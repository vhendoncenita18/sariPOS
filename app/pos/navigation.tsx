'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavigationItem = {
  href: string
  label: string
  icon: 'dashboard' | 'sales' | 'inventory' | 'products' | 'session' | 'settings'
}

const ownerItems: NavigationItem[] = [
  { href: '/pos', label: 'Dashboard', icon: 'dashboard' },
  { href: '/pos/sales', label: 'Sales', icon: 'sales' },
  { href: '/pos/inventory', label: 'Inventory', icon: 'inventory' },
  { href: '/pos/products', label: 'Products', icon: 'products' },
  { href: '/pos/session', label: 'Store shift', icon: 'session' },
  { href: '/pos/settings', label: 'Store settings', icon: 'settings' },
]

const cashierItems: NavigationItem[] = [
  { href: '/pos', label: 'Dashboard', icon: 'dashboard' },
  { href: '/pos/products', label: 'Products', icon: 'products' },
  { href: '/pos/session', label: 'My session', icon: 'session' },
]

const ownerOnlyRoutes = new Set(['/pos/sales', '/pos/inventory', '/pos/settings'])

function NavigationIcon({ name }: { name: NavigationItem['icon'] }) {
  const iconPaths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    sales: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
    inventory: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21" /></>,
    products: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M8 9h8M8 12h8" /></>,
    session: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    settings: <><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3.1 1.3v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3.1-1.3l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-1.3-3.1h-.2a1.8 1.8 0 1 1 0-3.6h.2a1.8 1.8 0 0 0 1.3-3.1l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3.1-1.3v-.2a1.8 1.8 0 1 1 3.6 0v.2a1.8 1.8 0 0 0 3.1 1.3l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 1.3 3.1h.2a1.8 1.8 0 1 1 0 3.6h-.2a1.8 1.8 0 0 0-1.3 3.1Z" /></>,
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]">
      {iconPaths[name]}
    </svg>
  )
}

export function PosNavigation({ isOwner, permissions, mobile = false }: { isOwner: boolean; permissions: string[]; mobile?: boolean }) {
  const pathname = usePathname()
  const permissionsForRoute: Record<string, string[]> = {
    '/pos/products': ['products.view'],
    '/pos/inventory': ['inventory.view'],
    '/pos/session': ['own_session.view', 'shift.open'],
  }
  const items = (isOwner ? ownerItems : cashierItems).filter((item) =>
    (!ownerOnlyRoutes.has(item.href) || isOwner) &&
    (isOwner || !permissionsForRoute[item.href] || permissionsForRoute[item.href].some((permission) => permissions.includes(permission))),
  )

  return (
    <nav aria-label={mobile ? 'Workspace navigation' : 'Main navigation'} className={mobile ? 'flex gap-1 overflow-x-auto border-b border-[#E8EAE8] bg-white px-3 py-2 md:hidden' : 'mt-8 space-y-1'}>
      {items.map((item) => {
        const current = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? 'page' : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D] ${mobile ? 'shrink-0' : ''} ${current ? 'bg-[#171918] text-white' : 'text-[#535D57] hover:bg-[#F3F6F4] hover:text-[#171918]'}`}
          >
            <NavigationIcon name={item.icon} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
