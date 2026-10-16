import { sendEmailSecondFactor, startTotpSecondFactor } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { hasPasswordOnlySession, hasPermittedOnlineAuthentication } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { ActionFeedback } from '@/app/components/action-feedback'
import { EmailCodeSendButton } from './email-send-button'

type PageProps = { searchParams: Promise<{ error?: string }> }

export default function ChooseVerificationPage(props: PageProps) {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#F7F8F7]">Loading verification options…</main>}><ChoiceContent {...props} /></Suspense>
}

async function ChoiceContent({ searchParams }: PageProps) {
  await connection()

  const supabase = await createClient()
  const [{ data: { user } }, { data: claims }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ])
  if (!user) redirect('/login')
  if (hasPermittedOnlineAuthentication(claims?.claims)) redirect('/pos')
  if (!hasPasswordOnlySession(claims?.claims)) redirect('/login')

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const hasTotp = factors?.totp.some((factor) => factor.status === 'verified') ?? false
  const { error } = await searchParams
  const errorMessage = error === 'totp-unavailable'
    ? 'No verified authenticator is set up for this account yet.'
    : error === 'email'
      ? 'This account needs a verified email address to receive a code.'
      : error === 'gateway-timeout' || error?.toLowerCase() === 'gateway timeout'
        ? 'Supabase Auth timed out while sending the email. The code may not have been sent. Check the project Auth logs and SMTP provider before retrying.'
        : error

  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F8F7] px-4 py-10 text-[#171918]">
      <section className="w-full max-w-[460px] rounded-2xl border border-[#E8EAE8] bg-white p-6 shadow-[0_24px_70px_-44px_rgba(23,48,37,0.34)] sm:p-9">
        <p className="text-sm font-semibold text-[#16835D]">SariPOS · Step 2 of 2</p>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Verify it’s you</h1>
        <p className="mt-2 text-sm leading-6 text-[#687873]">Your password is verified. Choose how to finish signing in.</p>
        <ActionFeedback message={errorMessage} error signal={errorMessage ? { errorMessage } : undefined} />

        <div className="mt-7 space-y-3">
          {hasTotp ? (
            <form action={startTotpSecondFactor}>
              <button className="min-h-12 w-full rounded-lg bg-[#171918] px-4 text-sm font-semibold text-white hover:bg-[#303431] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D]">Use authenticator app</button>
            </form>
          ) : (
            <a href="/mfa/setup" className="flex min-h-12 items-center justify-center rounded-lg border border-[#DCE5E1] px-4 text-sm font-semibold text-[#46534C] hover:bg-[#F7F9F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D]">Set up an authenticator app</a>
          )}
          <EmailCodeSendButton action={sendEmailSecondFactor} />
        </div>
        <p className="mt-5 text-xs leading-5 text-[#777D79]">Authenticator verification reaches AAL2. Email codes are a fallback sign-in method at AAL1.</p>
        <a href="/login" className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-[#087F5B] underline-offset-4 hover:underline">Back to sign in</a>
      </section>
    </main>
  )
}
