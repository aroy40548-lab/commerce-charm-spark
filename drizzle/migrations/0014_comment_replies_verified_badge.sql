ALTER TABLE public.reel_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.reel_comments(id) ON DELETE CASCADE;
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS reel_comments_parent_idx ON public.reel_comments(parent_id);
CREATE INDEX IF NOT EXISTS post_comments_parent_idx ON public.post_comments(parent_id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.trg_post_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify((SELECT user_id FROM public.posts WHERE id = NEW.post_id), NEW.user_id, 'comment', NEW.post_id, NULL, NEW.body);
  IF NEW.parent_id IS NOT NULL THEN
    PERFORM public.notify((SELECT user_id FROM public.post_comments WHERE id = NEW.parent_id AND user_id <> (SELECT user_id FROM public.posts WHERE id = NEW.post_id)), NEW.user_id, 'reply', NEW.post_id, NULL, NEW.body);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_reel_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify((SELECT user_id FROM public.reels WHERE id = NEW.reel_id), NEW.user_id, 'comment', NULL, NEW.reel_id, NEW.body);
  IF NEW.parent_id IS NOT NULL THEN
    PERFORM public.notify((SELECT user_id FROM public.reel_comments WHERE id = NEW.parent_id AND user_id <> (SELECT user_id FROM public.reels WHERE id = NEW.reel_id)), NEW.user_id, 'reply', NULL, NEW.reel_id, NEW.body);
  END IF;
  RETURN NEW;
END $$;