ALTER TABLE public.scripts ADD COLUMN raw_loader_url text;
COMMENT ON COLUMN public.scripts.raw_loader_url IS 'Admin-supplied public HTTPS raw Lua URL used to generate the script loader command.';