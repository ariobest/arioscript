-- Remove legacy browser-view protection fields and RPC while preserving all raw script records.
DROP FUNCTION IF EXISTS public.get_raw_script_browser(text);
ALTER TABLE public.raw_scripts DROP COLUMN IF EXISTS is_protected;
ALTER TABLE public.raw_scripts DROP COLUMN IF EXISTS protected_message;
