CREATE OR REPLACE FUNCTION public.protect_profile_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.id
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND (
       NEW.is_banned IS DISTINCT FROM OLD.is_banned
       OR NEW.is_soft_banned IS DISTINCT FROM OLD.is_soft_banned
       OR NEW.ban_expires_at IS DISTINCT FROM OLD.ban_expires_at
       OR NEW.ban_reason IS DISTINCT FROM OLD.ban_reason
     ) THEN
    RAISE EXCEPTION 'Only administrators can change account moderation status'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_moderation_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_moderation_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_moderation_fields();

REVOKE ALL ON FUNCTION public.protect_profile_moderation_fields() FROM PUBLIC;
