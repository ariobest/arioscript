-- Change newly generated ARIO license keys to ARIO-XX-XXXX-XX.
-- Existing keys remain valid and unchanged.

create or replace function public.admin_generate_keys(
  _type text,
  _count integer,
  _hours integer,
  _max_uses integer default null,
  _notes text default null,
  _user uuid default null
)
returns setof public.license_keys
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_key text;
  v_row public.license_keys;
  v_i integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'::public.app_role
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if _type not in ('free', 'premium', 'lifetime') then
    raise exception 'Invalid key type' using errcode = '22023';
  end if;
  if _count is null or _count < 1 or _count > 500 then
    raise exception 'Count must be between 1 and 500' using errcode = '22023';
  end if;
  if _type <> 'lifetime' and (_hours is null or _hours < 1) then
    raise exception 'Hours must be positive for expiring keys' using errcode = '22023';
  end if;
  if _max_uses is not null and _max_uses < 1 then
    raise exception 'Max uses must be positive or null' using errcode = '22023';
  end if;
  if _user is not null and not exists (select 1 from auth.users u where u.id = _user) then
    raise exception 'Target user does not exist' using errcode = '22023';
  end if;

  for v_i in 1.._count loop
    v_key := 'ARIO-' ||
      upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 2)) || '-' ||
      upper(substr(md5(gen_random_uuid()::text || random()::text), 1, 4)) || '-' ||
      upper(substr(md5(gen_random_uuid()::text || random()::text), 1, 2));

    insert into public.license_keys
      (key, user_id, status, tier, expires_at, key_type, max_uses, uses, active, notes, created_by)
    values
      (v_key, _user, 'active', _type,
       case when _type = 'lifetime' then null else now() + make_interval(hours => _hours) end,
       _type, _max_uses, 0, true, nullif(trim(coalesce(_notes, '')), ''), auth.uid())
    returning * into v_row;

    return next v_row;
  end loop;
  return;
end;
$function$;

revoke all on function public.admin_generate_keys(text, integer, integer, integer, text, uuid) from public, anon;
grant execute on function public.admin_generate_keys(text, integer, integer, integer, text, uuid) to authenticated;

notify pgrst, 'reload schema';
