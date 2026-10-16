import { createClient } from '@/lib/supabase/server'
import { hasPermittedOnlineAuthentication } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { StoreForm } from './store-form'

export default function StoreSetupPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#F7F8F7]">Loading store setup…</main>}><StoreSetupContent /></Suspense>
}

async function StoreSetupContent() {
  await connection()

  const supabase = await createClient()
  const [{ data: { user } }, { data: claims }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ])
  if (!user) redirect('/login')
  if (!hasPermittedOnlineAuthentication(claims?.claims)) redirect('/mfa/choose')

  const { data: membership, error } = await supabase
    .from('user_store_members')
    .select('store_id')
    .limit(1)
    .maybeSingle()
  if (membership) redirect('/pos')

  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F8F7] px-4 py-10 text-[#171918]">
      <section className="w-full max-w-[460px] rounded-2xl border border-[#E8EAE8] bg-white p-6 shadow-[0_24px_70px_-44px_rgba(23,48,37,0.34)] sm:p-9">
        <p className="text-sm font-semibold text-[#16835D]">SariPOS · Store setup</p>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Create your store</h1>
        <p className="mt-2 text-sm leading-6 text-[#687873]">Your account is confirmed. SariPOS creates your store and links your account to it with the owner role through a trusted database function.</p>
        {error ? <p role="alert" className="mt-4 rounded-lg border border-[#F0D5D2] bg-[#FFF8F7] p-3 text-sm leading-6 text-[#8B322B]">We couldn’t check your store membership. Refresh or sign in again before creating a store.</p> : null}
        {!error ? <StoreForm /> : null}
        <p className="mt-4 text-xs leading-5 text-[#777D79]">Your Auth account is stored in Supabase Auth (`auth.users`). The trusted `public.create_store_for_current_user` function writes the store and your `owner` membership in `public.user_store_members`. Management access still follows the database policies and permissions. Profile creation depends on the project’s configured trigger. Device registration happens separately.</p>
      </section>
    </main>
  )
}
