alter table public.shifts
  add column if not exists opened_by_user_id uuid references auth.users(id) on delete restrict,
  add column if not exists closed_by_user_id uuid references auth.users(id) on delete restrict;

alter table public.shifts
  add constraint shifts_closed_reconciliation_complete_check
  check (status <> 'closed' or (closed_by_user_id is not null and counted_cash is not null and expected_cash is not null and variance is not null))
  not valid;

alter table public.shift_expenses
  add column if not exists payment_method text;
alter table public.shift_expenses
  add column if not exists request_id uuid;
alter table public.shift_expenses
  add column if not exists actor_user_id uuid references auth.users(id) on delete restrict;

alter table public.shift_expenses
  add constraint shift_expenses_payment_method_check
  check (payment_method is null or payment_method = any (array['cash', 'gcash', 'maya']));
create unique index if not exists shift_expenses_store_request_id_unique
  on public.shift_expenses (store_id, request_id) where request_id is not null;

alter table public.sale_reversals
  add column if not exists refund_method text;

alter table public.sale_reversals
  add constraint sale_reversals_refund_method_check
  check (refund_method is null or (reversal_type = 'refund' and refund_method = any (array['cash', 'gcash', 'maya'])));

create table if not exists public.shift_cash_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  shift_id uuid not null,
  movement_type text not null,
  amount numeric not null,
  reason text not null,
  request_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint shift_cash_movements_amount_check check (amount > 0),
  constraint shift_cash_movements_reason_check check (length(trim(reason)) > 0),
  constraint shift_cash_movements_type_check check (movement_type = any (array['cash_drop', 'withdrawal'])),
  constraint shift_cash_movements_store_shift_fkey foreign key (store_id, shift_id)
    references public.shifts(store_id, id) on delete restrict,
  constraint shift_cash_movements_store_request_id_key unique (store_id, request_id),
  constraint shift_cash_movements_store_id_id_key unique (store_id, id)
);

create index if not exists shift_cash_movements_store_shift_created_idx
  on public.shift_cash_movements (store_id, shift_id, created_at, id);

alter table public.shift_cash_movements enable row level security;
revoke all on public.shift_cash_movements from anon, authenticated;
grant select on public.shift_cash_movements to authenticated;

create policy shift_cash_movements_read_member
  on public.shift_cash_movements
  for select to authenticated
  using (private.is_store_member(store_id));

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
  where m.user_id = auth.uid() order by m.store_id limit 1;
  if v_store_id is null or not private.has_store_permission(v_store_id, 'shift.open') then raise exception 'shift_permission_required'; end if;
  if p_opening_float is null or p_opening_float < 0 then raise exception 'invalid_opening_float'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_store_id::text, 0));
  if not exists (select 1 from public.store_devices d where d.id=p_device_id and d.store_id=v_store_id and d.is_active and d.revoked_at is null) then
    raise exception 'active_device_required';
  end if;
  if exists (select 1 from public.shifts s where s.store_id=v_store_id and s.status='open') then raise exception 'shift_already_open'; end if;

  insert into public.shifts (store_id, device_id, opening_float, status, opened_by_user_id)
  values (v_store_id, p_device_id, p_opening_float, 'open', auth.uid()) returning id into v_shift_id;
  return v_shift_id;
end;
$$;

create or replace function public.record_shift_cash_movement(
  p_shift_id uuid,
  p_movement_type text,
  p_amount numeric,
  p_reason text,
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_movement_id uuid;
  v_existing public.shift_cash_movements%rowtype;
begin
  if not private.has_permitted_online_authentication() then raise exception 'permitted_authentication_required'; end if;
  if p_shift_id is null or p_request_id is null or p_movement_type is null or p_amount is null or p_amount <= 0 or p_movement_type not in ('cash_drop', 'withdrawal') or p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'invalid_shift_cash_movement';
  end if;

  select m.store_id into v_store_id from public.user_store_members m
  where m.user_id = auth.uid() order by m.store_id limit 1;
  if v_store_id is null or not private.has_store_permission(v_store_id, 'shift.open') then raise exception 'shift_permission_required'; end if;

  perform 1 from public.shifts s
  where s.id = p_shift_id and s.store_id = v_store_id and s.status = 'open'
  for update;
  if not found then
    select m.* into v_existing from public.shift_cash_movements m
    where m.store_id = v_store_id and m.request_id = p_request_id;
    if found and v_existing.shift_id = p_shift_id and v_existing.actor_user_id = auth.uid() and v_existing.movement_type = p_movement_type
       and v_existing.amount = p_amount and v_existing.reason = trim(p_reason)
       then return v_existing.id; end if;
    raise exception 'open_shift_required';
  end if;

  select m.* into v_existing from public.shift_cash_movements m
  where m.store_id = v_store_id and m.request_id = p_request_id;
  if found then
    if v_existing.shift_id = p_shift_id and v_existing.movement_type = p_movement_type
       and v_existing.amount = p_amount and v_existing.reason = trim(p_reason)
       and v_existing.actor_user_id = auth.uid() then return v_existing.id; end if;
    raise exception 'shift_cash_movement_idempotency_conflict';
  end if;

  insert into public.shift_cash_movements (store_id, shift_id, movement_type, amount, reason, request_id, actor_user_id)
  values (v_store_id, p_shift_id, p_movement_type, p_amount, trim(p_reason), p_request_id, auth.uid())
  returning id into v_movement_id;

  insert into public.store_audit_logs (store_id, actor_user_id, event_type, details)
  values (v_store_id, auth.uid(), 'shift.cash_movement_recorded',
    jsonb_build_object('shift_id', p_shift_id, 'movement_id', v_movement_id,
      'movement_type', p_movement_type, 'amount', p_amount, 'reason', trim(p_reason)));
  return v_movement_id;
end;
$$;

create or replace function public.record_shift_expense(
  p_shift_id uuid,
  p_amount numeric,
  p_description text,
  p_payment_method text,
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_expense_id uuid;
  v_existing public.shift_expenses%rowtype;
begin
  if not private.has_permitted_online_authentication() then raise exception 'permitted_authentication_required'; end if;
  if p_shift_id is null or p_request_id is null or p_amount is null or p_amount <= 0 or p_description is null or length(trim(p_description)) = 0 or p_payment_method is null or p_payment_method not in ('cash', 'gcash', 'maya') then
    raise exception 'invalid_shift_expense';
  end if;

  select m.store_id into v_store_id from public.user_store_members m
  where m.user_id = auth.uid() order by m.store_id limit 1;
  if v_store_id is null or not private.has_store_permission(v_store_id, 'shift.open') then raise exception 'shift_permission_required'; end if;

  perform 1 from public.shifts s
  where s.id = p_shift_id and s.store_id = v_store_id and s.status = 'open'
  for update;
  if not found then
    select e.* into v_existing from public.shift_expenses e
    where e.store_id = v_store_id and e.request_id = p_request_id;
    if found and v_existing.shift_id = p_shift_id and v_existing.actor_user_id = auth.uid() and v_existing.amount = p_amount
       and v_existing.description = trim(p_description) and v_existing.payment_method = p_payment_method then
      return v_existing.id;
    end if;
    raise exception 'open_shift_required';
  end if;

  select e.* into v_existing from public.shift_expenses e
  where e.store_id = v_store_id and e.request_id = p_request_id;
  if found then
    if v_existing.shift_id = p_shift_id and v_existing.actor_user_id = auth.uid() and v_existing.amount = p_amount
       and v_existing.description = trim(p_description) and v_existing.payment_method = p_payment_method then
      return v_existing.id;
    end if;
    raise exception 'shift_expense_idempotency_conflict';
  end if;

  insert into public.shift_expenses (store_id, shift_id, amount, description, payment_method, request_id, actor_user_id)
  values (v_store_id, p_shift_id, p_amount, trim(p_description), p_payment_method, p_request_id, auth.uid())
  returning id into v_expense_id;

  insert into public.store_audit_logs (store_id, actor_user_id, event_type, details)
  values (v_store_id, auth.uid(), 'shift.expense_recorded',
    jsonb_build_object('shift_id', p_shift_id, 'expense_id', v_expense_id,
      'amount', p_amount, 'payment_method', p_payment_method, 'description', trim(p_description)));
  return v_expense_id;
end;
$$;

create or replace function public.close_store_shift(p_shift_id uuid, p_counted_cash numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_shift public.shifts%rowtype;
  v_cash_sales numeric := 0;
  v_cash_refunds numeric := 0;
  v_cash_drops numeric := 0;
  v_cash_withdrawals numeric := 0;
  v_cash_expenses numeric := 0;
  v_expected_cash numeric;
  v_variance numeric;
begin
  if not private.has_permitted_online_authentication() then raise exception 'permitted_authentication_required'; end if;
  if p_shift_id is null or p_counted_cash is null or p_counted_cash < 0 then raise exception 'invalid_counted_cash'; end if;

  select m.store_id into v_store_id from public.user_store_members m
  where m.user_id = auth.uid() order by m.store_id limit 1;
  if v_store_id is null or not private.has_store_permission(v_store_id, 'shift.open') then raise exception 'shift_permission_required'; end if;

  select s.* into v_shift
  from public.shifts s
  where s.id = p_shift_id and s.store_id = v_store_id
  for update;
  if not found then raise exception 'shift_not_found'; end if;

  if v_shift.status = 'closed' then
    if v_shift.closed_by_user_id = auth.uid() and v_shift.counted_cash = p_counted_cash then
      return jsonb_build_object(
        'status', 'already_closed', 'shift_id', v_shift.id,
        'counted_cash', v_shift.counted_cash,
        'expected_cash', v_shift.expected_cash,
        'variance', v_shift.variance,
        'closed_at', v_shift.closed_at
      );
    end if;
    raise exception 'shift_already_closed';
  end if;

  if exists (select 1 from public.shift_expenses e where e.store_id = v_store_id and e.shift_id = p_shift_id and e.payment_method is null) then
    raise exception 'shift_expense_payment_method_unverified';
  end if;
  if exists (select 1 from public.sale_reversals r where r.store_id = v_store_id and r.reversal_type = 'refund' and r.refund_method is null and exists (
    select 1 from public.sales s where s.store_id = r.store_id and s.id = r.sale_id and s.shift_id = p_shift_id
  )) then
    raise exception 'refund_method_unverified';
  end if;

  select coalesce(sum(p.amount), 0) into v_cash_sales
  from public.sales s
  join public.payments p on p.store_id = s.store_id and p.sale_id = s.id
  where s.store_id = v_store_id and s.shift_id = p_shift_id
    and s.status = 'completed' and p.status = 'recorded' and p.method = 'cash';

  select coalesce(sum(r.amount), 0) into v_cash_refunds
  from public.sale_reversals r
  join public.sales s on s.store_id = r.store_id and s.id = r.sale_id
  where r.store_id = v_store_id and s.shift_id = p_shift_id
    and r.reversal_type = 'refund' and r.refund_method = 'cash';

  select coalesce(sum(m.amount) filter (where m.movement_type = 'cash_drop'), 0),
         coalesce(sum(m.amount) filter (where m.movement_type = 'withdrawal'), 0)
  into v_cash_drops, v_cash_withdrawals
  from public.shift_cash_movements m
  where m.store_id = v_store_id and m.shift_id = p_shift_id;

  select coalesce(sum(e.amount), 0) into v_cash_expenses
  from public.shift_expenses e
  where e.store_id = v_store_id and e.shift_id = p_shift_id
    and e.payment_method = 'cash';

  v_expected_cash := v_shift.opening_float + v_cash_sales - v_cash_refunds - v_cash_drops - v_cash_withdrawals - v_cash_expenses;
  v_variance := p_counted_cash - v_expected_cash;

  update public.shifts
  set status = 'closed', closed_at = now(), counted_cash = p_counted_cash,
      expected_cash = v_expected_cash, variance = v_variance,
      closed_by_user_id = auth.uid()
  where id = p_shift_id and store_id = v_store_id and status = 'open';

  if not found then raise exception 'shift_already_closed'; end if;

  insert into public.store_audit_logs (store_id, actor_user_id, event_type, details)
  values (
    v_store_id, auth.uid(), 'shift.closed',
    jsonb_build_object(
      'shift_id', p_shift_id, 'opening_float', v_shift.opening_float,
      'cash_sales', v_cash_sales, 'cash_refunds', v_cash_refunds,
      'cash_drops', v_cash_drops, 'cash_withdrawals', v_cash_withdrawals, 'cash_expenses', v_cash_expenses,
      'expected_cash', v_expected_cash, 'counted_cash', p_counted_cash,
      'variance', v_variance
    )
  );

  return jsonb_build_object(
    'status', 'closed', 'shift_id', p_shift_id,
    'counted_cash', p_counted_cash, 'expected_cash', v_expected_cash,
    'variance', v_variance, 'closed_at', now()
  );
end;
$$;

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
  if v_store_id is null or not (
    private.has_store_permission(v_store_id, 'own_session.view')
    or private.has_store_permission(v_store_id, 'shift.open')
  ) then raise exception 'shift_permission_required'; end if;

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

revoke all on function public.record_shift_cash_movement(uuid, text, numeric, text, uuid) from public, anon;
revoke all on function public.record_shift_expense(uuid, numeric, text, text, uuid) from public, anon;
revoke all on function public.close_store_shift(uuid, numeric) from public, anon;
revoke all on function public.get_shift_cash_breakdown(uuid) from public, anon;
grant execute on function public.record_shift_cash_movement(uuid, text, numeric, text, uuid) to authenticated;
grant execute on function public.record_shift_expense(uuid, numeric, text, text, uuid) to authenticated;
grant execute on function public.close_store_shift(uuid, numeric) to authenticated;
grant execute on function public.get_shift_cash_breakdown(uuid) to authenticated;
