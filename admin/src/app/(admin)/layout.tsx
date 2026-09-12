'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, signOut, getApiStatus, onApiStatus, type ApiStatus } from '@/lib/api'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LogoMark } from '@/components/Logo'
import { Icon, type IconName } from '@/components/Icon'
import { FeedbackProvider } from '@/components/feedback'

// Grouped navigation — the shape of the business, not a flat list.
const NAV_GROUPS: { title: string; items: { href: string; icon: IconName; label: string }[] }[] = [
  {
    title: 'Operations',
    items: [
      { href: '/dashboard', icon: 'gauge', label: 'Action Center' },
      { href: '/pipeline', icon: 'grid', label: 'Pipeline' },
      { href: '/inbox', icon: 'mail', label: 'Inbox' },
      { href: '/submissions', icon: 'document', label: 'Submissions' },
      { href: '/imports', icon: 'car', label: 'Vehicle imports' },
      { href: '/inspections', icon: 'settings', label: 'Inspections' },
      { href: '/rentals/inquiries', icon: 'calendar', label: 'Rental inquiries' },
      { href: '/reports', icon: 'alert', label: 'Reported chats' },
      { href: '/activity', icon: 'clock', label: 'Activity history' },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { href: '/listings', icon: 'car', label: 'Listings' },
      { href: '/banner', icon: 'star', label: 'Home banner' },
      { href: '/brands', icon: 'car', label: 'Brands' },
      { href: '/account-closures', icon: 'user', label: 'Closures' },
      { href: '/rentals/fleet', icon: 'calendar', label: 'Rental inventory' },
      { href: '/settings', icon: 'settings', label: 'Platform settings' },
    ],
  },
  {
    title: 'People & Oversight',
    items: [
      { href: '/users', icon: 'user', label: 'Users & ID checks' },
      { href: '/vehicles', icon: 'search', label: 'Vehicle history' },
      { href: '/analytics', icon: 'chart', label: 'Analytics' },
      { href: '/revenue', icon: 'cash', label: 'Revenue' },
      { href: '/centers', icon: 'location', label: 'Centers' },
    ],
  },
]

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items)

/**
 * Reachability, derived from real request outcomes rather than asserted.
 *
 * The previous version of this was static markup — a green dot and the words
 * "Connected to live API" — which reported success even while every request on
 * the page was failing. An indicator that can only say one thing is worse than
 * no indicator, because it actively argues against what the operator is seeing.
 *
 * Silent until the first request resolves, so it never claims a state it has
 * not observed.
 */
function ApiStatusBadge() {
  const [status, setStatus] = useState<ApiStatus>(getApiStatus)

  useEffect(() => {
    setStatus(getApiStatus())
    return onApiStatus(setStatus)
  }, [])

  if (status === 'unknown') return null

  const ok = status === 'ok'
  return (
    <span
      className={`ml-auto hidden items-center gap-2 text-caption sm:flex ${
        ok ? 'text-content-muted' : 'font-semibold text-danger-strong'
      }`}
      role="status"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-success' : 'bg-danger-strong'}`}
        aria-hidden
      />
      {ok ? 'Connected to live API' : 'API unreachable — data may be stale'}
    </span>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadMail, setUnreadMail] = useState(0)
  const [openReports, setOpenReports] = useState(0)
  const [globalQuery, setGlobalQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ kind: string; id: string; title: string; detail: string; href: string }[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    api.me()
      .then((u) => {
        if (u.role !== 'admin') { router.replace('/login'); return }
        setUser(u)
        setReady(true)
      })
      .catch(() => router.replace('/login'))
  }, [router])

  useEffect(() => {
    if (!ready) return
    api.reports('open')
      .then((r) => setOpenReports(r.length))
      .catch(() => setOpenReports(0))
  }, [ready, pathname])

  useEffect(() => {
    const q = globalQuery.trim()
    if (q.length < 2) { setSearchResults([]); setSearching(false); return }
    setSearching(true)
    const timer = window.setTimeout(() => {
      api.search(q).then((r) => setSearchResults(r.results)).catch(() => setSearchResults([])).finally(() => setSearching(false))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [globalQuery])

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.getElementById('admin-global-search')?.focus()
      }
      if (event.key === 'Escape') { setGlobalQuery(''); setSearchResults([]) }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])

  // Unread mail, same treatment: a customer waiting on a reply is as urgent as a
  // dispute. Silent on failure — the badge is not the place to report that the
  // mail host is down (the Inbox page says so properly), and a mailbox that is
  // not configured at all must not put a permanent 0 or an error in the nav.
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const poll = () => {
      api.mailUnread()
        .then((r) => { if (!cancelled) setUnreadMail(r.unread || 0) })
        .catch(() => { if (!cancelled) setUnreadMail(0) })
    }
    poll()
    // Mail arrives without us asking, unlike everything else in this dashboard,
    // so this is the one thing worth polling. Two minutes is often enough to
    // notice and rare enough to be free.
    const id = window.setInterval(poll, 120_000)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [ready, pathname])

  // The cookie is httpOnly, so only the server can clear it.
  async function logout() {
    await signOut()
    router.replace('/login')
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="flex items-center gap-3 text-sm text-content-muted">
          <LogoMark size={28} />
          Loading…
        </div>
      </div>
    )
  }

  const badgeFor = (href: string) =>
    href === '/inbox' ? unreadMail
      : href === '/reports' ? openReports
      : 0

  const current = ALL_ITEMS.find(
    (n) => pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href)),
  )

  return (
    <FeedbackProvider>
    <a href="#admin-main" className="skip-link">Skip to main content</a>
    <div className="flex h-screen overflow-hidden bg-surface-page">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col bg-ink-900
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}
      >
        {/* Brand */}
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <LogoMark size={34} />
            <div>
              <p className="text-body font-extrabold leading-none tracking-[-0.01em] text-white">
                Sawa Cars
              </p>
              <p className="mt-1 text-micro font-semibold uppercase tracking-[0.14em] text-white/60">
                Operations
              </p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-5">
              {/* text-white/30 measured 2.68:1 on ink-900 — below even the 3:1
                  floor for large text, on the labels that carry the whole
                  information architecture. /60 is 6.9:1. */}
              <p className="mb-1.5 px-3 text-micro font-bold uppercase tracking-[0.16em] text-white/60">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, icon, label }) => {
                  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        group flex items-center gap-3 rounded-lg px-3 py-2 text-label font-semibold transition-colors
                        ${active ? 'bg-surface/10 text-white' : 'text-white/55 hover:bg-surface/5 hover:text-white'}
                      `}
                    >
                      <span className={active ? 'text-brand-bright' : 'text-white/60 group-hover:text-white/80'}>
                        <Icon name={icon} size={17} />
                      </span>
                      {label}
                      {badgeFor(href) > 0 && (
                        <span className="ml-auto min-w-5 rounded-full bg-brand px-1.5 py-0.5 text-center text-micro font-bold text-brand-on">
                          {badgeFor(href)}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-label font-bold text-brand-on">
              {(user?.name || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-label font-semibold text-white">{user?.name || 'Admin'}</p>
              <p className="truncate text-micro text-white/60">{user?.email}</p>
            </div>
          </div>
          {/* Reaching the password form used to require an SSH session, which is
              how a weak admin password survives. It lives beside Sign out
              because that is where someone looks for their own account. */}
          <Link
            href="/account"
            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-label font-semibold text-white/60 transition-colors hover:bg-surface/5 hover:text-white"
          >
            <Icon name="lock" size={15} />
            My account
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-label font-semibold text-white/60 transition-colors hover:bg-surface/5 hover:text-white"
          >
            <Icon name="logout" size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-line-soft bg-surface px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 text-content-muted hover:text-content lg:hidden"
            aria-label="Open menu"
          >
            <Icon name="menu" size={20} />
          </button>
          <span className="text-section font-bold text-content">{current?.label ?? ''}</span>
          <div className="relative ml-auto hidden w-full max-w-md md:block">
            <label className="relative block">
              <span className="sr-only">Search users, listings, submissions and rentals</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"><Icon name="search" size={15} /></span>
              <input id="admin-global-search" value={globalQuery} onChange={(e) => setGlobalQuery(e.target.value)}
                placeholder="Search the operation…"
                className="h-9 w-full rounded-lg border border-line bg-surface-alt pl-9 pr-12 text-label text-content placeholder:text-content-muted focus:border-content-muted focus:outline-none" />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 text-micro text-content-muted">⌘K</kbd>
            </label>
            {globalQuery.trim().length >= 2 ? (
              <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-line bg-surface shadow-card-lg">
                {searching ? <p className="p-4 text-label text-content-muted">Searching…</p>
                  : searchResults.length ? <ul className="max-h-80 overflow-y-auto py-1">{searchResults.map((result) => (
                    <li key={`${result.kind}-${result.id}`}>
                      <Link href={result.href} onClick={() => { setGlobalQuery(''); setSearchResults([]) }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt">
                        <span className="w-20 shrink-0 text-micro font-bold uppercase tracking-wide text-brand">{result.kind}</span>
                        <span className="min-w-0"><span className="block truncate text-label font-semibold text-content">{result.title}</span><span className="block truncate text-caption text-content-muted">{result.detail}</span></span>
                      </Link>
                    </li>
                  ))}</ul> : <p className="p-4 text-label text-content-muted">No matching operational records.</p>}
              </div>
            ) : null}
          </div>
          <ThemeToggle />
          <ApiStatusBadge />
        </header>

        {/* Page content */}
        <main id="admin-main" tabIndex={-1} className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
    </FeedbackProvider>
  )
}
