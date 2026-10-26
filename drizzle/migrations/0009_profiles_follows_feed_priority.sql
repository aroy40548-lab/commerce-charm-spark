ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text, ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS avatar_path text, ADD COLUMN IF NOT EXISTS feed_priority smallint NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key ON public.profiles (lower(username));
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS follows_following_idx ON public.follows (following_id);
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
COMMENT ON COLUMN public.profiles.feed_priority IS '0 hide from feed, 1 normal, 2 boost, 4 top';
COMMENT ON COLUMN public.reels.priority IS '0 hide from feed, 1 normal, 2 boost, 4 top';