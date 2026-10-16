'use client'

import { useActionState } from 'react'
import { registerStoreDevice, type DeviceActionState } from '@/app/actions/devices'
import { ActionFeedback } from '@/app/components/action-feedback'

type ActiveDevice = { id: string; device_name: string; enrolled_at: string }

export function DeviceManagement({ activeDevice, loadError }: { activeDevice: ActiveDevice | null; loadError: boolean }) {
  const [state, action, pending] = useActionState<DeviceActionState, FormData>(registerStoreDevice, { message: '', error: false })

  return (
    <section aria-labelledby="selling-device-title" className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="selling-device-title" className="text-base font-semibold">Selling device</h2>
          <p className="mt-1 max-w-prose text-sm leading-5 text-[#687873]">One active device connects the store’s shifts and sales.</p>
        </div>
        {!loadError && activeDevice ? (
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#EAF5EF] px-3 py-1.5 text-xs font-medium text-[#176B4C]">
            <span aria-hidden="true" className="size-2 rounded-full bg-[#16835D]" />Active
          </span>
        ) : null}
      </div>

      {loadError ? (
        <p role="alert" className="mt-5 rounded-lg border border-[#E9C9C5] bg-[#FFF8F7] p-4 text-sm leading-6 text-[#8B322B]">
          Device status could not be loaded. Check the store device read policy and reload this page.
        </p>
      ) : activeDevice ? (
        <div className="mt-5 rounded-lg border border-[#DCE5E1] bg-[#F7F8F7] p-4">
          <p className="text-xs font-medium text-[#687873]">Registered name</p>
          <p className="mt-1 break-words text-sm font-semibold text-[#171918]">{activeDevice.device_name}</p>
          <p className="mt-3 text-xs leading-5 text-[#687873]">This is a store record used by shifts and sales. It does not lock checkout to a physical browser.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 rounded-lg border border-dashed border-[#B9C9C1] bg-[#F7FAF8] p-4">
            <p className="text-sm font-medium text-[#171918]">No selling device is registered</p>
            <p className="mt-1 text-sm leading-5 text-[#687873]">Register this counter before opening a shift. The owner’s signed-in session approves the store’s operational device record.</p>
          </div>
          <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label htmlFor="device-name" className="text-sm font-medium text-[#171918]">
              Device name
              <input
                id="device-name"
                name="deviceName"
                required
                autoComplete="off"
                placeholder="For example, Front counter"
                className="mt-1.5 min-h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="min-h-12 cursor-pointer rounded-lg bg-[#171918] px-5 text-sm font-semibold text-white hover:bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16835D]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Registering…' : 'Register device'}
            </button>
          </form>
          <p className="mt-3 text-xs leading-5 text-[#687873]">The device ID associates shifts and sales with this store. It does not verify which physical browser submits a sale.</p>
        </>
      )}
      <ActionFeedback message={state.message} error={state.error} signal={state} />
    </section>
  )
}
