import { redirect } from 'next/navigation'
import { getStoreContext } from '@/app/pos/store-context'
import { AccessManagement } from '@/app/pos/settings/access-management'
import { DeviceManagement } from '@/app/pos/settings/device-management'

type AccessPayload = {
  roles: Array<{ id: string; name: string; is_system: boolean; permissions: string[] }>
  members: Array<{ user_id: string; role: string; role_id: string | null }>
}

export default async function StoreSettingsPage() {
  const { isOwner, supabase, storeId } = await getStoreContext()
  if (!isOwner) redirect('/pos')

  const [accessResult, deviceResult] = await Promise.all([
    supabase.rpc('list_store_access'),
    supabase.from('store_devices')
      .select('id, device_name, enrolled_at')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .is('revoked_at', null)
      .maybeSingle(),
  ])
  const access = accessResult.data as AccessPayload | null

  return (
    <main className="mx-auto max-w-[1560px] px-4 py-7 sm:px-7 lg:px-9">
      <header className="mb-7">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.04em]">Store settings</h1>
        <p className="mt-1.5 text-sm text-[#687873]">Manage store details, account security, and selling devices.</p>
      </header>
      {accessResult.error || !access ? (
        <section role="alert" className="rounded-xl border border-[#E9C9C5] bg-[#FFF8F7] p-5 text-sm leading-6 text-[#8B322B]">
          Role management is not connected yet. Apply the versioned owner and role operations migration, then reload this page.
        </section>
      ) : <AccessManagement roles={access.roles ?? []} members={access.members ?? []} />}
      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        {[
          ['Store information', 'Store details can be viewed. Editing is not enabled until a trusted store update operation is verified.'],
          ['Account security', 'Authenticator and email verification are available from the sign-in security flow. In-page security management is not connected.'],
        ].map(([title, description]) => (
          <article key={title} className="rounded-xl border border-[#E7EBE8] bg-white p-5">
            <span className="inline-flex rounded-full bg-[#F3F6F4] px-2.5 py-1 text-xs font-medium text-[#535D57]">Not available</span>
            <h2 className="mt-4 text-base font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#687873]">{description}</p>
          </article>
        ))}
        <DeviceManagement activeDevice={deviceResult.data} loadError={Boolean(deviceResult.error)} />
      </section>
    </main>
  )
}
