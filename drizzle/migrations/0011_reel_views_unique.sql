CREATE TABLE public.reel_views (
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  viewer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reel_id, viewer)
);
GRANT ALL ON public.reel_views TO service_role;
ALTER TABLE public.reel_views ENABLE ROW LEVEL SECURITY;