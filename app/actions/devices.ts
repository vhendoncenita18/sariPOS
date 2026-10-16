'use server'

import { revalidatePath } from 'next/cache'
import { getStoreContext } from '@/app/pos/store-context'

export type DeviceActionState = { message: string; error: boolean }

export async function registerStoreDevice(_previous: DeviceActionState, formData: FormData): Promise<DeviceActionState> {
  const context = await getStoreContext()
  if (!context.isOwner) return { message: 'Only the store owner can register a selling device.', error: true }

  const deviceName = String(formData.get('deviceName') ?? '').trim()
  if (!deviceName) return { message: 'Enter a name for this selling device.', error: true }

  const { error } = await context.supabase.rpc('register_store_device', { p_device_name: deviceName })
  if (error) {
    const databaseMessage = error.message ?? ''
    if (databaseMessage.includes('permitted_authentication_required')) {
      return { message: 'Sign in again with your authenticator or email code before registering a device.', error: true }
    }
    if (databaseMessage.includes('owner_required')) {
      return { message: 'Only the store owner can register a selling device.', error: true }
    }
    if (databaseMessage.includes('invalid_device_name')) {
      return { message: 'Enter a name for this selling device.', error: true }
    }
    if (databaseMessage.includes('active_device_already_registered') || databaseMessage.includes('one_active_device_per_store')) {
      revalidatePath('/pos/settings')
      return { message: 'This store already has an active selling device. Reload Store settings to view it.', error: true }
    }
    return { message: 'Device could not be registered. Apply the device registration migration, then try again.', error: true }
  }

  revalidatePath('/pos/settings')
  revalidatePath('/pos/session')
  revalidatePath('/pos/sale')
  revalidatePath('/pos')
  return { message: 'Selling device registered.', error: false }
}
