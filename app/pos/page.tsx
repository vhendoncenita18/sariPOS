import type { ReactNode } from 'react'
import Link from 'next/link'
import { getStoreContext } from '@/app/pos/store-context'

type ProductRow = {
  id: string
  name: string
  stock_quantity: number | string | null
  low_stock_threshold?: number | string | null
}

type SaleRow = {
  grand_total: number | string | null
}

type IconName = 'overview' | 'sale' | 'products' | 'inventory' | 'sales' | 'shift' | 'search' | 'store' | 'box' | 'alert' | 'clock'

const SALES_PAGE_SIZE = 1000

function numericValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function stockThreshold(product: ProductRow): number | null {
  const configuredThreshold = numericValue(product.low_stock_threshold)
  return configuredThreshold !== null && configuredThreshold >= 0 ? configuredThreshold : null
}

const paths: Record<IconName, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  sale: <><path d="M4 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 1.9-1.4L21 9H7" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
  products: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21" /></>,
  inventory: <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" /><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21" /></>,
  sales: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /><path d="M16 6h4v4" /></>,
  shift: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  store: <><path d="M3 10 5 4h14l2 6" /><path d="M4 10v10h16V10M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M9 20v-5h6v5" /></>,
  box: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M8 9.8 12 12l4-2.2M12 12v4" /></>,
  alert: <><path d="m12 3 9 16H3l9-16Z" /><path d="M12 9v4m0 3h.01" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
}

function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(value)
}

function Metric({
  label,
  value,
  icon,
  note,
}: {
  label: string
  value: string
  icon: IconName
  note: string
}) {
  return (
    <article className="rounded-xl border border-[#E7EBE8] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-[#687873]">{label}</p>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#F3F6F4] text-[#48564F]">
          <Icon name={icon} className="size-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-[25px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-[#7A8580]">{note}</p>
    </article>
  )
}

export default async function PosDashboardPage() {
  const { supabase, user, membership, isOwner, roleLabel, permissions } = await getStoreContext()
  const userName = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name.trim()
    : ''
  const displayName = userName || user.email?.split('@')[0] || roleLabel

  const [productsResult, stockResult, salesFirstPage] = await Promise.all([
    supabase
      .from('products')
      .select('id, name')
      .eq('store_id', membership.store_id)
      .order('name'),
    isOwner || permissions.includes('inventory.view')
      ? supabase.rpc('get_store_inventory')
      : Promise.resolve({ data: null, error: null }),
    isOwner
      ? supabase
          .from('sales')
          .select('grand_total', { count: 'exact' })
          .eq('store_id', membership.store_id)
          .range(0, SALES_PAGE_SIZE - 1)
      : Promise.resolve(null),
  ])

  const stockByProduct = new Map<string, number>((stockResult.data ?? []).map((row: { product_id: string; stock_quantity: number | string }) => [row.product_id, Number(row.stock_quantity)]))
  const products: ProductRow[] = (productsResult.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    stock_quantity: stockByProduct.get(String(row.id)) ?? null,
    low_stock_threshold: null,
  }))
  const productsError = productsResult.error ?? stockResult.error
  const thresholdAvailable = false
  let sales = (salesFirstPage?.data ?? []) as SaleRow[]
  let salesError = salesFirstPage?.error ?? null
  const salesCount = salesFirstPage?.count ?? sales.length

  if (isOwner && !salesError && salesCount > sales.length) {
    const pageOffsets = Array.from(
      { length: Math.ceil(salesCount / SALES_PAGE_SIZE) - 1 },
      (_, index) => (index + 1) * SALES_PAGE_SIZE,
    )
    const remainingPages = await Promise.all(
      pageOffsets.map((offset) =>
        supabase
          .from('sales')
          .select('grand_total')
          .eq('store_id', membership.store_id)
          .range(offset, offset + SALES_PAGE_SIZE - 1),
      ),
    )

    const failedPage = remainingPages.find((page) => page.error)
    if (failedPage?.error) {
      salesError = failedPage.error
    } else {
      sales = sales.concat(...remainingPages.map((page) => (page.data ?? []) as SaleRow[]))
    }
  }

  const productError = Boolean(productsError)
  const knownStock = products
    .map((product) => numericValue(product.stock_quantity))
    .filter((quantity): quantity is number => quantity !== null && quantity >= 0)
  const unknownStockProducts = products.filter((product) => numericValue(product.stock_quantity) === null)
  const unitsInStock = knownStock.reduce((total, quantity) => total + quantity, 0)
  const thresholdProducts = products.filter((product) => stockThreshold(product) !== null)
  const unconfiguredThresholdProducts = products.length - thresholdProducts.length
  const lowStockProducts = thresholdProducts.filter((product) => {
    const quantity = numericValue(product.stock_quantity)
    const threshold = stockThreshold(product)
    return quantity !== null && threshold !== null && quantity <= threshold
  })
  const salesTotals = sales.map((sale) => numericValue(sale.grand_total))
  const hasInvalidSalesTotal = salesTotals.some((total) => total === null)
  const recordedSales = salesError || hasInvalidSalesTotal
    ? null
    : salesTotals.reduce<number>((total, saleTotal) => total + (saleTotal ?? 0), 0)
  const salesRecordCount = salesError ? null : salesCount
  const averageSale = recordedSales !== null && salesRecordCount ? recordedSales / salesRecordCount : null
  const healthyProducts = thresholdProducts.filter((product) => {
    const quantity = numericValue(product.stock_quantity)
    const threshold = stockThreshold(product)
    return quantity !== null && threshold !== null && quantity > threshold
  }).length
  const knownStockProductCount = healthyProducts + lowStockProducts.filter((product) => numericValue(product.stock_quantity) !== null).length
  const lowProducts = lowStockProducts.filter((product) => numericValue(product.stock_quantity) !== null).length
  const totalProducts = products.length
  const healthyPercent = knownStockProductCount ? Math.round((healthyProducts / knownStockProductCount) * 100) : 0
  const lowPercent = knownStockProductCount ? 100 - healthyPercent : 0

  return (
    <main id="overview" className="mx-auto max-w-[1560px] px-4 py-7 sm:px-7 lg:px-9">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.04em]">{isOwner ? 'Dashboard' : 'Store workspace'}</h1>
          <p className="mt-1.5 text-sm text-[#687873]">
            {isOwner
            ? `Welcome back, ${displayName}. Here is the latest recorded activity for your store.`
              : 'Search the store catalog and review the tools available to your account.'}
          </p>
        </div>
        <Link href={isOwner ? '/pos/inventory' : '/pos/products'} className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-lg bg-[#171918] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#303431] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D] sm:self-auto">
          <Icon name={isOwner ? 'inventory' : 'search'} className="size-[18px]" />
          {isOwner ? 'Review low stock' : 'Search products'}
        </Link>
      </div>

      {productError || salesError ? (
        <div role="status" className="mt-6 rounded-lg border border-[#E9C9C5] bg-[#FFF8F7] px-4 py-3 text-sm text-[#8B322B]">
          {productError ? 'Inventory data is unavailable. ' : ''}
          {salesError ? 'Sales data is unavailable. ' : ''}
          Refresh to try again.
        </div>
      ) : null}

      {isOwner ? (
        <section aria-label="Store summary" className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Recorded sales" value={recordedSales === null ? '—' : formatCurrency(recordedSales)} icon="sales" note="All-time total · server recorded" />
          <Metric label="Sales records" value={salesRecordCount === null ? '—' : salesRecordCount.toLocaleString()} icon="sale" note="All-time transaction count" />
          <Metric label="Products tracked" value={productError ? '—' : totalProducts.toLocaleString()} icon="box" note="Items in your catalog" />
          <Metric label="Low stock" value={productError || !thresholdAvailable ? '—' : lowProducts.toLocaleString()} icon="alert" note={thresholdAvailable ? `${unconfiguredThresholdProducts} without a threshold` : 'Threshold field is unavailable'} />
        </section>
      ) : (
        <section aria-label="Store summary" className="mt-7 grid gap-3 sm:grid-cols-2">
          <Metric label="Products in catalog" value={productError ? '—' : totalProducts.toLocaleString()} icon="box" note="Items available to look up" />
          <Metric label="Known stock units" value={productError ? '—' : unitsInStock.toLocaleString()} icon="inventory" note="Recorded non-negative stock" />
        </section>
      )}

      {isOwner ? (
        <section aria-label="Store operations availability" className="mt-4 grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-[#E7EBE8] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Sales sync</h2>
              <span className="rounded-full bg-[#F3F6F4] px-2.5 py-1 text-xs font-medium text-[#535D57]">Not available</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#687873]">The offline queue is not connected. This dashboard shows server-recorded sales only.</p>
          </article>
          <article className="rounded-xl border border-[#E7EBE8] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Shift tracking</h2>
              <span className="rounded-full bg-[#F3F6F4] px-2.5 py-1 text-xs font-medium text-[#535D57]">Not available</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#687873]">Shift opening, cash closing, and shift-based sales are not connected yet.</p>
          </article>
        </section>
      ) : null}

      {isOwner ? (
        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
          <article id="sales" className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Sales overview</h2>
                <p className="mt-1 text-sm text-[#687873]">All-time totals from sales recorded by the server</p>
              </div>
              <Link href="/pos/sales" className="min-h-10 rounded-lg border border-[#E8EAE8] px-3 py-2 text-xs font-medium text-[#535D57] hover:bg-[#F3F6F4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D]">Open sales</Link>
            </div>
            <div className="mt-7 grid gap-6 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <p className="text-xs text-[#777D79]">Total recorded</p>
                <p className="mt-1 text-[32px] font-semibold tracking-[-0.045em] tabular-nums">{recordedSales === null ? '—' : formatCurrency(recordedSales)}</p>
                {salesError ? (
                  <p className="mt-3 max-w-sm text-sm leading-6 text-[#8B322B]">Sales data is unavailable right now.</p>
                ) : sales.length === 0 ? (
                  <p className="mt-3 max-w-sm text-sm leading-6 text-[#687873]">Sales totals will appear here when records are available for this store.</p>
                ) : (
                  <p className="mt-3 text-sm text-[#687873]">Across {salesRecordCount?.toLocaleString()} {salesRecordCount === 1 ? 'sale record' : 'sale records'}</p>
                )}
              </div>
              <div className="border-t border-[#E8EAE8] pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                <p className="text-xs text-[#777D79]">Average recorded sale</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{salesError || averageSale === null ? '—' : formatCurrency(averageSale)}</p>
                <p className="mt-2 text-xs leading-5 text-[#777D79]">{salesRecordCount ? 'All-time average' : 'Available after the first sale'}</p>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Inventory health</h2>
                <p className="mt-1 text-sm text-[#687873]">Stock quantity by product</p>
              </div>
              <Icon name="box" className="size-5 text-[#687873]" />
            </div>
            {productsError ? (
              <p className="mt-6 rounded-lg bg-[#FFF8F7] p-4 text-sm leading-6 text-[#8B322B]">Inventory health is unavailable right now.</p>
            ) : totalProducts === 0 ? (
              <p className="mt-6 rounded-lg bg-[#F7F8F7] p-4 text-sm leading-6 text-[#687873]">Add products to see inventory health for this store.</p>
            ) : !thresholdProducts.length ? (
              <p className="mt-6 rounded-lg bg-[#F7F8F7] p-4 text-sm leading-6 text-[#687873]">Low-stock health needs a configured threshold for each product. Stock quantities remain available in the product list.</p>
            ) : (
              <>
                <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-[#EDF1EF]" role="img" aria-label={`${lowProducts} products at or below their stock threshold, ${healthyProducts} above their threshold, ${unknownStockProducts.length} with unknown stock`}>
                  <span className="bg-[#16835D]" style={{ width: `${healthyPercent}%` }} />
                  <span className="bg-[#C96C61]" style={{ width: `${lowPercent}%` }} />
                </div>
                <ul className="mt-5 space-y-3 text-sm">
                  <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[#535D57]"><span className="size-2 rounded-full bg-[#16835D]" />Above threshold</span><strong className="font-semibold tabular-nums">{healthyProducts}</strong></li>
                  <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[#535D57]"><span className="size-2 rounded-full bg-[#C96C61]" />At or below threshold</span><strong className="font-semibold tabular-nums">{lowProducts}</strong></li>
                  {unconfiguredThresholdProducts ? <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[#535D57]"><span className="size-2 rounded-full bg-[#A8B0AB]" />Threshold not set</span><strong className="font-semibold tabular-nums">{unconfiguredThresholdProducts}</strong></li> : null}
                  {unknownStockProducts.length ? <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[#535D57]"><span className="size-2 rounded-full bg-[#A8B0AB]" />Stock unknown</span><strong className="font-semibold tabular-nums">{unknownStockProducts.length}</strong></li> : null}
                </ul>
              </>
            )}
            <p className="mt-4 border-t border-[#E8EAE8] pt-3 text-xs text-[#89928D]">{productError ? 'Unit count unavailable' : `${unitsInStock.toLocaleString()} known units on hand`}</p>
          </article>
        </section>
      ) : null}

      <section id="inventory" className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
        <article id={!isOwner ? 'products' : undefined} className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{isOwner ? 'Restock attention' : 'Product catalog'}</h2>
              <p className="mt-1 text-sm text-[#687873]">{isOwner ? 'Products at or below their stock threshold' : 'Browse the store catalog on the Products page'}</p>
            </div>
            <Icon name={isOwner ? 'alert' : 'search'} className="size-5 text-[#687873]" />
          </div>

          {!isOwner && productsError ? (
            <p className="mt-5 rounded-lg bg-[#FFF8F7] p-4 text-sm text-[#8B322B]">Product information is unavailable right now.</p>
          ) : !isOwner ? (
            <Link href="/pos/products" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#171918] px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D]">Open product catalog</Link>
          ) : productsError ? (
            <p className="mt-5 rounded-lg bg-[#FFF8F7] p-4 text-sm text-[#8B322B]">Product information is unavailable right now.</p>
          ) : totalProducts === 0 ? (
            <p className="mt-5 rounded-lg bg-[#F7F8F7] p-4 text-sm leading-6 text-[#687873]">Add products to see restock attention for this store.</p>
          ) : !thresholdAvailable ? (
            <p className="mt-5 rounded-lg bg-[#F7F8F7] p-4 text-sm leading-6 text-[#687873]">Low-stock alerts need a configured product threshold. The threshold field is unavailable, so no restock count is inferred.</p>
          ) : !thresholdProducts.length ? (
            <p className="mt-5 rounded-lg bg-[#F7F8F7] p-4 text-sm leading-6 text-[#687873]">Set a low-stock threshold on a product to see restock alerts here.</p>
          ) : (isOwner ? lowStockProducts : products.slice(0, 6)).length > 0 ? (
            <ul className="mt-4 divide-y divide-[#EEF1EF]">
              {(isOwner ? lowStockProducts : products.slice(0, 6)).slice(0, 6).map((product) => {
                const quantity = numericValue(product.stock_quantity)
                const threshold = stockThreshold(product)
                const isLow = quantity !== null && threshold !== null && quantity <= threshold
                return (
                  <li key={product.id} className="flex min-h-[68px] items-center justify-between gap-4 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#F3F6F4] text-[#66746C]"><Icon name="box" className="size-[18px]" /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{product.name}</span>
                        <span className="mt-1 block text-xs text-[#89928D]">{quantity === null ? 'Stock unavailable' : isOwner && threshold !== null ? `Low-stock threshold: ${threshold}` : 'Recorded stock'}</span>
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${isLow ? 'bg-[#FFF1EF] text-[#9A453C]' : 'bg-[#F3F6F4] text-[#535D57]'}`}>
                      {quantity === null ? 'Unknown' : quantity < 0 ? `${quantity} · review` : `${quantity} left`}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-5 rounded-lg bg-[#F7F8F7] p-4 text-sm leading-6 text-[#687873]">
              {products.length === 0 ? 'No products have been recorded for this store yet.' : 'No known products are at or below their stock threshold.'}
            </p>
          )}
        </article>

        <article className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
                <h2 className="text-base font-semibold">{isOwner ? 'Product catalog' : 'My session'}</h2>
                <p className="mt-1 text-sm text-[#687873]">{isOwner ? 'Review products, prices, and stock' : 'Personal checkout summary'}</p>
            </div>
            <Icon name={isOwner ? 'products' : 'clock'} className="size-5 text-[#687873]" />
          </div>
          {isOwner ? (
            <Link href="/pos/products" className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-[#DCE5E1] px-4 text-sm font-semibold text-[#171918] hover:bg-[#F3F6F4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D]">Open product management</Link>
          ) : (
            <div className="mt-5 rounded-lg bg-[#F7F8F7] p-4">
              <p className="text-sm font-medium">Session summary is not available yet.</p>
              <p className="mt-1.5 text-sm leading-6 text-[#687873]">Shift tracking is not configured yet, so sales are not grouped into a personal session.</p>
              <Link href="/pos/session" className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#087F5B] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D]">Open my session</Link>
            </div>
          )}
        </article>
      </section>
    </main>
  )
}
