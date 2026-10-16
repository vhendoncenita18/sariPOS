import { ProductCatalog, type CatalogProduct } from '@/app/pos/product-catalog'
import { getStoreContext } from '@/app/pos/store-context'
import { redirect } from 'next/navigation'

const basicProductColumns = 'id, name, sku, barcode, selling_price, is_active'
const ownerProductColumns = `${basicProductColumns}, cost_price`

export default async function ProductsPage() {
  const { supabase, storeId, isOwner, permissions } = await getStoreContext()
  if (!isOwner && !permissions.includes('products.view')) redirect('/pos')
  const [result, stockResult] = await Promise.all([
    isOwner
      ? supabase.from('products').select(ownerProductColumns).eq('store_id', storeId).order('name')
      : supabase.from('products').select(basicProductColumns).eq('store_id', storeId).order('name'),
    isOwner || permissions.includes('inventory.view')
      ? supabase.rpc('get_store_inventory')
      : Promise.resolve({ data: null, error: null }),
  ])
  const stockByProduct = new Map<string, number | string>((stockResult.data ?? []).map((row: { product_id: string; stock_quantity: number | string }) => [row.product_id, row.stock_quantity]))

  const products = (result.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    sku: 'sku' in row && typeof row.sku === 'string' ? row.sku : null,
    barcode: 'barcode' in row && typeof row.barcode === 'string' ? row.barcode : null,
    selling_price: 'selling_price' in row ? row.selling_price as number | string | null : null,
    cost_price: isOwner && 'cost_price' in row ? row.cost_price as number | string | null : null,
    stock_quantity: stockByProduct.get(String(row.id)) ?? 0,
    is_active: 'is_active' in row && typeof row.is_active === 'boolean' ? row.is_active : null,
    low_stock_threshold: null,
  })) satisfies CatalogProduct[]

  return (
    <main className="mx-auto max-w-[1560px] px-4 py-7 sm:px-7 lg:px-9">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.04em]">Products</h1>
          <p className="mt-1.5 text-sm text-[#687873]">Browse this store’s catalog and recorded stock.</p>
        </div>
        <span className="text-sm text-[#687873]">{products.length.toLocaleString()} products</span>
      </header>

      {result.error ? (
        <div role="alert" className="rounded-xl border border-[#E9C9C5] bg-[#FFF8F7] p-5 text-sm leading-6 text-[#8B322B]">
          Product records could not be loaded. Check this store’s read policy and the products schema.
        </div>
      ) : (
        <>
          {stockResult.error ? <p role="status" className="mb-4 rounded-lg border border-[#E8EAE8] bg-white px-4 py-3 text-sm text-[#687873]">Product stock totals are unavailable until the owner and role operations migration is applied.</p> : null}
          <ProductCatalog products={products} isOwner={isOwner} detailsAvailable={true} />
        </>
      )}
    </main>
  )
}
