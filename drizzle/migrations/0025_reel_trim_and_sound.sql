ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS trim_start numeric NOT NULL DEFAULT 0;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS trim_end numeric;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS sound_reel_id uuid REFERENCES public.reels(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS reels_sound_idx ON public.reels (sound_reel_id);
ALTER TABLE public.store_settings ALTER COLUMN affiliate_rate SET DEFAULT 2;