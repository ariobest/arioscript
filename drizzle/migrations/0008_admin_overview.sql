CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN json_build_object(
    'keys_active', (SELECT count(*) FROM license_keys WHERE active AND (expires_at IS NULL OR expires_at > now())),
    'keys_today', (SELECT count(*) FROM license_keys WHERE created_at >= date_trunc('day', now())),
    'key_checks_today', (SELECT count(*) FROM key_checks WHERE created_at >= date_trunc('day', now())),
    'key_system', (SELECT enabled FROM key_settings WHERE id = 1),
    'raw_total', (SELECT count(*) FROM raw_scripts),
    'raw_enabled', (SELECT count(*) FROM raw_scripts WHERE enabled),
    'drafts', (SELECT count(*) FROM scripts WHERE NOT published AND NOT archived),
    'archived', (SELECT count(*) FROM scripts WHERE archived),
    'banned', (SELECT count(*) FROM profiles WHERE is_banned),
    'announcements', (SELECT count(*) FROM announcements WHERE active),
    'maintenance', (SELECT maintenance_mode FROM site_settings WHERE id = 1),
    'registration', (SELECT registration_enabled FROM site_settings WHERE id = 1),
    'top_scripts', (SELECT coalesce(json_agg(t), '[]'::json) FROM (
       SELECT id, name, slug, views, copies, downloads FROM scripts
       WHERE NOT archived ORDER BY views + copies*3 + downloads*4 DESC LIMIT 5) t)
  );
END $$;
REVOKE ALL ON FUNCTION public.admin_overview() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;