
-- ROLES
CREATE TYPE public.app_role AS ENUM ('user','moderator','admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','moderator'));
$$;

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- SCRIPTS
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  game_name TEXT NOT NULL DEFAULT 'Universal',
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  code TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  youtube_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'working',
  published BOOLEAN NOT NULL DEFAULT true,
  archived BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  download_enabled BOOLEAN NOT NULL DEFAULT true,
  views INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  copies INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  favorites INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scripts_pub ON public.scripts(published, archived);
CREATE INDEX idx_scripts_cat ON public.scripts(category_id);
CREATE INDEX idx_scripts_game ON public.scripts(game_name);
GRANT SELECT ON public.scripts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.scripts TO authenticated;
GRANT ALL ON public.scripts TO service_role;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

-- FAVORITES
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, script_id)
);
GRANT SELECT ON public.favorites TO anon;
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- REPORTS
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- BADGES
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Award',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
GRANT SELECT ON public.user_badges TO anon, authenticated;
GRANT INSERT, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- ADMIN LOGS
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- SITE SETTINGS
CREATE TABLE public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  site_name TEXT NOT NULL DEFAULT 'ARIO SCRIPTS',
  description TEXT NOT NULL DEFAULT 'Premium script database',
  logo_url TEXT,
  favicon_url TEXT,
  discord_url TEXT,
  youtube_url TEXT,
  telegram_url TEXT,
  support_url TEXT,
  theme TEXT NOT NULL DEFAULT 'midnight',
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  registration_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_single CHECK (id = 1)
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- SCRIPT EVENTS
CREATE TABLE public.script_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view','copy','download','favorite','share')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_script ON public.script_events(script_id, event_type, created_at DESC);
CREATE INDEX idx_events_created ON public.script_events(created_at DESC);
GRANT SELECT ON public.script_events TO authenticated;
GRANT ALL ON public.script_events TO service_role;
ALTER TABLE public.script_events ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "roles readable" ON public.user_roles FOR SELECT USING (true);

CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "scripts public read" ON public.scripts FOR SELECT USING (published = true AND archived = false);
CREATE POLICY "scripts staff read" ON public.scripts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "scripts admin write" ON public.scripts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "favorites public read" ON public.favorites FOR SELECT USING (true);
CREATE POLICY "favorites own insert" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites own delete" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "reports own read" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "reports own insert" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports staff update" ON public.reports FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "badges public read" ON public.badges FOR SELECT USING (true);
CREATE POLICY "badges admin write" ON public.badges FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "user_badges public read" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "user_badges admin write" ON public.user_badges FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin_logs staff read" ON public.admin_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin_logs admin insert" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND admin_id = auth.uid());

CREATE POLICY "announcements public read" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "announcements admin write" ON public.announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "events staff read" ON public.script_events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- EVENT RECORDING (secure RPC, callable by anon)
CREATE OR REPLACE FUNCTION public.record_script_event(_script_id UUID, _event_type TEXT, _session_id TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recent INT;
BEGIN
  IF _event_type NOT IN ('view','copy','download','favorite','share') THEN
    RAISE EXCEPTION 'invalid event type';
  END IF;

  IF _event_type = 'view' THEN
    SELECT count(*) INTO recent FROM public.script_events
      WHERE script_id = _script_id AND event_type = 'view'
        AND created_at > now() - interval '30 minutes'
        AND (
          (_session_id IS NOT NULL AND session_id = _session_id)
          OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
        );
    IF recent > 0 THEN RETURN; END IF;
  END IF;

  INSERT INTO public.script_events (script_id, event_type, user_id, session_id)
  VALUES (_script_id, _event_type, auth.uid(), _session_id);

  UPDATE public.scripts SET
    views = views + CASE WHEN _event_type = 'view' THEN 1 ELSE 0 END,
    copies = copies + CASE WHEN _event_type = 'copy' THEN 1 ELSE 0 END,
    downloads = downloads + CASE WHEN _event_type = 'download' THEN 1 ELSE 0 END,
    shares = shares + CASE WHEN _event_type = 'share' THEN 1 ELSE 0 END
  WHERE id = _script_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_script_event(UUID, TEXT, TEXT) TO anon, authenticated;

-- favorites counter trigger
CREATE OR REPLACE FUNCTION public.sync_favorite_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.scripts SET favorites = favorites + 1 WHERE id = NEW.script_id;
    INSERT INTO public.script_events (script_id, event_type, user_id) VALUES (NEW.script_id,'favorite',NEW.user_id);
    RETURN NEW;
  ELSE
    UPDATE public.scripts SET favorites = GREATEST(favorites - 1, 0) WHERE id = OLD.script_id;
    RETURN OLD;
  END IF;
END;
$$;
CREATE TRIGGER trg_fav_count AFTER INSERT OR DELETE ON public.favorites
FOR EACH ROW EXECUTE FUNCTION public.sync_favorite_count();

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_scripts_touch BEFORE UPDATE ON public.scripts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- new user -> profile + role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uname TEXT;
BEGIN
  uname := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1), 'user');
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = uname) THEN
    uname := uname || '_' || substr(NEW.id::text,1,4);
  END IF;
  INSERT INTO public.profiles (id, username, email, avatar_url)
  VALUES (NEW.id, uname, NEW.email, NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- heartbeat
CREATE OR REPLACE FUNCTION public.touch_presence()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET last_seen = now() WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.touch_presence() TO authenticated;

-- public site stats
CREATE OR REPLACE FUNCTION public.site_stats()
RETURNS JSON LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'scripts', (SELECT count(*) FROM public.scripts WHERE published AND NOT archived),
    'users', (SELECT count(*) FROM public.profiles),
    'online', (SELECT count(*) FROM public.profiles WHERE last_seen > now() - interval '5 minutes'),
    'views', (SELECT count(*) FROM public.script_events WHERE event_type='view'),
    'copies', (SELECT count(*) FROM public.script_events WHERE event_type='copy'),
    'downloads', (SELECT count(*) FROM public.script_events WHERE event_type='download'),
    'favorites', (SELECT count(*) FROM public.favorites),
    'games', (SELECT count(DISTINCT game_name) FROM public.scripts WHERE published AND NOT archived)
  );
$$;
GRANT EXECUTE ON FUNCTION public.site_stats() TO anon, authenticated;

-- trending (recent events weighted)
CREATE OR REPLACE FUNCTION public.trending_scripts(_limit INT DEFAULT 8)
RETURNS SETOF public.scripts LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.* FROM public.scripts s
  LEFT JOIN (
    SELECT script_id, sum(CASE event_type WHEN 'view' THEN 1 WHEN 'copy' THEN 3 WHEN 'download' THEN 4 WHEN 'favorite' THEN 5 ELSE 2 END) AS score
    FROM public.script_events WHERE created_at > now() - interval '7 days' GROUP BY script_id
  ) e ON e.script_id = s.id
  WHERE s.published AND NOT s.archived
  ORDER BY COALESCE(e.score,0) DESC, s.created_at DESC
  LIMIT _limit;
$$;
GRANT EXECUTE ON FUNCTION public.trending_scripts(INT) TO anon, authenticated;

-- admin analytics
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (SELECT json_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'online', (SELECT count(*) FROM public.profiles WHERE last_seen > now() - interval '5 minutes'),
    'banned', (SELECT count(*) FROM public.profiles WHERE is_banned),
    'new_users_today', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '1 day'),
    'new_users_week', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'new_users_month', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '30 days'),
    'scripts', (SELECT count(*) FROM public.scripts),
    'views', (SELECT count(*) FROM public.script_events WHERE event_type='view'),
    'copies', (SELECT count(*) FROM public.script_events WHERE event_type='copy'),
    'downloads', (SELECT count(*) FROM public.script_events WHERE event_type='download'),
    'shares', (SELECT count(*) FROM public.script_events WHERE event_type='share'),
    'favorites', (SELECT count(*) FROM public.favorites),
    'reports', (SELECT count(*) FROM public.reports WHERE status='open')
  ));
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_timeseries(_days INT DEFAULT 30)
RETURNS TABLE(day DATE, views BIGINT, copies BIGINT, downloads BIGINT, new_users BIGINT, new_scripts BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH d AS (SELECT generate_series((now() - (_days || ' days')::interval)::date, now()::date, '1 day')::date AS day)
  SELECT d.day,
    (SELECT count(*) FROM public.script_events e WHERE e.event_type='view' AND e.created_at::date = d.day),
    (SELECT count(*) FROM public.script_events e WHERE e.event_type='copy' AND e.created_at::date = d.day),
    (SELECT count(*) FROM public.script_events e WHERE e.event_type='download' AND e.created_at::date = d.day),
    (SELECT count(*) FROM public.profiles p WHERE p.created_at::date = d.day),
    (SELECT count(*) FROM public.scripts s WHERE s.created_at::date = d.day)
  FROM d ORDER BY d.day;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_timeseries(INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.script_analytics(_script_id UUID)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (SELECT json_build_object(
    'views', count(*) FILTER (WHERE event_type='view'),
    'copies', count(*) FILTER (WHERE event_type='copy'),
    'downloads', count(*) FILTER (WHERE event_type='download'),
    'shares', count(*) FILTER (WHERE event_type='share'),
    'favorites', (SELECT count(*) FROM public.favorites WHERE script_id=_script_id),
    'views_today', count(*) FILTER (WHERE event_type='view' AND created_at > now() - interval '1 day'),
    'views_week', count(*) FILTER (WHERE event_type='view' AND created_at > now() - interval '7 days'),
    'views_month', count(*) FILTER (WHERE event_type='view' AND created_at > now() - interval '30 days')
  ) FROM public.script_events WHERE script_id = _script_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.script_analytics(UUID) TO authenticated;

-- seed categories + settings + badges
INSERT INTO public.site_settings (id) VALUES (1);
INSERT INTO public.categories (name, slug, description, icon) VALUES
 ('Combat','combat','Aimbot, silent aim and fighting helpers','Swords'),
 ('Automation','automation','Auto-play and macro scripts','Bot'),
 ('ESP','esp','Visuals, chams and wallhacks','Eye'),
 ('Farming','farming','Auto farm and grinding scripts','Sprout'),
 ('Teleport','teleport','Teleport and movement tools','Move3d'),
 ('Utilities','utilities','Helpful everyday utilities','Wrench'),
 ('UI','ui','Custom interface libraries','LayoutDashboard'),
 ('Misc','misc','Everything else','Shapes');
INSERT INTO public.badges (name, description, icon, color) VALUES
 ('Verified','Verified community member','BadgeCheck','#38bdf8'),
 ('OG','Here since day one','Crown','#f59e0b'),
 ('VIP','VIP member','Gem','#a855f7'),
 ('Supporter','Supports the project','Heart','#ef4444'),
 ('Developer','Builds scripts and tools','Code2','#22c55e'),
 ('Moderator','Keeps the place clean','Shield','#6366f1'),
 ('Admin','Site administrator','ShieldCheck','#f43f5e');
