import { createClient } from '@/lib/supabase/server'
import { hasPasswordOnlySession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { TotpSetupForm } from './setup-form'

export default function SetupTotpPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#F7F8F7]">Loading…</main>}><SetupContent /></Suspense>
}

async function SetupContent() {
  await connection()

  const supabase = await createClient()
  const [{ data: { user } }, { data: claims }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ])
  if (!user) redirect('/login')
  if (!hasPasswordOnlySession(claims?.claims)) redirect('/mfa/choose')

  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F8F7] px-4 py-10 text-[#171918]">
      <section className="w-full max-w-[460px] rounded-2xl border border-[#E8EAE8] bg-white p-6 shadow-[0_24px_70px_-44px_rgba(23,48,37,0.34)] sm:p-9">
        <p className="text-sm font-semibold text-[#16835D]">SariPOS · Authenticator setup</p>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Add an authenticator app</h1>
        <p className="mt-2 text-sm leading-6 text-[#687873]">Scan the QR code with an authenticator app, then enter its six-digit code. Keep the setup key private.</p>
        <TotpSetupForm />
      </section>
    </main>
  )
}
