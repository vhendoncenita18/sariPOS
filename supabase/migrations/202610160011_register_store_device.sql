-- Register the store's first operational selling device through an owner-only RPC.
-- The device ID associates shifts and sales; it does not prove browser possession.
revoke all on table public.store_devices from public, anon, authenticated;
grant select on table public.store_devices to authenticated;

create or replace function public.register_store_device(p_device_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_device_id uuid;
begin
  if not private.has_permitted_online_authentication() then
    raise exception 'permitted_authentication_required';
  end if;

  select m.store_id into v_store_id
  from public.user_store_members m
  where m.user_id = auth.uid() and m.role = 'owner'
  order by m.store_id
  limit 1;

  if v_store_id is null then
    raise exception 'owner_required';
  end if;

  if p_device_name is null or pg_catalog.length(pg_catalog.btrim(p_device_name)) = 0 then
    raise exception 'invalid_device_name';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_store_id::text, 0)
  );

  if exists (
    select 1 from public.store_devices d
    where d.store_id = v_store_id and d.is_active and d.revoked_at is null
  ) then
    raise exception 'active_device_already_registered';
  end if;

  begin
    insert into public.store_devices (store_id, device_name, is_active, revoked_at)
    values (v_store_id, pg_catalog.btrim(p_device_name), true, null)
    returning id into v_device_id;
  exception when unique_violation then
    raise exception 'active_device_already_registered';
  end;

  insert into public.store_audit_logs (store_id, actor_user_id, event_type, details)
  values (
    v_store_id,
    auth.uid(),
    'device.registered',
    pg_catalog.jsonb_build_object(
      'device_id', v_device_id,
      'device_name', pg_catalog.btrim(p_device_name)
    )
  );

  return v_device_id;
end;
$$;

revoke all on function public.register_store_device(text) from public, anon, authenticated;
grant execute on function public.register_store_device(text) to authenticated;
