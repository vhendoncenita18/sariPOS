import { createClient } from '@/lib/supabase/server'
import { hasPasswordOnlySession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { EmailCodeForm } from './email-form'

type PageProps = { searchParams: Promise<{ error?: string; sent?: string }> }

export default function EmailVerificationPage(props: PageProps) {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#F7F8F7]">Loading…</main>}><EmailContent {...props} /></Suspense>
}

async function EmailContent({ searchParams }: PageProps) {
  await connection()

  const supabase = await createClient()
  const [{ data: { user } }, { data: claims }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ])
  if (!user) redirect('/login')
  if (!hasPasswordOnlySession(claims?.claims)) redirect('/mfa/choose')
  if (!user.email) redirect('/mfa/choose?error=email')
  const { error, sent } = await searchParams
  const notice = error ? `Error: ${error}` : sent === '1' ? `A new code was sent to ${user.email}.` : undefined

  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F8F7] px-4 py-10 text-[#171918]">
      <section className="w-full max-w-[430px] rounded-2xl border border-[#E8EAE8] bg-white p-6 shadow-[0_24px_70px_-44px_rgba(23,48,37,0.34)] sm:p-9">
        <p className="text-sm font-semibold text-[#16835D]">SariPOS · Email verification</p>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Check your inbox</h1>
        <p className="mt-2 text-sm leading-6 text-[#687873]">Enter the six-digit code sent to {user.email}. It expires in 10 minutes.</p>
        <EmailCodeForm email={user.email} notice={notice} />
        <a href="/mfa/choose" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[#087F5B] underline-offset-4 hover:underline">Choose another method</a>
      </section>
    </main>
  )
}
