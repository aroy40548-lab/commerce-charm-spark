CREATE TABLE public.affiliate_link_visits (
  code text NOT NULL,
  client_hash text NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code, client_hash, product_id)
);
GRANT ALL ON public.affiliate_link_visits TO service_role;
ALTER TABLE public.affiliate_link_visits ENABLE ROW LEVEL SECURITY;