ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_chart jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS paired_product_ids uuid[] NOT NULL DEFAULT '{}';