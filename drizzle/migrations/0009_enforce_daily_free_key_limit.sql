CREATE OR REPLACE FUNCTION public.start_key_request() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.key_settings; latest timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  SELECT * INTO s FROM public.key_settings WHERE id = 1;
  IF NOT coalesce(s.enabled, false) THEN RAISE EXCEPTION 'Key system temporarily unavailable'; END IF;
  IF EXISTS (SELECT 1 FROM public.license_keys WHERE user_id = auth.uid() AND active AND (expires_at IS NULL OR expires_at > now()) AND (max_uses IS NULL OR uses < max_uses)) THEN
    RAISE EXCEPTION 'You already have an active key';
  END IF;
  SELECT max(created_at) INTO latest FROM public.license_keys WHERE user_id = auth.uid() AND key_type = 'free';
  IF latest > now() - interval '24 hours' THEN RAISE EXCEPTION 'One free key per 24 hours. Try again after %', to_char(latest + interval '24 hours', 'YYYY-MM-DD HH24:MI UTC'); END IF;
  INSERT INTO public.key_requests(user_id, started_at) VALUES (auth.uid(), now())
    ON CONFLICT (user_id) DO UPDATE SET started_at = now();
  RETURN s.wait_seconds;
END $$;

CREATE OR REPLACE FUNCTION public.claim_free_key() RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.key_settings; r public.key_requests; k public.license_keys; latest timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  SELECT * INTO s FROM public.key_settings WHERE id = 1;
  IF NOT coalesce(s.enabled, false) THEN RAISE EXCEPTION 'Key system temporarily unavailable'; END IF;
  IF EXISTS (SELECT 1 FROM public.license_keys WHERE user_id = auth.uid() AND active AND (expires_at IS NULL OR expires_at > now()) AND (max_uses IS NULL OR uses < max_uses)) THEN
    RAISE EXCEPTION 'You already have an active key';
  END IF;
  SELECT max(created_at) INTO latest FROM public.license_keys WHERE user_id = auth.uid() AND key_type = 'free';
  IF latest > now() - interval '24 hours' THEN RAISE EXCEPTION 'One free key per 24 hours. Try again after %', to_char(latest + interval '24 hours', 'YYYY-MM-DD HH24:MI UTC'); END IF;
  SELECT * INTO r FROM public.key_requests WHERE user_id = auth.uid() FOR UPDATE;
  IF r IS NULL THEN RAISE EXCEPTION 'Start the key request first'; END IF;
  IF r.started_at > now() - make_interval(secs => s.wait_seconds) THEN RAISE EXCEPTION 'Please wait for the timer to finish'; END IF;
  UPDATE public.license_keys SET active = false WHERE user_id = auth.uid() AND active = true;
  INSERT INTO public.license_keys(key, key_type, user_id, expires_at, created_by)
    VALUES (public.new_key_text(), 'free', auth.uid(), now() + make_interval(hours => s.free_hours), auth.uid()) RETURNING * INTO k;
  DELETE FROM public.key_requests WHERE user_id = auth.uid();
  RETURN json_build_object('key', k.key, 'key_type', k.key_type, 'expires_at', k.expires_at);
END $$;