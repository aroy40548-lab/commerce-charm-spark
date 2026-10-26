ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','hidden','reel_suspended','banned'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_changed_by text;
CREATE TABLE public.account_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL,
  reason text NOT NULL DEFAULT '',
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.account_actions TO service_role;
ALTER TABLE public.account_actions ENABLE ROW LEVEL SECURITY;
INSERT INTO public.profiles (id, email) SELECT u.id, u.email FROM auth.users u ON CONFLICT (id) DO NOTHING;