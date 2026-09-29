'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

// The dashboard's grouped navigation: the desktop sidebar and the phone's
// "More" sheet both draw this list (DashboardShell). The phone's everyday
// destinations also sit in a bottom tab bar there, which is why the old
// horizontally scrolling rail is gone.
//
// Groups, not a flat run of nine links: grouping is what lets someone find a
// link by remembering roughly where it lives rather than by reading all nine
// labels. The active row is tinted with a brand bar in the gutter, and
// `aria-current="page"` carries the same fact for a screen reader, which
// colour alone never does.

interface NavItem {
  href: string
  labelKey: string
  icon: IconName
}

interface NavGroup {
  /** i18n key for the sidebar heading. */
  titleKey: string
  items: NavItem[]
}

const BUYING: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard.nav.overview', icon: 'grid' },
  { href: '/dashboard/saved', labelKey: 'dashboard.nav.saved', icon: 'heart' },
  { href: '/dashboard/rentals', labelKey: 'dashboard.nav.rentals', icon: 'calendar' },
  { href: '/dashboard/imports', labelKey: 'dashboard.nav.imports', icon: 'clock' },
]

const SELLING: NavItem[] = [
  { href: '/dashboard/selling', labelKey: 'dashboard.nav.selling', icon: 'car' },
]

// Shown only to a verified rental provider (role=seller, business_verified) —
// see (dashboard)/layout.tsx. A buyer or an unverified seller has no fleet or
// inbox to manage, so the links would just 404-shaped empty-state their way.
const PROVIDER_ITEMS: NavItem[] = [
  { href: '/dashboard/rentals/fleet', labelKey: 'dashboard.nav.rentalFleet', icon: 'car' },
  { href: '/dashboard/rentals/inbox', labelKey: 'dashboard.nav.rentalInbox', icon: 'mail' },
]

const ACCOUNT: NavItem[] = [
  { href: '/dashboard/messages', labelKey: 'dashboard.nav.messages', icon: 'mail' },
  { href: '/dashboard/notifications', labelKey: 'dashboard.nav.notifications', icon: 'bell' },
  { href: '/dashboard/reports', labelKey: 'dashboard.nav.reports', icon: 'document' },
  { href: '/dashboard/profile', labelKey: 'dashboard.nav.profile', icon: 'user' },
]

/** Hrefs that show an unread badge, each with its own count (G1/G2 in
 *  docs/WEB-PARITY-PLAN.md). */
const BADGE_HREFS = new Set(['/dashboard/notifications', '/dashboard/messages'])

// Overview must match exactly, or every child route would light it up too.
// /dashboard/rentals must match exactly too, or it would light up alongside
// /dashboard/rentals/fleet and /dashboard/rentals/inbox — three different
// pages under the same prefix.
export const isActive = (href: string, pathname: string) =>
  href === '/dashboard' || href === '/dashboard/rentals'
    ? pathname === href
    : pathname.startsWith(href)

export function DashboardNav({
  unread = 0,
  messagesUnread = 0,
  isRentalProvider = false,
  onNavigate,
}: {
  unread?: number
  messagesUnread?: number
  isRentalProvider?: boolean
  /** Called when a link is chosen, so a sheet can close itself. */
  onNavigate?: () => void
}) {
  const t = useT()
  const pathname = usePathname() || ''

  const groups: NavGroup[] = [
    { titleKey: 'dashboard.nav.group.buying', items: BUYING },
    {
      titleKey: 'dashboard.nav.group.selling',
      items: [...SELLING, ...(isRentalProvider ? PROVIDER_ITEMS : [])],
    },
    { titleKey: 'dashboard.nav.group.account', items: ACCOUNT },
  ]

  // The unread count is a number AND a word, so it never depends on colour or
  // position alone to be understood. Notifications and messages keep separate
  // counts — a new message must not read as "3 notifications" or vice versa.
  const countFor = (item: NavItem): number => {
    if (item.href === '/dashboard/notifications') return unread
    if (item.href === '/dashboard/messages') return messagesUnread
    return 0
  }

  return (
    <nav aria-label={t('dashboard.nav.label')}>
      {groups.map((group, groupIndex) => (
        <div key={group.titleKey} className={groupIndex > 0 ? 'mt-6' : ''}>
          <h2 className="mb-1.5 px-3 text-micro font-bold uppercase tracking-wide text-content-muted">
            {t(group.titleKey)}
          </h2>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href, pathname)
              const count = BADGE_HREFS.has(item.href) ? countFor(item) : 0
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex h-10 items-center gap-3 rounded-xl pl-3.5 pr-3 text-caption font-bold transition-colors ${
                      active
                        ? 'bg-brand/10 text-brand'
                        : 'text-content-secondary hover:bg-surface-alt hover:text-content'
                    }`}
                  >
                    {active ? (
                      <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand" />
                    ) : null}
                    <Icon name={item.icon} size={18} aria-hidden="true" />
                    <span className="flex-1 truncate">{t(item.labelKey)}</span>
                    {count > 0 ? (
                      <span
                        className={`tnum rounded-pill px-2 py-0.5 text-micro font-bold leading-none ${
                          active ? 'bg-brand text-brand-on' : 'bg-info-tint text-info'
                        }`}
                      >
                        {count}
                        <span className="sr-only"> {t('dashboard.nav.unread')}</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export default DashboardNav
