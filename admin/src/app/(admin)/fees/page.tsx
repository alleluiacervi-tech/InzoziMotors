'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, fmtMoney } from '@/components/ui'
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
  fee_type: 'commission' | 'certification' | 'featured' | 'rental'
  amount: number
  status: 'due' | 'paid' | 'waived'
  created_at: string
}

export default function FeesPage() {
  const [tab, setTab]           = useState<'due' | 'paid' | 'waived'>('due')
  const [fees, setFees]         = useState<Fee[]>([])
  // Which currency `totals` is expressed in. The API picks the dominant one
  // and says so, rather than summing across currencies.
  const [totalsCurrency, setTotalsCurrency] = useState<string>('RWF')
  const [loading, setLoading]   = useState(true)
  const [error, setError]             = useState<unknown>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const ask = useConfirm()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [feeType, setFeeType] = useState('all')

  async function load(s: string) {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getFees(s)
      setFees(data.fees)
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

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return fees.filter((fee) => (feeType === 'all' || fee.fee_type === feeType) &&
      (!needle || [fee.seller_name, fee.car_title, fee.booking_id, fee.id, fee.fee_type]
        .some((value) => String(value || '').toLowerCase().includes(needle))))
  }, [fees, query, feeType])
  const visibleTotals = useMemo(() => visible.reduce<Record<string, number>>((acc, fee) => {
    const currency = fee.currency || 'RWF'
    acc[currency] = (acc[currency] || 0) + Number(fee.amount)
    return acc
  }, {}), [visible])

  function exportCsv() {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = [['Created', 'Car', 'Seller', 'Type', 'Booking', 'Amount', 'Currency', 'Status'],
      ...visible.map((f) => [f.created_at, f.car_title, f.seller_name, f.fee_type, f.booking_id, f.amount, f.currency, f.status])]
    const blob = new Blob([rows.map((row) => row.map(quote).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = `sawa-fees-${tab}-${new Date().toISOString().slice(0, 10)}.csv`; link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader title="Revenue" description="Reconcile every platform fee in its stored currency. Exports contain raw amounts and explicit currency codes."
        action={<button type="button" onClick={exportCsv} disabled={!visible.length} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-label font-bold text-content hover:bg-surface-alt disabled:opacity-40"><Icon name="document" size={16} />Export CSV</button>} />

      <Card className="mb-5 p-4"><div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><span className="sr-only">Search fees</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"><Icon name="search" size={16} /></span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search seller, vehicle, booking, or fee ID" className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-label text-content focus:border-content-muted focus:outline-none" /></label>
        <label><span className="sr-only">Filter fee type</span><select value={feeType} onChange={(e) => setFeeType(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-label font-semibold text-content focus:outline-none sm:w-48">
          <option value="all">All fee types</option><option value="commission">Commission</option><option value="certification">Certification</option><option value="featured">Featured</option><option value="rental">Rental</option>
        </select></label>
      </div></Card>

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
      ) : visible.length === 0 ? (
        <EmptyState icon="cash" title={fees.length ? 'No fees match' : 'Nothing to show'} description={fees.length ? 'Try a different seller, booking, or fee type.' : `No ${tab} fees have been recorded.`} />
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
              {visible.map((f) => (
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
                  {Object.entries(visibleTotals).map(([currency, amount]) => fmtMoney(amount, currency)).join(' · ') || fmtMoney(0, totalsCurrency)}
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
