'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { signOutAction } from '@/app/actions/auth'
import { Logo, LogoMark } from '@/components/brand/Logo'
import { DashboardNav, isActive } from '@/components/dashboard/DashboardNav'
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher'
import { Badge, Icon, type IconName } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

// ─────────────────────────────────────────────────────────────────────────────
// The signed-in workspace, drawn like an app rather than a web page.
//
//   lg and up  a fixed sidebar (brand, grouped nav, the account at its foot)
//              and a content column. No site header, no footer: SiteChrome
//              steps them aside on /dashboard.
//   phones     a slim top bar and a bottom tab bar for the five places people
//              go most, with everything else one tap away under "More".
//              An open conversation takes the whole screen, the way every
//              messaging app does it; its own header carries the way back.
//
// The layout (server) resolves the user and the counts and hands down only
// display fields. No token reaches this component.
// ─────────────────────────────────────────────────────────────────────────────

export interface ShellAccount {
  name: string
  initial: string
  roleLabel: string
  verification: { tone: 'success' | 'warning' | 'danger' | 'neutral'; icon: IconName; label: string }
  isAdmin: boolean
}

const TABS: { href: string; labelKey: string; icon: IconName }[] = [
  { href: '/dashboard', labelKey: 'dashboard.nav.overview', icon: 'grid' },
  { href: '/dashboard/saved', labelKey: 'dashboard.nav.saved', icon: 'heart' },
  { href: '/dashboard/messages', labelKey: 'dashboard.nav.messages', icon: 'mail' },
  { href: '/dashboard/selling', labelKey: 'dashboard.nav.selling', icon: 'car' },
]

const inMessages = (p: string) => p === '/dashboard/messages' || p.startsWith('/dashboard/messages/')
const inThread = (p: string) => /^\/dashboard\/messages\/[^/]+/.test(p)

function CountDot({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null
  return (
    <span className="tnum absolute -right-1.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-brand px-1 text-[10px] font-bold leading-none text-brand-on ring-2 ring-surface">
      {count > 99 ? '99+' : count}
      <span className="sr-only"> {label}</span>
    </span>
  )
}

function Avatar({ initial, size = 36 }: { initial: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-alt text-caption font-extrabold text-content-secondary ring-1 ring-inset ring-line"
    >
      {initial}
    </span>
  )
}

function AccountBlock({ account, compact = false }: { account: ShellAccount; compact?: boolean }) {
  const t = useT()
  return (
    <div className={compact ? '' : 'rounded-xl p-2'}>
      <div className="flex items-center gap-3">
        <Avatar initial={account.initial} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-caption font-extrabold text-content">{account.name}</p>
          <p className="truncate text-micro text-content-muted">{account.roleLabel}</p>
        </div>
      </div>
      <div className="mt-2.5">
        <Badge tone={account.verification.tone} icon={account.verification.icon}>
          {account.verification.label}
        </Badge>
      </div>
      <form action={signOutAction} className="mt-3">
        <button
          type="submit"
          className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-caption font-bold text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
        >
          <Icon name="logout" size={16} aria-hidden="true" />
          {t('dashboard.common.signOut')}
        </button>
      </form>
    </div>
  )
}

function Utilities({ isAdmin }: { isAdmin: boolean }) {
  const t = useT()
  return (
    <div className="space-y-1">
      <Link
        href="/cars"
        className="flex h-9 items-center gap-2 rounded-lg px-2 text-caption font-bold text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
      >
        <Icon name="compass" size={16} aria-hidden="true" />
        {t('dashboard.shell.backToSite')}
      </Link>
      {isAdmin ? (
        <Link
          href="/admin-portal"
          prefetch={false}
          className="flex h-9 items-center gap-2 rounded-lg px-2 text-caption font-bold text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
        >
          <Icon name="shield-check" size={16} aria-hidden="true" />
          {t('common.admin')}
        </Link>
      ) : null}
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <LanguageSwitcher tone="light" />
      </div>
    </div>
  )
}

export function DashboardShell({
  account,
  unread,
  messagesUnread,
  isRentalProvider,
  notice,
  children,
}: {
  account: ShellAccount
  unread: number
  messagesUnread: number
  isRentalProvider: boolean
  /** The verification banner. Kept off the inbox, where it would push the
   *  conversation list down on every visit. */
  notice?: ReactNode
  children: ReactNode
}) {
  const t = useT()
  const pathname = usePathname() || '/dashboard'
  const [moreOpen, setMoreOpen] = useState(false)

  const messages = inMessages(pathname)
  const thread = inThread(pathname)

  useEffect(() => setMoreOpen(false), [pathname])
  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  const unreadWord = t('dashboard.nav.unread')

  return (
    <div className="min-h-dvh bg-surface-page">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-line-soft bg-surface lg:flex">
        <div className="flex h-16 shrink-0 items-center px-6">
          <Link href="/" aria-label="Sawa Cars — home" className="flex h-11 items-center">
            <Logo size={16} tone="dark" />
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2">
          <DashboardNav unread={unread} messagesUnread={messagesUnread} isRentalProvider={isRentalProvider} />
        </div>
        <div className="shrink-0 space-y-3 border-t border-line-soft p-3">
          <Utilities isAdmin={account.isAdmin} />
          <div className="border-t border-line-soft pt-3">
            <AccountBlock account={account} />
          </div>
        </div>
      </aside>

      {/* ── Phone top bar ───────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-30 h-14 items-center gap-2 border-b border-line-soft bg-surface/90 px-4 backdrop-blur-xl lg:hidden ${
          thread ? 'hidden' : 'flex'
        }`}
      >
        <Link href="/" aria-label="Sawa Cars — home" className="flex h-11 items-center">
          <LogoMark size={28} />
        </Link>
        <p className="ml-1 min-w-0 flex-1 truncate text-body font-extrabold text-content">
          {t('dashboard.nav.label')}
        </p>
        <Link
          href="/dashboard/notifications"
          aria-label={t('dashboard.nav.notifications')}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-content hover:bg-surface-alt"
        >
          <Icon name="bell" size={21} />
          <CountDot count={unread} label={unreadWord} />
        </Link>
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label={t('dashboard.shell.menu')}
          aria-expanded={moreOpen}
          aria-controls="dashboard-more"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-alt"
        >
          <Avatar initial={account.initial} size={32} />
        </button>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="lg:pl-[264px]">
        {messages ? (
          // The inbox fills the viewport; its panes scroll on their own.
          <div className={`bg-surface ${thread ? 'h-dvh' : 'min-h-[calc(100dvh-3.5rem)] pb-[calc(4rem+env(safe-area-inset-bottom))] lg:h-dvh lg:min-h-0 lg:pb-0'}`}>
            {children}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[1120px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
            {notice}
            {children}
          </div>
        )}
      </div>

      {/* ── Phone tab bar ───────────────────────────────────────────────── */}
      <nav
        aria-label={t('dashboard.nav.label')}
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden ${
          thread ? 'hidden' : ''
        }`}
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
          {TABS.map((tab) => {
            const active = isActive(tab.href, pathname)
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-bold ${
                    active ? 'text-content' : 'text-content-muted'
                  }`}
                >
                  <span className="relative">
                    <Icon name={tab.icon} size={22} strokeWidth={active ? 2.2 : 1.7} />
                    {tab.href === '/dashboard/messages' ? (
                      <CountDot count={messagesUnread} label={unreadWord} />
                    ) : null}
                  </span>
                  {t(tab.labelKey)}
                </Link>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              aria-controls="dashboard-more"
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-bold text-content-muted"
            >
              <Icon name="menu" size={22} strokeWidth={1.7} />
              {t('dashboard.shell.more')}
            </button>
          </li>
        </ul>
      </nav>

      {/* ── Phone "More" sheet ──────────────────────────────────────────── */}
      {moreOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('dashboard.shell.menu')}>
          <button
            type="button"
            aria-label={t('dashboard.shell.closeMenu')}
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div
            id="dashboard-more"
            className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-surface shadow-card-lg"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line-soft px-4">
              <p className="text-body font-extrabold text-content">{t('dashboard.shell.menu')}</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label={t('dashboard.shell.closeMenu')}
                className="flex h-10 w-10 items-center justify-center rounded-full text-content hover:bg-surface-alt"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              <DashboardNav
                unread={unread}
                messagesUnread={messagesUnread}
                isRentalProvider={isRentalProvider}
                onNavigate={() => setMoreOpen(false)}
              />
              <div className="mt-6 border-t border-line-soft pt-4">
                <Utilities isAdmin={account.isAdmin} />
              </div>
            </div>
            <div className="shrink-0 border-t border-line-soft p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <AccountBlock account={account} compact />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default DashboardShell
