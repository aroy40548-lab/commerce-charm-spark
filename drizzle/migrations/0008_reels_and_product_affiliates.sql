CREATE TABLE IF NOT EXISTS public.reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_path text NOT NULL,
  caption text NOT NULL DEFAULT '',
  duration numeric(6,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'live',
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reels_status_chk CHECK (status IN ('live','hidden')),
  CONSTRAINT reels_duration_chk CHECK (duration > 0 AND duration <= 59.5)
);
GRANT ALL ON public.reels TO service_role;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reels_feed_idx ON public.reels (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reels_user_idx ON public.reels (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.reel_products (
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (reel_id, product_id)
);
GRANT ALL ON public.reel_products TO service_role;
ALTER TABLE public.reel_products ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reel_votes (
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  value smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reel_id, user_id),
  CONSTRAINT reel_votes_value_chk CHECK (value IN (-1, 1))
);
GRANT ALL ON public.reel_votes TO service_role;
ALTER TABLE public.reel_votes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reel_comments_len CHECK (char_length(body) BETWEEN 1 AND 500)
);
GRANT ALL ON public.reel_comments TO service_role;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reel_comments_reel_idx ON public.reel_comments (reel_id, created_at DESC);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS affiliate_product_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reel_id uuid;
ALTER TABLE public.affiliate_commissions ADD COLUMN IF NOT EXISTS product_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.affiliate_commissions ADD COLUMN IF NOT EXISTS reel_id uuid;

-- Commission is earned only on the products the affiliate's product link / reel pointed to.
-- Orders without linked products (old site-wide links) keep the whole-order commission.
CREATE OR REPLACE FUNCTION public.affiliate_commission_base(_order_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN cardinality(o.affiliate_product_ids) = 0 THEN GREATEST(o.subtotal - o.discount, 0)
    WHEN o.subtotal <= 0 THEN 0
    ELSE round(
      coalesce((SELECT sum(i.price * i.quantity) FROM public.order_items i
                WHERE i.order_id = o.id AND i.product_id = ANY(o.affiliate_product_ids)), 0)
      * GREATEST(o.subtotal - o.discount, 0) / o.subtotal, 2)
  END
  FROM public.orders o WHERE o.id = _order_id
$$;
REVOKE ALL ON FUNCTION public.affiliate_commission_base(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.affiliate_commission_base(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.commit_order(_order_id uuid, _payment_id text, _status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.orders%ROWTYPE;
  a public.affiliates%ROWTYPE;
  r numeric;
  base numeric;
BEGIN
  IF _status NOT IN ('paid','confirmed') THEN RAISE EXCEPTION 'bad status %', _status; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF o.status <> 'pending' THEN
    IF o.status = 'confirmed' AND _status = 'paid' THEN
      UPDATE public.orders SET status = 'paid', paid_at = now(), razorpay_payment_id = coalesce(_payment_id, razorpay_payment_id) WHERE id = _order_id;
    END IF;
    RETURN true;
  END IF;

  UPDATE public.product_variants v SET stock = GREATEST(v.stock - i.quantity, 0)
    FROM public.order_items i WHERE i.order_id = _order_id AND i.variant_id = v.id;
  INSERT INTO public.inventory_adjustments (variant_id, delta, stock_after, reason, actor)
    SELECT v.id, -i.quantity, v.stock, 'Order ZK' || o.order_number, 'system'
    FROM public.order_items i JOIN public.product_variants v ON v.id = i.variant_id WHERE i.order_id = _order_id;

  IF o.discount_code IS NOT NULL THEN
    UPDATE public.discounts SET used_count = used_count + 1 WHERE code = o.discount_code;
  END IF;
  IF o.gift_card_code IS NOT NULL AND o.gift_card_amount > 0 THEN
    UPDATE public.gift_cards SET balance = GREATEST(balance - o.gift_card_amount, 0) WHERE code = o.gift_card_code;
  END IF;

  IF o.affiliate_id IS NOT NULL THEN
    SELECT * INTO a FROM public.affiliates WHERE id = o.affiliate_id;
    IF FOUND AND a.status = 'active' AND a.user_id IS DISTINCT FROM o.user_id THEN
      SELECT coalesce(a.commission_rate, s.affiliate_rate) INTO r FROM public.store_settings s WHERE s.id = 1;
      base := public.affiliate_commission_base(o.id);
      IF base > 0 THEN
        INSERT INTO public.affiliate_commissions (affiliate_id, order_id, order_amount, rate, amount, product_ids, reel_id)
          VALUES (a.id, o.id, base, r, round(base * r / 100, 2), o.affiliate_product_ids, o.reel_id)
          ON CONFLICT (order_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  UPDATE public.orders SET
    status = _status,
    stock_committed = true,
    razorpay_payment_id = coalesce(_payment_id, razorpay_payment_id),
    paid_at = CASE WHEN _status = 'paid' THEN now() ELSE paid_at END
  WHERE id = _order_id;
  INSERT INTO public.order_events (order_id, kind, message, actor)
    VALUES (_order_id, _status, CASE WHEN _status = 'paid' THEN 'Payment received' ELSE 'Cash on delivery order confirmed' END, 'system');
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.commit_order(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_order(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.increment_reel_views(_reel_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.reels SET views = views + 1 WHERE id = _reel_id AND status = 'live'
$$;
REVOKE ALL ON FUNCTION public.increment_reel_views(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_reel_views(uuid) TO service_role;