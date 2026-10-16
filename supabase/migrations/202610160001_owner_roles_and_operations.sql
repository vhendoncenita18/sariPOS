create table if not exists public.store_roles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  constraint store_roles_name_not_blank check (length(trim(name)) between 1 and 40)
);

create unique index if not exists store_roles_store_name_unique
  on public.store_roles (store_id, lower(name));

create table if not exists public.role_permissions (
  role_id uuid not null references public.store_roles(id) on delete cascade,
  permission text not null,
  primary key (role_id, permission)
);

alter table public.user_store_members
  add column if not exists role_id uuid references public.store_roles(id) on delete set null;

alter table public.store_roles enable row level security;
alter table public.role_permissions enable row level security;
revoke all on public.store_roles, public.role_permissions from anon, authenticated;

create or replace function private.has_permitted_online_authentication()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
    or exists (
      select 1
      from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as method_entry(entry)
      where entry ->> 'method' = 'otp' or entry = '"otp"'::jsonb
    );
$$;

revoke all on function private.has_permitted_online_authentication() from public, anon;
grant execute on function private.has_permitted_online_authentication() to authenticated;

create or replace function private.has_store_permission(p_store_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_store_members m
    left join public.role_permissions rp on rp.role_id = m.role_id
    where m.user_id = auth.uid()
      and m.store_id = p_store_id
      and private.has_permitted_online_authentication()
      and (m.role = 'owner' or rp.permission = p_permission)
  );
$$;

revoke all on function private.has_store_permission(uuid, text) from public, anon;
grant execute on function private.has_store_permission(uuid, text) to authenticated;

create or replace function private.provision_cashier_role(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id uuid;
begin
  insert into public.store_roles (store_id, name, is_system)
  values (p_store_id, 'Cashier', true)
  on conflict do nothing;
  select id into v_role_id from public.store_roles
  where store_id = p_store_id and lower(name) = 'cashier';

  insert into public.role_permissions (role_id, permission)
  values
    (v_role_id, 'products.view'),
    (v_role_id, 'inventory.view'),
    (v_role_id, 'shift.open'),
    (v_role_id, 'own_session.view'),
    (v_role_id, 'sales.create')
  on conflict do nothing;
end;
$$;

revoke all on function private.provision_cashier_role(uuid) from public, anon, authenticated;

create or replace function private.provision_cashier_role_after_store_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.provision_cashier_role(new.id);
  return new;
end;
$$;

drop trigger if exists provision_cashier_role_after_store_insert on public.stores;
create trigger provision_cashier_role_after_store_insert
after insert on public.stores
for each row execute function private.provision_cashier_role_after_store_insert();

do $$
declare
  v_store_id uuid;
begin
  for v_store_id in select id from public.stores loop
    perform private.provision_cashier_role(v_store_id);
  end loop;
end;
$$;

update public.user_store_members m
set role_id = r.id
from public.store_roles r
where m.role = 'cashier' and m.role_id is null
  and r.store_id = m.store_id and lower(r.name) = 'cashier';

create or replace function public.can_open_store_shift()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_store_members m
    where m.user_id = auth.uid()
      and private.has_store_permission(m.store_id, 'shift.open')
  );
$$;

create or replace function public.get_current_store_permissions()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct rp.permission order by rp.permission), array[]::text[])
  from public.user_store_members m
  left join public.role_permissions rp on rp.role_id = m.role_id
  where m.user_id = auth.uid()
    and private.has_permitted_online_authentication();
$$;

create or replace function public.get_store_inventory()
returns table (product_id uuid, stock_quantity numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, coalesce(sum(im.quantity_change), 0)::numeric
  from public.user_store_members m
  join public.products p on p.store_id = m.store_id
  left join public.inventory_movements im on im.store_id = p.store_id and im.product_id = p.id
  where m.user_id = auth.uid()
    and private.has_permitted_online_authentication()
    and private.has_store_permission(m.store_id, 'inventory.view')
  group by p.id;
$$;
create or replace function public.list_store_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_result jsonb;
begin
  if not private.has_permitted_online_authentication() then raise exception 'permitted_authentication_required'; end if;
  select m.store_id into v_store_id
  from public.user_store_members m
  where m.user_id = auth.uid() and m.role = 'owner'
  order by m.store_id limit 1;
  if v_store_id is null then raise exception 'owner_required'; end if;

  select jsonb_build_object(
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'name', r.name, 'is_system', r.is_system,
        'permissions', coalesce((select jsonb_agg(rp.permission order by rp.permission)
          from public.role_permissions rp where rp.role_id = r.id), '[]'::jsonb)
      ) order by r.is_system desc, r.name)
      from public.store_roles r where r.store_id = v_store_id
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'role', m.role, 'role_id', m.role_id
      ) order by m.created_at)
      from public.user_store_members m where m.store_id = v_store_id
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.create_store_role(p_name text, p_permissions text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_role_id uuid;
  v_permission text;
  v_allowed constant text[] := array['products.view','inventory.view','shift.open','own_session.view','sales.create'];
begin
  if not private.has_permitted_online_authentication() then raise exception 'permitted_authentication_required'; end if;
  select m.store_id into v_store_id from public.user_store_members m
  where m.user_id = auth.uid() and m.role = 'owner' order by m.store_id limit 1;
  if v_store_id is null then raise exception 'owner_required'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 40 then raise exception 'invalid_role_name'; end if;
  if lower(trim(p_name)) = 'owner' then raise exception 'reserved_role_name'; end if;
  if p_permissions is null or cardinality(p_permissions) = 0 then raise exception 'select_permission'; end if;
  foreach v_permission in array p_permissions loop
    if not (v_permission = any(v_allowed)) then raise exception 'invalid_permission'; end if;
  end loop;

  insert into public.store_roles (store_id, name)
  values (v_store_id, trim(p_name)) returning id into v_role_id;
  insert into public.role_permissions (role_id, permission)
  select v_role_id, distinct_permission
  from (select distinct unnest(p_permissions) as distinct_permission) p;
  return v_role_id;
exception when unique_violation then
  raise exception 'role_name_exists';
end;
$$;

create or replace function public.assign_store_role(p_email text, p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_user_id uuid;
  v_role_name text;
begin
  if not private.has_permitted_online_authentication() then raise exception 'permitted_authentication_required'; end if;
  select m.store_id into v_store_id from public.user_store_members m
  where m.user_id = auth.uid() and m.role = 'owner' order by m.store_id limit 1;
  if v_store_id is null then raise exception 'owner_required'; end if;
  select r.name into v_role_name from public.store_roles r
  where r.id = p_role_id and r.store_id = v_store_id;
  if v_role_name is null or lower(v_role_name) = 'owner' then raise exception 'invalid_role'; end if;
  select u.id into v_user_id from auth.users u
  where lower(u.email) = lower(trim(p_email)) and u.email_confirmed_at is not null
  limit 1;
  if v_user_id is null then raise exception 'verified_user_not_found'; end if;
  if v_user_id = auth.uid() then raise exception 'cannot_change_owner_role'; end if;
  if exists (select 1 from public.user_store_members m where m.user_id=v_user_id and m.store_id=v_store_id and m.role='owner') then
    raise exception 'cannot_change_owner_role';
  end if;

  insert into public.user_store_members (user_id, store_id, role, role_id)
  values (v_user_id, v_store_id, v_role_name, p_role_id)
  on conflict (user_id, store_id) do update set role=excluded.role, role_id=excluded.role_id;
end;
$$;

create or replace function public.create_product_for_current_store(
  p_name text, p_selling_price numeric, p_sku text default null,
  p_barcode text default null, p_cost_price numeric default null
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
  if not private.has_permitted_online_authentication() then raise exception 'permitted_authentication_required'; end if;
  select m.store_id into v_store_id from public.user_store_members m
  where m.user_id=auth.uid() and m.role='owner' order by m.store_id limit 1;
  if v_store_id is null then raise exception 'owner_required'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 120 then raise exception 'invalid_product_name'; end if;
  if p_selling_price is null or p_selling_price <= 0 then raise exception 'invalid_selling_price'; end if;
  if p_cost_price is not null and p_cost_price < 0 then raise exception 'invalid_cost_price'; end if;

  insert into public.products (store_id, name, selling_price, sku, barcode, cost_price, is_active)
  values (v_store_id, trim(p_name), p_selling_price, nullif(trim(p_sku), ''), nullif(trim(p_barcode), ''), p_cost_price, true)
  returning id into v_product_id;
  return v_product_id;
end;
$$;

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
  if not private.has_permitted_online_authentication() then raise exception 'permitted_authentication_required'; end if;
  select m.store_id into v_store_id from public.user_store_members m
  where m.user_id=auth.uid() order by m.store_id limit 1;
  if v_store_id is null or not private.has_store_permission(v_store_id, 'shift.open') then raise exception 'shift_permission_required'; end if;
  if p_opening_float is null or p_opening_float < 0 then raise exception 'invalid_opening_float'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_store_id::text, 0));
  if not exists (select 1 from public.store_devices d where d.id=p_device_id and d.store_id=v_store_id and d.is_active and d.revoked_at is null) then
    raise exception 'active_device_required';
  end if;
  if exists (select 1 from public.shifts s where s.store_id=v_store_id and s.status='open') then raise exception 'shift_already_open'; end if;

  insert into public.shifts (store_id, device_id, opening_float, status)
  values (v_store_id, p_device_id, p_opening_float, 'open') returning id into v_shift_id;
  return v_shift_id;
end;
$$;

revoke all on function public.list_store_access() from public, anon;
revoke all on function public.can_open_store_shift() from public, anon;
revoke all on function public.get_current_store_permissions() from public, anon;
revoke all on function public.get_store_inventory() from public, anon;
revoke all on function public.create_store_role(text, text[]) from public, anon;
revoke all on function public.assign_store_role(text, uuid) from public, anon;
revoke all on function public.create_product_for_current_store(text, numeric, text, text, numeric) from public, anon;
revoke all on function public.open_store_shift(uuid, numeric) from public, anon;
grant execute on function public.list_store_access() to authenticated;
grant execute on function public.can_open_store_shift() to authenticated;
grant execute on function public.get_current_store_permissions() to authenticated;
grant execute on function public.get_store_inventory() to authenticated;
grant execute on function public.create_store_role(text, text[]) to authenticated;
grant execute on function public.assign_store_role(text, uuid) to authenticated;
grant execute on function public.create_product_for_current_store(text, numeric, text, text, numeric) to authenticated;
grant execute on function public.open_store_shift(uuid, numeric) to authenticated;
