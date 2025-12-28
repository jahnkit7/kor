-- Ensure profiles are created automatically on signup
-- 1) Create trigger on auth.users to call existing public.handle_new_user()
-- Note: function already exists in public schema.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 2) Also run default setup (roles/subscription) if that trigger is missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_setup_created'
  ) THEN
    CREATE TRIGGER on_auth_user_setup_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user_setup();
  END IF;
END $$;

-- 3) Prevent duplicate profiles per user
-- If duplicates exist, this migration will fail; we checked beforehand.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
