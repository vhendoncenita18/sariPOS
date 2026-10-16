create or replace function private.is_store_owner(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permitted_online_authentication() and exists (
    select 1 from public.user_store_members m
    where m.user_id = auth.uid() and m.store_id = p_store_id and m.role = 'owner'
  );
$$;

create or replace function private.can_view_shift_session(p_store_id uuid, p_shift_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_store_owner(p_store_id) or (
    private.has_permitted_online_authentication()
    and (private.has_store_permission(p_store_id, 'own_session.view')
      or private.has_store_permission(p_store_id, 'shift.open'))
    and exists (
      select 1 from public.shifts s
      where s.store_id = p_store_id and s.id = p_shift_id
        and (s.opened_by_user_id = auth.uid() or s.closed_by_user_id = auth.uid())
    )
  );
$$;

create or replace function private.can_manage_shift_session(p_store_id uuid, p_shift_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_store_owner(p_store_id) or (
    private.has_permitted_online_authentication()
    and private.has_store_permission(p_store_id, 'shift.open')
    and exists (
      select 1 from public.shifts s
      where s.store_id = p_store_id and s.id = p_shift_id
        and s.status = 'open' and s.opened_by_user_id = auth.uid()
    )
  );
$$;

revoke all on function private.is_store_owner(uuid) from public, anon;
revoke all on function private.can_view_shift_session(uuid, uuid) from public, anon;
revoke all on function private.can_manage_shift_session(uuid, uuid) from public, anon;
grant execute on function private.is_store_owner(uuid) to authenticated;
grant execute on function private.can_view_shift_session(uuid, uuid) to authenticated;
grant execute on function private.can_manage_shift_session(uuid, uuid) to authenticated;

create or replace function private.enforce_shift_session_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.actor_user_id is distinct from auth.uid()
    or not private.can_manage_shift_session(new.store_id, new.shift_id) then
    raise exception 'shift_session_owner_or_owner_required';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_shift_session_actor() from public, anon, authenticated;

drop trigger if exists shift_expenses_enforce_session_actor on public.shift_expenses;
create trigger shift_expenses_enforce_session_actor
before insert on public.shift_expenses
for each row execute function private.enforce_shift_session_actor();

drop trigger if exists shift_cash_movements_enforce_session_actor on public.shift_cash_movements;
create trigger shift_cash_movements_enforce_session_actor
before insert on public.shift_cash_movements
for each row execute function private.enforce_shift_session_actor();

create or replace function private.enforce_shift_close_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'open' and new.status = 'closed' then
    if new.closed_by_user_id is distinct from auth.uid()
      or not private.can_manage_shift_session(old.store_id, old.id) then
      raise exception 'shift_session_owner_or_owner_required';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_shift_close_actor() from public, anon, authenticated;

drop trigger if exists shifts_enforce_close_actor on public.shifts;
create trigger shifts_enforce_close_actor
before update on public.shifts
for each row execute function private.enforce_shift_close_actor();

drop policy if exists shifts_read_member on public.shifts;
create policy shifts_read_member
  on public.shifts for select to authenticated
  using (
    private.is_store_owner(store_id)
    or (
      (private.has_store_permission(store_id, 'own_session.view')
        or private.has_store_permission(store_id, 'shift.open'))
      and (opened_by_user_id = auth.uid() or closed_by_user_id = auth.uid())
    )
  );

drop policy if exists expenses_read_member on public.shift_expenses;
create policy expenses_read_member
  on public.shift_expenses for select to authenticated
  using (private.can_view_shift_session(store_id, shift_id));

drop policy if exists shift_cash_movements_read_member on public.shift_cash_movements;
create policy shift_cash_movements_read_member
  on public.shift_cash_movements for select to authenticated
  using (private.can_view_shift_session(store_id, shift_id));

drop policy if exists audit_logs_read_member on public.store_audit_logs;
create policy audit_logs_read_member
  on public.store_audit_logs for select to authenticated
  using (
    private.is_store_owner(store_id)
    or (private.is_store_member(store_id)
      and private.has_permitted_online_authentication()
      and actor_user_id = auth.uid())
  );

create or replace function public.get_shift_cash_breakdown(p_shift_id uuid)
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
  select m.store_id into v_store_id from public.user_store_members m
  where m.user_id = auth.uid() order by m.store_id limit 1;
  if v_store_id is null or not private.can_view_shift_session(v_store_id, p_shift_id) then
    raise exception 'closed_shift_not_found';
  end if;

  select jsonb_build_object(
    'shift_id', s.id,
    'status', s.status,
    'opened_at', s.opened_at,
    'closed_at', s.closed_at,
    'opened_by_user_id', s.opened_by_user_id,
    'closed_by_user_id', s.closed_by_user_id,
    'audit_recorded', exists (select 1 from public.store_audit_logs log
      where log.store_id = s.store_id and log.event_type = 'shift.closed'
        and log.details->>'shift_id' = s.id::text),
    'close_snapshot', (select log.details from public.store_audit_logs log
      where log.store_id = s.store_id and log.event_type = 'shift.closed'
        and log.details->>'shift_id' = s.id::text
      order by log.created_at desc limit 1),
    'opening_float', s.opening_float,
    'counted_cash', s.counted_cash,
    'expected_cash', s.expected_cash,
    'variance', s.variance,
    'cash_sales', coalesce((select sum(p.amount) from public.sales sale
      join public.payments p on p.store_id = sale.store_id and p.sale_id = sale.id
      where sale.store_id = s.store_id and sale.shift_id = s.id and sale.status = 'completed'
        and p.status = 'recorded' and p.method = 'cash'), 0),
    'cash_sale_records', coalesce((select jsonb_agg(jsonb_build_object(
      'sale_id', sale.id, 'amount', p.amount, 'created_at', p.created_at)
      order by p.created_at, sale.id) from public.sales sale
      join public.payments p on p.store_id = sale.store_id and p.sale_id = sale.id
      where sale.store_id = s.store_id and sale.shift_id = s.id and sale.status = 'completed'
        and p.status = 'recorded' and p.method = 'cash'), '[]'::jsonb),
    'cash_refunds', coalesce((select sum(r.amount) from public.sale_reversals r
      join public.sales sale on sale.store_id = r.store_id and sale.id = r.sale_id
      where r.store_id = s.store_id and sale.shift_id = s.id and r.reversal_type = 'refund'
        and r.refund_method = 'cash'), 0),
    'cash_refund_records', coalesce((select jsonb_agg(jsonb_build_object(
      'reversal_id', r.id, 'sale_id', r.sale_id, 'amount', r.amount,
      'reason', r.reason, 'actor_user_id', r.actor_user_id, 'created_at', r.created_at)
      order by r.created_at, r.id) from public.sale_reversals r
      join public.sales sale on sale.store_id = r.store_id and sale.id = r.sale_id
      where r.store_id = s.store_id and sale.shift_id = s.id
        and r.reversal_type = 'refund' and r.refund_method = 'cash'), '[]'::jsonb),
    'cash_drops', coalesce((select sum(m.amount) from public.shift_cash_movements m
      where m.store_id = s.store_id and m.shift_id = s.id and m.movement_type = 'cash_drop'), 0),
    'cash_withdrawals', coalesce((select sum(m.amount) from public.shift_cash_movements m
      where m.store_id = s.store_id and m.shift_id = s.id and m.movement_type = 'withdrawal'), 0),
    'cash_expenses', coalesce((select sum(e.amount) from public.shift_expenses e
      where e.store_id = s.store_id and e.shift_id = s.id and e.payment_method = 'cash'), 0),
    'movements', coalesce((select jsonb_agg(jsonb_build_object(
      'id', m.id, 'type', m.movement_type, 'amount', m.amount, 'reason', m.reason,
      'actor_user_id', m.actor_user_id, 'created_at', m.created_at) order by m.created_at, m.id)
      from public.shift_cash_movements m where m.store_id = s.store_id and m.shift_id = s.id), '[]'::jsonb),
    'expenses', coalesce((select jsonb_agg(jsonb_build_object(
      'id', e.id, 'amount', e.amount, 'description', e.description,
      'payment_method', e.payment_method, 'actor_user_id', e.actor_user_id, 'created_at', e.created_at)
      order by e.created_at, e.id) from public.shift_expenses e
      where e.store_id = s.store_id and e.shift_id = s.id), '[]'::jsonb)
  ) into v_result
  from public.shifts s
  where s.id = p_shift_id and s.store_id = v_store_id and s.status = 'closed';

  if v_result is null then raise exception 'closed_shift_not_found'; end if;
  return v_result;
end;
$$;

revoke all on function public.get_shift_cash_breakdown(uuid) from public, anon;
grant execute on function public.get_shift_cash_breakdown(uuid) to authenticated;
