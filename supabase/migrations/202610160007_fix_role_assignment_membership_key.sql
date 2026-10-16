-- Keep the legacy membership role value within its existing CHECK constraint.
-- role_id carries the selected built-in or custom role and its permissions.
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
  if exists (
    select 1 from public.user_store_members m
    where m.user_id = v_user_id and m.store_id = v_store_id and m.role = 'owner'
  ) then raise exception 'cannot_change_owner_role'; end if;

  insert into public.user_store_members (user_id, store_id, role, role_id)
  values (v_user_id, v_store_id, 'cashier', p_role_id)
  on conflict (user_id, store_id)
  do update set role = excluded.role, role_id = excluded.role_id;
end;
$$;

revoke all on function public.assign_store_role(text, uuid) from public, anon;
grant execute on function public.assign_store_role(text, uuid) to authenticated;
