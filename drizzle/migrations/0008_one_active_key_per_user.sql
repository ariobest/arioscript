-- Keep at most one active key per user. Existing duplicates are resolved by keeping
-- the newest active key and revoking the older ones.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM public.license_keys
  WHERE user_id IS NOT NULL AND active = true
)
UPDATE public.license_keys k
SET active = false
FROM ranked r
WHERE k.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS license_keys_one_active_user_idx
  ON public.license_keys(user_id)
  WHERE user_id IS NOT NULL AND active = true;

CREATE OR REPLACE FUNCTION public.claim_free_key() RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s key_settings; r key_requests; k license_keys;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO s FROM key_settings WHERE id = 1;
  IF NOT s.enabled THEN RAISE EXCEPTION 'Key system temporarily unavailable'; END IF;
  SELECT * INTO r FROM key_requests WHERE user_id = auth.uid();
  IF r IS NULL THEN RAISE EXCEPTION 'Start the key request first'; END IF;
  IF r.started_at > now() - make_interval(secs => s.wait_seconds) THEN
    RAISE EXCEPTION 'Please wait for the timer to finish';
  END IF;
  DELETE FROM key_requests WHERE user_id = auth.uid();

  SELECT * INTO k FROM license_keys WHERE user_id = auth.uid() AND active
    AND (expires_at IS NULL OR expires_at > now()) AND (max_uses IS NULL OR uses < max_uses)
    ORDER BY created_at DESC LIMIT 1;
  IF k IS NULL THEN
    -- An expired/revoked key must not block a replacement.
    UPDATE license_keys SET active = false WHERE user_id = auth.uid() AND active = true;
    INSERT INTO license_keys(key, key_type, user_id, expires_at, created_by)
      VALUES (new_key_text(), 'free', auth.uid(), now() + make_interval(hours => s.free_hours), auth.uid())
      RETURNING * INTO k;
  END IF;
  RETURN json_build_object('key', k.key, 'key_type', k.key_type, 'expires_at', k.expires_at);
END $$;

CREATE OR REPLACE FUNCTION public.admin_generate_keys(_type text, _count int, _hours int, _max_uses int, _notes text, _user uuid)
RETURNS SETOF license_keys LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _type NOT IN ('free','premium','lifetime') OR _count < 1 OR _count > 500 THEN RAISE EXCEPTION 'Invalid input'; END IF;
  IF _user IS NOT NULL AND _count <> 1 THEN RAISE EXCEPTION 'A user can only have one active key'; END IF;
  IF _user IS NOT NULL THEN
    -- Issuing a replacement revokes the previous active key first.
    UPDATE license_keys SET active = false WHERE user_id = _user AND active = true;
  END IF;
  RETURN QUERY INSERT INTO license_keys(key, key_type, user_id, expires_at, max_uses, notes, created_by)
    SELECT new_key_text(), _type, _user,
      CASE WHEN _type = 'lifetime' OR _hours IS NULL THEN NULL ELSE now() + make_interval(hours => _hours) END,
      _max_uses, nullif(trim(_notes),''), auth.uid()
    FROM generate_series(1, _count) RETURNING *;
END $$;
