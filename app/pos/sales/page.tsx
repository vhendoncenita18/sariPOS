import { redirect } from 'next/navigation'
import { getStoreContext } from '@/app/pos/store-context'

type SaleRecord = {
  id: string
  grand_total: number | string | null
  created_at?: string | null
}

function formatAmount(value: SaleRecord['grand_total']) {
  const amount = value === null ? Number.NaN : Number(value)
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(amount)
    : '—'
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default async function SalesPage() {
  const { supabase, storeId, isOwner } = await getStoreContext()
  if (!isOwner) redirect('/pos')

  let dateAvailable = true
  const withDate = await supabase
    .from('sales')
    .select('id, grand_total, created_at', { count: 'exact' })
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(100)

  let recordsData = withDate.data as SaleRecord[] | null
  let salesError = withDate.error
  let recordCount = withDate.count
  if (withDate.error && ['42703', 'PGRST204'].includes(withDate.error.code ?? '') && withDate.error.message.includes('created_at')) {
    dateAvailable = false
    const withoutDate = await supabase
      .from('sales')
      .select('id, grand_total', { count: 'exact' })
      .eq('store_id', storeId)
      .limit(100)
    recordsData = withoutDate.data as SaleRecord[] | null
    salesError = withoutDate.error
    recordCount = withoutDate.count
  }

  const records = recordsData ?? []

  return (
    <main className="mx-auto max-w-[1560px] px-4 py-7 sm:px-7 lg:px-9">
      <header className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.04em]">Sales</h1>
          <p className="mt-1.5 text-sm text-[#687873]">Review sale records saved for this store.</p>
        </div>
        <span className="text-sm text-[#687873]">{recordCount?.toLocaleString() ?? records.length.toLocaleString()} records</span>
      </header>

      {!dateAvailable ? <p role="status" className="mb-4 rounded-lg border border-[#E8EAE8] bg-white px-4 py-3 text-sm text-[#687873]">The sale date field is unavailable. Records are shown without a date sort.</p> : null}

      {salesError ? (
        <div role="alert" className="rounded-xl border border-[#E9C9C5] bg-[#FFF8F7] p-5 text-sm leading-6 text-[#8B322B]">Sale records could not be loaded. Check this store’s read policy and the sales schema.</div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-[#E7EBE8] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead className="bg-[#F7F8F7] text-xs font-medium text-[#687873]"><tr><th scope="col" className="px-5 py-3">Sale record</th><th scope="col" className="px-5 py-3">Recorded at</th><th scope="col" className="px-5 py-3 text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-[#EEF1EF]">
                {records.map((sale) => (
                  <tr key={sale.id}>
                    <th scope="row" className="px-5 py-3.5 font-medium">{sale.id.slice(0, 8)}</th>
                    <td className="px-5 py-3.5 text-[#687873]">{dateAvailable ? formatDate(sale.created_at) : 'Date unavailable'}</td>
                    <td className="px-5 py-3.5 text-right font-medium tabular-nums">{formatAmount(sale.grand_total)}</td>
                  </tr>
                ))}
                {records.length === 0 ? <tr><td colSpan={3} className="px-5 py-12 text-center text-sm text-[#687873]">No sale records are available for this store yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
          {records.length === 100 ? <p className="border-t border-[#E8EAE8] px-5 py-3 text-xs text-[#89928D]">Showing the latest 100 records. Additional history pagination is not connected.</p> : null}
        </section>
      )}

      <p className="mt-4 text-xs leading-5 text-[#89928D]">Payment details, sale items, and receipts require the related schema and detail route to be verified.</p>
    </main>
  )
}
