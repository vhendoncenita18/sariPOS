import type { ReactNode } from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import { PosNavigation } from '@/app/pos/navigation'
import { getStoreContext } from '@/app/pos/store-context'

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PosWorkspaceFallback />}>
      <PosWorkspaceContent>{children}</PosWorkspaceContent>
    </Suspense>
  )
}

async function PosWorkspaceContent({ children }: { children: ReactNode }) {
  const { supabase, user, membership, isOwner, roleLabel, permissions } = await getStoreContext()
  const { data: store } = await supabase
    .from('stores')
    .select('name')
    .eq('id', membership.store_id)
    .maybeSingle()

  const storeName = store?.name?.trim() || 'Store workspace'
  const metadataName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''
  const displayName = metadataName || user.email?.split('@')[0] || roleLabel

  return (
    <div className="min-h-screen bg-[#F7F8F7] text-[#171918] md:flex">
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-[#E8EAE8] bg-white px-4 py-5 md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto">
        <Link href="/pos" className="flex h-11 items-center gap-3 rounded-md px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#171918] text-sm font-bold text-white">S</span>
          <span className="text-[17px] font-semibold tracking-[-0.03em]">SariPOS</span>
        </Link>
        <PosNavigation isOwner={isOwner} permissions={permissions} />
        {isOwner ? (
          <div className="mt-8 rounded-xl border border-[#E8EAE8] bg-[#F7F8F7] p-3.5">
            <p className="text-xs font-medium text-[#535D57]">Owner access</p>
            <p className="mt-1 text-xs leading-5 text-[#777D79]">Your store membership grants access subject to database policies and permissions.</p>
          </div>
        ) : null}

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-[#E8EAE8] p-3.5">
            <p className="text-xs font-medium text-[#535D57]">Store workspace</p>
            <p className="mt-2 truncate text-sm font-medium">{storeName}</p>
            <p className="mt-1 text-xs text-[#777D79]">{isOwner ? 'Owner workspace' : 'Store workspace'}</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#E8EAE8] p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#E8F4EE] text-xs font-semibold text-[#087F5B]">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{displayName}</span>
              <span className="mt-0.5 block text-xs text-[#777D79]">{roleLabel}</span>
            </span>
          </div>
          <form action={signOut}>
            <button type="submit" className="flex min-h-11 w-full items-center rounded-lg px-3 text-sm font-medium text-[#535D57] hover:bg-[#F3F6F4] hover:text-[#171918] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D]">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-[#E8EAE8] bg-white/95 px-4 backdrop-blur-sm sm:px-7">
          <Link href="/pos" className="flex items-center gap-2.5 md:hidden">
            <span className="grid size-8 place-items-center rounded-lg bg-[#171918] text-sm font-bold text-white">S</span>
            <span className="text-base font-semibold tracking-[-0.03em]">SariPOS</span>
          </Link>
          <p className="hidden max-w-[280px] truncate text-sm text-[#687873] md:block">{storeName}</p>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-[#687873] sm:inline">{roleLabel}</span>
            <span className="grid size-9 place-items-center rounded-full bg-[#F3F6F4] text-sm font-medium text-[#48564F] md:hidden">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
            <form action={signOut} className="md:hidden">
              <button type="submit" className="min-h-11 rounded-lg border border-[#E8EAE8] px-3 text-sm font-medium text-[#535D57] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D]">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <PosNavigation isOwner={isOwner} permissions={permissions} mobile />
        {children}
      </div>
    </div>
  )
}

function PosWorkspaceFallback() {
  return (
    <div aria-busy="true" aria-label="Loading store workspace" className="min-h-screen bg-[#F7F8F7] text-[#171918] md:flex">
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-[#E8EAE8] bg-white px-4 py-5 md:flex md:h-screen">
        <div className="flex h-11 items-center gap-3 px-2">
          <span className="grid size-8 place-items-center rounded-lg bg-[#171918] text-sm font-bold text-white">S</span>
          <span className="text-[17px] font-semibold tracking-[-0.03em]">SariPOS</span>
        </div>
        <div className="mt-7 space-y-2" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-[#F3F6F4]" />
          ))}
        </div>
        <div className="mt-auto space-y-3" aria-hidden="true">
          <div className="h-[72px] animate-pulse rounded-xl border border-[#E8EAE8] bg-white" />
          <div className="h-[60px] animate-pulse rounded-xl border border-[#E8EAE8] bg-white" />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-[68px] items-center justify-between border-b border-[#E8EAE8] bg-white px-4 sm:px-7">
          <div className="h-4 w-36 animate-pulse rounded bg-[#F3F6F4]" aria-hidden="true" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-[#F3F6F4]" aria-hidden="true" />
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-7" aria-hidden="true">
          <div className="h-7 w-40 animate-pulse rounded bg-[#E8EAE8]" />
          <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-[#E8EAE8]" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl border border-[#E8EAE8] bg-white" />
            ))}
          </div>
          <div className="mt-5 h-64 animate-pulse rounded-xl border border-[#E8EAE8] bg-white" />
        </main>
      </div>
    </div>
  )
}
