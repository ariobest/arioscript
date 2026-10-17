-- Bind each license key to the first device that verifies it.
-- Expiring keys begin their duration at first successful verification.

alter table public.license_keys
  add column if not exists activated_at timestamptz,
  add column if not exists duration_hours integer;

-- Preserve expiry for already-used/bound keys and already-expired keys.
-- Unused, unexpired keys get an activation timer on first verification.
update public.license_keys
set duration_hours = case
      when expires_at is null then null
      else greatest(1, ceil(extract(epoch from (expires_at - created_at)) / 3600.0)::integer)
    end,
    activated_at = case
      when hardware_id is not null or last_used_at is not null then coalesce(last_used_at, created_at)
      when expires_at is not null and expires_at <= now() then created_at
      else null
    end,
    expires_at = case
      when hardware_id is not null or last_used_at is not null then expires_at
      when expires_at is not null and expires_at > now() then null
      else expires_at
    end
where duration_hours is null and activated_at is null;

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
set search_path to public, pg_temp
as $$
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
      upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8)) || '-' ||
      upper(substr(md5(gen_random_uuid()::text || random()::text), 1, 8)) || '-' ||
      upper(substr(md5(gen_random_uuid()::text || random()::text), 1, 8));

    insert into public.license_keys
      (key, user_id, status, tier, expires_at, activated_at, duration_hours,
       key_type, max_uses, uses, active, notes, created_by, hardware_id)
    values
      (v_key, _user, 'active', _type, null, null,
       case when _type = 'lifetime' then null else _hours end,
       _type, _max_uses, 0, true, nullif(trim(coalesce(_notes, '')), ''),
       auth.uid(), null)
    returning * into v_row;

    return next v_row;
  end loop;
  return;
end;
$$;

create or replace function public.claim_free_key()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_settings public.key_settings%rowtype;
  v_started timestamptz;
  v_active_count integer;
  v_key text;
  v_row public.license_keys%rowtype;
begin
  if v_user is null then
    raise exception 'Sign in to claim a key' using errcode = '28000';
  end if;

  select * into v_settings from public.key_settings order by created_at asc limit 1;
  if not found or not v_settings.enabled then
    raise exception 'The key system is currently disabled';
  end if;

  select started_at into v_started
  from public.key_requests
  where user_id = v_user
  for update;

  if not found then
    raise exception 'Start a key request first';
  end if;

  if now() < v_started + make_interval(secs => greatest(coalesce(v_settings.wait_seconds, 20), 0)) then
    raise exception 'Please wait before claiming your key';
  end if;

  select count(*) into v_active_count
  from public.license_keys
  where user_id = v_user
    and active
    and (expires_at is null or expires_at > now())
    and (max_uses is null or uses < max_uses);

  if v_active_count >= greatest(coalesce(v_settings.max_active_keys, 1), 1) then
    raise exception 'You already have the maximum number of active keys';
  end if;

  v_key := 'ARIO-' ||
    upper(substr(md5(gen_random_uuid()::text), 1, 8)) || '-' ||
    upper(substr(md5(gen_random_uuid()::text), 1, 8)) || '-' ||
    upper(substr(md5(gen_random_uuid()::text), 1, 8));

  insert into public.license_keys
    (key, user_id, status, tier, expires_at, activated_at, duration_hours,
     key_type, max_uses, uses, active, notes, hardware_id)
  values
    (v_key, v_user, 'active', 'free', null, null,
     greatest(coalesce(v_settings.free_hours, 24), 1),
     'free', null, 0, true, 'Self-service free key', null)
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'key', v_row.key,
    'key_type', v_row.key_type,
    'expires_at', v_row.expires_at,
    'activated_at', v_row.activated_at,
    'duration_hours', v_row.duration_hours,
    'active', v_row.active,
    'uses', v_row.uses,
    'max_uses', v_row.max_uses
  );
end;
$$;

drop function if exists public.validate_key(text);

create function public.validate_key(_key text, _hardware_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text := upper(trim(coalesce(_key, '')));
  v_hwid text := trim(coalesce(_hardware_id, ''));
  v_row public.license_keys%rowtype;
  v_enabled boolean;
  v_now timestamptz := now();
begin
  if length(v_hwid) < 16 or length(v_hwid) > 200 or v_hwid !~ '^[A-Za-z0-9._:-]+$' then
    insert into public.key_checks(ok) values (false);
    return jsonb_build_object('valid', false, 'reason', 'device_id_required');
  end if;

  select coalesce((select ks.enabled from public.key_settings ks order by ks.created_at asc limit 1), false)
    into v_enabled;

  if not v_enabled or v_key !~ '^ARIO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then
    insert into public.key_checks(ok) values (false);
    return jsonb_build_object('valid', false);
  end if;

  select * into v_row
  from public.license_keys
  where key = v_key
  for update;

  if not found or not v_row.active or (v_row.max_uses is not null and v_row.uses >= v_row.max_uses) then
    insert into public.key_checks(ok) values (false);
    return jsonb_build_object('valid', false);
  end if;

  if v_row.hardware_id is null and v_row.activated_at is null then
    update public.license_keys
    set hardware_id = v_hwid,
        activated_at = v_now,
        expires_at = case when duration_hours is null then null
                          else v_now + make_interval(hours => duration_hours) end,
        last_used_at = v_now,
        updated_at = v_now,
        uses = uses + 1
    where id = v_row.id
    returning * into v_row;
  else
    if v_row.hardware_id is distinct from v_hwid then
      insert into public.key_checks(ok) values (false);
      return jsonb_build_object('valid', false, 'reason', 'device_mismatch');
    end if;

    if v_row.expires_at is not null and v_row.expires_at <= v_now then
      insert into public.key_checks(ok) values (false);
      return jsonb_build_object('valid', false, 'reason', 'expired');
    end if;

    update public.license_keys
    set last_used_at = v_now,
        updated_at = v_now,
        uses = uses + 1
    where id = v_row.id
    returning * into v_row;
  end if;

  insert into public.key_checks(ok) values (true);
  return jsonb_build_object(
    'valid', true,
    'key_type', v_row.key_type,
    'activated_at', v_row.activated_at,
    'expires_at', v_row.expires_at,
    'device_bound', true,
    'uses', v_row.uses,
    'max_uses', v_row.max_uses
  );
end;
$$;

revoke all on function public.validate_key(text, text) from public;
grant execute on function public.validate_key(text, text) to anon, authenticated;
revoke all on function public.claim_free_key() from public, anon;
grant execute on function public.claim_free_key() to authenticated;
revoke all on function public.admin_generate_keys(text, integer, integer, integer, text, uuid) from public, anon;
grant execute on function public.admin_generate_keys(text, integer, integer, integer, text, uuid) to authenticated;

notify pgrst, 'reload schema';
