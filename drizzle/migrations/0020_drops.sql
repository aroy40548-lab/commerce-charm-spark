CREATE TABLE public.drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  product_handle text,
  drop_at timestamptz NOT NULL,
  whatsapp_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.drops TO service_role;
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;