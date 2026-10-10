-- Prevent separate ARIO profiles for the same email identity.
-- Gmail ignores dots and +suffixes in the local part; normalize those aliases too.
CREATE OR REPLACE FUNCTION public.canonical_account_email(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN value IS NULL THEN NULL
    WHEN lower(split_part(trim(value), '@', 2)) IN ('gmail.com', 'googlemail.com')
      THEN replace(split_part(split_part(lower(trim(value)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    ELSE lower(trim(value))
  END;
$$;

CREATE OR REPLACE FUNCTION public.reject_duplicate_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id <> NEW.id
      AND public.canonical_account_email(p.email) = public.canonical_account_email(NEW.email)
  ) THEN
    RAISE EXCEPTION 'An account already exists for this email identity. Sign in with the original method instead.'
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_profile_email ON public.profiles;
CREATE TRIGGER prevent_duplicate_profile_email
BEFORE INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.reject_duplicate_profile_email();
