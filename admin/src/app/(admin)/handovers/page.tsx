'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { EmptyState, ErrorState, LoadingState, fmtMoney } from '@/components/ui'
import { useConfirm, useToast } from '@/components/feedback'

// Secondary action grammar on this page — the tabs already use it.
const secondaryBtn =
  'px-4 py-2.5 text-sm font-semibold text-center whitespace-nowrap bg-white text-gray-600 border border-gray-200 rounded-xl hover:border-brand transition-colors'

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-warning-tint text-warning-text',
  confirmed: 'bg-info-tint text-info',
  complete:  'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-500',
}

const TAB_LABELS: Record<string, string> = {
  pending: 'pending', confirmed: 'confirmed', complete: 'completed', cancelled: 'cancelled',
}

export default function HandoversPage() {
  const [tab, setTab]         = useState<'pending' | 'confirmed' | 'complete' | 'cancelled'>('pending')
  const [items, setItems]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]             = useState<unknown>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const ask = useConfirm()
  const toast = useToast()

  async function load(s: string) {
    setLoading(true)
    setError(null)
    try {
      const data = await api.handovers(s)
      setItems(data)
    } catch (e: any) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(tab) }, [tab])

  async function complete(id: string) {
    const ok = await ask({
      title: 'Mark this handover complete?',
      message: 'The car is marked as sold, the sale becomes final, and both parties are notified. This is the platform\'s sale event — it cannot be undone from here.',
      confirmLabel: 'Mark sold',
    })
    if (!ok) return
    setActionId(id)
    try {
      await api.completeHandover(id)
      toast('Handover complete — car marked as sold.', 'success')
      load(tab)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setActionId(null)
    }
  }

  async function confirm(id: string) {
    const ok = await ask({
      title: 'Confirm this handover arrangement?',
      message: 'Both the buyer and the seller are notified of the agreed slot.',
      confirmLabel: 'Confirm arrangement',
    })
    if (!ok) return
    setActionId(id)
    try {
      await api.confirmHandover(id)
      toast('Arrangement confirmed — both parties notified.', 'success')
      load(tab)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Handovers</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {(['pending', 'confirmed', 'complete', 'cancelled'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
              tab === t ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => load(tab)} />
      ) : loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState icon="key" title="No handovers" description={`Nothing ${TAB_LABELS[tab]} right now.`} />
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
                    <p><strong>{h.center || 'Slot not arranged yet'}</strong></p>
                    <p>{h.handover_date ? `${h.handover_date}${h.handover_time ? ` at ${h.handover_time}` : ''}` : 'Coordinate via buyer phone below'}</p>
                    {h.contact_phone && <p>Contact: {h.contact_phone}</p>}
                    <p className="mt-1 font-medium text-brand">{fmtMoney(h.agreed_price || 0, h.currency)}</p>
                  </div>
                </div>
              </div>

              {tab === 'pending' && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => confirm(h.id)}
                    disabled={actionId === h.id}
                    className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {actionId === h.id ? 'Working…' : 'Confirm Arrangement'}
                  </button>
                  <button
                    onClick={() => complete(h.id)}
                    disabled={actionId === h.id}
                    className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Mark Sold Directly
                  </button>
                </div>
              )}
              {tab === 'confirmed' && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => complete(h.id)}
                    disabled={actionId === h.id}
                    className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {actionId === h.id ? 'Working…' : 'Handover Done — Mark Sold'}
                  </button>
                  {/* The deal is agreed, so the sale agreement can be issued */}
                  <Link href={`/handovers/${h.id}/contract`} className={secondaryBtn}>
                    Contract
                  </Link>
                </div>
              )}
              {tab === 'complete' && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex flex-1 items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    <span>Completed — car sold{h.booking_id ? ` · Ref ${h.booking_id}` : ''}</span>
                    {h.confirmed_at && (
                      <span>Confirmed {new Date(h.confirmed_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  <Link href={`/handovers/${h.id}/contract`} className={secondaryBtn}>
                    Contract
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
