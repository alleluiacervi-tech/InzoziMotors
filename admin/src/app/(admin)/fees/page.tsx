'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { EmptyState, ErrorState, LoadingState, fmtMoney } from '@/components/ui'
import { useConfirm, useToast } from '@/components/feedback'

// Fee types are categories, not statuses — they don't earn a hue each.
const TYPE_COLORS: Record<string, string> = {
  commission:    'bg-gray-100 text-gray-600',
  certification: 'bg-gray-100 text-gray-600',
  featured:      'bg-gray-100 text-gray-600',
}

interface Fee {
  /** Set by migration 0006. Legacy rows are still 'USD' until
   *  scripts/convert-to-rwf.js has been run with an agreed rate. */
  currency: string
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
  // Which currency `totals` is expressed in. The API picks the dominant one
  // and says so, rather than summing across currencies.
  const [totalsCurrency, setTotalsCurrency] = useState<string>('RWF')
  const [loading, setLoading]   = useState(true)
  const [error, setError]             = useState<unknown>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const ask = useConfirm()
  const toast = useToast()

  async function load(s: string) {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getFees(s)
      setFees(data.fees)
      setTotals(data.totals || {})
      setTotalsCurrency((data.currencies || []).includes('RWF') ? 'RWF' : (data.currencies || ['RWF'])[0])
    } catch (e: any) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(tab) }, [tab])

  async function setStatus(id: string, status: 'paid' | 'waived') {
    if (status === 'waived') {
      const ok = await ask({
        title: 'Waive this fee?',
        message: 'It stops counting as outstanding revenue. The row stays in the register marked waived.',
        confirmLabel: 'Waive fee',
        tone: 'danger',
      })
      if (!ok) return
    }
    setActionId(id)
    try {
      await api.updateFee(id, status)
      load(tab)
    } catch (e: any) {
      toast(e.message, 'error')
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

      {error ? (
        <ErrorState error={error} onRetry={() => load(tab)} />
      ) : loading ? (
        <LoadingState />
      ) : fees.length === 0 ? (
        <EmptyState icon="cash" title="Nothing to show" description={`No ${tab} fees have been recorded.`} />
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
                <th className="px-4 py-3 font-medium text-right">Amount</th>
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
                    {fmtMoney(f.amount, f.currency)}
                  </td>
                  {tab === 'due' && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setStatus(f.id, 'paid')}
                          disabled={actionId === f.id}
                          className="px-2 py-1 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
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
                  {fmtMoney(tabTotal, totalsCurrency)}
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
