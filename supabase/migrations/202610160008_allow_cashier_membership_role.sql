-- Store roles are detailed by role_id; role remains the owner/cashier access class.
alter table public.user_store_members
  drop constraint if exists user_store_members_role_check;

alter table public.user_store_members
  add constraint user_store_members_role_check
  check (role = any (array['owner', 'cashier']));
