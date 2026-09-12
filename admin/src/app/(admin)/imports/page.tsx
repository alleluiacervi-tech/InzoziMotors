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
  actual_cost_rwf?: number | string | null
  created_at: string; delivery_estimate?: string
}
type QuoteDraft = { vehicle?: string; freight?: string; landed?: string; expires?: string; delivery?: string }

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
  const [quote, setQuote] = useState<Record<string, QuoteDraft>>({})
  const toast = useToast()
  const quoteTotal=(draft:QuoteDraft={})=>Number(draft.vehicle||0)+Number(draft.freight||0)+Number(draft.landed||0)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await api.importOrders(status || undefined)) }
    catch (e) { setError(e) }
    finally { setLoading(false) }
  }, [status])
  useEffect(() => { load() }, [load])

  async function issueQuote(item: ImportRow) {
    const draft=quote[item.id]||{}
    const line_items=[['Vehicle and supplier preparation',draft.vehicle],['Freight and insurance',draft.freight],['Import, customs and service costs',draft.landed]].map(([label,value])=>({label:String(label),amount_rwf:Number(value||0)})).filter(row=>row.amount_rwf>0)
    const amount=quoteTotal(draft)
    if (!Number.isSafeInteger(amount) || amount < 100000) { toast('Enter the complete landed price in RWF', 'error'); return }
    setBusy(item.id)
    try { await api.quoteImport(item.id, { quoted_total_rwf: amount,line_items,quote_expires_at:draft.expires||undefined,delivery_estimate:draft.delivery||undefined }); toast('Itemized quotation issued with two 50% milestones', 'success'); await load() }
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
          <div className="text-left md:text-right"><p className="font-extrabold text-content">{item.quoted_total_rwf ? money(item.quoted_total_rwf) : 'Awaiting quotation'}</p><p className="text-caption text-content-muted">Verified paid: {money(item.paid_rwf)}</p>
            {item.actual_cost_rwf != null && item.quoted_total_rwf ? (() => { const margin = Number(item.quoted_total_rwf) - Number(item.actual_cost_rwf); return <p className={`text-caption font-bold ${margin >= 0 ? 'text-success' : 'text-danger-strong'}`}>Margin: {money(margin)}</p> })() : null}
          </div>
        </div>
        {item.status === 'enquiry' ? <div className="mt-4 border-t border-line-soft pt-4"><p className="mb-3 text-label font-bold text-content">Build an exact landed-price quotation</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[['vehicle','Vehicle & supplier (RWF)'],['freight','Freight & insurance (RWF)'],['landed','Import, customs & service (RWF)']].map(([key,label])=><input key={key} inputMode="numeric" value={(quote[item.id] as any)?.[key]||''} onChange={(e)=>setQuote({...quote,[item.id]:{...quote[item.id],[key]:e.target.value.replace(/\D/g,'')}})} placeholder={label} className="h-11 rounded-xl border border-line px-3"/>)}
          <input type="date" value={quote[item.id]?.expires||''} onChange={(e)=>setQuote({...quote,[item.id]:{...quote[item.id],expires:e.target.value}})} aria-label="Quotation expiry" className="h-11 rounded-xl border border-line px-3"/>
          <input value={quote[item.id]?.delivery||''} onChange={(e)=>setQuote({...quote,[item.id]:{...quote[item.id],delivery:e.target.value}})} placeholder="Delivery estimate, e.g. 8–12 weeks" className="h-11 rounded-xl border border-line px-3"/>
          <button onClick={() => issueQuote(item)} disabled={busy === item.id} className="rounded-xl bg-brand px-5 py-2.5 text-label font-bold text-brand-on disabled:opacity-50">Issue itemized 50/50 quotation</button>
        </div><p className="mt-2 text-caption text-content-muted">Total: {money(quoteTotal(quote[item.id]))}</p>
        </div> : nextStatus[item.status] ? <div className="mt-4 flex flex-wrap gap-3 border-t border-line-soft pt-4"><button onClick={() => advance(item)} disabled={busy === item.id} className="rounded-xl bg-ink-900 px-5 py-2.5 text-label font-bold text-white disabled:opacity-50">Advance to {nextStatus[item.status].replaceAll('_',' ')}</button><Link href={`/imports/${item.id}`} className="rounded-xl border border-line px-5 py-2.5 text-label font-bold text-content">Open operations record</Link></div> : <div className="mt-4 border-t border-line-soft pt-4"><Link href={`/imports/${item.id}`} className="text-label font-bold text-brand">Open operations record →</Link></div>}
      </Card>)}</div>}
  </div>
}
