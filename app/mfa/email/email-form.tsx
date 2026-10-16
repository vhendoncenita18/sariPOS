'use client'

import { useActionState } from 'react'
import { resendEmailSecondFactor, verifyEmailSecondFactor, type AuthState } from '@/app/actions/auth'
import { ActionFeedback } from '@/app/components/action-feedback'

export function EmailCodeForm({ email, notice }: { email: string; notice?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyEmailSecondFactor, {})
  const [resendState, resendAction, resendPending] = useActionState<AuthState, FormData>(resendEmailSecondFactor, {})

  return (
    <>
      <form action={action} className="mt-6 space-y-4">
        <div>
          <label htmlFor="otp" className="mb-2 block text-sm font-medium">Email code</label>
          <input id="otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="000000" className="h-12 w-full rounded-lg border border-[#DCE5E1] px-3 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" />
        </div>
        <button disabled={pending} className="min-h-12 w-full rounded-lg bg-[#087F5B] px-4 text-sm font-semibold text-white hover:bg-[#066B4D] disabled:opacity-70">{pending ? 'Verifying…' : 'Verify and continue'}</button>
      </form>
      <form action={resendAction} className="mt-2">
        <button disabled={resendPending} className="min-h-11 w-full rounded-lg border border-[#DCE5E1] px-4 text-sm font-medium text-[#46534C] hover:bg-[#F7F9F8] disabled:cursor-wait disabled:opacity-70">{resendPending ? 'Sending…' : 'Resend code'}</button>
      </form>
      <p className="mt-3 text-center text-xs leading-5 text-[#777D79]">Enter the six-digit code sent to {email}. Email OTP is an AAL1 fallback.</p>
      <ActionFeedback
        message={resendState.error ?? resendState.message ?? state.error ?? notice}
        error={Boolean(resendState.error ?? state.error ?? notice?.startsWith('Error:'))}
        signal={resendState.error || resendState.message ? resendState : state}
      />
    </>
  )
}
