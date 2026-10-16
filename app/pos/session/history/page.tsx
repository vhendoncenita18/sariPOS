import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStoreContext } from '@/app/pos/store-context'

type SearchParams = Promise<{ from?: string; to?: string; cashier?: string; variance?: string }>
type ClosedShift = {
  id: string
  opened_at: string
  closed_at: string | null
  opening_float: number | string
  counted_cash: number | string | null
  expected_cash: number | string | null
  variance: number | string | null
  opened_by_user_id: string | null
  closed_by_user_id: string | null
}

const money = (value: number | string | null) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value ?? 0))
const recordedMoney = (value: number | string | null) => value === null ? '—' : money(value)
const validDate = (value: string | undefined) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined

function varianceLabel(value: number | string | null) {
  if (value === null) return 'Unresolved'
  const amount = Number(value ?? 0)
  return amount === 0 ? 'Balanced' : amount < 0 ? 'Shortage' : 'Overage'
}

export default async function ShiftHistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, storeId, user, isOwner, permissions } = await getStoreContext()
  if (!isOwner && !permissions.includes('own_session.view') && !permissions.includes('shift.open')) redirect('/pos')
  const filters = await searchParams
  const from = validDate(filters.from)
  const to = validDate(filters.to)
  const cashier = filters.cashier && /^[0-9a-f-]{36}$/i.test(filters.cashier) ? filters.cashier : undefined
  const varianceFilter = ['balanced', 'shortage', 'overage'].includes(filters.variance ?? '') ? filters.variance : undefined

  let query = supabase
    .from('shifts')
    .select('id, opened_at, closed_at, opening_float, counted_cash, expected_cash, variance, opened_by_user_id, closed_by_user_id')
    .eq('store_id', storeId)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })
    .limit(100)
  if (!isOwner) query = query.or(`opened_by_user_id.eq.${user.id},closed_by_user_id.eq.${user.id}`)
  if (from) query = query.gte('closed_at', `${from}T00:00:00+08:00`)
  if (to) query = query.lte('closed_at', `${to}T23:59:59.999+08:00`)
  if (cashier) query = query.eq('closed_by_user_id', cashier)
  if (varianceFilter === 'balanced') query = query.eq('variance', 0)
  if (varianceFilter === 'shortage') query = query.lt('variance', 0)
  if (varianceFilter === 'overage') query = query.gt('variance', 0)
  const { data, error } = await query
  const shifts = (data ?? []) as ClosedShift[]

  return (
    <main className="mx-auto max-w-[1560px] px-4 py-7 sm:px-7 lg:px-9">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[28px] font-semibold leading-tight tracking-[-0.04em]">Shift history</h1><p className="mt-1.5 text-sm text-[#687873]">Finalized cash reconciliations for this store.</p></div>
        <Link href="/pos/session" className="inline-flex min-h-12 items-center rounded-lg border border-[#DCE5E1] px-4 text-sm font-semibold hover:bg-[#F7F8F7]">Current shift</Link>
      </header>

      <form className="mb-5 grid gap-3 rounded-xl border border-[#E7EBE8] bg-white p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <label className="text-sm font-medium">Closed from<input type="date" name="from" defaultValue={from} className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] px-3 font-normal" /></label>
        <label className="text-sm font-medium">Closed to<input type="date" name="to" defaultValue={to} className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] px-3 font-normal" /></label>
        <label className="text-sm font-medium">Closed by member ID<input name="cashier" defaultValue={cashier} inputMode="text" placeholder="Optional user ID" className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] px-3 font-normal" /></label>
        <label className="text-sm font-medium">Reconciliation<select name="variance" defaultValue={varianceFilter} className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal"><option value="">All</option><option value="balanced">Balanced</option><option value="shortage">Shortage</option><option value="overage">Overage</option></select></label>
        <button className="min-h-12 cursor-pointer rounded-lg bg-[#171918] px-4 text-sm font-semibold text-white">Apply filters</button>
      </form>

      {error ? <section role="alert" className="rounded-xl border border-[#E9C9C5] bg-[#FFF8F7] p-5 text-sm leading-6 text-[#8B322B]">Shift history is unavailable. Check the store shift read policy and apply the shift reconciliation migration.</section> : shifts.length === 0 ? (
        <section className="rounded-xl border border-[#E7EBE8] bg-white p-6 text-sm text-[#687873]">No closed shifts match these filters.</section>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E7EBE8] bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#F7F8F7] text-xs uppercase tracking-wide text-[#687873]"><tr><th className="px-4 py-3 font-medium">Closed</th><th className="px-4 py-3 font-medium">Closed by</th><th className="px-4 py-3 font-medium">Opening float</th><th className="px-4 py-3 font-medium">Expected</th><th className="px-4 py-3 font-medium">Counted</th><th className="px-4 py-3 font-medium">Variance</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-[#EEF1EF]">{shifts.map((shift) => (
              <tr key={shift.id}>
                <td className="whitespace-nowrap px-4 py-3">{shift.closed_at ? new Date(shift.closed_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : '—'}</td>
                <td className="px-4 py-3 font-mono text-xs" title={shift.closed_by_user_id ?? 'Legacy shift without closing user'}>{shift.closed_by_user_id ? `${shift.closed_by_user_id.slice(0, 8)}…` : 'Legacy record'}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">{money(shift.opening_float)}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">{recordedMoney(shift.expected_cash)}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">{recordedMoney(shift.counted_cash)}</td>
                <td className={`whitespace-nowrap px-4 py-3 font-medium tabular-nums ${shift.variance === null ? 'text-[#89928D]' : Number(shift.variance) < 0 ? 'text-[#9B3028]' : Number(shift.variance) > 0 ? 'text-[#8A5A00]' : 'text-[#176B4C]'}`}>{recordedMoney(shift.variance)}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-[#F2F5F3] px-2.5 py-1 text-xs">{shift.closed_by_user_id && shift.expected_cash !== null && shift.counted_cash !== null && shift.variance !== null ? varianceLabel(shift.variance) : 'Unverified legacy'}</span></td>
                <td className="px-4 py-3"><Link href={`/pos/session/history/${shift.id}`} className="min-h-12 inline-flex items-center font-semibold text-[#087F5B] hover:underline">Details</Link></td>
              </tr>
            ))}</tbody>
          </table>
          <p className="border-t border-[#EEF1EF] px-4 py-3 text-xs text-[#89928D]">Showing up to 100 shifts. Older shifts remain available through the date filters.</p>
        </div>
      )}
    </main>
  )
}
