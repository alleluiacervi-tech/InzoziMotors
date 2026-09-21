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
//
// One glyph, one destination. An icon in a sidebar is an identifier, and it
// stops identifying anything the moment two rows share it: `car` sat on
// Vehicle imports, Listings and Brands at once, and `settings`, `calendar`
// and `user` were each on two rows. Each is now the thing it actually names —
// a shield-check for the 150-point inspection, a key for rental inventory,
// a marque-shaped shield for brands.
const NAV_GROUPS: { title: string; items: { href: string; icon: IconName; label: string }[] }[] = [
  {
    title: 'Operations',
    items: [
      { href: '/dashboard', icon: 'gauge', label: 'Action Center' },
      { href: '/pipeline', icon: 'grid', label: 'Pipeline' },
      { href: '/inbox', icon: 'mail', label: 'Inbox' },
      { href: '/submissions', icon: 'document', label: 'Submissions' },
      { href: '/imports', icon: 'external', label: 'Vehicle imports' },
      { href: '/imports/photos', icon: 'camera', label: 'Catalogue photos' },
      { href: '/inspections', icon: 'shield-check', label: 'Inspections' },
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
      { href: '/brands', icon: 'shield', label: 'Brands' },
      { href: '/account-closures', icon: 'close-circle', label: 'Closures' },
      { href: '/rentals/fleet', icon: 'key', label: 'Rental inventory' },
      { href: '/settings', icon: 'settings', label: 'Platform settings' },
    ],
  },
  {
    title: 'People & Oversight',
    items: [
      { href: '/users', icon: 'user', label: 'Users & ID checks' },
      { href: '/vehicles', icon: 'eye', label: 'Vehicle history' },
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

  const matches = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  const current = ALL_ITEMS.find((n) => matches(n.href))
  // Twenty-one destinations across three groups: the page title alone does not
  // say where you are. The group name does, and it costs one line.
  const currentGroup = NAV_GROUPS.find((g) => g.items.some((n) => matches(n.href)))?.title

  return (
    <FeedbackProvider>
    <a href="#admin-main" className="skip-link">Skip to main content</a>
    {/* ─────────────────────────────────────────────────────────────────────
        TWO LAYOUTS, and the reason there have to be two.

        From lg up this is an app shell: a fixed rail, a fixed header, and one
        inner scroll region. That is right for an operations console on a
        monitor — the navigation never leaves and a long queue scrolls under a
        header that stays put.

        Below lg the same shell was actively broken, and this is the bug that
        produced "scroll past the bottom and the page is blank". `h-screen` is
        `height: 100vh`, and on a phone 100vh is the viewport with the URL bar
        HIDDEN — taller than what you can actually see while it is shown. So
        the shell stood ~90px taller than the visible area, the document itself
        gained that much scroll, and scrolling it slid the whole clipped shell
        up to reveal the page background underneath: a blank screen with no
        content in it, exactly as reported. The inner scroller made it worse by
        stopping the browser collapsing its own chrome, since from its point of
        view the document never scrolled at all.

        So below lg there is no height cap, no clipping and no inner scroller:
        the DOCUMENT scrolls, the way a phone expects. `sticky` on the header
        then does its job against the document instead of being inert. On lg
        the cap comes back as 100dvh — the dynamic viewport unit, which tracks
        the browser chrome instead of pretending it is not there.
        ───────────────────────────────────────────────────────────────────── */}
    <div className="bg-surface-page lg:flex lg:h-[100dvh] lg:overflow-hidden">
      {/* Sidebar. `console-rail` lights the ink so 21 rows of navigation do not
          sit on an unlit slab; `isolate` keeps that lamp behind the nav. */}
      <aside
        className={`
          console-rail fixed inset-y-0 left-0 z-40 flex h-[100dvh] w-[264px] transform isolate flex-col
          overflow-hidden bg-ink-900 transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:h-auto lg:translate-x-0
        `}
      >
        {/* Brand */}
        <div className="relative z-10 border-b border-white/10 px-5 py-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl"
            onClick={() => setSidebarOpen(false)}
          >
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

        {/* Nav. The active row is marked by a bar in the gutter rather than a
            filled pill — the same treatment the website's dashboard uses, so
            an operator moving between the two reads one product. A pill in a
            21-row list fights the list's own rhythm; a bar sits outside it.
            `aria-current` carries the same fact for a screen reader, which
            colour alone never does. */}
        {/* `nav-fade` dissolves the last few pixels of the scroll area into the
            ink. Twenty-one destinations do not fit a laptop's rail, and without
            it the list simply stopped mid-row against the user footer — which
            reads as a clipping bug rather than as "there is more below". */}
        <nav className="rail-scroll nav-fade relative z-10 min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.title} className={groupIndex > 0 ? 'mt-6' : ''}>
              {/* text-white/30 measured 2.68:1 on ink-900 — below even the 3:1
                  floor for large text, on the labels that carry the whole
                  information architecture. /60 is 6.9:1. */}
              <p className="mb-2 px-3 text-micro font-bold uppercase tracking-[0.16em] text-white/60">
                {group.title}
              </p>
              <div className="space-y-px">
                {group.items.map(({ href, icon, label }) => {
                  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                  const badge = badgeFor(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        group relative flex h-9 items-center gap-3 rounded-lg pl-4 pr-2.5 text-label font-semibold transition-colors
                        ${active ? 'bg-white/[0.07] text-white' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'}
                      `}
                    >
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-brand-bright"
                        />
                      ) : null}
                      <span className={active ? 'text-brand-bright' : 'text-white/55 group-hover:text-white/80'}>
                        <Icon name={icon} size={17} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {badge > 0 && (
                        <span className="tnum ml-auto min-w-5 shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-center text-micro font-bold text-brand-on">
                          {badge}
                          <span className="sr-only"> waiting</span>
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
        <div className="relative z-10 border-t border-white/10 px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-label font-bold text-brand-on">
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
      <div className="flex min-w-0 flex-1 flex-col lg:overflow-hidden">
        {/* Top bar. Taller than it was, because it now carries WHERE you are as
            well as what the page is: a 56px strip with one bold word in it was
            using a full band of chrome to say less than the sidebar already
            showed. Sticky, so the context survives a long queue scroll. */}
        {/* Opaque, not frosted. Below lg this bar is sticky over a scrolling
            document, and at 90% with a blur the queue's text ghosted through
            it — legible enough to notice, not legible enough to read, which is
            the worst of both. A translucent bar is a marketing flourish; an
            operations console wants its chrome to stay put and stay solid. */}
        <header className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center gap-3 border-b border-line-soft bg-surface px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="-ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-surface-alt hover:text-content lg:hidden"
            aria-label="Open menu"
          >
            <Icon name="menu" size={20} />
          </button>
          <div className="min-w-0">
            {currentGroup ? (
              <p className="truncate text-micro font-bold uppercase tracking-[0.14em] text-content-muted">
                {currentGroup}
              </p>
            ) : null}
            <p className="truncate text-section font-bold leading-tight text-content">
              {current?.label ?? ''}
            </p>
          </div>
          <div className="relative ml-auto hidden w-full max-w-md md:block">
            <label className="relative block">
              <span className="sr-only">Search users, listings, submissions and rentals</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"><Icon name="search" size={15} /></span>
              <input id="admin-global-search" value={globalQuery} onChange={(e) => setGlobalQuery(e.target.value)}
                placeholder="Search the operation…"
                className="h-10 w-full rounded-xl border border-line bg-surface-alt pl-9 pr-12 text-label text-content placeholder:text-content-muted transition-colors focus:border-brand focus:bg-surface focus:outline-none" />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 text-micro text-content-muted">⌘K</kbd>
            </label>
            {globalQuery.trim().length >= 2 ? (
              <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-line bg-surface shadow-card-lg">
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
        {/* max-w-7xl, not 6xl: this console renders dense queues and wide
            tables, and 1152px on a 2560px monitor left a third of the screen
            empty while rows truncated. */}
        {/* `relative` is load-bearing, not decoration.
            `overflow` does not create a containing block — only `position`
            does — so an absolutely positioned descendant with no positioned
            ancestor resolves against the INITIAL containing block and escapes
            this scroller's clipping entirely. The chart's visually-hidden data
            table did exactly that: it landed at y=1657 in document coordinates
            and stretched the page 757px past a shell that is clipped at the
            viewport, which is the blank screen you reach by scrolling down.
            One word contains every such descendant, including any a future
            page adds. */}
        <main id="admin-main" tabIndex={-1} className="relative flex-1 p-4 lg:overflow-y-auto lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
    </FeedbackProvider>
  )
}
