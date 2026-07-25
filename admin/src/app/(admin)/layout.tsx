'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

const NAV = [
  { href: '/dashboard',   icon: '📊', label: 'Dashboard' },
  { href: '/submissions', icon: '📋', label: 'Submissions' },
  { href: '/inspections', icon: '🔧', label: 'Inspections' },
  { href: '/handovers',   icon: '🤝', label: 'Handovers' },
  { href: '/disputes',    icon: '⚖️', label: 'Disputes' },
  { href: '/listings',    icon: '🚗', label: 'Listings' },
  { href: '/rentals',     icon: '🔑', label: 'Rentals' },
  { href: '/fees',        icon: '💰', label: 'Revenue' },
  { href: '/users',       icon: '👤', label: 'Users / ID Queue' },
  { href: '/analytics',  icon: '📈', label: 'Analytics' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [user, setUser]       = useState<any>(null)
  const [ready, setReady]     = useState(false)
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-60 bg-brand-dark flex flex-col
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}
      >
        {/* Brand */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚗</span>
            <div>
              <p className="text-white font-bold text-sm leading-none">Inzozi Motors</p>
              <p className="text-white/50 text-xs mt-0.5">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'}
                `}
              >
                <span className="text-base">{icon}</span>
                {label}
                {href === '/disputes' && openDisputes > 0 && (
                  <span className="ml-auto min-w-5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold text-center">
                    {openDisputes}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-brand-bright flex items-center justify-center text-white text-xs font-bold">
              {(user?.name || 'A')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-white/40 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-xs text-white/50 hover:text-white py-1.5 text-left transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-900"
          >
            ☰
          </button>
          <span className="text-sm text-gray-400">
            {NAV.find((n) => pathname.startsWith(n.href))?.label ?? ''}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
