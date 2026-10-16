create or replace function public.update_product_for_current_store(
  p_product_id uuid,
  p_name text,
  p_sku text,
  p_barcode text,
  p_selling_price numeric,
  p_cost_price numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_product_id uuid;
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

  if p_name is null or length(pg_catalog.btrim(p_name)) not between 1 and 120 then
    raise exception 'invalid_product_name';
  end if;
  if p_selling_price is null or p_selling_price <= 0 or p_selling_price::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'invalid_selling_price';
  end if;
  if p_cost_price is not null and (p_cost_price < 0 or p_cost_price::text in ('NaN', 'Infinity', '-Infinity')) then
    raise exception 'invalid_cost_price';
  end if;

  select p.id into v_product_id
  from public.products p
  where p.id = p_product_id and p.store_id = v_store_id
  for update;

  if not found then
    raise exception 'product_not_found';
  end if;

  update public.products p
  set name = pg_catalog.btrim(p_name),
      sku = nullif(pg_catalog.btrim(p_sku), ''),
      barcode = nullif(pg_catalog.btrim(p_barcode), ''),
      selling_price = p_selling_price,
      cost_price = p_cost_price
  where p.id = v_product_id and p.store_id = v_store_id;

  insert into public.store_audit_logs (store_id, actor_user_id, event_type, details)
  values (
    v_store_id,
    auth.uid(),
    'product.updated',
    pg_catalog.jsonb_build_object('product_id', v_product_id)
  );

  return v_product_id;
exception when unique_violation then
  raise exception 'product_identifier_conflict';
end;
$$;

create or replace function public.set_product_active_for_current_store(
  p_product_id uuid,
  p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_product_id uuid;
  v_previous_active boolean;
  v_event_type text;
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
  if p_is_active is null then
    raise exception 'invalid_product_status';
  end if;

  select p.id, p.is_active into v_product_id, v_previous_active
  from public.products p
  where p.id = p_product_id and p.store_id = v_store_id
  for update;

  if not found then
    raise exception 'product_not_found';
  end if;

  if v_previous_active is distinct from p_is_active then
    update public.products p
    set is_active = p_is_active
    where p.id = v_product_id and p.store_id = v_store_id;

    v_event_type := case when p_is_active then 'product.reactivated' else 'product.deactivated' end;
    insert into public.store_audit_logs (store_id, actor_user_id, event_type, details)
    values (
      v_store_id,
      auth.uid(),
      v_event_type,
      pg_catalog.jsonb_build_object('product_id', v_product_id)
    );
  end if;

  return v_product_id;
end;
$$;

revoke all on function public.update_product_for_current_store(uuid, text, text, text, numeric, numeric) from public, anon;
revoke all on function public.set_product_active_for_current_store(uuid, boolean) from public, anon;
grant execute on function public.update_product_for_current_store(uuid, text, text, text, numeric, numeric) to authenticated;
grant execute on function public.set_product_active_for_current_store(uuid, boolean) to authenticated;
