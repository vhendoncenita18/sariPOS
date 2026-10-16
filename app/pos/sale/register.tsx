'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { processCheckout, type CheckoutState } from '@/app/actions/checkout'

export type SaleProduct = { id: string; name: string; sku: string | null; barcode: string | null; price: number; stock: number }
type CartLine = { id: string; product_id: string; quantity: number; line_discount: number }
type SaleAttempt = { saleId: string; paymentId: string; occurredAt: string }
const initialState: CheckoutState = { message: '', error: false }
const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value)

export function SaleRegister({ products, shiftId, deviceId }: { products: SaleProduct[]; shiftId: string; deviceId: string }) {
  const [state, action, pending] = useActionState(processCheckout, initialState)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [attempt, setAttempt] = useState<SaleAttempt | null>(null)
  const [discount, setDiscount] = useState('0')
  const [method, setMethod] = useState<'cash' | 'gcash' | 'maya'>('cash')
  const [tendered, setTendered] = useState('')
  const [reference, setReference] = useState('')
  const lockedForRetry = Boolean(state.error && state.saleId && attempt?.saleId === state.saleId && !state.retrySafe)

  useEffect(() => {
    if (!state.error && state.saleId && attempt?.saleId === state.saleId) {
      setCart([])
      setAttempt(null)
      setDiscount('0')
      setTendered('')
      setReference('')
    }
  }, [attempt?.saleId, state.error, state.saleId])

  const filtered = useMemo(() => {
    const value = search.trim().toLocaleLowerCase()
    return products.filter((product) => !value || [product.name, product.sku, product.barcode].some((field) => field?.toLocaleLowerCase().includes(value)))
  }, [products, search])
  const detailById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const subtotal = cart.reduce((sum, line) => sum + (detailById.get(line.product_id)?.price ?? 0) * line.quantity, 0)
  const itemDiscount = cart.reduce((sum, line) => sum + line.line_discount, 0)
  const totalDiscount = itemDiscount + (Number(discount) || 0)
  const total = Math.max(0, subtotal - totalDiscount)
  const change = Math.max(0, (Number(tendered) || 0) - total)
  const cartLocked = lockedForRetry || pending

  function addProduct(product: SaleProduct) {
    if (cartLocked || product.stock <= 0) return
    if (!attempt) setAttempt({ saleId: crypto.randomUUID(), paymentId: crypto.randomUUID(), occurredAt: new Date().toISOString() })
    setCart((current) => {
      const existing = current.find((line) => line.product_id === product.id)
      return existing
        ? current.map((line) => line.product_id === product.id ? { ...line, quantity: Math.min(product.stock, line.quantity + 1) } : line)
        : [...current, { id: crypto.randomUUID(), product_id: product.id, quantity: 1, line_discount: 0 }]
    })
  }

  function updateLine(productId: string, update: Partial<Pick<CartLine, 'quantity' | 'line_discount'>>) {
    if (cartLocked) return
    setCart((current) => current.map((line) => line.product_id === productId ? { ...line, ...update } : line))
  }

  function removeProduct(productId: string) {
    if (!cartLocked) setCart((current) => current.filter((line) => line.product_id !== productId))
  }

  return (
    <form action={action} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,430px)]">
      <input type="hidden" name="shiftId" value={shiftId} /><input type="hidden" name="deviceId" value={deviceId} />
      <input type="hidden" name="saleId" value={attempt?.saleId ?? ''} /><input type="hidden" name="paymentId" value={attempt?.paymentId ?? ''} /><input type="hidden" name="occurredAt" value={attempt?.occurredAt ?? ''} />
      <input type="hidden" name="items" value={JSON.stringify(cart)} />

      <section className="min-w-0">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block flex-1"><span className="sr-only">Find products by name, SKU, or barcode</span><span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#687873]">⌕</span><input autoComplete="off" disabled={cartLocked} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Scan barcode or search products" className="min-h-[52px] w-full rounded-xl border border-[#DCE5E1] bg-white pl-11 pr-4 text-sm outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10 disabled:bg-[#F3F6F4]" /></label>
          <p className="shrink-0 rounded-lg bg-[#E8F4EE] px-3 py-2 text-sm font-medium text-[#176B4C]">Shift open</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((product) => (
            <button key={product.id} type="button" disabled={cartLocked || product.stock <= 0} onClick={() => addProduct(product)} className="group flex min-h-[116px] cursor-pointer flex-col justify-between rounded-xl border border-[#E2E8E4] bg-white p-4 text-left transition-colors hover:border-[#16835D] hover:bg-[#FAFCFB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D] disabled:cursor-not-allowed disabled:opacity-55">
              <span className="line-clamp-2 text-sm font-semibold leading-5">{product.name}</span>
              <span className="mt-3 flex w-full items-end justify-between gap-2"><span className="text-lg font-semibold tabular-nums tracking-tight">{money(product.price)}</span><span className="text-xs text-[#687873]">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span></span>
            </button>
          ))}
          {filtered.length === 0 ? <p className="col-span-full rounded-xl border border-dashed border-[#DCE5E1] bg-white p-8 text-center text-sm text-[#687873]">{products.length ? 'No products match that search.' : 'This store has no active products yet.'}</p> : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#E2E8E4] bg-white xl:sticky xl:top-[88px]">
        <header className="flex items-center justify-between border-b border-[#EEF1EF] px-5 py-4"><div><h2 className="font-semibold">Current sale</h2><p className="mt-1 text-xs text-[#687873]">{cart.length} {cart.length === 1 ? 'product' : 'products'}</p></div>{cart.length ? <button type="button" disabled={cartLocked} onClick={() => { setCart([]); setAttempt(null); setDiscount('0'); setTendered('') }} className="min-h-10 cursor-pointer px-2 text-sm font-medium text-[#687873] hover:text-[#9B3028] disabled:cursor-not-allowed">Clear sale</button> : null}</header>

        <div className="max-h-[38vh] min-h-24 divide-y divide-[#EEF1EF] overflow-y-auto px-5">
          {cart.map((line) => {
            const product = detailById.get(line.product_id)
            if (!product) return null
            return <div key={line.id} className="py-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{product.name}</p><p className="mt-1 text-xs tabular-nums text-[#687873]">{money(product.price)} each</p></div><button type="button" aria-label={`Remove ${product.name}`} disabled={cartLocked} onClick={() => removeProduct(line.product_id)} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-lg text-[#687873] hover:bg-[#F7F8F7] hover:text-[#9B3028] disabled:cursor-not-allowed">×</button></div>
              <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-3"><label className="text-xs text-[#687873]">Quantity<input aria-label={`${product.name} quantity`} type="number" min="1" max={product.stock} step="1" value={line.quantity} disabled={cartLocked} onChange={(event) => updateLine(line.product_id, { quantity: Math.min(product.stock, Math.max(1, Number(event.target.value) || 1)) })} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE5E1] px-3 text-sm text-[#171918] outline-none focus:border-[#16835D] disabled:bg-[#F3F6F4]" /></label><label className="text-xs text-[#687873]">Item discount<input aria-label={`${product.name} discount`} type="number" min="0" max={product.price * line.quantity} step="0.01" value={line.line_discount} disabled={cartLocked} onChange={(event) => updateLine(line.product_id, { line_discount: Math.max(0, Number(event.target.value) || 0) })} className="mt-1 min-h-11 w-full rounded-lg border border-[#DCE5E1] px-3 text-sm text-[#171918] outline-none focus:border-[#16835D] disabled:bg-[#F3F6F4]" /></label><p className="pb-3 text-sm font-semibold tabular-nums">{money(product.price * line.quantity - line.line_discount)}</p></div>
            </div>
          })}
          {!cart.length ? <div className="grid min-h-28 place-items-center text-sm text-[#89928D]">Add an item to start the sale</div> : null}
        </div>

        <div className="space-y-3 border-t border-[#EEF1EF] px-5 py-4">
          <div className="flex justify-between text-sm text-[#687873]"><span>Subtotal</span><span className="tabular-nums">{money(subtotal)}</span></div>
          <div className="flex items-center justify-between gap-4 text-sm text-[#687873]"><label htmlFor="sale-discount">Sale discount</label><span className="flex items-center gap-1">₱<input id="sale-discount" name="discount" type="number" min="0" max={Math.max(0, subtotal - itemDiscount)} step="0.01" value={discount} disabled={cartLocked} onChange={(event) => setDiscount(event.target.value)} className="min-h-10 w-28 rounded-lg border border-[#DCE5E1] px-2 text-right text-sm text-[#171918] outline-none focus:border-[#16835D] disabled:bg-[#F3F6F4]" /></span></div>
          <div className="flex items-center justify-between border-t border-[#EEF1EF] pt-3"><span className="font-semibold">Due</span><span className="text-[26px] font-semibold tabular-nums tracking-tight">{money(total)}</span></div>

          <label className="block text-sm font-medium">Payment method<select name="paymentMethod" value={method} disabled={cartLocked} onChange={(event) => setMethod(event.target.value as typeof method)} className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] bg-white px-3 outline-none focus:border-[#16835D] disabled:cursor-not-allowed disabled:bg-[#F3F6F4]"><option value="cash">Cash</option><option value="gcash">GCash</option><option value="maya">Maya</option></select></label>
          {method === 'cash' ? <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Cash received<input name="cashTendered" required type="number" min={total} step="0.01" value={tendered} disabled={cartLocked} onChange={(event) => setTendered(event.target.value)} placeholder="0.00" className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] px-3 tabular-nums outline-none focus:border-[#16835D] disabled:bg-[#F3F6F4]" /></label><div className="text-sm font-medium">Change due<div className="mt-1.5 flex min-h-12 items-center rounded-lg bg-[#F3F6F4] px-3 font-semibold tabular-nums">{money(change)}</div></div></div> : <label className="block text-sm font-medium">Payment reference <span className="font-normal text-[#89928D]">(optional)</span><input name="reference" maxLength={160} value={reference} disabled={cartLocked} onChange={(event) => setReference(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] px-3 font-normal outline-none focus:border-[#16835D] disabled:bg-[#F3F6F4]" /></label>}

          {state.message ? <p role={state.error ? 'alert' : 'status'} className={`rounded-lg px-3 py-2.5 text-sm leading-5 ${state.error ? 'bg-[#FFF3F1] text-[#8B322B]' : 'bg-[#E8F4EE] text-[#176B4C]'}`}>{state.message}</p> : null}
          {lockedForRetry ? <p className="text-xs leading-5 text-[#687873]">The first request may have completed. Retry without changing this basket; the sale ID prevents a duplicate.</p> : null}
          <button type="submit" disabled={pending || !cart.length || total < 0 || (method === 'cash' && (Number(tendered) || 0) < total)} className="min-h-[52px] w-full cursor-pointer rounded-lg bg-[#087F5B] px-4 text-base font-semibold text-white hover:bg-[#076A4D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087F5B] disabled:cursor-not-allowed disabled:bg-[#A9BCB3]">{pending ? 'Recording sale…' : lockedForRetry ? 'Retry same sale' : 'Complete sale'}</button>
          <p className="text-center text-xs leading-5 text-[#89928D]">Checkout is online-only. Server checks current prices, stock, shift, device, and cashier access.</p>
        </div>
      </section>
    </form>
  )
}
