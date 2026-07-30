'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { LogoMark } from '@/components/Logo'
import { Icon, type IconName } from '@/components/Icon'

// Grouped navigation — the shape of the business, not a flat list.
const NAV_GROUPS: { title: string; items: { href: string; icon: IconName; label: string }[] }[] = [
  {
    title: 'Operations',
    items: [
      { href: '/dashboard', icon: 'gauge', label: 'Dashboard' },
      { href: '/submissions', icon: 'document', label: 'Submissions' },
      { href: '/inspections', icon: 'settings', label: 'Inspections' },
      { href: '/handovers', icon: 'key', label: 'Handovers' },
      { href: '/disputes', icon: 'shield', label: 'Disputes' },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { href: '/listings', icon: 'car', label: 'Listings' },
      { href: '/rentals', icon: 'calendar', label: 'Rentals' },
    ],
  },
  {
    title: 'Money & People',
    items: [
      { href: '/fees', icon: 'cash', label: 'Revenue' },
      { href: '/users', icon: 'user', label: 'Users & ID checks' },
      { href: '/analytics', icon: 'chart', label: 'Analytics' },
    ],
  },
]

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items)

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openDisputes, setOpenDisputes] = useState(0)

  useEffect(() => {
    api.me()
      .then((u) => {
        if (u.role !== 'admin') { router.replace('/login'); return }
        setUser(u)
        setReady(true)
      })
      .catch(() => router.replace('/login'))
  }, [router])

  // The 7-day return window is short — an open dispute has to be visible from every page.
  useEffect(() => {
    if (!ready) return
    api.disputes('open')
      .then((d) => setOpenDisputes(d.length))
      .catch(() => setOpenDisputes(0))
  }, [ready, pathname])

  function logout() {
    localStorage.removeItem('inzozi_admin_token')
    document.cookie = 'inzozi_admin_token=; path=/; max-age=0'
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

  const current = ALL_ITEMS.find(
    (n) => pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href)),
  )

  return (
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
              <p className="text-sm font-extrabold leading-none tracking-[-0.01em] text-white">
                Inzozi Motors
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                Operations
              </p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-5">
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
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
                        group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors
                        ${active ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'}
                      `}
                    >
                      <span className={active ? 'text-brand-bright' : 'text-white/40 group-hover:text-white/70'}>
                        <Icon name={icon} size={17} />
                      </span>
                      {label}
                      {href === '/disputes' && openDisputes > 0 && (
                        <span className="ml-auto min-w-5 rounded-full bg-brand px-1.5 py-0.5 text-center text-[11px] font-bold text-white">
                          {openDisputes}
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {(user?.name || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user?.name || 'Admin'}</p>
              <p className="truncate text-[11px] text-white/40">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-white/50 transition-colors hover:bg-white/5 hover:text-white"
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
          <span className="text-sm font-bold text-content">{current?.label ?? ''}</span>
          <span className="ml-auto hidden items-center gap-2 text-xs text-content-muted sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            Connected to live API
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
