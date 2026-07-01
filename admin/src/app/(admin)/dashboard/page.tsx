'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Stats {
  liveListings: number
  pendingSubmissions: number
  pendingHandovers: number
  pendingIdVerifications: number
  totalSold: number
  totalRevenue: number
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>live</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats]     = useState<Stats | null>(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.stats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-400 text-sm">Loading stats…</div>
  if (error)   return <div className="text-red-600 text-sm">Error: {error}</div>

  const s = stats!

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Live Listings"        value={s.liveListings}           icon="🚗" color="bg-green-100 text-green-700" />
        <StatCard label="Pending Submissions"  value={s.pendingSubmissions}     icon="📋" color="bg-amber-100 text-amber-700" />
        <StatCard label="Pending Handovers"    value={s.pendingHandovers}       icon="🤝" color="bg-purple-100 text-purple-700" />
        <StatCard label="ID Queue"             value={s.pendingIdVerifications} icon="🪪" color="bg-blue-100 text-blue-700" />
        <StatCard label="Cars Sold"            value={s.totalSold}              icon="✅" color="bg-gray-100 text-gray-700" />
        <StatCard label="Revenue (RWF)"        value={`${(s.totalRevenue / 1_000_000).toFixed(1)}M`} icon="💰" color="bg-green-100 text-green-700" />
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/submissions', label: 'Review Submissions', icon: '📋' },
            { href: '/inspections', label: 'Today\'s Inspections', icon: '🔧' },
            { href: '/handovers',   label: 'Confirm Handovers',  icon: '🤝' },
            { href: '/users',       label: 'ID Verification Queue', icon: '🪪' },
          ].map(({ href, label, icon }) => (
            <a
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-100 hover:border-brand hover:bg-brand-tint transition-colors text-center"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
