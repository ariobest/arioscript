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
