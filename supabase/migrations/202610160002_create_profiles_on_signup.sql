create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.create_profile_for_auth_user() from public, anon, authenticated;

drop trigger if exists create_profile_after_auth_user_insert on auth.users;
create trigger create_profile_after_auth_user_insert
after insert on auth.users
for each row execute function private.create_profile_for_auth_user();

insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;
