'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { fmtUSD, fmtRWF } from '@/components/ui'

const TYPE_COLORS: Record<string, string> = {
  commission:    'bg-purple-100 text-purple-700',
  certification: 'bg-blue-100 text-blue-700',
  featured:      'bg-amber-100 text-amber-700',
}

interface Fee {
  id: string
  seller_name: string
  booking_id: string | null
  car_title: string | null
  fee_type: 'commission' | 'certification' | 'featured'
  amount: number
  status: 'due' | 'paid' | 'waived'
  created_at: string
}

export default function FeesPage() {
  const [tab, setTab]           = useState<'due' | 'paid' | 'waived'>('due')
  const [fees, setFees]         = useState<Fee[]>([])
  const [totals, setTotals]     = useState<Record<string, number>>({})
  const [loading, setLoading]   = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  async function load(s: string) {
    setLoading(true)
    try {
      const data = await api.getFees(s)
      setFees(data.fees)
      setTotals(data.totals || {})
    } catch (e: any) {
      console.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(tab) }, [tab])

  async function setStatus(id: string, status: 'paid' | 'waived') {
    if (status === 'waived' && !window.confirm('Waive this fee? It will no longer count as outstanding revenue.')) return
    setActionId(id)
    try {
      await api.updateFee(id, status)
      load(tab)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionId(null)
    }
  }

  const tabTotal = totals[tab] || 0

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Revenue</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {(['due', 'paid', 'waived'] as const).map((t) => (
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
      ) : fees.length === 0 ? (
        <div className="text-gray-400 text-sm bg-white rounded-xl border border-gray-100 p-8 text-center">
          No {tab} fees.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Car</th>
                <th className="px-4 py-3 font-medium">Seller</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Booking</th>
                <th className="px-4 py-3 font-medium text-right">Amount (USD)</th>
                {tab === 'due' && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {fees.map((f) => (
                <tr key={f.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{f.car_title || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{f.seller_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[f.fee_type] || 'bg-gray-100 text-gray-600'}`}>
                      {f.fee_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{f.booking_id || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {fmtUSD(f.amount)}
                  </td>
                  {tab === 'due' && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setStatus(f.id, 'paid')}
                          disabled={actionId === f.id}
                          className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                        <button
                          onClick={() => setStatus(f.id, 'waived')}
                          disabled={actionId === f.id}
                          className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                          Waive
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total {tab}
                </td>
                <td className="px-4 py-3 text-right font-bold text-brand whitespace-nowrap">
                  {fmtUSD(tabTotal)}
                  <span className="ml-1.5 text-[11px] font-medium text-gray-400">≈ {fmtRWF(tabTotal)}</span>
                </td>
                {tab === 'due' && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
