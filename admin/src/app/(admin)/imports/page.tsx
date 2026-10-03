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
    <PageHeader title="Vehicle imports" description="One auditable pipeline from customer enquiry and 50% order payment to Kigali inspection, final balance and handover." action={<ExportLink dataset="imports" />} />
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
      <div className="space-y-4">{items.map((item) => <Card key={item.id} className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div><div className="flex flex-wrap items-center gap-2"><span className="text-caption font-bold text-content">{item.order_ref}</span><Pill status={item.status} /></div>
            <h2 className="mt-2 text-lg font-extrabold text-content">{item.year || ''} {item.make} {item.model}</h2>
            <p className="mt-1 text-label text-content-muted">From {item.origin_country} · {item.buyer_name} · {item.buyer_email}</p>
          </div>
          <div className="text-left md:text-right"><p className="font-extrabold text-content">{item.quoted_total_rwf ? money(item.quoted_total_rwf) : 'Awaiting quotation'}</p><p className="text-caption text-content-muted">Verified paid: {money(item.paid_rwf)}</p>
            {item.actual_cost_rwf != null && item.quoted_total_rwf ? (() => { const margin = Number(item.quoted_total_rwf) - Number(item.actual_cost_rwf); return <p className={`text-caption font-bold ${margin >= 0 ? 'text-success-text' : 'text-danger-strong'}`}>Margin: {money(margin)}</p> })() : null}
          </div>
        </div>
        {item.status === 'enquiry' ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning-tint px-4 py-3">
          <p className="text-label font-semibold text-warning-text">Waiting for a landed-price quotation</p>
          <Link href={`/imports/${item.id}`} className="text-label font-bold text-content underline decoration-line underline-offset-4 hover:decoration-content">Build the quotation</Link>
        </div> : null}
        <div className="mt-4 flex flex-col gap-3 border-t border-line-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
          <ImportStatusControls orderId={item.id} status={item.status}
            allowed={(item.allowed_transitions || []).filter((next) => item.status !== 'enquiry' || next === 'cancelled')}
            onChanged={load} />
          <Link href={`/imports/${item.id}`} className="shrink-0 text-label font-bold text-content underline decoration-line underline-offset-4 hover:decoration-content">Open order</Link>
        </div>
      </Card>)}</div>}
  </div>
}
