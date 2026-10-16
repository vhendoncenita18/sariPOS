'use client'

import { useActionState } from 'react'
import { recordRestock, type ActionState } from '@/app/actions/owner'

type RestockProduct = {
  id: string
  name: string
  stock: number
}

export function RestockForm({ products }: { products: RestockProduct[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(recordRestock, { message: '', error: false })

  return (
    <section aria-labelledby="restock-title" className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
      <div className="max-w-2xl">
        <h2 id="restock-title" className="text-base font-semibold">Restock products</h2>
        <p className="mt-1 text-sm leading-6 text-[#687873]">Record newly received units. Each restock adds a positive movement to the inventory ledger.</p>
      </div>

      {products.length > 0 ? (
        <form action={action} className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.55fr)_auto] sm:items-end">
          <label className="text-sm font-medium">
            Product
            <select required name="productId" defaultValue="" className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10">
              <option value="" disabled>Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · current stock {product.stock.toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Quantity received
            <input required min="0.000001" step="any" type="number" inputMode="decimal" name="quantity" className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" />
          </label>
          <button disabled={pending} className="min-h-12 rounded-lg bg-[#171918] px-5 text-sm font-semibold text-white hover:bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16835D]/20 disabled:cursor-wait disabled:opacity-60">
            {pending ? 'Recording…' : 'Record restock'}
          </button>
          {state.message ? <p role={state.error ? 'alert' : 'status'} className={`text-sm sm:col-span-3 ${state.error ? 'text-[#9B3028]' : 'text-[#087F5B]'}`}>{state.message}</p> : null}
        </form>
      ) : (
        <p role="status" className="mt-4 rounded-lg bg-[#F7F8F7] p-4 text-sm leading-6 text-[#687873]">Add a product before recording a restock.</p>
      )}
    </section>
  )
}
