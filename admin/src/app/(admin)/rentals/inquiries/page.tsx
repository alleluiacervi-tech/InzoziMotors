'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui'
import { useConfirm, useToast } from '@/components/feedback'
import { QueueSearch } from '@/components/QueueSearch'
import { useFocusRow } from '@/components/useFocusRow'

const TABS = ['new', 'contacted', 'closed', 'cancelled'] as const
type Status = typeof TABS[number]

const STATUS_STYLE: Record<Status, string> = {
  new: 'bg-warning-tint text-warning-text',
  contacted: 'bg-info-tint text-info',
  closed: 'bg-success-tint text-success',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function RentalInquiriesPage() {
  // Arrives here from an Action Center item; marks the row it named.
  const { focusProps } = useFocusRow()
  const [tab, setTab] = useState<Status>('new')
  const [items, setItems] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [working, setWorking] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkWorking, setBulkWorking] = useState(false)
  const ask = useConfirm()
  const toast = useToast()

  async function load(status = tab) {
    setLoading(true)
    setError(null)
    try { setItems(await api.getRentalInquiries(status)) }
    catch (e) { setError(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(tab); setSelected(new Set()) }, [tab])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => !q || [
      item.inquiry_ref, item.car_title, item.renter_name, item.renter_phone,
      item.renter_whatsapp, item.provider_name, item.provider_business_name,
      item.pickup_location,
    ].some((value) => String(value || '').toLowerCase().includes(q)))
  }, [items, query])

  // A search that narrows the list should narrow the selection with it — a
  // bulk bar naming an inquiry the operator can no longer see is confusing
  // in exactly the way the tab-change reset above already avoids.
  useEffect(() => {
    setSelected((prev) => {
      if (!prev.size) return prev
      const visibleIds = new Set(visible.map((item) => item.id))
      const next = new Set([...prev].filter((id) => visibleIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [visible])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Only the 'new' tab offers this — "contacted" only ever means the first
  // follow-up, and a queue full of same-day requests is exactly where
  // clicking each one individually is the friction worth removing.
  async function bulkMarkContacted() {
    const targets = visible.filter((item) => selected.has(item.id))
    if (!targets.length) return
    const ok = await ask({
      title: `Mark ${targets.length} ${targets.length === 1 ? 'inquiry' : 'inquiries'} as contacted?`,
      message: 'This records that the provider or operations team followed up on each selected request. It does not confirm any booking.',
      confirmLabel: `Mark ${targets.length} contacted`,
    })
    if (!ok) return
    setBulkWorking(true)
    let succeeded = 0
    const failures: string[] = []
    for (const item of targets) {
      try {
        await api.updateRentalInquiryStatus(item.id, 'contacted')
        succeeded += 1
      } catch (e: any) {
        failures.push(`${item.inquiry_ref}: ${e.message}`)
      }
    }
    setBulkWorking(false)
    setSelected(new Set())
    if (succeeded) toast(`Marked ${succeeded} ${succeeded === 1 ? 'inquiry' : 'inquiries'} as contacted.`, 'success')
    failures.forEach((line) => toast(line, 'error'))
    load(tab)
  }

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
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${tab === status ? 'bg-brand text-brand-on' : 'border border-gray-200 bg-surface text-gray-600'}`}>
            {status}
          </button>
        ))}
      </div>
      <QueueSearch value={query} onChange={setQuery} resultCount={visible.length} placeholder="Search reference, car, renter, provider or location" />
      {tab === 'new' && selected.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">{selected.size} {selected.size === 1 ? 'inquiry' : 'inquiries'} selected</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelected(new Set())} className="rounded-lg border border-gray-200 bg-surface px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-brand">Clear</button>
            <button type="button" onClick={bulkMarkContacted} disabled={bulkWorking} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-brand-on hover:bg-brand-light disabled:opacity-50">
              {bulkWorking ? 'Marking…' : `Mark ${selected.size} contacted`}
            </button>
          </div>
        </div>
      ) : null}
      {error ? <ErrorState error={error} onRetry={() => load(tab)} />
        : loading ? <LoadingState />
        : !visible.length ? <EmptyState icon="calendar" title="No rental inquiries" description={`There are no ${tab} availability requests.`} />
        : (
          <div className="overflow-x-auto rounded-xl border border-gray-100 bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                {tab === 'new' ? (
                  <th className="px-4 py-3">
                    <input type="checkbox" aria-label="Select all visible inquiries"
                      checked={visible.length > 0 && visible.every((item) => selected.has(item.id))}
                      onChange={(e) => setSelected(e.target.checked ? new Set(visible.map((item) => item.id)) : new Set())}
                      className="h-4 w-4 accent-brand" />
                  </th>
                ) : null}
                <th className="px-4 py-3">Reference</th><th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Renter</th><th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Request</th><th className="px-4 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody>{visible.map((item) => (
                <tr key={item.id} id={`row-${item.id}`} className={`border-b border-gray-50 align-top last:border-0 ${focusProps(item.id).className}`}>
                  {tab === 'new' ? (
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)}
                        aria-label={`Select ${item.inquiry_ref}`} className="h-4 w-4 accent-brand" />
                    </td>
                  ) : null}
                  <td className="px-4 py-3"><p className="font-bold text-gray-900">{item.inquiry_ref}</p><span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[item.status as Status]}`}>{item.status}</span></td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{item.car_title}</td>
                  <td className="px-4 py-3"><p className="text-gray-900">{item.renter_name}</p><p className="text-xs text-gray-500">{item.renter_phone || item.renter_whatsapp || 'In-app contact'}</p></td>
                  <td className="px-4 py-3"><p className="text-gray-900">{item.provider_business_name || item.provider_name || 'Sawa operations'}</p></td>
                  <td className="px-4 py-3 text-gray-600"><p>{item.start_date || 'Flexible date'}{item.days ? ` · ${item.days} days` : ''}</p><p className="mt-1 max-w-xs text-xs">{item.message || item.pickup_location || 'No additional message'}</p></td>
                  <td className="px-4 py-3 text-right"><div className="flex justify-end gap-2">
                    {item.status === 'new' && <button disabled={working === item.id} onClick={() => transition(item, 'contacted')} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-on disabled:opacity-50">Contacted</button>}
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
