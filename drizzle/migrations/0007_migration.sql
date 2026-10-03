CREATE TABLE public.key_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  wait_seconds int NOT NULL DEFAULT 20 CHECK (wait_seconds BETWEEN 0 AND 600),
  free_hours int NOT NULL DEFAULT 24 CHECK (free_hours BETWEEN 1 AND 8760),
  premium_hours int NOT NULL DEFAULT 720 CHECK (premium_hours BETWEEN 1 AND 87600),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.key_settings TO anon, authenticated;
GRANT UPDATE ON public.key_settings TO authenticated;
GRANT ALL ON public.key_settings TO service_role;
ALTER TABLE public.key_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "key_settings public read" ON public.key_settings FOR SELECT USING (true);
CREATE POLICY "key_settings admin update" ON public.key_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
INSERT INTO public.key_settings (id) VALUES (1);

CREATE TABLE public.license_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  key_type text NOT NULL DEFAULT 'free' CHECK (key_type IN ('free','premium','lifetime')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  max_uses int CHECK (max_uses IS NULL OR max_uses > 0),
  uses int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX license_keys_user_idx ON public.license_keys(user_id);
CREATE INDEX license_keys_created_idx ON public.license_keys(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_keys TO authenticated;
GRANT ALL ON public.license_keys TO service_role;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "keys admin all" ON public.license_keys FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "keys own read" ON public.license_keys FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.key_requests (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.key_requests TO service_role;
ALTER TABLE public.key_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.key_checks (
  id bigserial PRIMARY KEY,
  ok boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.key_checks TO service_role;
ALTER TABLE public.key_checks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.new_key_text() RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'ARIO-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)) || '-' ||
         upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)) || '-' ||
         upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))
$$;

CREATE OR REPLACE FUNCTION public.start_key_request() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s key_settings;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO s FROM key_settings WHERE id = 1;
  IF NOT s.enabled THEN RAISE EXCEPTION 'Key system temporarily unavailable'; END IF;
  INSERT INTO key_requests(user_id, started_at) VALUES (auth.uid(), now())
    ON CONFLICT (user_id) DO UPDATE SET started_at = now();
  RETURN s.wait_seconds;
END $$;

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
  SELECT * INTO k FROM license_keys WHERE user_id = auth.uid() AND key_type = 'free' AND active
    AND (expires_at IS NULL OR expires_at > now()) AND (max_uses IS NULL OR uses < max_uses)
    ORDER BY created_at DESC LIMIT 1;
  IF k IS NULL THEN
    INSERT INTO license_keys(key, key_type, user_id, expires_at, created_by)
      VALUES (new_key_text(), 'free', auth.uid(), now() + make_interval(hours => s.free_hours), auth.uid())
      RETURNING * INTO k;
  END IF;
  RETURN json_build_object('key', k.key, 'key_type', k.key_type, 'expires_at', k.expires_at);
END $$;

CREATE OR REPLACE FUNCTION public.validate_key(_key text) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k license_keys; ok boolean;
BEGIN
  SELECT * INTO k FROM license_keys WHERE key = upper(trim(_key));
  ok := k IS NOT NULL AND k.active AND (k.expires_at IS NULL OR k.expires_at > now())
        AND (k.max_uses IS NULL OR k.uses < k.max_uses)
        AND EXISTS (SELECT 1 FROM key_settings WHERE id = 1 AND enabled);
  INSERT INTO key_checks(ok) VALUES (ok);
  IF NOT ok THEN RETURN json_build_object('valid', false); END IF;
  UPDATE license_keys SET uses = uses + 1, last_used_at = now() WHERE id = k.id;
  RETURN json_build_object('valid', true, 'type', k.key_type, 'expires_at', k.expires_at);
END $$;

CREATE OR REPLACE FUNCTION public.admin_generate_keys(_type text, _count int, _hours int, _max_uses int, _notes text, _user uuid)
RETURNS SETOF license_keys LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _type NOT IN ('free','premium','lifetime') OR _count < 1 OR _count > 500 THEN RAISE EXCEPTION 'Invalid input'; END IF;
  RETURN QUERY INSERT INTO license_keys(key, key_type, user_id, expires_at, max_uses, notes, created_by)
    SELECT new_key_text(), _type, _user,
      CASE WHEN _type = 'lifetime' OR _hours IS NULL THEN NULL ELSE now() + make_interval(hours => _hours) END,
      _max_uses, nullif(trim(_notes),''), auth.uid()
    FROM generate_series(1, _count) RETURNING *;
END $$;

CREATE OR REPLACE FUNCTION public.admin_key_stats() RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN json_build_object(
    'total', (SELECT count(*) FROM license_keys),
    'active', (SELECT count(*) FROM license_keys WHERE active AND (expires_at IS NULL OR expires_at > now())),
    'expired', (SELECT count(*) FROM license_keys WHERE expires_at <= now()),
    'premium', (SELECT count(*) FROM license_keys WHERE key_type = 'premium'),
    'lifetime', (SELECT count(*) FROM license_keys WHERE key_type = 'lifetime'),
    'today', (SELECT count(*) FROM license_keys WHERE created_at >= date_trunc('day', now())),
    'checks', (SELECT count(*) FROM key_checks),
    'failed', (SELECT count(*) FROM key_checks WHERE NOT ok)
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.validate_key(text) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_key(text) TO anon, authenticated;