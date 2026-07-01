'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

const CENTERS = ['all', 'Nyarutarama', 'Kicukiro', 'Kimironko']
const STATUS_COLORS: Record<string, string> = {
  scheduled:  'bg-indigo-100 text-indigo-700',
  inspecting: 'bg-purple-100 text-purple-700',
  complete:   'bg-green-100 text-green-700',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function InspectionsPage() {
  const [center, setCenter]   = useState('all')
  const [date, setDate]       = useState(todayISO())
  const [status, setStatus]   = useState('scheduled')
  const [items, setItems]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const params: Record<string, string> = { status }
    if (center !== 'all') params.center = center
    if (date)             params.date   = date
    try {
      const data = await api.inspections(params)
      setItems(data)
    } catch (e: any) {
      console.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [center, date, status])

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Inspections</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Center</label>
          <select
            value={center}
            onChange={(e) => setCenter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {CENTERS.map((c) => <option key={c}>{c === 'all' ? 'All Centers' : c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="scheduled">Scheduled</option>
            <option value="inspecting">In Progress</option>
            <option value="complete">Complete</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-gray-400 text-sm bg-white rounded-xl border border-gray-100 p-8 text-center">
          No inspections found for the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((insp) => (
            <div key={insp.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-gray-900 text-sm">
                    {insp.year} {insp.make} {insp.model}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[insp.status] || 'bg-gray-100 text-gray-600'}`}>
                    {insp.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{insp.center} · {insp.scheduled_date} at {insp.scheduled_time}</p>
                <p className="text-xs text-gray-500">Seller: {insp.seller_name}</p>
              </div>
              {insp.status !== 'complete' && (
                <Link
                  href={`/inspections/${insp.id}`}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-light"
                >
                  {insp.status === 'scheduled' ? 'Start Checklist' : 'Continue'}
                </Link>
              )}
              {insp.status === 'complete' && (
                <span className="text-xs text-green-600 font-medium flex-shrink-0">✅ Done</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
