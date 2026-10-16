'use client'

import { useActionState } from 'react'
import { createStore, type StoreSetupState } from '@/app/actions/auth'
import { ConfirmedForm } from '@/app/components/confirmed-form'
import { ActionFeedback } from '@/app/components/action-feedback'

export function StoreForm() {
  const [state, action, pending] = useActionState<StoreSetupState, FormData>(createStore, {})

  return (
    <ConfirmedForm action={action} title="Create your store?" description="SariPOS will create the store and give your account the owner role for it." confirmLabel="Create store" className="mt-7 space-y-5">
      <div>
        <label htmlFor="storeName" className="mb-2 block text-sm font-medium">Store name</label>
        <input id="storeName" name="storeName" required minLength={2} maxLength={120} autoComplete="organization" placeholder="e.g. Santos Sari-Sari Store" className="h-12 w-full rounded-lg border border-[#DCE5E1] px-3.5 text-base outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" />
      </div>
      <p className="-mt-2 text-sm leading-5 text-[#687873]">Your store timezone will use Asia/Manila.</p>
      <ActionFeedback message={state.error} error signal={state} />
      <button disabled={pending} className="min-h-12 w-full rounded-lg bg-[#087F5B] px-4 text-sm font-semibold text-white hover:bg-[#066B4D] disabled:opacity-70">{pending ? 'Creating store…' : 'Create store and continue'}</button>
    </ConfirmedForm>
  )
}
