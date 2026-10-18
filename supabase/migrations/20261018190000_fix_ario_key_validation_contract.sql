-- Repair validation to accept the requested ARIO-XX-XXXX-XX format
-- while retaining legacy keys already issued. Row locking keeps first activation atomic.
create or replace function public.validate_key(_key text, _hardware_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_key text := upper(trim(coalesce(_key, '')));
  v_hwid text := trim(coalesce(_hardware_id, ''));
  v_row public.license_keys%rowtype;
  v_enabled boolean;
  v_now timestamptz := now();
begin
  if length(v_hwid) < 16 or length(v_hwid) > 200 or v_hwid !~ '^[A-Za-z0-9._:-]+$' then
    insert into public.key_checks(ok) values (false);
    return jsonb_build_object('valid', false, 'code', 'INVALID_REQUEST', 'message', 'The key could not be verified');
  end if;

  select coalesce((select ks.enabled from public.key_settings ks order by ks.created_at asc limit 1), false)
    into v_enabled;
  if not v_enabled then
    insert into public.key_checks(ok) values (false);
    return jsonb_build_object('valid', false, 'code', 'KEY_DISABLED', 'message', 'The key could not be verified');
  end if;

  if v_key !~ '^ARIO-[A-Z0-9]{2}-[A-Z0-9]{4}-[A-Z0-9]{2}$'
     and v_key !~ '^ARIO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then
    insert into public.key_checks(ok) values (false);
    return jsonb_build_object('valid', false, 'code', 'KEY_INVALID', 'message', 'The key could not be verified');
  end if;

  select * into v_row from public.license_keys where key = v_key for update;
  if not found then
    insert into public.key_checks(ok) values (false);
    return jsonb_build_object('valid', false, 'code', 'KEY_INVALID', 'message', 'The key could not be verified');
  end if;

  if not v_row.active or lower(v_row.status) in ('revoked', 'disabled', 'inactive') then
    insert into public.key_checks(ok) values (false);
    return jsonb_build_object('valid', false, 'code', 'KEY_REVOKED', 'message', 'The key could not be verified');
  end if;
  if v_row.expires_at is not null and v_row.expires_at <= v_now then
    insert into public.key_checks(ok) values (false);
    return jsonb_build_object('valid', false, 'code', 'KEY_EXPIRED', 'message', 'The key could not be verified');
  end if;
  if v_row.max_uses is not null and v_row.uses >= v_row.max_uses then
    insert into public.key_checks(ok) values (false);
    return jsonb_build_object('valid', false, 'code', 'KEY_LIMIT_REACHED', 'message', 'The key could not be verified');
  end if;

  if v_row.hardware_id is null and v_row.activated_at is null then
    update public.license_keys
      set hardware_id = v_hwid,
          activated_at = v_now,
          expires_at = case when duration_hours is null then null else v_now + make_interval(hours => duration_hours) end,
          last_used_at = v_now, updated_at = v_now, uses = uses + 1
      where id = v_row.id returning * into v_row;
  elsif v_row.hardware_id is distinct from v_hwid then
    insert into public.key_checks(ok) values (false);
    return jsonb_build_object('valid', false, 'code', 'DEVICE_MISMATCH', 'message', 'The key could not be verified');
  else
    update public.license_keys
      set last_used_at = v_now, updated_at = v_now, uses = uses + 1
      where id = v_row.id returning * into v_row;
  end if;

  insert into public.key_checks(ok) values (true);
  return jsonb_build_object('valid', true, 'code', 'KEY_VALID', 'message', 'Key verified',
    'key_type', v_row.key_type, 'activated_at', v_row.activated_at,
    'expires_at', v_row.expires_at, 'device_bound', true, 'uses', v_row.uses, 'max_uses', v_row.max_uses);
end;
$function$;

revoke all on function public.validate_key(text, text) from public, anon;
grant execute on function public.validate_key(text, text) to service_role;
notify pgrst, 'reload schema';
