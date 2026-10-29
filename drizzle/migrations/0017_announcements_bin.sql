CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text NOT NULL,
  sent_by uuid,
  sent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS announcement_id uuid;
CREATE INDEX IF NOT EXISTS notifications_announcement_idx ON public.notifications(announcement_id);
CREATE OR REPLACE FUNCTION public.send_announcement(_id uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  INSERT INTO public.notifications(user_id, kind, body, announcement_id)
  SELECT p.id, 'announcement', left(a.body, 200), a.id FROM public.profiles p, public.announcements a WHERE a.id = _id AND p.username IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE public.announcements SET sent_count = n WHERE id = _id;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.send_announcement(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_announcement(uuid) TO service_role;