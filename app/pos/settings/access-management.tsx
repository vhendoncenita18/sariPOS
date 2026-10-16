'use client'

import { useActionState } from 'react'
import { assignStoreRole, createStoreRole, type ActionState } from '@/app/actions/owner'
import { ConfirmedForm } from '@/app/components/confirmed-form'
import { ActionFeedback } from '@/app/components/action-feedback'

type StoreRole = { id: string; name: string; is_system: boolean; permissions: string[] }
type StoreMember = { user_id: string; role: string; role_id: string | null }
const permissionChoices = [
  ['products.view', 'View products'],
  ['inventory.view', 'View inventory'],
  ['shift.open', 'Open a shift'],
  ['own_session.view', 'View own session'],
  ['sales.create', 'Create sales'],
] as const

export function AccessManagement({ roles, members }: { roles: StoreRole[]; members: StoreMember[] }) {
  const [roleState, roleAction, creatingRole] = useActionState<ActionState, FormData>(createStoreRole, { message: '', error: false })
  const [assignState, assignAction, assigning] = useActionState<ActionState, FormData>(assignStoreRole, { message: '', error: false })
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]">
      <section className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold">Store roles</h2>
        <p className="mt-1 text-sm leading-5 text-[#687873]">The owner keeps management access. Other roles receive only the permissions selected here.</p>
        <div className="mt-4 divide-y divide-[#EEF1EF]">
          {roles.map((role) => <article key={role.id} className="py-3 first:pt-0"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-medium">{role.name}</h3>{role.is_system ? <span className="rounded-full bg-[#F2F5F3] px-2.5 py-1 text-xs text-[#687873]">Built in</span> : null}</div><p className="mt-1 text-xs leading-5 text-[#687873]">{role.permissions.map((permission) => permissionChoices.find(([key]) => key === permission)?.[1] ?? permission).join(' · ') || 'No permissions'}</p></article>)}
        </div>

        <ConfirmedForm action={roleAction} title="Create this role?" description="The role and its selected permissions will be available when assigning store access." confirmLabel="Create role" className="mt-5 border-t border-[#EEF1EF] pt-5">
          <label className="block text-sm font-medium">Create a role<input required maxLength={40} name="name" placeholder="For example, Stock clerk" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#DCE5E1] px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
          <fieldset className="mt-4"><legend className="text-sm font-medium">Permissions</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{permissionChoices.map(([key, label]) => <label key={key} className="flex min-h-10 items-center gap-2 rounded-lg border border-[#EEF1EF] px-3 text-sm"><input type="checkbox" name="permissions" value={key} className="size-4 accent-[#16835D]" />{label}</label>)}</div></fieldset>
          <button disabled={creatingRole} className="mt-4 min-h-11 rounded-lg bg-[#171918] px-4 text-sm font-semibold text-white disabled:opacity-60">{creatingRole ? 'Creating…' : 'Create role'}</button>
          <ActionFeedback message={roleState.message} error={roleState.error} signal={roleState} />
        </ConfirmedForm>
      </section>

      <section className="rounded-xl border border-[#E7EBE8] bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold">Assign a store role</h2>
        <p className="mt-1 text-sm leading-5 text-[#687873]">The person must already have a verified SariPOS account. Enter their account email to add them to this store.</p>
        <ConfirmedForm action={assignAction} title="Assign this store role?" description="The selected account will receive the permissions granted to this role in the store." confirmLabel="Assign role" className="mt-5 space-y-4">
          <label className="block text-sm font-medium">Account email<input required type="email" name="email" autoComplete="email" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#DCE5E1] px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10" /></label>
          <label className="block text-sm font-medium">Role<select required name="roleId" defaultValue="" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#DCE5E1] bg-white px-3 font-normal outline-none focus:border-[#16835D] focus:ring-4 focus:ring-[#16835D]/10"><option value="" disabled>Select a role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
          <button disabled={assigning || roles.length === 0} className="min-h-11 rounded-lg bg-[#171918] px-4 text-sm font-semibold text-white disabled:opacity-60">{assigning ? 'Saving…' : 'Assign role'}</button>
          <ActionFeedback message={assignState.message} error={assignState.error} signal={assignState} />
        </ConfirmedForm>
        <div className="mt-6 border-t border-[#EEF1EF] pt-4">
          <h3 className="text-sm font-medium">Store members</h3>
          <ul className="mt-2 divide-y divide-[#EEF1EF]">{members.map((member) => <li key={member.user_id} className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm"><span className="truncate text-[#687873]">{member.user_id}</span><span className="shrink-0 rounded-full bg-[#F2F5F3] px-2.5 py-1 text-xs">{member.role}</span></li>)}</ul>
        </div>
      </section>
    </div>
  )
}
