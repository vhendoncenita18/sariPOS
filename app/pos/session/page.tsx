import { randomUUID } from 'node:crypto'
import Link from 'next/link'
import { getStoreContext } from '@/app/pos/store-context'
import { ShiftControls } from '@/app/pos/session/shift-controls'
import { redirect } from 'next/navigation'

export default async function SessionPage() {
  const { supabase, storeId, isOwner, permissions } = await getStoreContext()
  if (!isOwner && !permissions.includes('own_session.view') && !permissions.includes('shift.open')) redirect('/pos')
  const [shiftResult, deviceResult, permissionResult] = await Promise.all([
    supabase.from('shifts').select('id, opened_at, opening_float, device_id, opened_by_user_id').eq('store_id', storeId).eq('status', 'open').maybeSingle(),
    supabase.from('store_devices').select('id, device_name').eq('store_id', storeId).eq('is_active', true).is('revoked_at', null).order('device_name'),
    supabase.rpc('can_open_store_shift'),
  ])

  return (
    <main className="mx-auto max-w-[1560px] px-4 py-7 sm:px-7 lg:px-9">
      <header className="mb-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-[28px] font-semibold leading-tight tracking-[-0.04em]">Store shift</h1>
            <p className="mt-1.5 text-sm text-[#687873]">Open the selling shift, record cash activity, or close it with a blind cash count.</p></div>
          <Link href="/pos/session/history" className="inline-flex min-h-12 items-center rounded-lg border border-[#DCE5E1] px-4 text-sm font-semibold hover:bg-[#F7F8F7]">Shift history</Link>
        </div>
      </header>
      {shiftResult.error || deviceResult.error || permissionResult.error ? (
        <section role="alert" className="rounded-xl border border-[#E9C9C5] bg-[#FFF8F7] p-5 text-sm leading-6 text-[#8B322B]">Shift access is not configured. Apply the owner and role operations migration, and check this store’s shift and device read policies.</section>
      ) : <ShiftControls devices={deviceResult.data ?? []} activeShift={shiftResult.data} canOpen={permissionResult.data === true} cashRequestId={randomUUID()} expenseRequestId={randomUUID()} />}
    </main>
  )
}
