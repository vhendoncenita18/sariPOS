create or replace function public.record_restock(
  p_product_id uuid,
  p_quantity numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_product_id uuid;
  v_movement_id uuid;
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

  if p_quantity is null or p_quantity <= 0 or p_quantity::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'invalid_restock_quantity';
  end if;

  select p.id into v_product_id
  from public.products p
  where p.id = p_product_id and p.store_id = v_store_id
  for update;

  if not found then
    raise exception 'product_not_found';
  end if;

  insert into public.inventory_movements (store_id, product_id, quantity_change, reason)
  values (v_store_id, v_product_id, p_quantity, 'restock')
  returning id into v_movement_id;

  insert into public.store_audit_logs (store_id, actor_user_id, event_type, details)
  values (
    v_store_id,
    auth.uid(),
    'inventory.restock_recorded',
    pg_catalog.jsonb_build_object(
      'product_id', v_product_id,
      'inventory_movement_id', v_movement_id,
      'quantity', p_quantity,
      'reason', 'restock'
    )
  );

  return v_movement_id;
end;
$$;

revoke all on function public.record_restock(uuid, numeric) from public, anon;
grant execute on function public.record_restock(uuid, numeric) to authenticated;
