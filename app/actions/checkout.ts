'use server'

import { revalidatePath } from 'next/cache'
import { getStoreContext } from '@/app/pos/store-context'

export type CheckoutState = {
  message: string
  error: boolean
  saleId?: string
  retrySafe?: boolean
  grandTotal?: string
  paymentMethod?: string
}

type CartLine = { id: string; product_id: string; product_name_snapshot: string; unit_price: number; quantity: number; line_discount: number }

const initialState: CheckoutState = { message: '', error: false }
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const cents = (value: unknown) => {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? Math.round((amount + Number.EPSILON) * 100) : NaN
}
const money = (value: number) => (value / 100).toFixed(2)

export async function processCheckout(_previous: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const { supabase, user, storeId, isOwner, permissions } = await getStoreContext()
  if (!isOwner && !permissions.includes('sales.create')) {
    return { ...initialState, message: 'Your store role cannot create sales.', error: true }
  }

  const saleId = String(formData.get('saleId') ?? '')
  const paymentId = String(formData.get('paymentId') ?? '')
  const occurredAt = String(formData.get('occurredAt') ?? '')
  const shiftId = String(formData.get('shiftId') ?? '')
  const deviceId = String(formData.get('deviceId') ?? '')
  const method = String(formData.get('paymentMethod') ?? '')
  const reference = String(formData.get('reference') ?? '').trim()
  const overallDiscount = cents(formData.get('discount') ?? '0')
  let submitted: CartLine[]
  try {
    submitted = JSON.parse(String(formData.get('items') ?? '')) as CartLine[]
  } catch {
    return { ...initialState, message: 'The sale details are invalid. Review the cart and try again.', error: true }
  }

  if (![saleId, paymentId, shiftId, deviceId].every((value) => uuidPattern.test(value)) || !Number.isFinite(Date.parse(occurredAt))) {
    return { ...initialState, message: 'The sale session expired. Start a new sale.', error: true }
  }
  if (!Array.isArray(submitted) || submitted.length === 0 || submitted.length > 100 || !['cash', 'gcash', 'maya'].includes(method)) {
    return { ...initialState, message: 'Add at least one item and choose a payment method.', error: true }
  }
  if (!Number.isFinite(overallDiscount)) {
    return { ...initialState, message: 'Enter a valid sale discount.', error: true }
  }
  if (submitted.some((line) => !line || typeof line !== 'object' || !uuidPattern.test(line.id) || !uuidPattern.test(line.product_id) || typeof line.product_name_snapshot !== 'string' || !line.product_name_snapshot.trim() || !Number.isFinite(cents(line.unit_price)) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10000 || !Number.isFinite(cents(line.line_discount)))) {
    return { ...initialState, message: 'Check the item quantities and discounts.', error: true }
  }

  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('id, device_id, status, opened_by_user_id')
    .eq('id', shiftId)
    .eq('store_id', storeId)
    .eq('status', 'open')
    .maybeSingle()
  if (shiftError || !shift || shift.device_id !== deviceId || (!isOwner && shift.opened_by_user_id !== user.id)) {
    return { ...initialState, message: 'Your open shift is no longer available. Return to My session and check its status.', error: true }
  }

  const items = []
  let subtotal = 0
  let itemDiscountTotal = 0
  for (const line of submitted) {
    const unitPrice = cents(line.unit_price)
    const lineDiscount = cents(line.line_discount)
    const gross = unitPrice * line.quantity
    if (!Number.isSafeInteger(gross) || lineDiscount > gross) {
      return { ...initialState, message: `Check the discount for ${line.product_name_snapshot}.`, error: true }
    }
    const lineTotal = gross - lineDiscount
    subtotal += gross
    itemDiscountTotal += lineDiscount
    items.push({
      id: line.id,
      product_id: line.product_id,
      product_name_snapshot: line.product_name_snapshot,
      unit_price: money(unitPrice),
      quantity: line.quantity,
      line_discount: money(lineDiscount),
      line_total: money(lineTotal),
    })
  }

  const discountAmount = itemDiscountTotal + overallDiscount
  const grandTotal = subtotal - discountAmount
  if (discountAmount > subtotal || !Number.isSafeInteger(grandTotal) || grandTotal < 0) {
    return { ...initialState, message: 'Discounts cannot exceed the sale subtotal.', error: true }
  }

  const amount = grandTotal
  const payment: Record<string, string> = {
    id: paymentId,
    method,
    amount: money(amount),
  }
  if (reference) payment.reference = reference.slice(0, 160)
  if (method === 'cash') {
    const tendered = cents(formData.get('cashTendered'))
    if (!Number.isFinite(tendered) || tendered < amount) {
      return { ...initialState, message: 'Cash received must cover the total due.', error: true }
    }
    payment.cash_tendered = money(tendered)
    payment.change_given = money(tendered - amount)
  }

  const { error } = await supabase.rpc('sync_sale', {
    p_store_id: storeId,
    p_sale_id: saleId,
    p_shift_id: shiftId,
    p_device_id: deviceId,
    p_occurred_at: occurredAt,
    p_items: items,
    p_payment: payment,
    p_subtotal: money(subtotal),
    p_discount_amount: money(discountAmount),
    p_grand_total: money(grandTotal),
  })

  if (error) {
    const message = error.message?.includes('sale_create_permission_required')
      ? 'Your assigned role does not allow creating sales.'
      : error.message?.includes('sale_item_product_snapshot_mismatch')
        ? 'A product price or name changed. Refresh the catalog and start a new sale.'
        : error.code ? 'Sale was not recorded. Correct the details and try again.' : 'The result is unclear. Retry this same sale to safely confirm or finish it.'
    return {
      ...initialState,
      saleId,
      message,
      error: true,
      retrySafe: Boolean(error.code),
    }
  }

  revalidatePath('/pos')
  revalidatePath('/pos/sales')
  return { message: 'Sale recorded.', error: false, saleId, grandTotal: money(grandTotal), paymentMethod: method }
}
