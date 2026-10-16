import { redirect } from 'next/navigation'
import { getStoreContext } from '@/app/pos/store-context'
import { OpeningStockForm } from './opening-stock-form'
import { RestockForm } from './restock-form'

export default async function InventoryPage() {
  const { supabase, storeId, isOwner, permissions } = await getStoreContext()
  if (!isOwner && !permissions.includes('inventory.view')) redirect('/pos')

  const [productResult, stockResult] = await Promise.all([
    supabase.from('products').select('id, name').eq('store_id', storeId).order('name'),
    supabase.rpc('get_store_inventory'),
  ])
  const stockByProduct = new Map<string, number>((stockResult.data ?? []).map((row: { product_id: string; stock_quantity: number | string }) => [row.product_id, Number(row.stock_quantity)]))
  const products = (productResult.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    stock: stockByProduct.get(String(row.id)) ?? 0,
  }))

  return (
    <main className="mx-auto max-w-[1560px] px-4 py-7 sm:px-7 lg:px-9">
      <header className="mb-7">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.04em]">Inventory</h1>
        <p className="mt-1.5 text-sm text-[#687873]">Review current stock totals from this store’s inventory ledger.</p>
      </header>

      {productResult.error || stockResult.error ? (
        <div role="alert" className="rounded-xl border border-[#E9C9C5] bg-[#FFF8F7] p-5 text-sm leading-6 text-[#8B322B]">Inventory records could not be loaded. Apply the owner and role operations migration and check this store’s read policies.</div>
      ) : (
        <>
          {isOwner ? <div className="mb-5 grid gap-5"><OpeningStockForm products={products} /><RestockForm products={products} /></div> : null}

          <section aria-label="Inventory summary" className="mb-5 grid gap-3 sm:grid-cols-2">
            <article className="rounded-xl border border-[#E7EBE8] bg-white p-5"><p className="text-sm text-[#687873]">Products tracked</p><p className="mt-3 text-2xl font-semibold tabular-nums">{products.length.toLocaleString()}</p><p className="mt-2 text-xs text-[#7A8580]">Store catalog records</p></article>
            <article className="rounded-xl border border-[#E7EBE8] bg-white p-5"><p className="text-sm text-[#687873]">Low-stock alerts</p><p className="mt-3 text-2xl font-semibold tabular-nums">—</p><p className="mt-2 text-xs text-[#7A8580]">Product thresholds are not configured in the live schema</p></article>
          </section>

          <p role="status" className="mb-4 rounded-lg border border-[#E8EAE8] bg-white px-4 py-3 text-sm leading-5 text-[#687873]">Stock is summed from inventory movements. Owners can record opening stock and restocks; adjustments and low-stock thresholds are not available.</p>
          <section className="overflow-hidden rounded-xl border border-[#E7EBE8] bg-white">
            <div className="border-b border-[#E8EAE8] px-5 py-4"><h2 className="text-base font-semibold">Current product stock</h2><p className="mt-1 text-sm text-[#687873]">Quantities are calculated from the store’s movement ledger.</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] border-collapse text-left text-sm">
                <thead className="bg-[#F7F8F7] text-xs font-medium text-[#687873]"><tr><th scope="col" className="px-5 py-3">Product</th><th scope="col" className="px-5 py-3">On hand</th><th scope="col" className="px-5 py-3">Low-stock threshold</th></tr></thead>
                <tbody className="divide-y divide-[#EEF1EF]">
                  {products.map((product) => <tr key={product.id}><th scope="row" className="px-5 py-3.5 font-medium">{product.name}</th><td className="px-5 py-3.5 tabular-nums">{product.stock.toLocaleString()}</td><td className="px-5 py-3.5 text-[#687873]">Not configured</td></tr>)}
                  {products.length === 0 ? <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-[#687873]">No products are recorded in this store yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
