CREATE OR REPLACE FUNCTION public.validate_key(_key text) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k license_keys; ok boolean;
BEGIN
  SELECT * INTO k FROM license_keys WHERE key = upper(trim(_key));
  ok := FOUND AND k.active AND (k.expires_at IS NULL OR k.expires_at > now())
        AND (k.max_uses IS NULL OR k.uses < k.max_uses)
        AND EXISTS (SELECT 1 FROM key_settings WHERE id = 1 AND enabled);
  INSERT INTO key_checks(ok) VALUES (coalesce(ok,false));
  IF NOT coalesce(ok,false) THEN RETURN json_build_object('valid', false); END IF;
  UPDATE license_keys SET uses = uses + 1, last_used_at = now() WHERE id = k.id;
  RETURN json_build_object('valid', true, 'type', k.key_type, 'expires_at', k.expires_at);
END $$;
REVOKE EXECUTE ON FUNCTION public.validate_key(text) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_key(text) TO anon, authenticated;