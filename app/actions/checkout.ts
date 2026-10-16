'use server'

import { revalidatePath } from 'next/cache'
import { getStoreContext } from '@/app/pos/store-context'

export interface CartItemInput {
  product_id: string
  quantity: number
  unit_price: number
  discount_amount?: number
}

export interface SyncSalePayload {
  customer_name?: string
  subtotal: number
  discount_amount: number
  grand_total: number
  payment_method: 'cash' | 'e-wallet'
  items: CartItemInput[]
}

export async function processCheckout(payload: SyncSalePayload) {
  const { supabase, isOwner, permissions } = await getStoreContext()
  if (!isOwner && !permissions.includes('sales.create')) return { success: false, error: 'Your store role cannot create sales.' }

  // Enforce mathematical integrity guardrail
  const calculatedTotal = payload.subtotal - payload.discount_amount
  if (Math.abs(payload.grand_total - calculatedTotal) > 0.01) {
    return { success: false, error: 'Invalid total breakdown' }
  }

  const { data, error } = await supabase.rpc('sync_sale', {
    p_sale_data: payload,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/pos')
  return { success: true, data }
}
