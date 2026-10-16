'use client'

import { useActionState } from 'react'
import type { AuthState } from '@/app/actions/auth'
import { ActionFeedback } from '@/app/components/action-feedback'

export function EmailCodeSendButton({ action }: { action: () => Promise<AuthState> }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {})

  return (
    <>
      <form action={formAction}>
        <button disabled={pending} className="min-h-12 w-full rounded-lg border border-[#DCE5E1] px-4 text-sm font-semibold text-[#46534C] hover:bg-[#F7F9F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D] disabled:cursor-wait disabled:opacity-70">
          {pending ? 'Sending code…' : 'Send a code to my email'}
        </button>
      </form>
      <ActionFeedback message={state.error ?? state.message} error={Boolean(state.error)} signal={state} />
    </>
  )
}
