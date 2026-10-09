-- Require an active developer API key before serving raw Lua source.
-- Existing public raw URLs without ?key=... will stop returning source.
CREATE OR REPLACE FUNCTION public.get_protected_raw_script(_slug text, _api_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  kh text;
  key_id uuid;
  script_code text;
BEGIN
  IF coalesce(trim(_api_key), '') = '' THEN
    RETURN NULL;
  END IF;

  kh := encode(extensions.digest(trim(_api_key), 'sha256'), 'hex');

  SELECT id INTO key_id
  FROM public.developer_api_keys
  WHERE key_hash = kh
    AND revoked = false
  LIMIT 1;

  IF key_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.developer_api_keys
  SET last_used_at = now()
  WHERE id = key_id;

  SELECT code INTO script_code
  FROM public.raw_scripts
  WHERE lower(slug) = lower(_slug)
    AND enabled = true
  LIMIT 1;

  RETURN script_code;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_protected_raw_script(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_protected_raw_script(text, text) TO anon, authenticated;

-- Prevent bypassing the API-key gate through the legacy public RPCs.
REVOKE ALL ON FUNCTION public.get_raw_script(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_raw_script(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_raw_script(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_raw_script(text, text) FROM anon, authenticated;
