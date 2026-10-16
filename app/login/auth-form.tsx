'use client'

import { useActionState, useState } from 'react'
import { resendSignupCode, type AuthAction, type AuthState } from '@/app/actions/auth'

export function AuthForm({
  action,
  isSignUp,
}: {
  action: AuthAction
  isSignUp: boolean
}) {
  const [state, formAction, isPending] = useActionState(action, {})
  const [resendState, resendAction, isResending] = useActionState<AuthState, FormData>(resendSignupCode, {})
  const [email, setEmail] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const isCodeStep = isSignUp && state.step === 'signup-verify'

  return (
    <>
      <form action={formAction} className="mt-7 space-y-5">
        {isCodeStep ? <input type="hidden" name="step" value="signup-verify" /> : null}
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email || state.email || ''}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            maxLength={254}
            readOnly={isCodeStep}
            className="h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3.5 text-base outline-none transition placeholder:text-[#9AA8A1] focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10 read-only:bg-[#F7F9F8]"
          />
        </div>

        {isCodeStep ? (
          <div>
            <label htmlFor="otp" className="mb-2 block text-sm font-medium">Email confirmation code</label>
            <input
              id="otp"
              name="otp"
              type="text"
              placeholder="000000"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
              className="h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3.5 text-center font-mono text-lg tracking-[0.3em] outline-none transition placeholder:text-[#9AA8A1] focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10"
            />
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  minLength={isSignUp ? 8 : undefined}
                  className="h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3.5 pr-14 text-base outline-none transition placeholder:text-[#9AA8A1] focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                  aria-pressed={passwordVisible}
                  className="absolute inset-y-0 right-2 min-w-11 rounded-md px-2 text-xs font-medium text-[#53645C] hover:bg-[#F3F6F4] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#16835D]"
                >
                  {passwordVisible ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {isSignUp ? (
              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">Confirm password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="h-12 w-full rounded-lg border border-[#DCE5E1] bg-white px-3.5 text-base outline-none transition focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10"
                />
              </div>
            ) : null}
          </>
        )}

        <div aria-live="polite" className={`min-h-10 text-sm leading-5 ${state.error ? 'text-[#B42318]' : 'text-[#087F5B]'}`}>
          {state.error ?? state.message}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-[#087F5B] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#066B4D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087F5B] disabled:cursor-wait disabled:opacity-75"
        >
          {isPending
            ? 'Please wait…'
            : isCodeStep
              ? 'Confirm email and continue'
              : isSignUp
                ? 'Create account'
                : 'Continue'}
        </button>
      </form>

      {!isSignUp ? (
        <a href="/forgot-password" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[#087F5B] underline-offset-4 hover:underline">
          Forgot or don’t have a password?
        </a>
      ) : null}

      {isCodeStep ? (
        <form action={resendAction} className="mt-2">
          <input type="hidden" name="email" value={state.email ?? email} />
          <button
            type="submit"
            disabled={isResending}
            className="min-h-11 w-full rounded-lg border border-[#DCE5E1] px-4 text-sm font-medium text-[#46534C] hover:bg-[#F7F9F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D] disabled:cursor-wait disabled:opacity-75"
          >
            {isResending ? 'Sending…' : 'Resend confirmation code'}
          </button>
          <p aria-live="polite" className={`min-h-6 pt-1 text-center text-xs ${resendState.error ? 'text-[#B42318]' : 'text-[#087F5B]'}`}>
            {resendState.error ?? resendState.message}
          </p>
        </form>
      ) : null}
    </>
  )
}
