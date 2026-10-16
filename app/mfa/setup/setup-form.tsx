'use client'

import Image from 'next/image'
import { useActionState } from 'react'
import { enrollTotp, verifyTotpEnrollment, type AuthState } from '@/app/actions/auth'
import { ActionFeedback } from '@/app/components/action-feedback'

export function TotpSetupForm() {
  const [setup, setupAction, setupPending] = useActionState<AuthState, FormData>(enrollTotp, {})
  const [verify, verifyAction, verifyPending] = useActionState<AuthState, FormData>(verifyTotpEnrollment, {})

  return (
    <>
      {!setup.qrCode ? (
        <form action={setupAction} className="mt-6">
          <button disabled={setupPending} className="min-h-12 w-full rounded-lg bg-[#087F5B] px-4 text-sm font-semibold text-white hover:bg-[#066B4D] disabled:opacity-70">{setupPending ? 'Preparing…' : 'Set up authenticator'}</button>
        </form>
      ) : (
        <>
          <div className="mt-4 flex justify-center rounded-xl border border-[#E8EAE8] bg-white p-4">
            <Image src={setup.qrCode.trimEnd()} alt="QR code for your SariPOS authenticator" width={220} height={220} unoptimized />
          </div>
          <details className="mt-3 rounded-lg border border-[#E8EAE8] p-3">
            <summary className="cursor-pointer text-sm font-medium">Can’t scan the QR code?</summary>
            <code className="mt-2 block break-all text-sm text-[#46534C]">{setup.secret}</code>
          </details>
          <form action={verifyAction} className="mt-5 space-y-4">
            <input type="hidden" name="factorId" value={setup.factorId} />
            <div>
              <label htmlFor="otp" className="mb-2 block text-sm font-medium">Authenticator code</label>
              <input id="otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="000000" className="h-12 w-full rounded-lg border border-[#DCE5E1] px-3 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" />
            </div>
            <button disabled={verifyPending} className="min-h-12 w-full rounded-lg bg-[#087F5B] px-4 text-sm font-semibold text-white hover:bg-[#066B4D] disabled:opacity-70">{verifyPending ? 'Verifying…' : 'Verify and enable authenticator'}</button>
          </form>
        </>
      )}
      <ActionFeedback message={verify.error ?? setup.error ?? setup.message} error={Boolean(verify.error ?? setup.error)} signal={verify.error ? verify : setup} />
      <a href="/mfa/choose" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[#087F5B] underline-offset-4 hover:underline">Back to verification choices</a>
    </>
  )
}
