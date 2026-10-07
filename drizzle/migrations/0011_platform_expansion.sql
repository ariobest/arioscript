-- ARIO SCRIPTS platform expansion
-- Additive migration: user dashboard, notifications, script versions, developer API keys and activity.
create table if not exists public.script_versions (id uuid primary key default gen_random_uuid(),script_id uuid not null references public.scripts(id) on delete cascade,version text not null,code text not null default '',raw_loader_url text,changelog text,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now());
create table if not exists public.notifications (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,type text not null default 'system',title text not null,message text,link_url text,read_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.developer_api_keys (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,name text not null,key_prefix text not null,key_hash text not null unique,scopes text[] not null default array['scripts:read'],revoked boolean not null default false,last_used_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.activity_events (id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,event_type text not null,entity_type text,entity_id text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create index if not exists script_versions_script_idx on public.script_versions(script_id,created_at desc);
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);
create index if not exists developer_api_keys_user_idx on public.developer_api_keys(user_id,created_at desc);
create index if not exists activity_events_user_idx on public.activity_events(user_id,created_at desc);
alter table public.script_versions enable row level security; alter table public.notifications enable row level security; alter table public.developer_api_keys enable row level security; alter table public.activity_events enable row level security;
drop policy if exists versions_public_read on public.script_versions; create policy versions_public_read on public.script_versions for select using(exists(select 1 from public.scripts s where s.id=script_id and s.published and not s.archived) or public.is_staff(auth.uid()));
drop policy if exists versions_staff_insert on public.script_versions; create policy versions_staff_insert on public.script_versions for insert to authenticated with check(public.is_staff(auth.uid()));
drop policy if exists notifications_own_read on public.notifications; create policy notifications_own_read on public.notifications for select to authenticated using(auth.uid()=user_id);
drop policy if exists notifications_own_update on public.notifications; create policy notifications_own_update on public.notifications for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists api_keys_own_read on public.developer_api_keys; create policy api_keys_own_read on public.developer_api_keys for select to authenticated using(auth.uid()=user_id);
drop policy if exists api_keys_own_insert on public.developer_api_keys; create policy api_keys_own_insert on public.developer_api_keys for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists api_keys_own_update on public.developer_api_keys; create policy api_keys_own_update on public.developer_api_keys for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists activity_own_read on public.activity_events; create policy activity_own_read on public.activity_events for select to authenticated using(auth.uid()=user_id);
drop policy if exists activity_own_insert on public.activity_events; create policy activity_own_insert on public.activity_events for insert to authenticated with check(auth.uid()=user_id);

-- Security hardening applied after initial rollout
revoke all on function public.grant_owner_admin() from anon, authenticated;
revoke all on function public.handle_new_user() from anon, authenticated;
revoke all on function public.snapshot_script_version() from anon, authenticated;
revoke all on function public.sync_favorite_count() from anon, authenticated;
alter function public.handle_new_user() set search_path = public;
alter function public.grant_owner_admin() set search_path = public;
drop policy if exists categories_public_read on public.categories; create policy categories_public_read on public.categories for select using(true);
drop policy if exists key_settings_public_read on public.key_settings; create policy key_settings_public_read on public.key_settings for select using(true);
drop policy if exists admin_logs_staff_read on public.admin_logs; create policy admin_logs_staff_read on public.admin_logs for select to authenticated using(public.is_staff(auth.uid()));
drop policy if exists admin_logs_staff_insert on public.admin_logs; create policy admin_logs_staff_insert on public.admin_logs for insert to authenticated with check(public.is_staff(auth.uid()) and admin_id=auth.uid());
drop policy if exists key_checks_staff_read on public.key_checks; create policy key_checks_staff_read on public.key_checks for select to authenticated using(public.is_staff(auth.uid()));
drop policy if exists key_requests_own_read on public.key_requests; create policy key_requests_own_read on public.key_requests for select to authenticated using(auth.uid()=user_id or public.is_staff(auth.uid()));

revoke all on function public.grant_owner_admin() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.snapshot_script_version() from public;
revoke all on function public.sync_favorite_count() from public;

-- Performance hardening for platform tables
create index if not exists activity_events_entity_idx on public.activity_events(entity_type,entity_id,created_at desc);
create index if not exists activity_events_user_fk_idx on public.activity_events(user_id);
create index if not exists admin_logs_admin_fk_idx on public.admin_logs(admin_id);
create index if not exists developer_api_keys_user_fk_idx on public.developer_api_keys(user_id);
create index if not exists favorites_script_fk_idx on public.favorites(script_id);
create index if not exists notifications_user_fk_idx on public.notifications(user_id);
create index if not exists reports_script_fk_idx on public.reports(script_id);
create index if not exists reports_user_fk_idx on public.reports(user_id);
create index if not exists script_events_script_fk_idx on public.script_events(script_id);
create index if not exists script_events_user_fk_idx on public.script_events(user_id);
create index if not exists script_versions_created_by_fk_idx on public.script_versions(created_by);
create index if not exists script_versions_script_fk_idx on public.script_versions(script_id);
create index if not exists user_badges_assigned_by_fk_idx on public.user_badges(assigned_by);
create index if not exists user_badges_badge_fk_idx on public.user_badges(badge_id);

-- RLS performance hardening
 drop policy if exists fav_read on public.favorites; create policy fav_read on public.favorites for select to authenticated using((select auth.uid())=user_id);
 drop policy if exists fav_insert on public.favorites; create policy fav_insert on public.favorites for insert to authenticated with check((select auth.uid())=user_id);
 drop policy if exists fav_delete on public.favorites; create policy fav_delete on public.favorites for delete to authenticated using((select auth.uid())=user_id);
 drop policy if exists notif_read on public.notifications; create policy notif_read on public.notifications for select to authenticated using((select auth.uid())=user_id);
 drop policy if exists notif_update on public.notifications; create policy notif_update on public.notifications for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
 drop policy if exists api_read on public.developer_api_keys; create policy api_read on public.developer_api_keys for select to authenticated using((select auth.uid())=user_id);
 drop policy if exists api_insert on public.developer_api_keys; create policy api_insert on public.developer_api_keys for insert to authenticated with check((select auth.uid())=user_id);
 drop policy if exists api_update on public.developer_api_keys; create policy api_update on public.developer_api_keys for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
 drop policy if exists activity_read on public.activity_events; create policy activity_read on public.activity_events for select to authenticated using((select auth.uid())=user_id);
 drop policy if exists activity_insert on public.activity_events; create policy activity_insert on public.activity_events for insert to authenticated with check((select auth.uid())=user_id);
 drop policy if exists reports_read on public.reports; create policy reports_read on public.reports for select to authenticated using((select auth.uid())=user_id or public.is_staff((select auth.uid())));
 drop policy if exists reports_insert on public.reports; create policy reports_insert on public.reports for insert to authenticated with check((select auth.uid())=user_id);
 drop policy if exists versions_staff_insert on public.script_versions; create policy versions_staff_insert on public.script_versions for insert to authenticated with check(public.is_staff((select auth.uid())));
 drop policy if exists events_staff on public.script_events; create policy events_staff on public.script_events for select to authenticated using(public.is_staff((select auth.uid())));
 drop policy if exists admin_logs_staff_read on public.admin_logs; create policy admin_logs_staff_read on public.admin_logs for select to authenticated using(public.is_staff((select auth.uid())));
 drop policy if exists admin_logs_staff_insert on public.admin_logs; create policy admin_logs_staff_insert on public.admin_logs for insert to authenticated with check(public.is_staff((select auth.uid())) and admin_id=(select auth.uid()));
