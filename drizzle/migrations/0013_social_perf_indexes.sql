CREATE INDEX IF NOT EXISTS post_likes_user_idx ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS saves_user_created_idx ON public.saves(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_unread_idx ON public.messages(conversation_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS reel_votes_reel_idx ON public.reel_votes(reel_id, value);
CREATE INDEX IF NOT EXISTS reel_comments_reel_idx ON public.reel_comments(reel_id) WHERE hidden = false;
CREATE INDEX IF NOT EXISTS follows_follower_idx ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS reels_live_idx ON public.reels(status, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications(user_id) WHERE read_at IS NULL;