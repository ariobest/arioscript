-- Repair self-service key requests and add server-side license validation.
-- This migration is safe to re-run and does not delete existing keys or user data.

create or replace function public.start_key_request()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_settings public.key_settings%rowtype;
  v_started timestamptz;
begin
  if v_user is null then
    raise exception 'Sign in to request a key' using errcode = '28000';
  end if;

  select * into v_settings from public.key_settings order by created_at asc limit 1;
  if not found or not v_settings.enabled then
    raise exception 'The key system is currently disabled';
  end if;

  select started_at into v_started
  from public.key_requests
  where user_id = v_user
  for update;

  if found and v_started > now() - make_interval(hours => greatest(coalesce(v_settings.cooldown_hours, 24), 0)) then
    raise exception 'Key request cooldown is active. Try again after the cooldown ends.';
  end if;

  insert into public.key_requests(user_id, started_at)
  values (v_user, now())
  on conflict (user_id) do update set started_at = excluded.started_at;

  return greatest(coalesce(v_settings.wait_seconds, 20), 0);
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
    (key, user_id, status, tier, expires_at, key_type, max_uses, uses, active, notes)
  values
    (v_key, v_user, 'active', 'free',
     now() + make_interval(hours => greatest(coalesce(v_settings.free_hours, 24), 1)),
     'free', null, 0, true, 'Self-service free key')
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'key', v_row.key,
    'key_type', v_row.key_type,
    'expires_at', v_row.expires_at,
    'active', v_row.active,
    'uses', v_row.uses,
    'max_uses', v_row.max_uses
  );
end;
$$;

create or replace function public.validate_key(_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text := upper(trim(coalesce(_key, '')));
  v_row public.license_keys%rowtype;
  v_enabled boolean;
  v_ok boolean := false;
begin
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

  if not found then
    insert into public.key_checks(ok) values (false);
    return jsonb_build_object('valid', false);
  end if;

  v_ok := v_row.active
    and (v_row.expires_at is null or v_row.expires_at > now())
    and (v_row.max_uses is null or v_row.uses < v_row.max_uses);

  if v_ok then
    update public.license_keys
      set uses = uses + 1,
          last_used_at = now(),
          updated_at = now()
      where id = v_row.id
      returning * into v_row;
  end if;

  insert into public.key_checks(ok) values (v_ok);

  if not v_ok then
    return jsonb_build_object('valid', false);
  end if;

  return jsonb_build_object(
    'valid', true,
    'key_type', v_row.key_type,
    'expires_at', v_row.expires_at,
    'uses', v_row.uses,
    'max_uses', v_row.max_uses
  );
end;
$$;

revoke all on function public.start_key_request() from public, anon;
revoke all on function public.claim_free_key() from public, anon;
grant execute on function public.start_key_request() to authenticated;
grant execute on function public.claim_free_key() to authenticated;

revoke all on function public.validate_key(text) from public;
grant execute on function public.validate_key(text) to anon, authenticated;

notify pgrst, 'reload schema';
