import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getStoreContext } from '@/app/pos/store-context'

type Breakdown = {
  opened_at: string
  closed_at: string
  opened_by_user_id: string | null
  closed_by_user_id: string | null
  audit_recorded: boolean
  close_snapshot: {
    opening_float: number | string
    cash_sales: number | string
    cash_refunds: number | string
    cash_drops: number | string
    cash_withdrawals: number | string
    cash_expenses: number | string
  } | null
  opening_float: number | string
  counted_cash: number | string | null
  expected_cash: number | string | null
  variance: number | string | null
  cash_sales: number | string
  cash_refunds: number | string
  cash_drops: number | string
  cash_withdrawals: number | string
  cash_expenses: number | string
  cash_sale_records: Array<{ sale_id: string; amount: number | string; created_at: string }>
  cash_refund_records: Array<{ reversal_id: string; sale_id: string; amount: number | string; reason: string; actor_user_id: string | null; created_at: string }>
  movements: Array<{ id: string; type: string; amount: number | string; reason: string; actor_user_id: string; created_at: string }>
  expenses: Array<{ id: string; amount: number | string; description: string; payment_method: string | null; actor_user_id: string | null; created_at: string }>
}

const money = (value: number | string | null | undefined) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value ?? 0))
const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : '—'

export default async function ShiftHistoryDetailPage({ params }: { params: Promise<{ shiftId: string }> }) {
  const { supabase, storeId, isOwner, permissions } = await getStoreContext()
  if (!isOwner && !permissions.includes('own_session.view') && !permissions.includes('shift.open')) redirect('/pos')
  const { shiftId } = await params
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('id, status')
    .eq('store_id', storeId)
    .eq('id', shiftId)
    .eq('status', 'closed')
    .maybeSingle()
  if (shiftError) return <main className="mx-auto max-w-4xl px-4 py-8"><section role="alert" className="rounded-xl border border-[#E9C9C5] bg-[#FFF8F7] p-5 text-sm text-[#8B322B]">Shift details are unavailable. Check the store shift read policy and apply the shift reconciliation migration.</section></main>
  if (!shift) notFound()

  const { data, error } = await supabase.rpc('get_shift_cash_breakdown', { p_shift_id: shiftId })
  const breakdown = data as unknown as Breakdown | null
  if (error || !breakdown) return <main className="mx-auto max-w-4xl px-4 py-8"><section role="alert" className="rounded-xl border border-[#E9C9C5] bg-[#FFF8F7] p-5 text-sm text-[#8B322B]">Shift reconciliation details could not be loaded. Apply the shift reconciliation migration and verify member access.</section></main>

  if (!breakdown.audit_recorded || !breakdown.close_snapshot || breakdown.counted_cash === null || breakdown.expected_cash === null || breakdown.variance === null) {
    return <main className="mx-auto max-w-4xl px-4 py-8"><Link href="/pos/session/history" className="text-sm font-semibold text-[#087F5B] hover:underline">← Shift history</Link><section className="mt-5 rounded-xl border border-[#E8DDB8] bg-[#FFFDF3] p-5"><h1 className="text-lg font-semibold">Reconciliation unverified</h1><p className="mt-2 text-sm leading-6 text-[#6A5A2B]">This legacy shift has no complete audited close record. SariPOS does not infer or replace missing amounts.</p></section></main>
  }

  const rows = [
    ['Opening float', Number(breakdown.close_snapshot?.opening_float)],
    ['Eligible cash sales', Number(breakdown.close_snapshot?.cash_sales)],
    ['Cash refunds', -Number(breakdown.close_snapshot?.cash_refunds)],
    ['Cash drops', -Number(breakdown.close_snapshot?.cash_drops)],
    ['Withdrawals', -Number(breakdown.close_snapshot?.cash_withdrawals)],
    ['Cash expenses', -Number(breakdown.close_snapshot?.cash_expenses)],
  ] as const

  return (
    <main className="mx-auto max-w-5xl px-4 py-7 sm:px-7 lg:px-9">
      <header className="mb-6">
        <Link href="/pos/session/history" className="text-sm font-semibold text-[#087F5B] hover:underline">← Shift history</Link>
        <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.04em]">Closed shift</h1>
        <p className="mt-1.5 text-sm text-[#687873]">Opened {dateTime(breakdown.opened_at)} · Closed {dateTime(breakdown.closed_at)}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Expected cash', money(breakdown.expected_cash)],
          ['Cash counted', money(breakdown.counted_cash)],
          ['Variance', money(breakdown.variance)],
          ['Closed by', breakdown.closed_by_user_id ?? 'Legacy record'],
        ].map(([label, value]) => <article key={label} className="rounded-xl border border-[#E7EBE8] bg-white p-5"><p className="text-xs text-[#687873]">{label}</p><p className="mt-2 break-all text-lg font-semibold tabular-nums">{value}</p></article>)}
      </section>

      <section className="mt-5 rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold">Cash reconciliation</h2>
        <dl className="mt-4 divide-y divide-[#EEF1EF]">{rows.map(([label, amount]) => <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-[#535D57]">{label}</dt><dd className="font-medium tabular-nums">{amount < 0 ? `−${money(Math.abs(amount))}` : money(amount)}</dd></div>)}<div className="flex items-center justify-between gap-4 py-3 text-sm font-semibold"><dt>Expected cash</dt><dd className="tabular-nums">{money(breakdown.expected_cash)}</dd></div></dl>
        <p className="mt-2 text-xs text-[#89928D]">Variance = cash counted − expected cash. A difference is recorded as-is and does not change the expected total.</p>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Eligible cash sales</h2>
          {breakdown.cash_sale_records.length ? <ul className="mt-4 divide-y divide-[#EEF1EF]">{breakdown.cash_sale_records.map((sale) => <li key={sale.sale_id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="font-mono text-xs">Sale {sale.sale_id.slice(0, 8)}…</p><p className="mt-1 text-xs text-[#687873]">{dateTime(sale.created_at)}</p></div><span className="font-medium tabular-nums">{money(sale.amount)}</span></li>)}</ul> : <p className="mt-4 text-sm text-[#687873]">No eligible cash sales were recorded.</p>}
        </article>
        <article className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Cash refunds</h2>
          {breakdown.cash_refund_records.length ? <ul className="mt-4 divide-y divide-[#EEF1EF]">{breakdown.cash_refund_records.map((refund) => <li key={refund.reversal_id} className="flex items-start justify-between gap-4 py-3 text-sm"><div><p className="font-medium">{refund.reason}</p><p className="mt-1 text-xs text-[#687873]">Sale {refund.sale_id.slice(0, 8)}… · {dateTime(refund.created_at)}</p></div><span className="shrink-0 font-medium tabular-nums">−{money(refund.amount)}</span></li>)}</ul> : <p className="mt-4 text-sm text-[#687873]">No cash refunds were recorded.</p>}
        </article>
        <article className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Cash drops and withdrawals</h2>
          {breakdown.movements.length ? <ul className="mt-4 divide-y divide-[#EEF1EF]">{breakdown.movements.map((movement) => <li key={movement.id} className="flex items-start justify-between gap-4 py-3 text-sm"><div><p className="font-medium">{movement.type === 'cash_drop' ? 'Cash drop' : 'Withdrawal'}</p><p className="mt-1 text-xs text-[#687873]">{movement.reason} · {dateTime(movement.created_at)}</p></div><span className="shrink-0 font-medium tabular-nums">{money(movement.amount)}</span></li>)}</ul> : <p className="mt-4 text-sm text-[#687873]">No cash drops or withdrawals were recorded.</p>}
        </article>
        <article className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Shift expenses</h2>
          {breakdown.expenses.length ? <ul className="mt-4 divide-y divide-[#EEF1EF]">{breakdown.expenses.map((expense) => <li key={expense.id} className="flex items-start justify-between gap-4 py-3 text-sm"><div><p className="font-medium">{expense.description}</p><p className="mt-1 text-xs text-[#687873]">{expense.payment_method ?? 'Payment method unverified'} · {dateTime(expense.created_at)}</p></div><span className="shrink-0 font-medium tabular-nums">{money(expense.amount)}</span></li>)}</ul> : <p className="mt-4 text-sm text-[#687873]">No expenses were recorded.</p>}
        </article>
      </section>
    </main>
  )
}
