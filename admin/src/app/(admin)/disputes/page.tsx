'use client'

import { Fragment, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Icon } from '@/components/ui'

const STATUS_COLORS: Record<string, string> = {
  open:     'bg-warning-tint text-warning-text',
  resolved: 'bg-success-tint text-success',
  rejected: 'bg-gray-100 text-gray-600',
}

interface Dispute {
  id: string
  handover_id: string
  raised_by: string
  reason: string
  status: 'open' | 'resolved' | 'rejected'
  resolution: string | null
  created_at: string
  resolved_at: string | null
  booking_id: string | null
  car_title: string
  buyer_name: string
  seller_name: string
}

export default function DisputesPage() {
  const [tab, setTab]           = useState<'open' | 'resolved' | 'rejected'>('open')
  const [items, setItems]       = useState<Dispute[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [actionId, setActionId] = useState<string | null>(null)

  // Inline resolve/reject panel
  const [panelFor, setPanelFor]       = useState<string | null>(null)
  const [panelStatus, setPanelStatus] = useState<'resolved' | 'rejected'>('resolved')
  const [resolution, setResolution]   = useState('')
  const [panelError, setPanelError]   = useState('')

  // One fetch for every tab — the open count must stay visible from any tab.
  async function load() {
    setLoading(true)
    try {
      const data = await api.disputes()
      setItems(data)
      setError('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openPanel(id: string, status: 'resolved' | 'rejected') {
    setPanelFor(id)
    setPanelStatus(status)
    setResolution('')
    setPanelError('')
  }

  function closePanel() {
    setPanelFor(null)
    setResolution('')
    setPanelError('')
  }

  async function submit(id: string) {
    if (!resolution.trim()) {
      setPanelError('A resolution note is required — it is sent to the buyer as a notification.')
      return
    }
    setActionId(id)
    setPanelError('')
    try {
      await api.resolveDispute(id, { status: panelStatus, resolution: resolution.trim() })
      closePanel()
      load()
    } catch (e: any) {
      setPanelError(e.message)
    } finally {
      setActionId(null)
    }
  }

  const counts = {
    open:     items.filter((d) => d.status === 'open').length,
    resolved: items.filter((d) => d.status === 'resolved').length,
    rejected: items.filter((d) => d.status === 'rejected').length,
  }
  const rows = items.filter((d) => d.status === tab)

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Disputes</h1>
      <p className="text-sm text-gray-500 mb-6">
        Buyers can raise a dispute within 7 days of a completed handover. Every decision notifies the buyer.
      </p>

      {/* Open-dispute alarm — a dispute sitting untouched breaks the return guarantee */}
      <div
        className={`rounded-xl border p-5 mb-6 flex items-center gap-4 ${
          counts.open > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100 shadow-sm'
        }`}
      >
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${counts.open > 0 ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-700'}`}><Icon name={counts.open > 0 ? 'alert' : 'check'} size={20} /></span>
        <div>
          <p className={`text-2xl font-bold ${counts.open > 0 ? 'text-red-700' : 'text-gray-900'}`}>
            {counts.open}
          </p>
          <p className={`text-sm ${counts.open > 0 ? 'text-red-700' : 'text-gray-500'}`}>
            {counts.open > 0
              ? `open dispute${counts.open === 1 ? '' : 's'} awaiting a decision — both parties are waiting`
              : 'open disputes — nothing outstanding'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {(['open', 'resolved', 'rejected'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); closePanel() }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
              tab === t ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand'
            }`}
          >
            {t} ({counts[t]})
          </button>
        ))}
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-400 text-sm bg-white rounded-xl border border-gray-100 p-8 text-center">
          No {tab} disputes.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Raised</th>
                <th className="px-4 py-3 font-medium">Raised by</th>
                <th className="px-4 py-3 font-medium">Car / Booking</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {tab === 'open' && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <Fragment key={d.id}>
                  <tr className="border-b border-gray-50 last:border-0 align-top">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(d.created_at).toLocaleDateString()}
                      {d.resolved_at && (
                        <p className="text-xs text-gray-400">
                          closed {new Date(d.resolved_at).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{d.buyer_name}</p>
                      <p className="text-xs text-gray-500">seller: {d.seller_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 font-medium">{d.car_title}</p>
                      <p className="text-xs text-gray-500">{d.booking_id || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-md">
                      {d.reason}
                      {d.resolution && (
                        <p className="text-xs text-gray-400 mt-1 italic">Resolution: {d.resolution}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-600'}`}>
                        {d.status}
                      </span>
                    </td>
                    {tab === 'open' && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openPanel(d.id, 'resolved')}
                            disabled={actionId === d.id}
                            className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => openPanel(d.id, 'rejected')}
                            disabled={actionId === d.id}
                            className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>

                  {panelFor === d.id && (
                    <tr className="border-b border-gray-50 last:border-0">
                      <td colSpan={6} className="px-4 pb-4">
                        <div className={`p-3 rounded-lg border ${panelStatus === 'resolved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <p className={`text-xs font-medium mb-2 ${panelStatus === 'resolved' ? 'text-green-700' : 'text-red-700'}`}>
                            {panelStatus === 'resolved'
                              ? 'Resolution note (sent to the buyer)'
                              : 'Why is this dispute rejected? (sent to the buyer)'}
                          </p>
                          <textarea
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            rows={2}
                            className={`w-full text-sm border rounded-lg p-2 focus:outline-none focus:ring-1 ${
                              panelStatus === 'resolved'
                                ? 'border-green-200 focus:ring-green-400'
                                : 'border-red-200 focus:ring-red-400'
                            }`}
                            placeholder={panelStatus === 'resolved'
                              ? 'e.g. Car returned at Nyarutarama center, full refund arranged with the seller…'
                              : 'e.g. Fault reported is normal wear disclosed in the inspection report…'}
                          />
                          {panelError && <p className="text-xs text-red-600 mt-2">{panelError}</p>}
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => submit(d.id)}
                              disabled={actionId === d.id}
                              className={`px-3 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50 ${
                                panelStatus === 'resolved'
                                  ? 'bg-green-600 hover:bg-green-700'
                                  : 'bg-red-600 hover:bg-red-700'
                              }`}
                            >
                              {actionId === d.id
                                ? 'Working…'
                                : panelStatus === 'resolved' ? 'Confirm Resolve' : 'Confirm Reject'}
                            </button>
                            <button
                              onClick={closePanel}
                              className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
