CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verified := false; NEW.verified_at := NULL; NEW.account_status := 'active';
    NEW.status_reason := NULL; NEW.status_changed_at := NULL; NEW.status_changed_by := NULL; NEW.feed_priority := 0;
  ELSE
    NEW.verified := OLD.verified; NEW.verified_at := OLD.verified_at; NEW.account_status := OLD.account_status;
    NEW.status_reason := OLD.status_reason; NEW.status_changed_at := OLD.status_changed_at;
    NEW.status_changed_by := OLD.status_changed_by; NEW.feed_priority := OLD.feed_priority;
  END IF;
  IF NEW.avatar_path IS NOT NULL AND NEW.avatar_path !~ ('^avatars/' || NEW.id::text || '/[A-Za-z0-9._-]+$') THEN
    RAISE EXCEPTION 'Invalid avatar path';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_guard ON public.profiles;
CREATE TRIGGER profiles_guard BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_guard();

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY,
  path text NOT NULL DEFAULT '/',
  device text NOT NULL DEFAULT '',
  cart_count integer NOT NULL DEFAULT 0,
  cart_value numeric NOT NULL DEFAULT 0,
  cart_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  visits integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  session_started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_presence TO service_role;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS user_presence_last_seen ON public.user_presence (last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.user_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  body text NOT NULL,
  link text,
  sent_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz
);
GRANT ALL ON public.user_nudges TO service_role;
ALTER TABLE public.user_nudges ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS user_nudges_pending ON public.user_nudges (user_id) WHERE seen_at IS NULL;