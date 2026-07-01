'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden">
        <div
          className={`h-full rounded-md transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right flex-shrink-0">{value}</span>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.analytics()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-400 text-sm">Loading analytics…</div>
  if (error)   return <div className="text-red-600 text-sm">Error: {error}</div>

  const {
    topMakes = [],
    pipelineFunnel = [],
    centers = [],
    monthlySales = [],
  } = data || {}

  const maxMakeCount   = Math.max(...topMakes.map((m: any) => m.count), 1)
  const maxCenterCount = Math.max(...centers.map((c: any) => c.scheduled), 1)
  const maxMonthly     = Math.max(...monthlySales.map((m: any) => m.total_sold), 1)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Analytics</h1>

      {/* Pipeline funnel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Listing Pipeline Funnel</h2>
        <div className="flex items-end gap-3 flex-wrap">
          {pipelineFunnel.map((stage: any, i: number) => {
            const maxCount = Math.max(...pipelineFunnel.map((s: any) => s.count), 1)
            const height   = Math.max(20, (stage.count / maxCount) * 100)
            const colors   = ['bg-amber-400', 'bg-blue-400', 'bg-indigo-400', 'bg-purple-400', 'bg-brand', 'bg-gray-400']
            return (
              <div key={stage.status} className="flex flex-col items-center gap-1 flex-1 min-w-[60px]">
                <span className="text-sm font-bold text-gray-800">{stage.count}</span>
                <div
                  className={`w-full rounded-t-lg ${colors[i % colors.length]}`}
                  style={{ height: `${height}px` }}
                />
                <span className="text-xs text-gray-500 text-center capitalize">{stage.status.replace('_', ' ')}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top makes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Makes (Live + Sold)</h2>
          <div className="space-y-2">
            {topMakes.length === 0 ? (
              <p className="text-xs text-gray-400">No data yet</p>
            ) : (
              topMakes.map((m: any) => (
                <Bar key={m.make} label={m.make} value={m.count} max={maxMakeCount} color="bg-brand" />
              ))
            )}
          </div>
        </div>

        {/* Centers */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Inspection Centers (Scheduled This Month)</h2>
          <div className="space-y-2">
            {centers.length === 0 ? (
              <p className="text-xs text-gray-400">No data yet</p>
            ) : (
              centers.map((c: any) => (
                <Bar key={c.center} label={c.center} value={c.scheduled} max={maxCenterCount} color="bg-indigo-500" />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Monthly sales */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Sales (Last 6 Months)</h2>
        {monthlySales.length === 0 ? (
          <p className="text-xs text-gray-400">No sales data yet</p>
        ) : (
          <div className="flex items-end gap-4">
            {monthlySales.map((m: any) => {
              const height = Math.max(16, (m.total_sold / maxMonthly) * 120)
              return (
                <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs font-semibold text-gray-700">{m.total_sold}</span>
                  <div
                    className="w-full bg-brand rounded-t-lg"
                    style={{ height: `${height}px` }}
                  />
                  <span className="text-xs text-gray-500">
                    {new Date(m.month + '-01').toLocaleDateString('en', { month: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
