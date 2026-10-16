'use client'

import { useActionState, useState } from 'react'
import { setProductActive, updateProduct, type ActionState } from '@/app/actions/owner'
import type { CatalogProduct } from '@/app/pos/product-catalog'

export function ProductActions({ product }: { product: CatalogProduct }) {
  const [editing, setEditing] = useState(false)
  const [editState, editAction, updating] = useActionState<ActionState, FormData>(updateProduct, { message: '', error: false })
  const [statusState, statusAction, changingStatus] = useActionState<ActionState, FormData>(setProductActive, { message: '', error: false })

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-expanded={editing} onClick={() => setEditing((value) => !value)} className="min-h-12 rounded-lg border border-[#DCE5E1] px-3 text-sm font-medium hover:bg-[#F7F8F7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16835D]/20">
          {editing ? 'Close edit' : 'Edit'}
        </button>
        {product.is_active !== null ? (
          <form action={statusAction} onSubmit={(event) => {
            if (product.is_active && !window.confirm(`Deactivate ${product.name}? It will remain in sales history but cannot be used for new sales.`)) event.preventDefault()
          }}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="isActive" value={String(!product.is_active)} />
            <button disabled={changingStatus} className="min-h-12 rounded-lg px-3 text-sm font-medium text-[#8B322B] hover:bg-[#FFF8F7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B5473D]/15 disabled:cursor-wait disabled:opacity-60">
              {changingStatus ? 'Saving…' : product.is_active ? 'Deactivate' : 'Reactivate'}
            </button>
          </form>
        ) : null}
      </div>

      {editing ? (
        <form action={editAction} className="mt-3 grid min-w-[640px] gap-3 rounded-lg border border-[#E8EAE8] bg-[#FAFBFA] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="productId" value={product.id} />
          <label className="text-sm font-medium">Product name<input required maxLength={120} name="name" defaultValue={product.name} className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
          <label className="text-sm font-medium">Selling price<input required min="0.01" step="0.01" type="number" name="sellingPrice" defaultValue={product.selling_price === null ? '' : String(product.selling_price)} className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
          <label className="text-sm font-medium">Cost price <span className="font-normal text-[#777D79]">(optional)</span><input min="0" step="0.01" type="number" name="costPrice" defaultValue={product.cost_price === null ? '' : String(product.cost_price)} className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
          <label className="text-sm font-medium">SKU <span className="font-normal text-[#777D79]">(optional)</span><input maxLength={120} name="sku" defaultValue={product.sku ?? ''} className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
          <label className="text-sm font-medium">Barcode <span className="font-normal text-[#777D79]">(optional)</span><input maxLength={120} name="barcode" defaultValue={product.barcode ?? ''} className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
          <button disabled={updating} className="min-h-12 self-end rounded-lg bg-[#171918] px-4 text-sm font-semibold text-white hover:bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16835D]/20 disabled:cursor-wait disabled:opacity-60">
            {updating ? 'Saving…' : 'Save changes'}
          </button>
          {editState.message ? <p role={editState.error ? 'alert' : 'status'} className={`text-sm sm:col-span-2 lg:col-span-3 ${editState.error ? 'text-[#9B3028]' : 'text-[#087F5B]'}`}>{editState.message}</p> : null}
        </form>
      ) : null}
      {statusState.message ? <p role={statusState.error ? 'alert' : 'status'} className={`mt-2 text-sm ${statusState.error ? 'text-[#9B3028]' : 'text-[#087F5B]'}`}>{statusState.message}</p> : null}
    </>
  )
}
