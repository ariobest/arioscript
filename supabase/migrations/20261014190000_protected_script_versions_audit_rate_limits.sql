-- ARIO protected delivery: version history, audit trail, and per-script rate limits.
-- Additive only: preserves all existing protected_scripts rows and source.

alter table public.protected_scripts
  add column if not exists version integer not null default 1,
  add column if not exists rate_limit_per_minute integer not null default 60,
  add column if not exists disabled_reason text;

alter table public.protected_scripts
  drop constraint if exists protected_scripts_rate_limit_per_minute_check;
alter table public.protected_scripts
  add constraint protected_scripts_rate_limit_per_minute_check
  check (rate_limit_per_minute between 1 and 600);

create table if not exists public.protected_script_versions (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.protected_scripts(id) on delete cascade,
  version integer not null,
  name text not null,
  source text not null,
  change_note text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid,
  unique (script_id, version)
);

create table if not exists public.protected_script_events (
  id bigint generated always as identity primary key,
  script_id uuid references public.protected_scripts(id) on delete set null,
  event_type text not null,
  status_code integer not null,
  client_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists protected_script_versions_history_idx
  on public.protected_script_versions (script_id, version desc);
create index if not exists protected_script_events_script_time_idx
  on public.protected_script_events (script_id, created_at desc);
create index if not exists protected_script_events_client_time_idx
  on public.protected_script_events (client_hash, created_at desc);

-- Seed a version 1 snapshot for existing scripts without deleting or rewriting them.
insert into public.protected_script_versions (script_id, version, name, source, change_note, created_at)
select s.id, greatest(s.version, 1), s.name, s.source, 'Initial snapshot created during ARIO protection upgrade', s.created_at
from public.protected_scripts s
where not exists (
  select 1 from public.protected_script_versions v
  where v.script_id = s.id and v.version = greatest(s.version, 1)
)
on conflict (script_id, version) do nothing;

alter table public.protected_script_versions enable row level security;
alter table public.protected_script_events enable row level security;
revoke all on table public.protected_script_versions from anon, authenticated;
revoke all on table public.protected_script_events from anon, authenticated;
grant select, insert, update, delete on table public.protected_script_versions to service_role;
grant select, insert, update, delete on table public.protected_script_events to service_role;
grant usage, select on sequence public.protected_script_events_id_seq to service_role;

comment on table public.protected_script_versions is
  'Private immutable snapshots used by the ARIO protected-script version history and rollback API.';
comment on table public.protected_script_events is
  'Private audit events for protected script delivery and management. client_hash is a SHA-256 hash, not a raw IP address.';
