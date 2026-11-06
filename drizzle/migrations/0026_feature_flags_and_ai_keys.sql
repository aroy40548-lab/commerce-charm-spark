ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS public.app_secrets (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  gemini_api_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_secrets TO service_role;
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_secrets (id) VALUES (1) ON CONFLICT DO NOTHING;