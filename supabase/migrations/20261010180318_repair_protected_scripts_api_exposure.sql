-- Repair the protected-scripts table exposure for PostgREST.
-- The table remains private to server-side service-role API routes.
create table if not exists public.protected_scripts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null,
  token_hash text not null unique,
  enabled boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz
);

create index if not exists protected_scripts_enabled_idx
  on public.protected_scripts (enabled);

alter table public.protected_scripts enable row level security;
revoke all on table public.protected_scripts from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.protected_scripts to service_role;

-- Ensure PostgREST immediately reloads its schema metadata.
notify pgrst, 'reload schema';
