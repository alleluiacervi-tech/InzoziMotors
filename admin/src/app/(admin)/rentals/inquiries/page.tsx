'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui'
import { useConfirm, useToast } from '@/components/feedback'
import { QueueSearch } from '@/components/QueueSearch'

const TABS = ['new', 'contacted', 'closed', 'cancelled'] as const
type Status = typeof TABS[number]

const STATUS_STYLE: Record<Status, string> = {
  new: 'bg-warning-tint text-warning-text',
  contacted: 'bg-info-tint text-info',
  closed: 'bg-success-tint text-success',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function RentalInquiriesPage() {
  const [tab, setTab] = useState<Status>('new')
  const [items, setItems] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [working, setWorking] = useState<string | null>(null)
  const ask = useConfirm()
  const toast = useToast()

  async function load(status = tab) {
    setLoading(true)
    setError(null)
    try { setItems(await api.getRentalInquiries(status)) }
    catch (e) { setError(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(tab) }, [tab])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => !q || [
      item.inquiry_ref, item.car_title, item.renter_name, item.renter_phone,
      item.renter_whatsapp, item.provider_name, item.provider_business_name,
      item.pickup_location,
    ].some((value) => String(value || '').toLowerCase().includes(q)))
  }, [items, query])

  async function transition(item: any, status: 'contacted' | 'closed' | 'cancelled') {
    const ok = await ask({
      title: `${status === 'contacted' ? 'Mark as contacted' : status === 'closed' ? 'Close' : 'Cancel'} ${item.inquiry_ref}?`,
      message: status === 'contacted'
        ? 'This records that the provider or operations team followed up. It does not confirm a booking.'
        : 'The inquiry remains in history. Sawa does not record or decide the parties’ commercial outcome.',
      confirmLabel: status === 'contacted' ? 'Mark contacted' : status === 'closed' ? 'Close inquiry' : 'Cancel inquiry',
      tone: status === 'cancelled' ? 'danger' : 'primary',
    })
    if (!ok) return
    setWorking(item.id)
    try { await api.updateRentalInquiryStatus(item.id, status); await load(tab) }
    catch (e: any) { toast(e.message, 'error') }
    finally { setWorking(null) }
  }

  return (
    <div>
      <div className="mb-5 rounded-xl border border-info/20 bg-info-tint p-4 text-sm text-content-secondary">
        These are availability requests only. Rental companies contact renters directly and remain responsible for price, contract, payment, pickup and return terms.
      </div>
      <div className="mb-5 flex flex-wrap gap-1">
        {TABS.map((status) => (
          <button key={status} onClick={() => setTab(status)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${tab === status ? 'bg-brand text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>
            {status}
          </button>
        ))}
      </div>
      <QueueSearch value={query} onChange={setQuery} resultCount={visible.length} placeholder="Search reference, car, renter, provider or location" />
      {error ? <ErrorState error={error} onRetry={() => load(tab)} />
        : loading ? <LoadingState />
        : !visible.length ? <EmptyState icon="calendar" title="No rental inquiries" description={`There are no ${tab} availability requests.`} />
        : (
          <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-3">Reference</th><th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Renter</th><th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Request</th><th className="px-4 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody>{visible.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 align-top last:border-0">
                  <td className="px-4 py-3"><p className="font-bold text-gray-900">{item.inquiry_ref}</p><span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[item.status as Status]}`}>{item.status}</span></td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{item.car_title}</td>
                  <td className="px-4 py-3"><p className="text-gray-900">{item.renter_name}</p><p className="text-xs text-gray-500">{item.renter_phone || item.renter_whatsapp || 'In-app contact'}</p></td>
                  <td className="px-4 py-3"><p className="text-gray-900">{item.provider_business_name || item.provider_name || 'Sawa operations'}</p></td>
                  <td className="px-4 py-3 text-gray-600"><p>{item.start_date || 'Flexible date'}{item.days ? ` · ${item.days} days` : ''}</p><p className="mt-1 max-w-xs text-xs">{item.message || item.pickup_location || 'No additional message'}</p></td>
                  <td className="px-4 py-3 text-right"><div className="flex justify-end gap-2">
                    {item.status === 'new' && <button disabled={working === item.id} onClick={() => transition(item, 'contacted')} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Contacted</button>}
                    {['new', 'contacted'].includes(item.status) && <button disabled={working === item.id} onClick={() => transition(item, 'closed')} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50">Close</button>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
    </div>
  )
}
