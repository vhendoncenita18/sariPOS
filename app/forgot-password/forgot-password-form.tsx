'use client'

import { useActionState } from 'react'
import {
  requestPasswordRecovery,
  updateRecoveredPassword,
  verifyPasswordRecoveryCode,
  type RecoveryState,
} from '@/app/actions/auth'

export function ForgotPasswordForm({ initialState }: { initialState: RecoveryState }) {
  const [requestState, requestAction, requestPending] = useActionState<RecoveryState, FormData>(requestPasswordRecovery, initialState.step === 'set-password' ? {} : initialState)
  const [verifyState, verifyAction, verifyPending] = useActionState<RecoveryState, FormData>(verifyPasswordRecoveryCode, {})
  const [updateState, updateAction, updatePending] = useActionState<RecoveryState, FormData>(updateRecoveredPassword, initialState.step === 'set-password' ? initialState : {})

  const step = updateState.step === 'set-password' || initialState.step === 'set-password'
    ? 'set-password'
    : verifyState.step ?? requestState.step ?? initialState.step
  const email = verifyState.email ?? requestState.email ?? initialState.email ?? ''

  return (
    <>
      {step === 'set-password' ? (
        <form action={updateAction} className="mt-7 space-y-5">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">New password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="h-12 w-full rounded-lg border border-[#DCE5E1] px-3.5 text-base outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">Confirm new password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required className="h-12 w-full rounded-lg border border-[#DCE5E1] px-3.5 text-base outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" />
          </div>
          <p aria-live="polite" className="min-h-8 text-sm leading-5 text-[#B42318]">{updateState.error}</p>
          <button disabled={updatePending} className="min-h-12 w-full rounded-lg bg-[#087F5B] px-4 text-sm font-semibold text-white hover:bg-[#066B4D] disabled:opacity-70">{updatePending ? 'Updating…' : 'Save new password'}</button>
        </form>
      ) : step === 'recovery-code' ? (
        <>
          <p className="mt-4 text-sm leading-6 text-[#687873]">If an account exists for {email}, we sent a six-digit recovery code. It expires in 10 minutes.</p>
          <form action={verifyAction} className="mt-5 space-y-4">
            <input type="hidden" name="email" value={email} />
            <div>
              <label htmlFor="otp" className="mb-2 block text-sm font-medium">Recovery code</label>
              <input id="otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="000000" className="h-12 w-full rounded-lg border border-[#DCE5E1] px-3 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" />
            </div>
            <p aria-live="polite" className="min-h-8 text-sm leading-5 text-[#B42318]">{verifyState.error}</p>
            <button disabled={verifyPending} className="min-h-12 w-full rounded-lg bg-[#087F5B] px-4 text-sm font-semibold text-white hover:bg-[#066B4D] disabled:opacity-70">{verifyPending ? 'Verifying…' : 'Verify code'}</button>
          </form>
          <form action={requestAction} className="mt-2">
            <input type="hidden" name="email" value={email} />
            <button disabled={requestPending} className="min-h-11 w-full rounded-lg border border-[#DCE5E1] px-4 text-sm font-medium text-[#46534C] hover:bg-[#F7F9F8] disabled:opacity-70">{requestPending ? 'Sending…' : 'Send another code'}</button>
          </form>
          <p aria-live="polite" className="min-h-6 pt-1 text-center text-xs text-[#087F5B]">{requestState.message}</p>
        </>
      ) : (
        <form action={requestAction} className="mt-7 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} className="h-12 w-full rounded-lg border border-[#DCE5E1] px-3.5 text-base outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" />
          </div>
          <p aria-live="polite" className="min-h-8 text-sm leading-5 text-[#B42318]">{requestState.error}</p>
          <button disabled={requestPending} className="min-h-12 w-full rounded-lg bg-[#087F5B] px-4 text-sm font-semibold text-white hover:bg-[#066B4D] disabled:opacity-70">{requestPending ? 'Sending…' : 'Send recovery code'}</button>
          <p className="text-xs leading-5 text-[#777D79]">For your privacy, the confirmation message is the same whether or not the email has an account.</p>
        </form>
      )}
    </>
  )
}
