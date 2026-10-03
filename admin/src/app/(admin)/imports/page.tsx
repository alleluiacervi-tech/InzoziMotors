'use client'

import { ExportLink } from '@/components/ExportLink'
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, Pill, statusLabel } from '@/components/ui'
import Link from 'next/link'
import { ImportStatusControls } from '@/components/ImportStatusControls'

type ImportRow = {
  id: string; order_ref: string; buyer_name: string; buyer_email: string
  origin_country: string; make: string; model: string; year?: number
  status: string; quoted_total_rwf?: number | string; paid_rwf?: number | string
  actual_cost_rwf?: number | string | null
  created_at: string; delivery_estimate?: string
  allowed_transitions?: string[]
}

// One column layout for the header and every row, so they line up.
const ROW_GRID = 'grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,2.2fr)] gap-4'
const ROW_GRID_LG = 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,2.2fr)]'

const money = (value: number | string | undefined) =>
  `${new Intl.NumberFormat('en-RW').format(Number(value || 0))} RWF`

export default function ImportsPage() {
  const [items, setItems] = useState<ImportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await api.importOrders(status || undefined)) }
    catch (e) { setError(e) }
    finally { setLoading(false) }
  }, [status])
  useEffect(() => { load() }, [load])


  return <div>
    <PageHeader title="Import orders" description="Each order from enquiry to collection: an itemized quote, a signed agreement, two payments evidenced by bank-transfer proof, and an inspection in Kigali." action={<ExportLink dataset="imports" />} />
    <Card className="mb-5 p-4">
      <label className="text-label font-semibold text-content">Pipeline stage
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="ml-3 h-10 rounded-xl border border-line bg-surface px-3 font-normal">
          <option value="">All stages</option>
          {['enquiry','quoted','agreement_pending','deposit_due','deposit_review','ordered','inspected_abroad','shipping_booked','in_transit','arrived','kigali_inspection','balance_due','balance_review','customs_clearance','ready_for_handover','completed','cancelled'].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </label>
    </Card>
    {error ? <ErrorState error={error} onRetry={load} /> : loading ? <LoadingState /> : !items.length ?
      <EmptyState icon="car" title="No import orders here" description="New customer import enquiries will appear in this pipeline." /> :
      <Card className="overflow-hidden">
        <div aria-hidden className={`hidden ${ROW_GRID} border-b border-line-soft bg-surface-alt px-5 py-2.5 text-caption font-semibold text-content-muted lg:grid`}>
          <span>Order</span><span>Buyer</span><span>Quote</span><span>Stage</span><span className="text-right">Next step</span>
        </div>
        <ul className="divide-y divide-line-soft">{items.map((item) => {
          const margin = item.actual_cost_rwf != null && item.quoted_total_rwf ? Number(item.quoted_total_rwf) - Number(item.actual_cost_rwf) : null
          return <li key={item.id} className="px-5 py-4">
            <div className={`grid gap-x-4 gap-y-2 ${ROW_GRID_LG} lg:items-center`}>
              <div className="min-w-0">
                <Link href={`/imports/${item.id}`} className="font-semibold text-content hover:underline">{item.year || ''} {item.make} {item.model}</Link>
                <p className="mt-0.5 text-label text-content-muted"><span className="tnum">{item.order_ref}</span> · from {item.origin_country}</p>
              </div>
              <div className="min-w-0 text-label text-content-secondary">
                <span className="block truncate">{item.buyer_name}</span>
                <span className="block truncate text-caption text-content-muted">{item.buyer_email}</span>
              </div>
              <div className="tnum text-label">
                {item.quoted_total_rwf ? <span className="block font-semibold text-content">{money(item.quoted_total_rwf)}</span> : <span className="block text-content-muted">No quote yet</span>}
                <span className="block text-caption text-content-muted">Paid {money(item.paid_rwf)}{margin != null ? <> · <span className={margin >= 0 ? 'text-success-text' : 'text-danger-strong'}>margin {money(margin)}</span></> : null}</span>
              </div>
              <div><Pill status={item.status} /></div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {item.status === 'enquiry' ? (
                  <Link href={`/imports/${item.id}`} className="inline-flex h-9 items-center rounded-lg bg-ink-900 px-3 text-caption font-bold text-white hover:bg-ink-800">Build the quotation</Link>
                ) : (
                  <ImportStatusControls compact orderId={item.id} status={item.status} allowed={item.allowed_transitions || []} onChanged={load} />
                )}
                <Link href={`/imports/${item.id}`} className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-caption font-bold text-content hover:bg-surface-alt">Open</Link>
              </div>
            </div>
          </li>
        })}</ul>
      </Card>}
  </div>
}
