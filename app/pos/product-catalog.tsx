'use client'

import { useActionState, useMemo, useState } from 'react'
import { createProduct, type ActionState } from '@/app/actions/owner'
import { ProductActions } from '@/app/pos/products/product-actions'

export type CatalogProduct = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  selling_price: number | string | null
  cost_price: number | string | null
  stock_quantity: number | string | null
  is_active: boolean | null
  low_stock_threshold: number | string | null
}

function money(value: CatalogProduct['selling_price']) {
  if (value === null || value === '') return '—'
  const amount = Number(value)
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(amount)
    : '—'
}

function stock(value: CatalogProduct['stock_quantity']) {
  if (value === null || value === '') return 'Unknown'
  const amount = Number(value)
  return Number.isFinite(amount) ? amount.toLocaleString() : 'Unknown'
}

export function ProductCatalog({ products, isOwner, detailsAvailable }: {
  products: CatalogProduct[]
  isOwner: boolean
  detailsAvailable: boolean
}) {
  const [createState, createAction, creating] = useActionState<ActionState, FormData>(createProduct, { message: '', error: false })
  const [query, setQuery] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredProducts = useMemo(() => products.filter((product) =>
    [product.name, product.sku, product.barcode]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(normalizedQuery)),
  ), [normalizedQuery, products])

  return (
    <>
      {isOwner ? (
        <div className="mb-5 rounded-xl border border-[#E8EAE8] bg-white p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium">Manage products</p>
              <p className="mt-1 max-w-xl text-sm leading-5 text-[#687873]">Create a store product. Starting stock is recorded separately through Inventory.</p>
            </div>
            <button type="button" aria-expanded={addingProduct} onClick={() => setAddingProduct((value) => !value)} className="min-h-11 shrink-0 rounded-lg bg-[#171918] px-4 text-sm font-semibold text-white hover:bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16835D]/20">{addingProduct ? 'Close form' : 'Add product'}</button>
          </div>
          {addingProduct ? (
            <form action={createAction} className="mt-5 grid gap-4 border-t border-[#EEF1EF] pt-5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium">Product name<input required maxLength={120} name="name" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#DCE5E1] px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
              <label className="text-sm font-medium">Selling price<input required min="0.01" step="0.01" type="number" name="sellingPrice" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#DCE5E1] px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
              <label className="text-sm font-medium">Cost price <span className="font-normal text-[#777D79]">(optional)</span><input min="0" step="0.01" type="number" name="costPrice" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#DCE5E1] px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
              <label className="text-sm font-medium">SKU <span className="font-normal text-[#777D79]">(optional)</span><input maxLength={120} name="sku" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#DCE5E1] px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
              <label className="text-sm font-medium">Barcode <span className="font-normal text-[#777D79]">(optional)</span><input maxLength={120} name="barcode" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#DCE5E1] px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
              <div className="flex flex-col justify-end gap-3 sm:col-span-2 lg:col-span-1"><button disabled={creating} className="min-h-11 rounded-lg bg-[#171918] px-4 text-sm font-semibold text-white disabled:opacity-60">{creating ? 'Saving…' : 'Save product'}</button>{createState.message ? <p role={createState.error ? 'alert' : 'status'} className={`text-sm ${createState.error ? 'text-[#9B3028]' : 'text-[#087F5B]'}`}>{createState.message}</p> : null}</div>
            </form>
          ) : null}
        </div>
      ) : null}

      {!detailsAvailable ? (
        <p role="status" className="mb-4 rounded-lg border border-[#E8EAE8] bg-white px-4 py-3 text-sm leading-5 text-[#687873]">Showing product names and recorded stock. Optional SKU, price, status, and cost fields are not available in the current database schema.</p>
      ) : null}

      <label className="mb-4 block">
        <span className="sr-only">Search product catalog</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by product, SKU, or barcode"
          className="min-h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-4 text-sm outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10"
        />
      </label>

      <div className="overflow-x-auto rounded-xl border border-[#E7EBE8] bg-white">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-[#F7F8F7] text-xs font-medium text-[#687873]">
            <tr>
              <th scope="col" className="px-4 py-3">Product</th>
              <th scope="col" className="px-4 py-3">SKU / barcode</th>
              <th scope="col" className="px-4 py-3">Price</th>
              {isOwner ? <th scope="col" className="px-4 py-3">Cost</th> : null}
              <th scope="col" className="px-4 py-3">Recorded stock</th>
              <th scope="col" className="px-4 py-3">Status</th>
              {isOwner ? <th scope="col" className="px-4 py-3">Action</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF1EF]">
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <th scope="row" className="max-w-[260px] truncate px-4 py-3.5 font-medium">{product.name}</th>
                <td className="px-4 py-3.5 text-[#687873]">{product.sku || product.barcode || '—'}</td>
                <td className="px-4 py-3.5 tabular-nums">{money(product.selling_price)}</td>
                {isOwner ? <td className="px-4 py-3.5 tabular-nums">{money(product.cost_price)}</td> : null}
                <td className="px-4 py-3.5 tabular-nums">{stock(product.stock_quantity)}</td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${product.is_active === false ? 'bg-[#F3F4F3] text-[#687873]' : product.is_active === true ? 'bg-[#E8F4EE] text-[#087F5B]' : 'bg-[#F3F4F3] text-[#687873]'}`}>
                    {product.is_active === true ? 'Active' : product.is_active === false ? 'Inactive' : 'Unknown'}
                  </span>
                </td>
                {isOwner ? <td className="px-4 py-3.5 align-top"><ProductActions product={product} /></td> : null}
              </tr>
            ))}
            {filteredProducts.length === 0 ? (
              <tr><td colSpan={isOwner ? 7 : 5} className="px-4 py-10 text-center text-sm text-[#687873]">{products.length ? 'No products match this search.' : 'No products have been added to this store yet.'}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-[#89928D]">Showing {filteredProducts.length} of {products.length} products</p>
    </>
  )
}
