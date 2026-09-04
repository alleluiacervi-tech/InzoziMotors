'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

// One nav, two shapes: a horizontal rail that sticks under the site header on
// phones, and a vertical sidebar from lg up. Client-only because the active
// item depends on the pathname — no user data passes through here.

const BASE_ITEMS: { href: string; labelKey: string; icon: IconName }[] = [
  { href: '/dashboard', labelKey: 'dashboard.nav.overview', icon: 'grid' },
  { href: '/dashboard/saved', labelKey: 'dashboard.nav.saved', icon: 'heart' },
  { href: '/dashboard/rentals', labelKey: 'dashboard.nav.rentals', icon: 'calendar' },
]

// Shown only to a verified rental provider (role=seller, business_verified) —
// see (dashboard)/layout.tsx. A buyer or an unverified seller has no fleet or
// inbox to manage, so the links would just 404-shaped empty-state their way.
const PROVIDER_ITEMS: { href: string; labelKey: string; icon: IconName }[] = [
  { href: '/dashboard/rentals/fleet', labelKey: 'dashboard.nav.rentalFleet', icon: 'car' },
  { href: '/dashboard/rentals/inbox', labelKey: 'dashboard.nav.rentalInbox', icon: 'mail' },
]

const REST_ITEMS: { href: string; labelKey: string; icon: IconName }[] = [
  { href: '/dashboard/imports', labelKey: 'dashboard.nav.imports', icon: 'clock' },
  { href: '/dashboard/reports', labelKey: 'dashboard.nav.reports', icon: 'document' },
  { href: '/dashboard/notifications', labelKey: 'dashboard.nav.notifications', icon: 'bell' },
  { href: '/dashboard/selling', labelKey: 'dashboard.nav.selling', icon: 'car' },
  { href: '/dashboard/profile', labelKey: 'dashboard.nav.profile', icon: 'user' },
]

export function DashboardNav({ unread = 0, isRentalProvider = false }: { unread?: number; isRentalProvider?: boolean }) {
  const t = useT()
  const pathname = usePathname()
  const ITEMS = [...BASE_ITEMS, ...(isRentalProvider ? PROVIDER_ITEMS : []), ...REST_ITEMS]

  // Overview must match exactly, or every child route would light it up too.
  // /dashboard/rentals must match exactly too, or it would light up alongside
  // /dashboard/rentals/fleet and /dashboard/rentals/inbox — three different
  // pages under the same prefix.
  const isActive = (href: string) =>
    href === '/dashboard' || href === '/dashboard/rentals' ? pathname === href : pathname.startsWith(href)

  return (
    <nav aria-label={t('dashboard.nav.label')}>
      {/* Phones: scrolling rail, pinned below the site header */}
      <div className="sticky top-[var(--header-h)] z-30 -mx-5 border-b border-line-soft bg-surface-page/95 backdrop-blur sm:-mx-8 lg:hidden">
        <ul className="no-scrollbar flex gap-1 overflow-x-auto px-5 py-2 sm:px-8">
          {ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-11 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-caption font-bold transition-colors ${
                    active
                      ? 'bg-brand/10 text-brand'
                      : 'text-content-secondary hover:bg-surface-alt hover:text-content'
                  }`}
                >
                  <Icon name={item.icon} size={16} />
                  {t(item.labelKey)}
                  {item.href === '/dashboard/notifications' && unread > 0 ? (
                    <span
                      className={`rounded-pill px-1.5 py-0.5 text-micro leading-none ${
                        active ? 'bg-white/25 text-white' : 'bg-info-tint text-info'
                      }`}
                    >
                      {unread}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* lg and up: sidebar */}
      <ul className="hidden lg:block lg:space-y-0.5">
        {ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 text-body font-bold transition-colors ${
                  active
                    ? 'bg-brand/10 text-brand'
                    : 'text-content-secondary hover:bg-surface-alt hover:text-content'
                }`}
              >
                <Icon name={item.icon} size={18} />
                <span className="flex-1 truncate">{t(item.labelKey)}</span>
                {item.href === '/dashboard/notifications' && unread > 0 ? (
                  <span className="rounded-pill bg-info-tint px-2 py-0.5 text-micro font-bold leading-none text-info">
                    {unread}
                    <span className="sr-only"> {t('dashboard.nav.unread')}</span>
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default DashboardNav
