'use client'

import { useActionState, useState } from 'react'
import { ActionFeedback } from '@/app/components/action-feedback'
import {
  requestPasswordRecovery,
  updateRecoveredPassword,
  verifyPasswordRecoveryCode,
  type RecoveryState,
} from '@/app/actions/auth'

export function ForgotPasswordForm({ initialState }: { initialState: RecoveryState }) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [requestState, requestAction, requestPending] = useActionState<RecoveryState, FormData>(requestPasswordRecovery, initialState.step === 'set-password' ? {} : initialState)
  const [verifyState, verifyAction, verifyPending] = useActionState<RecoveryState, FormData>(verifyPasswordRecoveryCode, {})
  const [updateState, updateAction, updatePending] = useActionState<RecoveryState, FormData>(updateRecoveredPassword, initialState.step === 'set-password' ? initialState : {})

  const step = updateState.step === 'set-password' || initialState.step === 'set-password'
    ? 'set-password'
    : verifyState.step ?? requestState.step ?? initialState.step
  const email = verifyState.email ?? requestState.email ?? initialState.email ?? ''
  const feedbackState = step === 'set-password'
    ? updateState
    : step === 'recovery-code'
      ? (verifyState.error ? verifyState : requestState)
      : requestState
  const feedbackMessage = feedbackState.error ?? feedbackState.message

  return (
    <>
      {step === 'set-password' ? (
        <form action={updateAction} className="mt-7 space-y-5">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">New password</label>
            <div className="relative">
              <input id="password" name="password" type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" minLength={8} required className="h-12 w-full rounded-lg border border-[#DCE5E1] px-3.5 pr-14 text-base outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" />
              <PasswordVisibilityButton visible={passwordVisible} toggle={() => setPasswordVisible((visible) => !visible)} />
            </div>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">Confirm new password</label>
            <div className="relative">
              <input id="confirmPassword" name="confirmPassword" type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" minLength={8} required className="h-12 w-full rounded-lg border border-[#DCE5E1] px-3.5 pr-14 text-base outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" />
              <PasswordVisibilityButton visible={passwordVisible} toggle={() => setPasswordVisible((visible) => !visible)} />
            </div>
          </div>
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
            <button disabled={verifyPending} className="min-h-12 w-full rounded-lg bg-[#087F5B] px-4 text-sm font-semibold text-white hover:bg-[#066B4D] disabled:opacity-70">{verifyPending ? 'Verifying…' : 'Verify code'}</button>
          </form>
          <form action={requestAction} className="mt-2">
            <input type="hidden" name="email" value={email} />
            <button disabled={requestPending} className="min-h-11 w-full rounded-lg border border-[#DCE5E1] px-4 text-sm font-medium text-[#46534C] hover:bg-[#F7F9F8] disabled:opacity-70">{requestPending ? 'Sending…' : 'Send another code'}</button>
          </form>
        </>
      ) : (
        <form action={requestAction} className="mt-7 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} className="h-12 w-full rounded-lg border border-[#DCE5E1] px-3.5 text-base outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" />
          </div>
          <button disabled={requestPending} className="min-h-12 w-full rounded-lg bg-[#087F5B] px-4 text-sm font-semibold text-white hover:bg-[#066B4D] disabled:opacity-70">{requestPending ? 'Sending…' : 'Send recovery code'}</button>
          <p className="text-xs leading-5 text-[#777D79]">For your privacy, the confirmation message is the same whether or not the email has an account.</p>
        </form>
      )}
      <ActionFeedback message={feedbackMessage} error={Boolean(feedbackState.error)} signal={feedbackState} />
    </>
  )
}

function PasswordVisibilityButton({ visible, toggle }: { visible: boolean; toggle: () => void }) {
  return (
    <button type="button" onClick={toggle} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} className="absolute inset-y-0 right-2 min-w-11 rounded-md px-2 text-[#53645C] hover:bg-[#F3F6F4] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#16835D]">
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="mx-auto size-5">
        {visible ? (
          <><path d="M3 3 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M8.6 8.6a2 2 0 0 0 2.8 2.8M7.1 5.5A9.7 9.7 0 0 1 10 5c4.2 0 7.3 3.1 8.3 5-.4.8-1.2 1.8-2.4 2.7M5.2 6.8C3.4 7.9 2.3 9.3 1.7 10c1 1.9 4.1 5 8.3 5 1 0 2-.2 2.8-.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>
        ) : (
          <><path d="M1.7 10C2.7 8.1 5.8 5 10 5s7.3 3.1 8.3 5c-1 1.9-4.1 5-8.3 5S2.7 11.9 1.7 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" /></>
        )}
      </svg>
    </button>
  )
}
