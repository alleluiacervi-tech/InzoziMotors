'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

// One nav, two shapes: a horizontal rail that sticks under the site header on
// phones, and a vertical sidebar from lg up. Client-only because the active
// item depends on the pathname — no user data passes through here.
//
// WHAT CHANGED, AND WHY.
//
// It was a flat list of up to nine links. Nine undifferentiated rows is a menu,
// not a structure: "Saved" and "Profile" got the same visual weight, and a
// verified rental provider's two extra links appeared in the middle of the run
// with nothing to say they belonged together. The items are the same and in the
// same order — they are now GROUPED, with a quiet heading per group on the
// sidebar. Grouping is what lets someone find a link by remembering roughly
// where it lives rather than by reading all nine labels.
//
// The mobile rail stays flat and unheaded on purpose. Headings inside a
// horizontally scrolling strip cost a whole row of height to say something a
// thumb scrolls straight past.
//
// The active treatment changed from a filled pill to a tinted row with a brand
// bar on the leading edge. A pill in a vertical list fights the list's own
// rhythm; a bar sits in the gutter and reads as "you are here" at a glance —
// and `aria-current="page"` carries the same fact for a screen reader, which
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
  { href: '/dashboard/notifications', labelKey: 'dashboard.nav.notifications', icon: 'bell' },
  { href: '/dashboard/reports', labelKey: 'dashboard.nav.reports', icon: 'document' },
  { href: '/dashboard/profile', labelKey: 'dashboard.nav.profile', icon: 'user' },
]

// Overview must match exactly, or every child route would light it up too.
// /dashboard/rentals must match exactly too, or it would light up alongside
// /dashboard/rentals/fleet and /dashboard/rentals/inbox — three different
// pages under the same prefix.
const isActive = (href: string, pathname: string) =>
  href === '/dashboard' || href === '/dashboard/rentals'
    ? pathname === href
    : pathname.startsWith(href)

export function DashboardNav({
  unread = 0,
  isRentalProvider = false,
}: {
  unread?: number
  isRentalProvider?: boolean
}) {
  const t = useT()
  const pathname = usePathname()

  const groups: NavGroup[] = [
    { titleKey: 'dashboard.nav.group.buying', items: BUYING },
    {
      titleKey: 'dashboard.nav.group.selling',
      items: [...SELLING, ...(isRentalProvider ? PROVIDER_ITEMS : [])],
    },
    { titleKey: 'dashboard.nav.group.account', items: ACCOUNT },
  ]
  const flat = groups.flatMap((group) => group.items)

  // The unread count is a number AND a word, so it never depends on colour or
  // position alone to be understood.
  const badge = (item: NavItem, active: boolean) =>
    item.href === '/dashboard/notifications' && unread > 0 ? (
      <span
        className={`tnum rounded-pill px-2 py-0.5 text-micro font-bold leading-none ${
          active ? 'bg-brand text-brand-on' : 'bg-info-tint text-info'
        }`}
      >
        {unread}
        <span className="sr-only"> {t('dashboard.nav.unread')}</span>
      </span>
    ) : null

  return (
    <nav aria-label={t('dashboard.nav.label')}>
      {/* Phones: scrolling rail, pinned below the site header. */}
      <div className="sticky top-[var(--header-h)] z-30 -mx-5 border-b border-line-soft bg-surface-page/95 backdrop-blur sm:-mx-8 lg:hidden">
        <ul className="no-scrollbar flex gap-1 overflow-x-auto px-5 py-2 sm:px-8">
          {flat.map((item) => {
            const active = isActive(item.href, pathname)
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
                  <Icon name={item.icon} size={16} aria-hidden="true" />
                  {t(item.labelKey)}
                  {badge(item, active)}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* lg and up: grouped sidebar */}
      <div className="hidden lg:block">
        {groups.map((group, groupIndex) => (
          <div key={group.titleKey} className={groupIndex > 0 ? 'mt-7' : ''}>
            <h2 className="mb-2 px-3 text-eyebrow font-bold uppercase text-content-muted">
              {t(group.titleKey)}
            </h2>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href, pathname)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex h-11 items-center gap-3 rounded-xl pl-4 pr-3 text-body font-bold transition-colors ${
                        active
                          ? 'bg-brand/10 text-brand'
                          : 'text-content-secondary hover:bg-surface-alt hover:text-content'
                      }`}
                    >
                      {/* The "you are here" bar, in the gutter. */}
                      {active ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand"
                        />
                      ) : null}
                      <Icon name={item.icon} size={18} aria-hidden="true" />
                      <span className="flex-1 truncate">{t(item.labelKey)}</span>
                      {badge(item, active)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}

export default DashboardNav
