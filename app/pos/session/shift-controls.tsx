'use client'

import { useActionState } from 'react'
import { openShift, type ActionState } from '@/app/actions/owner'
import { ConfirmedForm } from '@/app/components/confirmed-form'
import { ActionFeedback } from '@/app/components/action-feedback'

type Device = { id: string; device_name: string }
type ActiveShift = { id: string; opened_at: string; opening_float: number | string; device_id: string }

export function ShiftControls({ devices, activeShift, canOpen }: { devices: Device[]; activeShift: ActiveShift | null; canOpen: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(openShift, { message: '', error: false })
  return (
    <section className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-base font-semibold">Store shift</h2><p className="mt-1 text-sm text-[#687873]">Opening a shift records its starting cash float and selling device.</p></div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${activeShift ? 'bg-[#E8F4EE] text-[#087F5B]' : 'bg-[#F2F5F3] text-[#687873]'}`}>{activeShift ? 'Open' : 'Closed'}</span>
      </div>

      {activeShift ? (
        <dl className="mt-5 grid gap-4 border-t border-[#EEF1EF] pt-4 sm:grid-cols-3">
          <div><dt className="text-xs text-[#687873]">Opened</dt><dd className="mt-1 text-sm font-medium">{new Date(activeShift.opened_at).toLocaleString()}</dd></div>
          <div><dt className="text-xs text-[#687873]">Opening float</dt><dd className="mt-1 text-sm font-medium tabular-nums">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(activeShift.opening_float))}</dd></div>
          <div><dt className="text-xs text-[#687873]">Device</dt><dd className="mt-1 truncate text-sm font-medium">{devices.find((device) => device.id === activeShift.device_id)?.device_name ?? 'Registered device'}</dd></div>
        </dl>
      ) : canOpen ? (
        devices.length ? (
          <ConfirmedForm action={action} title="Open this shift?" description="The shift will start for the selected selling device with the opening cash float you entered." confirmLabel="Open shift" className="mt-5 grid gap-4 border-t border-[#EEF1EF] pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm font-medium">Selling device<select required name="deviceId" defaultValue="" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10"><option value="" disabled>Select a device</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.device_name}</option>)}</select></label>
            <label className="text-sm font-medium">Opening cash float<input required min="0" step="0.01" type="number" name="openingFloat" defaultValue="0" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#DCE5E1] px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
            <button disabled={pending} className="min-h-11 rounded-lg bg-[#171918] px-4 text-sm font-semibold text-white disabled:opacity-60">{pending ? 'Opening…' : 'Open shift'}</button>
            <ActionFeedback message={state.message} error={state.error} signal={state} />
          </ConfirmedForm>
        ) : <p className="mt-4 border-t border-[#EEF1EF] pt-4 text-sm leading-6 text-[#687873]">Register an active selling device before opening a shift. Device enrollment is not connected in this workspace.</p>
      ) : <p className="mt-4 border-t border-[#EEF1EF] pt-4 text-sm leading-6 text-[#687873]">Your assigned role does not include permission to open a shift.</p>}
    </section>
  )
}
