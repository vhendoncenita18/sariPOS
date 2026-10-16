'use client'

import { useActionState, useState } from 'react'
import { setProductActive, updateProduct, type ActionState } from '@/app/actions/owner'
import type { CatalogProduct } from '@/app/pos/product-catalog'
import { ConfirmedForm } from '@/app/components/confirmed-form'
import { ActionFeedback } from '@/app/components/action-feedback'

export function ProductActions({ product }: { product: CatalogProduct }) {
  const [editing, setEditing] = useState(false)
  const [editState, editAction, updating] = useActionState<ActionState, FormData>(updateProduct, { message: '', error: false })
  const [statusState, statusAction, changingStatus] = useActionState<ActionState, FormData>(setProductActive, { message: '', error: false })

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-expanded={editing} onClick={() => setEditing((value) => !value)} className="min-h-9 rounded-lg border border-[#DCE5E1] px-1.5 text-sm font-medium hover:bg-[#F7F8F7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16835D]/20">
          <span className="inline-flex items-center gap-1">
            {editing ? (
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4"><path d="m12.9 4.1 3 3M4 16l3.1-.6L16.4 6a1.8 1.8 0 0 0-2.5-2.5L4.6 12.9 4 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
            {editing ? 'Close edit' : 'Edit'}
          </span>
        </button>
        {product.is_active !== null ? (
          <ConfirmedForm action={statusAction} title={product.is_active ? `Deactivate ${product.name}?` : `Reactivate ${product.name}?`} description={product.is_active ? 'It will remain in sales history, but it cannot be added to new sales.' : 'It will become available in the product catalog for new sales.'} confirmLabel={product.is_active ? 'Deactivate product' : 'Reactivate product'} destructive={product.is_active}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="isActive" value={String(!product.is_active)} />
            <button disabled={changingStatus} className="min-h-9 rounded-lg px-1.5 text-sm font-medium text-[#8B322B] hover:bg-[#FFF8F7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B5473D]/15 disabled:cursor-wait disabled:opacity-60">
              <span className="inline-flex items-center gap-1">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" /><path d={product.is_active ? 'M7 10h6' : 'M10 7v6M7 10h6'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              {changingStatus ? 'Saving…' : product.is_active ? 'Deactivate' : 'Reactivate'}
              </span>
            </button>
          </ConfirmedForm>
        ) : null}
      </div>

      {editing ? (
        <ConfirmedForm action={editAction} title="Save product changes?" description={`Your changes to ${product.name} will update the store catalog.`} confirmLabel="Save changes" className="mt-3 grid w-[min(36rem,calc(100vw-3rem))] max-w-full gap-3 rounded-lg border border-[#E8EAE8] bg-[#FAFBFA] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="productId" value={product.id} />
          <label className="text-sm font-medium">Product name<input required maxLength={120} name="name" defaultValue={product.name} className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
          <label className="text-sm font-medium">Selling price<input required min="0.01" step="0.01" type="number" name="sellingPrice" defaultValue={product.selling_price === null ? '' : String(product.selling_price)} className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
          <label className="text-sm font-medium">Cost price <span className="font-normal text-[#777D79]">(optional)</span><input min="0" step="0.01" type="number" name="costPrice" defaultValue={product.cost_price === null ? '' : String(product.cost_price)} className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
          <label className="text-sm font-medium">SKU <span className="font-normal text-[#777D79]">(optional)</span><input maxLength={120} name="sku" defaultValue={product.sku ?? ''} className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
          <label className="text-sm font-medium">Barcode <span className="font-normal text-[#777D79]">(optional)</span><input maxLength={120} name="barcode" defaultValue={product.barcode ?? ''} className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
          <button disabled={updating} className="min-h-12 self-end rounded-lg bg-[#171918] px-4 text-sm font-semibold text-white hover:bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16835D]/20 disabled:cursor-wait disabled:opacity-60">
            {updating ? 'Saving…' : 'Save changes'}
          </button>
          <ActionFeedback message={editState.message} error={editState.error} signal={editState} />
        </ConfirmedForm>
      ) : null}
      <ActionFeedback message={statusState.message} error={statusState.error} signal={statusState} />
    </>
  )
}
