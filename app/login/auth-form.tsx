'use client'

import { useActionState, useState } from 'react'
import { resendSignupCode, type AuthAction, type AuthState } from '@/app/actions/auth'
import { ActionFeedback } from '@/app/components/action-feedback'

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
  const feedbackMessage = isCodeStep
    ? resendState.error ?? resendState.message ?? state.error ?? state.message
    : state.error ?? state.message
  const feedbackError = isCodeStep ? Boolean(resendState.error ?? state.error) : Boolean(state.error)
  const feedbackSignal = isCodeStep && (resendState.error || resendState.message) ? resendState : state

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
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="mx-auto size-5">
                    {passwordVisible ? (
                      <><path d="M3 3 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M8.6 8.6a2 2 0 0 0 2.8 2.8M7.1 5.5A9.7 9.7 0 0 1 10 5c4.2 0 7.3 3.1 8.3 5-.4.8-1.2 1.8-2.4 2.7M5.2 6.8C3.4 7.9 2.3 9.3 1.7 10c1 1.9 4.1 5 8.3 5 1 0 2-.2 2.8-.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>
                    ) : (
                      <><path d="M1.7 10C2.7 8.1 5.8 5 10 5s7.3 3.1 8.3 5c-1 1.9-4.1 5-8.3 5S2.7 11.9 1.7 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" /></>
                    )}
                  </svg>
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
        </form>
      ) : null}
      <ActionFeedback message={feedbackMessage} error={feedbackError} signal={feedbackSignal} />
    </>
  )
}
