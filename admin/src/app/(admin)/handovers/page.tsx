'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-purple-100 text-purple-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function HandoversPage() {
  const [tab, setTab]         = useState<'pending' | 'confirmed' | 'cancelled'>('pending')
  const [items, setItems]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  async function load(s: string) {
    setLoading(true)
    try {
      const data = await api.handovers(s)
      setItems(data)
    } catch (e: any) {
      console.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(tab) }, [tab])

  async function confirm(id: string) {
    if (!window.confirm('Mark this handover complete? The car will be marked as SOLD and both parties will be notified.')) return
    setActionId(id)
    try {
      await api.confirmHandover(id)
      load(tab)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Handovers</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {(['pending', 'confirmed', 'cancelled'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
              tab === t ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-gray-400 text-sm bg-white rounded-xl border border-gray-100 p-8 text-center">
          No {tab} handovers.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((h) => (
            <div key={h.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900">{h.year} {h.make} {h.model}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[h.status] || 'bg-gray-100 text-gray-500'}`}>
                      {h.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 text-xs text-gray-500 mt-2">
                    <div>
                      <p className="font-medium text-gray-700">Buyer</p>
                      <p>{h.buyer_name}</p>
                      <p>{h.buyer_phone}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Seller</p>
                      <p>{h.seller_name}</p>
                      <p>{h.seller_phone}</p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                    <p>📍 <strong>{h.center}</strong></p>
                    <p>📅 {h.handover_date} at {h.handover_time}</p>
                    <p className="mt-1 font-medium text-brand">RWF {Number(h.agreed_price || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {tab === 'pending' && (
                <button
                  onClick={() => confirm(h.id)}
                  disabled={actionId === h.id}
                  className="mt-4 w-full py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-light transition-colors disabled:opacity-50"
                >
                  {actionId === h.id ? 'Confirming…' : '✅ Confirm Handover — Mark Sold'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
