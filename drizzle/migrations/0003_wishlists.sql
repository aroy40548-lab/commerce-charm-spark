CREATE TABLE public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlist own read" ON public.wishlists
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "wishlist own insert" ON public.wishlists
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "wishlist own delete" ON public.wishlists
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());