'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, Pill } from '@/components/ui'
import { useToast } from '@/components/feedback'
import Link from 'next/link'

type ImportRow = {
  id: string; order_ref: string; buyer_name: string; buyer_email: string
  origin_country: string; make: string; model: string; year?: number
  status: string; quoted_total_rwf?: number | string; paid_rwf?: number | string
  created_at: string; delivery_estimate?: string
}

const nextStatus: Record<string, string> = {
  quoted: 'agreement_pending', agreement_pending: 'deposit_due', deposit_due: 'deposit_review',
  deposit_review: 'ordered', ordered: 'inspected_abroad', inspected_abroad: 'shipping_booked',
  shipping_booked: 'in_transit', in_transit: 'arrived', arrived: 'kigali_inspection',
  kigali_inspection: 'balance_due', balance_due: 'balance_review', balance_review: 'customs_clearance',
  customs_clearance: 'ready_for_handover', ready_for_handover: 'completed',
}

const money = (value: number | string | undefined) =>
  `${new Intl.NumberFormat('en-RW').format(Number(value || 0))} RWF`

export default function ImportsPage() {
  const [items, setItems] = useState<ImportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [quote, setQuote] = useState<Record<string, string>>({})
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await api.importOrders(status || undefined)) }
    catch (e) { setError(e) }
    finally { setLoading(false) }
  }, [status])
  useEffect(() => { load() }, [load])

  async function issueQuote(item: ImportRow) {
    const amount = Number(quote[item.id])
    if (!Number.isSafeInteger(amount) || amount < 100000) { toast('Enter the complete landed price in RWF', 'error'); return }
    setBusy(item.id)
    try { await api.quoteImport(item.id, { quoted_total_rwf: amount }); toast('Quotation issued with two 50% milestones', 'success'); await load() }
    catch (e: any) { toast(e.message, 'error') } finally { setBusy(null) }
  }

  async function advance(item: ImportRow) {
    const next = nextStatus[item.status]
    if (!next) return
    setBusy(item.id)
    try { await api.updateImportStatus(item.id, next); toast(`Order moved to ${next.replaceAll('_', ' ')}`, 'success'); await load() }
    catch (e: any) { toast(e.message, 'error') } finally { setBusy(null) }
  }

  return <div>
    <PageHeader title="Vehicle imports" description="One auditable pipeline from customer enquiry and 50% order payment to Kigali inspection, final balance and handover." />
    <Card className="mb-5 p-4">
      <label className="text-label font-semibold text-content">Pipeline stage
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="ml-3 h-10 rounded-xl border border-line bg-surface px-3 font-normal">
          <option value="">All stages</option>
          {['enquiry','quoted','agreement_pending','deposit_due','deposit_review','ordered','inspected_abroad','shipping_booked','in_transit','arrived','kigali_inspection','balance_due','balance_review','customs_clearance','ready_for_handover','completed','cancelled'].map((s) => <option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}
        </select>
      </label>
    </Card>
    {error ? <ErrorState error={error} onRetry={load} /> : loading ? <LoadingState /> : !items.length ?
      <EmptyState icon="car" title="No import orders here" description="New customer import enquiries will appear in this pipeline." /> :
      <div className="space-y-4">{items.map((item) => <Card key={item.id} className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div><div className="flex flex-wrap items-center gap-2"><span className="text-caption font-bold text-brand">{item.order_ref}</span><Pill status={item.status} label={item.status.replaceAll('_',' ')} /></div>
            <h2 className="mt-2 text-lg font-extrabold text-content">{item.year || ''} {item.make} {item.model}</h2>
            <p className="mt-1 text-label text-content-muted">From {item.origin_country} · {item.buyer_name} · {item.buyer_email}</p>
          </div>
          <div className="text-left md:text-right"><p className="font-extrabold text-content">{item.quoted_total_rwf ? money(item.quoted_total_rwf) : 'Awaiting quotation'}</p><p className="text-caption text-content-muted">Verified paid: {money(item.paid_rwf)}</p></div>
        </div>
        {item.status === 'enquiry' ? <div className="mt-4 flex flex-col gap-2 border-t border-line-soft pt-4 sm:flex-row">
          <input inputMode="numeric" value={quote[item.id] || ''} onChange={(e) => setQuote({ ...quote, [item.id]: e.target.value.replace(/\D/g,'') })} placeholder="Complete landed price in RWF" className="h-11 flex-1 rounded-xl border border-line px-3" />
          <button onClick={() => issueQuote(item)} disabled={busy === item.id} className="rounded-xl bg-brand px-5 py-2.5 text-label font-bold text-white disabled:opacity-50">Issue 50/50 quotation</button>
        </div> : nextStatus[item.status] ? <div className="mt-4 flex flex-wrap gap-3 border-t border-line-soft pt-4"><button onClick={() => advance(item)} disabled={busy === item.id} className="rounded-xl bg-ink-900 px-5 py-2.5 text-label font-bold text-white disabled:opacity-50">Advance to {nextStatus[item.status].replaceAll('_',' ')}</button><Link href={`/imports/${item.id}`} className="rounded-xl border border-line px-5 py-2.5 text-label font-bold text-content">Open operations record</Link></div> : <div className="mt-4 border-t border-line-soft pt-4"><Link href={`/imports/${item.id}`} className="text-label font-bold text-brand">Open operations record →</Link></div>}
      </Card>)}</div>}
  </div>
}
