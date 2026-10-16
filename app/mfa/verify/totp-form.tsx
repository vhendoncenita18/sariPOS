'use client'

import { useActionState } from 'react'
import { verifyTotp, type AuthState } from '@/app/actions/auth'

export function TotpForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyTotp, {})

  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="otp" className="mb-2 block text-sm font-medium">Authenticator code</label>
        <input id="otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="000000" className="h-12 w-full rounded-lg border border-[#DCE5E1] px-3 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" />
      </div>
      <p aria-live="polite" className="min-h-10 text-sm leading-5 text-[#B42318]">{state.error}</p>
      <button disabled={pending} className="min-h-12 w-full rounded-lg bg-[#087F5B] px-4 text-sm font-semibold text-white hover:bg-[#066B4D] disabled:opacity-70">{pending ? 'Verifying…' : 'Verify and continue'}</button>
    </form>
  )
}
