ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_soft_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS ban_reason text;

CREATE OR REPLACE FUNCTION public.block_banned_user_actions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  actor_profile public.profiles%ROWTYPE;
BEGIN
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO actor_profile FROM public.profiles WHERE id = actor_id;
  IF FOUND
     AND (actor_profile.is_banned OR actor_profile.is_soft_banned)
     AND (actor_profile.ban_expires_at IS NULL OR actor_profile.ban_expires_at > now()) THEN
    RAISE EXCEPTION 'Your ARIO account is restricted: %',
      COALESCE(actor_profile.ban_reason, CASE WHEN actor_profile.is_banned THEN 'account banned' ELSE 'account soft-banned' END)
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_banned_favorites ON public.favorites;
CREATE TRIGGER trg_block_banned_favorites
  BEFORE INSERT OR UPDATE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.block_banned_user_actions();

DROP TRIGGER IF EXISTS trg_block_banned_reports ON public.reports;
CREATE TRIGGER trg_block_banned_reports
  BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.block_banned_user_actions();

DROP TRIGGER IF EXISTS trg_block_banned_comments ON public.script_comments;
CREATE TRIGGER trg_block_banned_comments
  BEFORE INSERT OR UPDATE ON public.script_comments
  FOR EACH ROW EXECUTE FUNCTION public.block_banned_user_actions();

DROP TRIGGER IF EXISTS trg_block_banned_key_requests ON public.key_requests;
CREATE TRIGGER trg_block_banned_key_requests
  BEFORE INSERT OR UPDATE ON public.key_requests
  FOR EACH ROW EXECUTE FUNCTION public.block_banned_user_actions();

DROP TRIGGER IF EXISTS trg_block_banned_license_keys ON public.license_keys;
CREATE TRIGGER trg_block_banned_license_keys
  BEFORE INSERT OR UPDATE ON public.license_keys
  FOR EACH ROW EXECUTE FUNCTION public.block_banned_user_actions();

REVOKE ALL ON FUNCTION public.block_banned_user_actions() FROM PUBLIC;
