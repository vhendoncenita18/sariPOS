'use server'

import { revalidatePath } from 'next/cache'
import { getStoreContext } from '@/app/pos/store-context'

export type ActionState = { message: string; error: boolean }

function messageFor(error: { message?: string } | null, fallback: string) {
  const message = error?.message ?? ''
  if (message.includes('role_name_exists')) return 'A role with that name already exists.'
  if (message.includes('verified_user_not_found')) return 'No verified SariPOS account uses that email yet.'
  if (message.includes('shift_already_open')) return 'A shift is already open for this store.'
  if (message.includes('active_device_required')) return 'Choose an active registered selling device.'
  if (message.includes('invalid_selling_price')) return 'Enter a selling price greater than zero.'
  if (message.includes('invalid_cost_price')) return 'Cost price cannot be negative.'
  if (message.includes('invalid_product_name')) return 'Enter a product name (up to 120 characters).'
  if (message.includes('product_identifier_conflict')) return 'That SKU or barcode is already used by another product in this store.'
  if (message.includes('invalid_product_status')) return 'Choose whether the product is active or inactive.'
  if (message.includes('invalid_opening_float')) return 'Opening cash cannot be negative.'
  if (message.includes('invalid_opening_stock_quantity')) return 'Enter an opening quantity greater than zero.'
  if (message.includes('invalid_restock_quantity')) return 'Enter a restock quantity greater than zero.'
  if (message.includes('product_not_found')) return 'That product is not available in this store.'
  if (message.includes('opening_stock_already_recorded')) return 'This product already has stock history. Opening stock can only be recorded once; use restock instead.'
  if (message.includes('owner_required')) return 'Only the store owner can make this change.'
  if (message.includes('permitted_authentication_required')) return 'Sign in again with your authenticator or email code before making store changes.'
  return fallback
}

async function ownerContext() {
  const context = await getStoreContext()
  return context.isOwner ? context : null
}

export async function createProduct(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const context = await ownerContext()
  if (!context) return { message: 'Only the store owner can add products.', error: true }

  const name = String(formData.get('name') ?? '').trim()
  const sellingPrice = Number(formData.get('sellingPrice'))
  const costRaw = String(formData.get('costPrice') ?? '').trim()
  const costPrice = costRaw ? Number(costRaw) : null
  const sku = String(formData.get('sku') ?? '').trim() || null
  const barcode = String(formData.get('barcode') ?? '').trim() || null
  if (!name || !Number.isFinite(sellingPrice) || (costPrice !== null && !Number.isFinite(costPrice))) {
    return { message: 'Check the product name and prices, then try again.', error: true }
  }

  const { error } = await context.supabase.rpc('create_product_for_current_store', {
    p_name: name,
    p_selling_price: sellingPrice,
    p_sku: sku,
    p_barcode: barcode,
    p_cost_price: costPrice,
  })
  if (error) return { message: messageFor(error, 'Product could not be saved. Apply the owner operations database migration and try again.'), error: true }

  revalidatePath('/pos/products')
  revalidatePath('/pos/inventory')
  return { message: 'Product added.', error: false }
}

const productIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function updateProduct(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const context = await ownerContext()
  if (!context) return { message: 'Only the store owner can edit products.', error: true }

  const productId = String(formData.get('productId') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const sku = String(formData.get('sku') ?? '').trim() || null
  const barcode = String(formData.get('barcode') ?? '').trim() || null
  const sellingPrice = Number(formData.get('sellingPrice'))
  const costRaw = String(formData.get('costPrice') ?? '').trim()
  const costPrice = costRaw ? Number(costRaw) : null
  if (!productIdPattern.test(productId)) return { message: 'Choose a valid product.', error: true }
  if (!name || !Number.isFinite(sellingPrice) || (costPrice !== null && !Number.isFinite(costPrice))) {
    return { message: 'Check the product name and prices, then try again.', error: true }
  }

  const { error } = await context.supabase.rpc('update_product_for_current_store', {
    p_product_id: productId,
    p_name: name,
    p_sku: sku,
    p_barcode: barcode,
    p_selling_price: sellingPrice,
    p_cost_price: costPrice,
  })
  if (error) return { message: messageFor(error, 'Product could not be updated. Apply the product-management database migration and try again.'), error: true }

  revalidatePath('/pos/products')
  revalidatePath('/pos/inventory')
  revalidatePath('/pos/sales')
  revalidatePath('/pos')
  return { message: 'Product updated.', error: false }
}

export async function setProductActive(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const context = await ownerContext()
  if (!context) return { message: 'Only the store owner can change product status.', error: true }

  const productId = String(formData.get('productId') ?? '')
  const activeValue = String(formData.get('isActive') ?? '')
  if (!productIdPattern.test(productId) || !['true', 'false'].includes(activeValue)) {
    return { message: 'Choose a valid product status.', error: true }
  }

  const isActive = activeValue === 'true'
  const { error } = await context.supabase.rpc('set_product_active_for_current_store', {
    p_product_id: productId,
    p_is_active: isActive,
  })
  if (error) return { message: messageFor(error, `Product could not be ${isActive ? 'reactivated' : 'deactivated'}. Apply the product-management database migration and try again.`), error: true }

  revalidatePath('/pos/products')
  revalidatePath('/pos/inventory')
  revalidatePath('/pos/sales')
  revalidatePath('/pos')
  return { message: isActive ? 'Product reactivated.' : 'Product deactivated.', error: false }
}

export async function recordOpeningStock(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const context = await ownerContext()
  if (!context) return { message: 'Only the store owner can record opening stock.', error: true }

  const productId = String(formData.get('productId') ?? '')
  const quantity = Number(formData.get('quantity'))
  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    return { message: 'Enter a product and an opening quantity greater than zero.', error: true }
  }

  const { error } = await context.supabase.rpc('record_opening_stock', {
    p_product_id: productId,
    p_quantity: quantity,
  })
  if (error) return { message: messageFor(error, 'Opening stock could not be recorded. Apply the opening-stock database migration and try again.'), error: true }

  revalidatePath('/pos/inventory')
  revalidatePath('/pos/products')
  revalidatePath('/pos')
  return { message: 'Opening stock recorded.', error: false }
}

export async function recordRestock(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const context = await ownerContext()
  if (!context) return { message: 'Only the store owner can record restocks.', error: true }

  const productId = String(formData.get('productId') ?? '')
  const quantity = Number(formData.get('quantity'))
  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    return { message: 'Enter a product and a restock quantity greater than zero.', error: true }
  }

  const { error } = await context.supabase.rpc('record_restock', {
    p_product_id: productId,
    p_quantity: quantity,
  })
  if (error) return { message: messageFor(error, 'Restock could not be recorded. Apply the restock database migration and try again.'), error: true }

  revalidatePath('/pos/inventory')
  revalidatePath('/pos/products')
  revalidatePath('/pos')
  return { message: 'Restock recorded.', error: false }
}

const allowedPermissions = new Set(['products.view', 'inventory.view', 'shift.open', 'own_session.view', 'sales.create'])

export async function createStoreRole(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const context = await ownerContext()
  if (!context) return { message: 'Only the store owner can create roles.', error: true }
  const name = String(formData.get('name') ?? '').trim()
  const permissions = formData.getAll('permissions').map(String).filter((value) => allowedPermissions.has(value))
  const { error } = await context.supabase.rpc('create_store_role', { p_name: name, p_permissions: permissions })
  if (error) return { message: messageFor(error, 'Role could not be created. Apply the owner operations database migration and try again.'), error: true }
  revalidatePath('/pos/settings')
  return { message: 'Role created.', error: false }
}

export async function assignStoreRole(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const context = await ownerContext()
  if (!context) return { message: 'Only the store owner can assign roles.', error: true }
  const email = String(formData.get('email') ?? '').trim()
  const roleId = String(formData.get('roleId') ?? '')
  if (!email || !roleId) return { message: 'Enter a verified user email and select a role.', error: true }
  const { error } = await context.supabase.rpc('assign_store_role', { p_email: email, p_role_id: roleId })
  if (error) return { message: messageFor(error, 'Role could not be assigned. Apply the owner operations database migration and try again.'), error: true }
  revalidatePath('/pos/settings')
  return { message: 'Store role assigned.', error: false }
}

export async function openShift(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const context = await getStoreContext()
  const deviceId = String(formData.get('deviceId') ?? '')
  const openingFloat = Number(formData.get('openingFloat'))
  if (!deviceId || !Number.isFinite(openingFloat)) return { message: 'Choose a selling device and enter the opening float.', error: true }
  const { error } = await context.supabase.rpc('open_store_shift', { p_device_id: deviceId, p_opening_float: openingFloat })
  if (error) return { message: messageFor(error, 'Shift could not be opened. Check the registered device and apply the owner operations migration.'), error: true }
  revalidatePath('/pos/session')
  revalidatePath('/pos')
  return { message: 'Shift opened.', error: false }
}
