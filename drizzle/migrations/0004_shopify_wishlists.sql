CREATE TABLE public.shopify_wishlists (
  customer_id text not null,
  handle text not null,
  created_at timestamptz not null default now(),
  primary key (customer_id, handle)
);
GRANT ALL ON public.shopify_wishlists TO service_role;
ALTER TABLE public.shopify_wishlists ENABLE ROW LEVEL SECURITY;
-- No client policies: only the server (after verifying the Shopify customer token) reads/writes.