import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStoreContext } from '@/app/pos/store-context'
import { SaleRegister, type SaleProduct } from '@/app/pos/sale/register'

export default async function NewSalePage() {
  const { supabase, storeId, user, isOwner, permissions } = await getStoreContext()
  if (!isOwner && !permissions.includes('sales.create')) redirect('/pos')
  if (!isOwner && (!permissions.includes('products.view') || !permissions.includes('inventory.view'))) redirect('/pos')

  const [productsResult, stockResult, shiftResult] = await Promise.all([
    supabase.from('products').select('id, name, sku, barcode, selling_price').eq('store_id', storeId).eq('is_active', true).order('name'),
    supabase.rpc('get_store_inventory'),
    supabase.from('shifts').select('id, device_id, opened_by_user_id').eq('store_id', storeId).eq('status', 'open').maybeSingle(),
  ])
  const stock = new Map<string, number>((stockResult.data ?? []).map((row: { product_id: string; stock_quantity: number | string }) => [row.product_id, Number(row.stock_quantity)]))
  const products: SaleProduct[] = (productsResult.data ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    price: Number(product.selling_price),
    stock: stock.get(product.id) ?? 0,
  }))
  const activeShift = shiftResult.data && (isOwner || shiftResult.data.opened_by_user_id === user.id) ? shiftResult.data : null

  return (
    <main className="mx-auto max-w-[1560px] px-4 py-6 pb-28 sm:px-7 sm:py-8 sm:pb-32 lg:px-9">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[28px] font-semibold leading-tight tracking-[-0.04em]">New sale</h1><p className="mt-1.5 text-sm text-[#687873]">Search the catalog, build the basket, and take one payment.</p></div>
        <Link href="/pos/session" className="inline-flex min-h-11 items-center rounded-lg border border-[#DCE5E1] px-4 text-sm font-semibold hover:bg-white">My session</Link>
      </header>

      {productsResult.error ? <section role="alert" className="rounded-xl border border-[#E9C9C5] bg-[#FFF8F7] p-5 text-sm text-[#8B322B]">The product catalog could not be loaded. Check the store product read policy.</section> : shiftResult.error ? <section role="alert" className="rounded-xl border border-[#E9C9C5] bg-[#FFF8F7] p-5 text-sm text-[#8B322B]">The active shift could not be checked. Checkout is unavailable until shift access is configured.</section> : !activeShift ? (
        <section className="rounded-xl border border-[#E7EBE8] bg-white p-6 sm:p-8"><p className="text-lg font-semibold">Open your shift before checkout</p><p className="mt-2 max-w-xl text-sm leading-6 text-[#687873]">Sales are attached to the active shift and registered device. If another cashier opened today’s shift, ask the store owner to check the session assignment.</p><Link href="/pos/session" className="mt-5 inline-flex min-h-12 items-center rounded-lg bg-[#171918] px-5 text-sm font-semibold text-white">Go to My session</Link></section>
      ) : stockResult.error ? <section role="alert" className="rounded-xl border border-[#E9C9C5] bg-[#FFF8F7] p-5 text-sm text-[#8B322B]">Stock availability is unavailable, so checkout is paused. Check the inventory permission and refresh.</section> : (
        <SaleRegister products={products} shiftId={activeShift.id} deviceId={activeShift.device_id} />
      )}
    </main>
  )
}
