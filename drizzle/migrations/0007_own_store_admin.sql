-- ZANKYO's own store backend (replaces Shopify): richer catalog, orders with
-- payment/fulfilment history, staff roles, affiliates, gift cards, reviews and blog.
-- Every statement is idempotent so the file can be re-applied safely.

-- ---------- Catalog ----------
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS handle text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
UPDATE public.categories
  SET handle = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
  WHERE handle IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS categories_handle_idx ON public.categories (handle);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_description text;
UPDATE public.products SET status = CASE WHEN active THEN 'active' ELSE 'draft' END
  WHERE status = 'active' AND NOT active;
DO $$ BEGIN
  ALTER TABLE public.products ADD CONSTRAINT products_status_check CHECK (status IN ('active','draft','archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- `active` stays for the existing read policy; it simply mirrors status.
CREATE OR REPLACE FUNCTION public.products_sync_active() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.active := NEW.status = 'active'; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS products_sync_active ON public.products;
CREATE TRIGGER products_sync_active BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_sync_active();

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS compare_at_price numeric(10,2);

CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  delta int NOT NULL,
  stock_after int NOT NULL,
  reason text NOT NULL DEFAULT 'manual',
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.inventory_adjustments TO service_role;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS inventory_adjustments_variant_idx ON public.inventory_adjustments (variant_id, created_at DESC);

-- ---------- Settings ----------
INSERT INTO public.store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS standard_label text NOT NULL DEFAULT 'Standard (7–14 days)';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS express_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS express_label text NOT NULL DEFAULT 'Diamond (2–4 days)';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS express_shipping_fee numeric(10,2) NOT NULL DEFAULT 500;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS cod_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS cod_fee numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS affiliates_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS affiliate_rate numeric(5,2) NOT NULL DEFAULT 5;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS affiliate_cookie_days int NOT NULL DEFAULT 30;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS low_stock_threshold int NOT NULL DEFAULT 3;
-- Match what checkout charged on Shopify (Standard ₹100, no free-shipping threshold),
-- but only if the old defaults were never edited.
UPDATE public.store_settings SET shipping_fee = 100, free_shipping_over = 0
  WHERE id = 1 AND shipping_fee = 99 AND free_shipping_over = 1999;

-- ---------- Discounts & gift cards ----------
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS first_order_only boolean NOT NULL DEFAULT false;
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS once_per_customer boolean NOT NULL DEFAULT false;
INSERT INTO public.discounts (code, kind, value, description, first_order_only, once_per_customer, expires_at)
VALUES ('FIRST20', 'percent', 20, '20% off a customer''s first order', true, true, '2026-12-27T18:29:59Z')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  initial_value numeric(10,2) NOT NULL,
  balance numeric(10,2) NOT NULL,
  customer_email text,
  note text NOT NULL DEFAULT '',
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.gift_cards TO service_role;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

-- ---------- Orders ----------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'razorpay';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_method text NOT NULL DEFAULT 'standard';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gift_card_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gift_card_amount numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cod_fee numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS affiliate_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_note text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_committed boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
CREATE INDEX IF NOT EXISTS orders_user_idx ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status, created_at DESC);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sku text;

CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'note',
  message text NOT NULL,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS order_events_order_idx ON public.order_events (order_id, created_at);

-- ---------- Customers ----------
CREATE TABLE IF NOT EXISTS public.customer_notes (
  user_id uuid PRIMARY KEY,
  note text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.customer_notes TO service_role;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

-- Google gives a full name rather than first/last; keep the admin grant from 0002.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE full_name text := coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, username)
  VALUES (
    NEW.id, NEW.email,
    coalesce(NEW.raw_user_meta_data->>'first_name', nullif(split_part(full_name, ' ', 1), '')),
    coalesce(NEW.raw_user_meta_data->>'last_name', nullif(substr(full_name, length(split_part(full_name, ' ', 1)) + 2), '')),
    NULLIF(lower(NEW.raw_user_meta_data->>'username'), '')
  )
  ON CONFLICT (id) DO NOTHING;
  IF lower(NEW.email) IN ('aroy40548@gmail.com', 'help@zankyo.in')
     AND NEW.raw_app_meta_data->>'provider' = 'google' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;

-- ---------- Staff & roles ----------
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  permissions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff_roles TO service_role;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
INSERT INTO public.staff_roles (name, description, permissions) VALUES
  ('Full access', 'Can change everything, including staff', ARRAY['orders','products','customers','discounts','marketing','reviews','content','settings','staff']),
  ('Order manager', 'Packs, ships, cancels and refunds orders', ARRAY['orders']),
  ('Catalog manager', 'Adds and edits products, collections and stock', ARRAY['products']),
  ('Marketing', 'Runs discounts, affiliates and blog posts', ARRAY['discounts','marketing','content']),
  ('Support', 'Handles orders, customers and reviews', ARRAY['orders','customers','reviews'])
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  user_id uuid UNIQUE,
  role_id uuid REFERENCES public.staff_roles(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  invited_by text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS staff_members_email_idx ON public.staff_members (lower(email));
GRANT ALL ON public.staff_members TO service_role;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

-- ---------- Affiliates ----------
CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  commission_rate numeric(5,2),
  payout_upi text,
  clicks int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  order_amount numeric(10,2) NOT NULL,
  rate numeric(5,2) NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  decided_by text,
  decided_at timestamptz,
  paid_at timestamptz,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS affiliate_commissions_affiliate_idx ON public.affiliate_commissions (affiliate_id, created_at DESC);

-- ---------- Reviews (now tied to ZANKYO orders) ----------
ALTER TABLE public.product_reviews ALTER COLUMN shopify_product_id DROP NOT NULL;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS replied_at timestamptz;

-- ---------- Blog ----------
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  cover_url text,
  author text NOT NULL DEFAULT 'ZANKYO',
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS blog_posts_touch ON public.blog_posts;
CREATE TRIGGER blog_posts_touch BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- Storage ----------
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('review-photos', 'review-photos', false) ON CONFLICT (id) DO NOTHING;

-- ---------- Order lifecycle ----------
-- Called once payment is confirmed (status 'paid') or a COD order is accepted
-- ('confirmed'): takes stock, counts discount use, spends gift card balance and
-- records the affiliate's commission for owner approval.
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
    -- A COD order that later gets paid online just records the payment.
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
      base := GREATEST(o.subtotal - o.discount, 0);
      INSERT INTO public.affiliate_commissions (affiliate_id, order_id, order_amount, rate, amount)
        VALUES (a.id, o.id, base, r, round(base * r / 100, 2))
        ON CONFLICT (order_id) DO NOTHING;
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

-- Kept for older callers.
CREATE OR REPLACE FUNCTION public.mark_order_paid(_order_id uuid, _payment_id text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.commit_order(_order_id, _payment_id, 'paid')
$$;
REVOKE ALL ON FUNCTION public.mark_order_paid(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid, text) TO service_role;

-- Cancels or refunds an order: puts stock back, returns gift card balance and
-- voids any commission that hasn't been paid out yet.
CREATE OR REPLACE FUNCTION public.release_order(_order_id uuid, _status text, _reason text, _actor text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders%ROWTYPE;
BEGIN
  IF _status NOT IN ('cancelled','refunded') THEN RAISE EXCEPTION 'bad status %', _status; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF o.status IN ('cancelled','refunded') THEN RETURN true; END IF;

  IF o.stock_committed THEN
    UPDATE public.product_variants v SET stock = v.stock + i.quantity
      FROM public.order_items i WHERE i.order_id = _order_id AND i.variant_id = v.id;
    INSERT INTO public.inventory_adjustments (variant_id, delta, stock_after, reason, actor)
      SELECT v.id, i.quantity, v.stock, 'Restock ZK' || o.order_number, _actor
      FROM public.order_items i JOIN public.product_variants v ON v.id = i.variant_id WHERE i.order_id = _order_id;
    IF o.gift_card_code IS NOT NULL AND o.gift_card_amount > 0 THEN
      UPDATE public.gift_cards SET balance = balance + o.gift_card_amount WHERE code = o.gift_card_code;
    END IF;
    IF o.discount_code IS NOT NULL THEN
      UPDATE public.discounts SET used_count = GREATEST(used_count - 1, 0) WHERE code = o.discount_code;
    END IF;
  END IF;
  UPDATE public.affiliate_commissions SET status = 'rejected', note = 'Order ' || _status, decided_at = now(), decided_by = 'system'
    WHERE order_id = _order_id AND status IN ('pending','approved');

  UPDATE public.orders SET status = _status, stock_committed = false, cancelled_at = now(), cancel_reason = _reason
    WHERE id = _order_id;
  INSERT INTO public.order_events (order_id, kind, message, actor)
    VALUES (_order_id, _status, initcap(_status) || coalesce(': ' || nullif(_reason, ''), ''), _actor);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.release_order(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_order(uuid, text, text, text) TO service_role;

-- Atomic stock change from the admin, logged for the inventory history.
CREATE OR REPLACE FUNCTION public.adjust_stock(_variant_id uuid, _delta int, _reason text, _actor text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.product_variants SET stock = GREATEST(stock + _delta, 0) WHERE id = _variant_id RETURNING stock INTO n;
  IF n IS NULL THEN RAISE EXCEPTION 'variant not found'; END IF;
  INSERT INTO public.inventory_adjustments (variant_id, delta, stock_after, reason, actor) VALUES (_variant_id, _delta, n, _reason, _actor);
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.adjust_stock(uuid, int, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, int, text, text) TO service_role;

-- Affiliate link clicks (called from the server with the service role).
CREATE OR REPLACE FUNCTION public.track_affiliate_click(_code text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.affiliates SET clicks = clicks + 1 WHERE code = upper(_code) AND status = 'active'
$$;
REVOKE ALL ON FUNCTION public.track_affiliate_click(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_affiliate_click(text) TO service_role;
