import { signIn, signUp } from '@/app/actions/auth'
import { AuthForm } from '@/app/login/auth-form'
import { Suspense } from 'react'

type LoginPageProps = {
  searchParams: Promise<{ mode?: string; error?: string; method?: string; confirmed?: string; passwordUpdated?: string }>
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense fallback={<AuthPageShell isSignUp={false} />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  )
}

async function LoginContent({ searchParams }: LoginPageProps) {
  const { mode, error: callbackError, method, confirmed, passwordUpdated } = await searchParams

  const isSignUp = mode === 'signup'

  const notice = passwordUpdated === '1'
    ? 'Password updated. Sign in with your new password, then complete verification.'
    : confirmed === '1'
      ? 'Email confirmed. Sign in with your password to continue to verification and store setup.'
    : method === 'otp'
      ? 'Choose a verification method to continue.'
      : callbackError === 'confirmation'
      ? 'That confirmation link is invalid or expired. Request a new confirmation code and try again.'
      : undefined

  return <AuthPageShell isSignUp={isSignUp} notice={notice} />
}

function AuthPageShell({ isSignUp, notice }: { isSignUp: boolean; notice?: string }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#F4F7F5] px-4 py-10 text-[#17231F] sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-32 size-[420px] rounded-full border border-[#16835D]/10 sm:right-[8%] sm:top-[-220px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-32 size-[420px] rounded-full border border-[#16835D]/10 sm:bottom-[-270px] sm:left-[12%]" />

      <section className="relative w-full max-w-[430px] overflow-hidden rounded-[22px] border border-[#E1E8E4] bg-white px-6 py-8 shadow-[0_24px_70px_-44px_rgba(23,48,37,0.34)] sm:px-10 sm:py-10">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[#16835D]" />

        <div className="flex items-center justify-between gap-4">
          <a href="/login" className="inline-flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#16835D]">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-[#E8F4EE] text-[#087F5B]">
              <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10 12 5l8 5v9H4v-9Z" />
                <path d="M8 19v-6h8v6M3 10l9-6 9 6" />
              </svg>
            </span>
            <span className="text-base font-semibold tracking-[-0.03em]">SariPOS</span>
          </a>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F7F5] px-2.5 py-1.5 text-xs font-medium text-[#527064]">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#16835D]" />
            Secure access
          </span>
        </div>

        <div className="mt-9 min-h-[112px]">
          <p className="text-sm font-medium text-[#687873]">{isSignUp ? 'Set up your store access' : 'Welcome back'}</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.045em] sm:text-[30px]">
            {isSignUp ? 'Create an account' : 'Sign in to SariPOS'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#687873]">
            {isSignUp
              ? 'Create your account with an email address and password, then confirm your email.'
              : 'Enter your email and password first. Then choose an authenticator code or an email code.'}
          </p>
        </div>

        {notice ? <p role="alert" className="mt-5 rounded-lg border border-[#F0D5D2] bg-[#FFF8F7] p-3 text-sm leading-6 text-[#8B322B]">{notice}</p> : null}
        <AuthForm action={isSignUp ? signUp : signIn} isSignUp={isSignUp} />

        <p className="mt-6 min-h-5 text-center text-sm text-[#687873]">
          {isSignUp ? 'Already have an account?' : 'New to SariPOS?'}{' '}
          <a
            href={isSignUp ? '/login' : '/login?mode=signup'}
            className="rounded-sm font-semibold text-[#087F5B] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D]"
          >
            {isSignUp ? 'Sign in' : 'Create an account'}
          </a>
        </p>

        <div className="mt-7 border-t border-[#E9EEEB] pt-5 text-center text-xs leading-5 text-[#687873]">
          {isSignUp
            ? 'Your account and store are separate. Store setup happens after email confirmation and sign-in.'
            : 'Email codes are an AAL1 fallback. Authenticator verification provides Supabase AAL2.'}
        </div>
      </section>
    </main>
  )
}
