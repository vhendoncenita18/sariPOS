-- sync_sale validates membership and transaction integrity, but the supplied
-- hosted definition does not check the caller's sales.create permission.
-- Enforce that permission at the final trusted write boundary as well.
create or replace function private.enforce_sale_create_permission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_store_permission(new.store_id, 'sales.create') then
    raise exception 'sale_create_permission_required';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_sale_create_permission() from public, anon, authenticated;

drop trigger if exists sales_enforce_create_permission on public.sales;
create trigger sales_enforce_create_permission
before insert on public.sales
for each row execute function private.enforce_sale_create_permission();

create or replace function private.enforce_sale_item_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_name text;
  v_selling_price numeric;
begin
  select p.name, p.selling_price into v_product_name, v_selling_price
  from public.products p
  where p.id = new.product_id and p.store_id = new.store_id and p.is_active;

  if not found or new.product_name_snapshot is distinct from v_product_name
    or new.unit_price is distinct from v_selling_price then
    raise exception 'sale_item_product_snapshot_mismatch';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_sale_item_snapshot() from public, anon, authenticated;

drop trigger if exists sale_items_enforce_product_snapshot on public.sale_items;
create trigger sale_items_enforce_product_snapshot
before insert on public.sale_items
for each row execute function private.enforce_sale_item_snapshot();
