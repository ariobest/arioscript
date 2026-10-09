-- ARIO raw Lua script protection.
-- Keep these columns and RPC in sync with src/routes/raw.$slug.ts.
alter table public.raw_scripts
  add column if not exists is_protected boolean not null default false,
  add column if not exists protected_message text not null default 'ADMIN REQUIRED GO PLAY WITH THE SCRIPT DUM';

create or replace function public.get_raw_script(_slug text, _user_agent text default '')
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(rs.is_protected, false)
      and coalesce(_user_agent, '') ~* '(Mozilla/|Chrome/|Safari/|Firefox/|Edg/)'
      then coalesce(rs.protected_message, 'ADMIN REQUIRED GO PLAY WITH THE SCRIPT DUM')
    else rs.code
  end
  from public.raw_scripts rs
  where lower(rs.slug) = lower(_slug)
    and rs.enabled = true
  limit 1;
$$;

revoke all on function public.get_raw_script(text, text) from public;
grant execute on function public.get_raw_script(text, text) to anon, authenticated;

notify pgrst, 'reload schema';


-- Admin-only RPCs let the admin UI manage protection without sending protection
-- columns through PostgREST table inserts/updates.
create or replace function public.admin_list_raw_script_protection()
returns table (
  id uuid, name text, slug text, enabled boolean,
  is_protected boolean, protected_message text, updated_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query
  select rs.id, rs.name, rs.slug, rs.enabled, coalesce(rs.is_protected, false),
         coalesce(rs.protected_message, 'GO PLAY DUM'), rs.updated_at
  from public.raw_scripts rs order by rs.updated_at desc;
end;
$$;

create or replace function public.admin_set_raw_script_protection(
  _slug text, _is_protected boolean, _protected_message text default 'GO PLAY DUM'
)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  update public.raw_scripts
  set is_protected = coalesce(_is_protected, false),
      protected_message = coalesce(nullif(trim(_protected_message), ''), 'GO PLAY DUM'),
      updated_at = now()
  where lower(raw_scripts.slug) = lower(_slug);
  return found;
end;
$$;

revoke all on function public.admin_list_raw_script_protection() from public;
revoke all on function public.admin_set_raw_script_protection(text, boolean, text) from public;
grant execute on function public.admin_list_raw_script_protection() to authenticated;
grant execute on function public.admin_set_raw_script_protection(text, boolean, text) to authenticated;
notify pgrst, 'reload schema';
