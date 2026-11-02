CREATE TABLE public.affiliate_clicks (
  code text NOT NULL,
  client_hash text NOT NULL,
  day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code, client_hash, day)
);
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;