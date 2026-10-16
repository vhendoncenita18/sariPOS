import { createClient } from '@/lib/supabase/server'
import { includesRecoveryMethod } from '@/lib/auth/session'
import { Suspense } from 'react'
import { ForgotPasswordForm } from './forgot-password-form'

type PageProps = { searchParams: Promise<{ step?: string }> }

export default function ForgotPasswordPage(props: PageProps) {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#F7F8F7]">Loading recovery…</main>}><RecoveryContent {...props} /></Suspense>
}

async function RecoveryContent({ searchParams }: PageProps) {
  const supabase = await createClient()
  const [{ data: { user } }, { data: claims }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ])
  const { step } = await searchParams
  const isRecoverySession = includesRecoveryMethod(claims?.claims?.amr)
  const initialState = isRecoverySession
    ? { step: 'set-password' as const, email: user?.email }
    : step === 'password'
      ? { error: 'Recovery session expired. Request a new code.', email: user?.email }
      : {}

  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F8F7] px-4 py-10 text-[#171918]">
      <section className="w-full max-w-[430px] rounded-2xl border border-[#E8EAE8] bg-white p-6 shadow-[0_24px_70px_-44px_rgba(23,48,37,0.34)] sm:p-9">
        <p className="text-sm font-semibold text-[#16835D]">SariPOS · Account recovery</p>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-[#687873]">Request a short-lived code, verify it, then set a new password.</p>
        <ForgotPasswordForm initialState={initialState} />
        <a href="/login" className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-[#087F5B] underline-offset-4 hover:underline">Back to sign in</a>
      </section>
    </main>
  )
}
