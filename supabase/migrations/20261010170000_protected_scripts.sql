-- ARIO protected script storage.
-- Keep this table private: no anon/authenticated table access is granted.
-- Only a server endpoint using the server-side service role should read source.

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
grant all on table public.protected_scripts to service_role;

comment on table public.protected_scripts is
  'Private ARIO script source. Never expose source or token hashes to public clients.';
