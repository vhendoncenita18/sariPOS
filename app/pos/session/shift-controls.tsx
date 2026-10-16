'use client'

import { useActionState } from 'react'
import { closeShift, openShift, recordShiftCashMovementAction, recordShiftExpenseAction, type ActionState } from '@/app/actions/owner'
import { ConfirmedForm } from '@/app/components/confirmed-form'
import { ActionFeedback } from '@/app/components/action-feedback'

type Device = { id: string; device_name: string }
type ActiveShift = { id: string; opened_at: string; opening_float: number | string; device_id: string; opened_by_user_id: string | null }

export function ShiftControls({ devices, activeShift, canOpen, cashRequestId, expenseRequestId }: { devices: Device[]; activeShift: ActiveShift | null; canOpen: boolean; cashRequestId: string; expenseRequestId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(openShift, { message: '', error: false })
  const [closeState, closeAction, closing] = useActionState<ActionState, FormData>(closeShift, { message: '', error: false })
  const [movementState, movementAction, recordingMovement] = useActionState<ActionState, FormData>(recordShiftCashMovementAction, { message: '', error: false })
  const [expenseState, expenseAction, recordingExpense] = useActionState<ActionState, FormData>(recordShiftExpenseAction, { message: '', error: false })
  return (
    <section className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-base font-semibold">Store shift</h2><p className="mt-1 text-sm text-[#687873]">Opening a shift records its starting cash float and selling device.</p></div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${activeShift ? 'bg-[#E8F4EE] text-[#087F5B]' : 'bg-[#F2F5F3] text-[#687873]'}`}>{activeShift ? 'Open' : 'Closed'}</span>
      </div>

      {activeShift ? (
        <>
          <dl className="mt-5 grid gap-4 border-t border-[#EEF1EF] pt-4 sm:grid-cols-3">
            <div><dt className="text-xs text-[#687873]">Opened</dt><dd className="mt-1 text-sm font-medium">{new Date(activeShift.opened_at).toLocaleString()}</dd></div>
            <div><dt className="text-xs text-[#687873]">Opening float</dt><dd className="mt-1 text-sm font-medium tabular-nums">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(activeShift.opening_float))}</dd></div>
            <div><dt className="text-xs text-[#687873]">Device</dt><dd className="mt-1 truncate text-sm font-medium">{devices.find((device) => device.id === activeShift.device_id)?.device_name ?? 'Registered device'}</dd></div>
          </dl>
          <p className="mt-4 rounded-lg bg-[#F7F8F7] p-3 text-sm leading-5 text-[#687873]">Expected cash stays hidden until you submit the physical count. Closing requires an internet connection; the server finalizes the count after locking the shift and including accepted transactions.</p>
          {canOpen ? <>
          <div className="mt-4 grid gap-4 border-t border-[#EEF1EF] pt-4 lg:grid-cols-2">
            <ConfirmedForm action={movementAction} title="Record this cash movement?" description="This cash removal will be recorded in the shift and audit log. It will reduce expected drawer cash at close." confirmLabel="Record movement" className="grid gap-3 rounded-lg border border-[#E7EBE8] p-4 sm:grid-cols-2">
              <input type="hidden" name="shiftId" value={activeShift.id} />
              <input type="hidden" name="requestId" value={cashRequestId} />
              <h3 className="text-sm font-semibold sm:col-span-2">Cash movement</h3>
              <label className="text-sm font-medium">Type<select required name="movementType" defaultValue="cash_drop" className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal"><option value="cash_drop">Cash drop</option><option value="withdrawal">Withdrawal</option></select></label>
              <label className="text-sm font-medium">Amount<input required min="0.01" step="0.01" type="number" name="amount" className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] px-3 font-normal" /></label>
              <label className="text-sm font-medium sm:col-span-2">Reason<input required maxLength={240} name="reason" className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] px-3 font-normal" /></label>
              <button disabled={recordingMovement} className="min-h-12 cursor-pointer rounded-lg border border-[#DCE5E1] px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">{recordingMovement ? 'Recording…' : 'Record cash movement'}</button>
              <ActionFeedback message={movementState.message} error={movementState.error} signal={movementState} />
            </ConfirmedForm>
            <ConfirmedForm action={expenseAction} title="Record this shift expense?" description="The expense will be attached to this open shift. Only cash-paid expenses reduce expected drawer cash." confirmLabel="Record expense" className="grid gap-3 rounded-lg border border-[#E7EBE8] p-4 sm:grid-cols-2">
              <input type="hidden" name="shiftId" value={activeShift.id} />
              <input type="hidden" name="requestId" value={expenseRequestId} />
              <h3 className="text-sm font-semibold sm:col-span-2">Shift expense</h3>
              <label className="text-sm font-medium">Amount<input required min="0.01" step="0.01" type="number" name="amount" className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] px-3 font-normal" /></label>
              <label className="text-sm font-medium">Paid with<select required name="paymentMethod" defaultValue="cash" className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal"><option value="cash">Cash</option><option value="gcash">GCash</option><option value="maya">Maya</option></select></label>
              <label className="text-sm font-medium sm:col-span-2">Description<input required maxLength={240} name="description" className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] px-3 font-normal" /></label>
              <button disabled={recordingExpense} className="min-h-12 cursor-pointer rounded-lg border border-[#DCE5E1] px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">{recordingExpense ? 'Recording…' : 'Record expense'}</button>
              <ActionFeedback message={expenseState.message} error={expenseState.error} signal={expenseState} />
            </ConfirmedForm>
          </div>
          <ConfirmedForm action={closeAction} title="Close this shift?" description="Submit the counted cash. Expected cash and the variance will be calculated and revealed only after the server successfully finalizes the shift." confirmLabel="Submit count and close" className="mt-4 grid gap-3 border-t border-[#EEF1EF] pt-4 sm:grid-cols-[minmax(0,20rem)_auto] sm:items-end">
            <input type="hidden" name="shiftId" value={activeShift.id} />
            <label className="text-sm font-medium">Physical cash counted<input required min="0" step="0.01" type="number" name="countedCash" className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] px-3 font-normal" /></label>
            <button disabled={closing} className="min-h-12 cursor-pointer rounded-lg bg-[#9B3028] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{closing ? 'Closing…' : 'Submit count and close'}</button>
            <ActionFeedback message={closeState.message} error={closeState.error} signal={closeState} />
          </ConfirmedForm>
          </> : <p className="mt-4 border-t border-[#EEF1EF] pt-4 text-sm text-[#687873]">Your assigned role can view this shift but cannot record cash or close it.</p>}
        </>
      ) : canOpen ? (
        devices.length ? (
          <ConfirmedForm action={action} title="Open this shift?" description="The shift will start for the selected selling device with the opening cash float you entered." confirmLabel="Open shift" className="mt-5 grid gap-4 border-t border-[#EEF1EF] pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm font-medium">Selling device<select required name="deviceId" defaultValue="" className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10"><option value="" disabled>Select a device</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.device_name}</option>)}</select></label>
            <label className="text-sm font-medium">Opening cash float<input required min="0" step="0.01" type="number" name="openingFloat" defaultValue="0" className="mt-1.5 min-h-12 w-full cursor-pointer rounded-lg border border-[#DCE5E1] px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
            <button disabled={pending} className="min-h-12 cursor-pointer rounded-lg bg-[#171918] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Opening…' : 'Open shift'}</button>
            <ActionFeedback message={state.message} error={state.error} signal={state} />
          </ConfirmedForm>
        ) : <p className="mt-4 border-t border-[#EEF1EF] pt-4 text-sm leading-6 text-[#687873]">Register an active selling device before opening a shift. Device enrollment is not connected in this workspace.</p>
      ) : <p className="mt-4 border-t border-[#EEF1EF] pt-4 text-sm leading-6 text-[#687873]">Your assigned role does not include permission to open a shift.</p>}
    </section>
  )
}
