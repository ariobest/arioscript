-- Restore public raw source delivery. The raw endpoint is intentionally public again.
GRANT EXECUTE ON FUNCTION public.get_raw_script(text) TO anon, authenticated;
DROP FUNCTION IF EXISTS public.get_protected_raw_script(text, text);
