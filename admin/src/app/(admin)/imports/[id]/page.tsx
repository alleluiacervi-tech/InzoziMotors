'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Card, ErrorState, LoadingState, PageHeader, Pill } from '@/components/ui'
import { useToast } from '@/components/feedback'
import { fmtDateTime } from '@/lib/format'
import { ImportStatusControls } from '@/components/ImportStatusControls'
import { ImportQuoteForm } from '@/components/ImportQuoteForm'
import { MoneyInput } from '@/components/MoneyInput'

const money = (v: unknown) => `${new Intl.NumberFormat('en-RW').format(Number(v || 0))} RWF`

export default function ImportOperationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState('')
  const [shipment, setShipment] = useState<Record<string,string>>({})
  const [cost, setCost] = useState('')
  const [costNote, setCostNote] = useState('')
  const toast = useToast()
  const load = useCallback(async () => { try { const data=await api.importOrder(id); setOrder(data); setShipment(data.shipment || {}); setCost(data.actual_cost_rwf!=null?String(data.actual_cost_rwf):''); setCostNote(data.cost_note||'') } catch(e){setError(e)} }, [id])
  useEffect(() => { load() }, [load])
  async function payment(paymentId:string,status:'reviewed'|'verified'|'rejected') { setBusy(paymentId); try { await api.reviewImportPayment(id,paymentId,status,status==='rejected'?'Payment evidence did not match the bank record':undefined); toast(`Payment ${status}`,'success'); await load() } catch(e:any){toast(e.message,'error')} finally{setBusy('')} }
  async function saveCost(e:React.FormEvent){e.preventDefault();const n=Number(cost);if(!Number.isInteger(n)||n<0){toast('Enter the actual cost in RWF, zero or more','error');return}setBusy('cost');try{await api.recordImportCost(id,{actual_cost_rwf:n,note:costNote||undefined});toast('Actual cost recorded','success');await load()}catch(e:any){toast(e.message,'error')}finally{setBusy('')}}
  async function saveShipment(e:React.FormEvent){e.preventDefault();setBusy('shipment');try{await api.updateImportShipment(id,shipment);toast('Shipment record updated','success');await load()}catch(e:any){toast(e.message,'error')}finally{setBusy('')}}
  async function upload(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy('document');try{const data=new FormData(e.currentTarget);await api.uploadImportDocument(id,data);toast('Document attached','success');e.currentTarget.reset();await load()}catch(e:any){toast(e.message,'error')}finally{setBusy('')}}
  async function preparePack(){setBusy('pack');try{await api.prepareImportDocumentPack(id);toast('Quotation, agreement and deposit invoice are ready','success');await load()}catch(e:any){toast(e.message,'error')}finally{setBusy('')}}
  async function issueReceipt(paymentId:string){setBusy(`receipt-${paymentId}`);try{await api.issueImportPaymentReceipt(id,paymentId);toast('Verified-payment receipt is ready','success');await load()}catch(e:any){toast(e.message,'error')}finally{setBusy('')}}
  const generated=(kind:string,subjectId?:string)=>order?.generated_documents?.find((d:any)=>d.kind===kind&&(!subjectId||d.subject_id===subjectId))
  if(error)return <ErrorState error={error} onRetry={load}/>
  if(!order)return <LoadingState/>
  return <div><Link href="/imports" className="mb-4 inline-block text-label font-bold text-brand">← Import pipeline</Link><PageHeader title={`${order.year||''} ${order.make} ${order.model}`} description={`${order.order_ref} · ${order.buyer_name} · ${order.origin_country}`}/>
    {/* Every move this order can make from here, and a way to stop it. */}
    <div className="mb-5"><ImportStatusControls orderId={id} status={order.status}
      allowed={(order.allowed_transitions || []).filter((next: string) => order.status !== 'enquiry' || next === 'cancelled')}
      onChanged={load} /></div>
    <div className="grid gap-5 xl:grid-cols-2">
      {/* The quotation is the one thing an enquiry is waiting for, so it leads. */}
      {order.status === 'enquiry' ? <Card className="p-5 xl:col-span-2">
        <h2 className="font-extrabold text-content">Landed-price quotation</h2>
        <p className="mb-4 mt-1 text-caption text-content-muted">Every cost to put the car in Kigali, itemized. The buyer pays it in two halves, each evidenced by bank-transfer proof.</p>
        <ImportQuoteForm orderId={id} orderRef={order.order_ref} onIssued={load} />
      </Card> : null}
      {/* A request for a specific Korean car: what the customer asked for, frozen the day they
          asked. The live listing may have changed or sold since; this record has not. */}
      {order.listing_snapshot ? <Card className="p-5 xl:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-extrabold text-content">Korean listing (as requested)</h2><p className="mt-1 text-caption text-content-muted">Captured {fmtDateTime(order.snapshot_at)}. Refresh and confirm it is still available before you quote.</p></div>
          <div className="flex gap-2">
            <a href={`https://fem.encar.com/cars/detail/${encodeURIComponent(order.encar_listing_id)}`} target="_blank" rel="noreferrer" className="rounded-xl border border-line px-4 py-2 text-caption font-bold text-content">Open the source listing ↗</a>
            <button disabled={busy==='encar'} onClick={async()=>{setBusy('encar');try{const r=await api.encarRefresh(order.encar_listing_id);toast(r.note,'success')}catch(e:any){toast(e.message,'error')}finally{setBusy('')}}} className="rounded-xl bg-ink-900 px-4 py-2 text-caption font-bold text-white disabled:opacity-40">Ask the provider to refresh</button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
          {(order.snapshot_photos?.[0] || order.listing_snapshot.photos?.[0]) ? <img src={order.snapshot_photos?.[0] || order.listing_snapshot.photos[0]} alt="" referrerPolicy="no-referrer" className="aspect-[4/3] w-full rounded-xl object-cover" /> : null}
          <div className="text-label text-content-secondary">
            <p className="font-extrabold text-content">{order.listing_snapshot.year} {order.listing_snapshot.make} {order.listing_snapshot.model} {order.listing_snapshot.badge||''}</p>
            <p className="mt-1 capitalize">{[order.listing_snapshot.mileage_km!=null?`${Number(order.listing_snapshot.mileage_km).toLocaleString('en-US')} km`:null,order.listing_snapshot.fuel,order.listing_snapshot.transmission,order.listing_snapshot.color].filter(Boolean).join(' · ')}</p>
            <p className="mt-2">Korean price: <span className="font-bold text-content tabular-nums">₩{Number(order.listing_snapshot.price_krw).toLocaleString('en-US')}</span>{order.listing_snapshot.krw_per_usd?<span className="text-content-muted"> (≈ ${Math.round(order.listing_snapshot.price_krw/order.listing_snapshot.krw_per_usd).toLocaleString('en-US')} at ₩{Math.round(order.listing_snapshot.krw_per_usd)}/US$)</span>:null}</p>
            <p className="mt-1 text-caption text-content-muted">Photos: {order.snapshot_photos?.length ? `${order.snapshot_photos.length} copied to our storage` : 'not yet copied (the provider\'s addresses are shown)'}</p>
          </div>
        </div>
      </Card> : null}
      <Card className="p-5"><div className="flex items-center justify-between"><h2 className="font-extrabold text-content">Agreement & money</h2><Pill status={order.status} label={order.status.replaceAll('_',' ')}/></div><p className="mt-3 text-2xl font-black text-content">{money(order.quoted_total_rwf)}</p>
        <div className="mt-4 space-y-3">{order.payments.map((p:any)=><div key={p.id} className="rounded-xl border border-line-soft p-4"><div className="flex justify-between gap-3"><div><p className="font-bold text-content">{p.milestone.replaceAll('_',' ')}</p><p className="text-caption text-content-muted">Expected reference: <span className="font-mono">{p.reference}</span></p><p className="text-caption text-content-muted">{p.bank_reference?<>Buyer submitted: <span className="font-mono">{p.bank_reference}</span>{p.bank_reference!==p.reference?<span className="font-bold text-warning-text"> · does not match</span>:null}</>:'No bank reference submitted'}</p></div><div className="text-right"><p className="font-extrabold text-content">{money(p.amount_rwf)}</p><Pill status={p.status} label={p.status}/></div></div>
          {p.proof_url?<a href={`/api/backend/imports/${id}/payments/${p.id}/proof`} target="_blank" rel="noreferrer" className="mr-2 mt-3 inline-block rounded-xl border border-line px-4 py-2 text-caption font-bold text-content">View transfer proof</a>:null}
          {p.status==='submitted'?<button disabled={busy===p.id} onClick={()=>payment(p.id,'reviewed')} className="mt-3 rounded-xl bg-warning-tint px-4 py-2 text-caption font-bold text-warning-text">First finance review</button>:null}
          {p.status==='reviewed'?<button disabled={busy===p.id} onClick={()=>payment(p.id,'verified')} className="mt-3 rounded-xl bg-success px-4 py-2 text-caption font-bold text-white">Final bank verification</button>:null}
          {['submitted','reviewed'].includes(p.status)?<button disabled={busy===p.id} onClick={()=>payment(p.id,'rejected')} className="ml-2 mt-3 rounded-xl border border-danger-border px-4 py-2 text-caption font-bold text-danger-strong">Reject</button>:null}
          {p.status==='verified'?(generated('import_payment_receipt',p.id)?<a href={`/api/backend/imports/${id}/payments/${p.id}/receipt/file`} className="mt-3 inline-block rounded-xl border border-line px-4 py-2 text-caption font-bold text-content">Download official receipt</a>:<button disabled={busy===`receipt-${p.id}`} onClick={()=>issueReceipt(p.id)} className="mt-3 rounded-xl border border-success px-4 py-2 text-caption font-bold text-success-text">Issue official receipt</button>):null}
        </div>)}</div>
      </Card>
      <Card className="p-5"><h2 className="font-extrabold text-content">Shipment record</h2><form onSubmit={saveShipment} className="mt-4 grid gap-3 sm:grid-cols-2">{[['supplier_name','Supplier'],['carrier','Carrier'],['booking_reference','Booking reference'],['bill_of_lading','Bill of lading'],['vessel_or_flight','Vessel / flight'],['last_location','Last known location'],['estimated_arrival','Estimated arrival']].map(([key,label])=><label key={key} className="text-caption font-bold text-content">{label}<input type={key==='estimated_arrival'?'datetime-local':'text'} value={shipment[key]||''} onChange={e=>setShipment({...shipment,[key]:e.target.value})} className="mt-1 h-10 w-full rounded-xl border border-line px-3 font-normal"/></label>)}<button disabled={busy==='shipment'} className="rounded-xl bg-ink-900 px-4 py-2.5 text-label font-bold text-white sm:col-span-2">Save shipment update</button></form></Card>
      <Card className="p-5"><h2 className="font-extrabold text-content">Cost & margin</h2><p className="mt-1 text-caption text-content-muted">Sawa's own landed cost — vehicle, freight, duty, anything else. Never shown to the buyer, who sees only the quote.</p>
        <div className="mt-4 flex items-baseline justify-between gap-3 rounded-xl border border-line-soft p-4">
          <div><p className="text-caption font-bold text-content-muted">Quoted to buyer</p><p className="mt-1 text-lg font-extrabold text-content">{money(order.quoted_total_rwf)}</p></div>
          <div className="text-right"><p className="text-caption font-bold text-content-muted">Margin</p><p className={`mt-1 text-lg font-extrabold ${order.actual_cost_rwf==null?'text-content-muted':(Number(order.quoted_total_rwf||0)-Number(order.actual_cost_rwf))>=0?'text-success':'text-danger-strong'}`}>{order.actual_cost_rwf==null?'—':money(Number(order.quoted_total_rwf||0)-Number(order.actual_cost_rwf))}</p></div>
        </div>
        <form onSubmit={saveCost} className="mt-4 grid gap-3"><div><label htmlFor="actual-cost" className="text-caption font-bold text-content">Actual cost</label><div className="mt-1"><MoneyInput id="actual-cost" value={cost} onChange={setCost} placeholder="24,000,000" className="h-10 w-full rounded-xl border border-line px-3 font-normal"/></div></div>
          <label className="text-caption font-bold text-content">Note (optional)<input value={costNote} onChange={e=>setCostNote(e.target.value)} placeholder="Vehicle 24M, freight 4M, duty 2M" className="mt-1 h-10 w-full rounded-xl border border-line px-3 font-normal"/></label>
          <button disabled={busy==='cost'} className="rounded-xl bg-ink-900 px-4 py-2.5 text-label font-bold text-white">Save cost</button>
        </form>
      </Card>
      <Card className="p-5 xl:col-span-2"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-extrabold text-content">Official document pack</h2><p className="mt-1 text-caption text-content-muted">Immutable, numbered PDFs generated from the active quotation version.</p></div><button onClick={preparePack} disabled={busy==='pack'||!order.quoted_total_rwf} className="rounded-xl bg-ink-900 px-4 py-2.5 text-label font-bold text-white disabled:opacity-40">{order.generated_documents?.some((d:any)=>d.subject_type==='import_order')?'Refresh document pack':'Prepare document pack'}</button></div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">{[['import_quotation','Quotation'],['import_agreement','Service agreement'],['import_deposit_invoice','50% deposit invoice']].map(([kind,label])=>{const doc=generated(kind);return <div key={kind} className="rounded-xl border border-line-soft p-4"><p className="font-bold text-content">{label}</p><p className="mt-1 text-caption text-content-muted">{doc?`${doc.document_number} · v${doc.version}`:'Not generated'}</p>{doc?<a href={`/api/backend/imports/${id}/generated-documents/${kind}/file`} className="mt-3 inline-block text-label font-bold text-brand">Download PDF →</a>:null}</div>})}</div>
      </Card>
      <Card className="p-5 xl:col-span-2"><h2 className="font-extrabold text-content">Supporting documents</h2><form onSubmit={upload} className="mt-4 grid gap-3 md:grid-cols-4"><input name="label" required placeholder="Document label" className="h-11 rounded-xl border border-line px-3"/><select name="kind" required className="h-11 rounded-xl border border-line px-3"><option value="supplier_invoice">Supplier invoice</option><option value="inspection">Inspection report</option><option value="bill_of_lading">Bill of lading</option><option value="customs">Customs document</option><option value="arrival">Arrival report</option></select><input name="document" required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="h-11 rounded-xl border border-line p-2"/><label className="flex items-center gap-2 text-label"><input name="customer_visible" value="true" type="checkbox"/>Customer can view</label><button disabled={busy==='document'} className="rounded-xl bg-brand px-4 py-2.5 text-label font-bold text-brand-on md:col-span-4">Attach secure document</button></form>
        <div className="mt-4 divide-y divide-line-soft">{order.documents.map((d:any)=><div key={d.id} className="flex justify-between py-3 text-label"><span className="font-bold text-content">{d.label}</span><span className="text-content-muted">{d.customer_visible?'Customer visible':'Internal only'}</span></div>)}</div>
      </Card>
      <Card className="p-5 xl:col-span-2"><h2 className="font-extrabold text-content">Audit timeline</h2><ol className="mt-4 space-y-3">{order.events.map((e:any)=><li key={e.id} className="border-l-2 border-brand/25 pl-4"><p className="font-bold text-content">{e.summary}</p><p className="text-caption text-content-muted">{fmtDateTime(e.created_at)}</p></li>)}</ol></Card>
    </div>
  </div>
}
