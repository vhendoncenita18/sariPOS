-- Record the authenticated user who opens a shift so own-session RLS can reveal it.
create or replace function public.open_store_shift(p_device_id uuid, p_opening_float numeric)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_shift_id uuid;
begin
  if not private.has_permitted_online_authentication() then
    raise exception 'permitted_authentication_required';
  end if;

  select m.store_id into v_store_id
  from public.user_store_members m
  where m.user_id = auth.uid()
  order by m.store_id
  limit 1;

  if v_store_id is null
    or not private.has_store_permission(v_store_id, 'shift.open') then
    raise exception 'shift_permission_required';
  end if;

  if p_opening_float is null or p_opening_float < 0 then
    raise exception 'invalid_opening_float';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_store_id::text, 0)
  );

  if not exists (
    select 1
    from public.store_devices d
    where d.id = p_device_id
      and d.store_id = v_store_id
      and d.is_active
      and d.revoked_at is null
  ) then
    raise exception 'active_device_required';
  end if;

  if exists (
    select 1
    from public.shifts s
    where s.store_id = v_store_id and s.status = 'open'
  ) then
    raise exception 'shift_already_open';
  end if;

  insert into public.shifts (
    store_id, device_id, opening_float, status, opened_by_user_id
  )
  values (
    v_store_id, p_device_id, p_opening_float, 'open', auth.uid()
  )
  returning id into v_shift_id;

  return v_shift_id;
end;
$$;

revoke all on function public.open_store_shift(uuid, numeric) from public, anon;
grant execute on function public.open_store_shift(uuid, numeric) to authenticated;
