ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (lower(username));

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, username)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name', NULLIF(lower(NEW.raw_user_meta_data->>'username'), ''))
  ON CONFLICT (id) DO NOTHING;
  -- Admin only via verified Google sign-in (password accounts are unverified)
  IF lower(NEW.email) IN ('aroy40548@gmail.com', 'help@zankyo.in')
     AND NEW.raw_app_meta_data->>'provider' = 'google' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) IN ('aroy40548@gmail.com', 'help@zankyo.in') AND raw_app_meta_data->>'provider' = 'google'
ON CONFLICT DO NOTHING;