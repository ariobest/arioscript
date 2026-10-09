CREATE TABLE public.raw_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  code text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raw_scripts TO authenticated;
GRANT ALL ON public.raw_scripts TO service_role;
ALTER TABLE public.raw_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raw_scripts admin all" ON public.raw_scripts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_raw_scripts_touch BEFORE UPDATE ON public.raw_scripts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE OR REPLACE FUNCTION public.get_raw_script(_slug text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $
  SELECT code FROM public.raw_scripts WHERE slug = lower(_slug) AND enabled LIMIT 1;
$;
REVOKE ALL ON FUNCTION public.get_raw_script(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_raw_script(text) TO anon, authenticated;