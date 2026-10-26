ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dm_followers_only boolean NOT NULL DEFAULT false;

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  caption text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live','hidden')),
  priority smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_user_idx ON public.posts(user_id, created_at DESC);
CREATE INDEX posts_live_idx ON public.posts(status, created_at DESC);

CREATE TABLE public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  path text NOT NULL,
  thumb_path text NOT NULL,
  width integer NOT NULL DEFAULT 0,
  height integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX post_media_post_idx ON public.post_media(post_id, position);

CREATE OR REPLACE FUNCTION public.post_media_limit() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.post_media WHERE post_id = NEW.post_id) >= 10 THEN
    RAISE EXCEPTION 'A post can have at most 10 photos';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER post_media_limit BEFORE INSERT ON public.post_media FOR EACH ROW EXECUTE FUNCTION public.post_media_limit();

CREATE TABLE public.post_products (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, product_id)
);

CREATE TABLE public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post_idx ON public.post_comments(post_id, created_at);

CREATE TABLE public.saves (
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('post','reel')),
  item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, item_id)
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid,
  kind text NOT NULL,
  post_id uuid,
  reel_id uuid,
  body text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
CREATE INDEX conversations_a_idx ON public.conversations(user_a, last_message_at DESC);
CREATE INDEX conversations_b_idx ON public.conversations(user_b, last_message_at DESC);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL DEFAULT '',
  image_path text,
  shared jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON public.messages(conversation_id, created_at DESC);

CREATE TABLE public.blocks (
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.posts, public.post_media, public.post_products, public.post_likes, public.post_comments, public.saves, public.notifications, public.conversations, public.messages, public.blocks, public.message_reports TO service_role;
GRANT SELECT ON public.notifications, public.messages, public.conversations TO authenticated;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

-- Read-only policies exist only so live updates reach the right person.
CREATE POLICY "Own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own conversations" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "Messages in own conversations" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Notification triggers
CREATE OR REPLACE FUNCTION public.notify(_user uuid, _actor uuid, _kind text, _post uuid, _reel uuid, _body text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user IS NULL OR _user = _actor THEN RETURN; END IF;
  IF _actor IS NOT NULL AND EXISTS (SELECT 1 FROM public.blocks WHERE blocker_id = _user AND blocked_id = _actor) THEN RETURN; END IF;
  INSERT INTO public.notifications(user_id, actor_id, kind, post_id, reel_id, body) VALUES (_user, _actor, _kind, _post, _reel, left(coalesce(_body,''), 200));
END $$;
REVOKE EXECUTE ON FUNCTION public.notify(uuid, uuid, text, uuid, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_post_like() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.notify((SELECT user_id FROM public.posts WHERE id = NEW.post_id), NEW.user_id, 'like', NEW.post_id, NULL, ''); RETURN NEW; END $$;
CREATE TRIGGER notify_post_like AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.trg_post_like();

CREATE OR REPLACE FUNCTION public.trg_post_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.notify((SELECT user_id FROM public.posts WHERE id = NEW.post_id), NEW.user_id, 'comment', NEW.post_id, NULL, NEW.body); RETURN NEW; END $$;
CREATE TRIGGER notify_post_comment AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.trg_post_comment();

CREATE OR REPLACE FUNCTION public.trg_reel_vote() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.value = 1 AND (TG_OP = 'INSERT' OR OLD.value IS DISTINCT FROM 1) THEN
    PERFORM public.notify((SELECT user_id FROM public.reels WHERE id = NEW.reel_id), NEW.user_id, 'like', NULL, NEW.reel_id, '');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_reel_vote AFTER INSERT OR UPDATE ON public.reel_votes FOR EACH ROW EXECUTE FUNCTION public.trg_reel_vote();

CREATE OR REPLACE FUNCTION public.trg_reel_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.notify((SELECT user_id FROM public.reels WHERE id = NEW.reel_id), NEW.user_id, 'comment', NULL, NEW.reel_id, NEW.body); RETURN NEW; END $$;
CREATE TRIGGER notify_reel_comment AFTER INSERT ON public.reel_comments FOR EACH ROW EXECUTE FUNCTION public.trg_reel_comment();

CREATE OR REPLACE FUNCTION public.trg_follow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.notify(NEW.following_id, NEW.follower_id, 'follow', NULL, NULL, ''); RETURN NEW; END $$;
CREATE TRIGGER notify_follow AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.trg_follow();

CREATE OR REPLACE FUNCTION public.trg_commission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    PERFORM public.notify((SELECT user_id FROM public.affiliates WHERE id = NEW.affiliate_id), NULL, 'partner', NULL, NULL, 'Your partner commission of ₹' || round(NEW.amount)::text || ' was approved');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_commission AFTER UPDATE ON public.affiliate_commissions FOR EACH ROW EXECUTE FUNCTION public.trg_commission();

CREATE OR REPLACE FUNCTION public.broadcast_notification(_body text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  INSERT INTO public.notifications(user_id, kind, body)
  SELECT id, 'announcement', left(_body, 200) FROM public.profiles WHERE username IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.broadcast_notification(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_notification(text) TO service_role;
