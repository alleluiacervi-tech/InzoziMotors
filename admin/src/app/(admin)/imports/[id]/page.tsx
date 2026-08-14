'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Card, ErrorState, LoadingState, PageHeader, Pill } from '@/components/ui'
import { useToast } from '@/components/feedback'

const money = (v: unknown) => `${new Intl.NumberFormat('en-RW').format(Number(v || 0))} RWF`

export default function ImportOperationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState('')
  const [shipment, setShipment] = useState<Record<string,string>>({})
  const toast = useToast()
  const load = useCallback(async () => { try { const data=await api.importOrder(id); setOrder(data); setShipment(data.shipment || {}) } catch(e){setError(e)} }, [id])
  useEffect(() => { load() }, [load])
  async function payment(paymentId:string,status:'reviewed'|'verified'|'rejected') { setBusy(paymentId); try { await api.reviewImportPayment(id,paymentId,status,status==='rejected'?'Payment evidence did not match the bank record':undefined); toast(`Payment ${status}`,'success'); await load() } catch(e:any){toast(e.message,'error')} finally{setBusy('')} }
  async function saveShipment(e:React.FormEvent){e.preventDefault();setBusy('shipment');try{await api.updateImportShipment(id,shipment);toast('Shipment record updated','success');await load()}catch(e:any){toast(e.message,'error')}finally{setBusy('')}}
  async function upload(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy('document');try{const data=new FormData(e.currentTarget);await api.uploadImportDocument(id,data);toast('Document attached','success');e.currentTarget.reset();await load()}catch(e:any){toast(e.message,'error')}finally{setBusy('')}}
  if(error)return <ErrorState error={error} onRetry={load}/>
  if(!order)return <LoadingState/>
  return <div><Link href="/imports" className="mb-4 inline-block text-label font-bold text-brand">← Import pipeline</Link><PageHeader title={`${order.year||''} ${order.make} ${order.model}`} description={`${order.order_ref} · ${order.buyer_name} · ${order.origin_country}`}/>
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="p-5"><div className="flex items-center justify-between"><h2 className="font-extrabold text-content">Agreement & money</h2><Pill status={order.status} label={order.status.replaceAll('_',' ')}/></div><p className="mt-3 text-2xl font-black text-content">{money(order.quoted_total_rwf)}</p>
        <div className="mt-4 space-y-3">{order.payments.map((p:any)=><div key={p.id} className="rounded-xl border border-line-soft p-4"><div className="flex justify-between gap-3"><div><p className="font-bold text-content">{p.milestone.replaceAll('_',' ')}</p><p className="text-caption text-content-muted">{p.bank_reference||'No bank reference submitted'}</p></div><div className="text-right"><p className="font-extrabold text-content">{money(p.amount_rwf)}</p><Pill status={p.status} label={p.status}/></div></div>
          {p.status==='submitted'?<button disabled={busy===p.id} onClick={()=>payment(p.id,'reviewed')} className="mt-3 rounded-xl bg-warning-tint px-4 py-2 text-caption font-bold text-warning-text">First finance review</button>:null}
          {p.status==='reviewed'?<button disabled={busy===p.id} onClick={()=>payment(p.id,'verified')} className="mt-3 rounded-xl bg-success px-4 py-2 text-caption font-bold text-white">Second-person verification</button>:null}
          {['submitted','reviewed'].includes(p.status)?<button disabled={busy===p.id} onClick={()=>payment(p.id,'rejected')} className="ml-2 mt-3 rounded-xl border border-danger-border px-4 py-2 text-caption font-bold text-danger-strong">Reject</button>:null}
        </div>)}</div>
      </Card>
      <Card className="p-5"><h2 className="font-extrabold text-content">Shipment record</h2><form onSubmit={saveShipment} className="mt-4 grid gap-3 sm:grid-cols-2">{[['supplier_name','Supplier'],['carrier','Carrier'],['booking_reference','Booking reference'],['bill_of_lading','Bill of lading'],['vessel_or_flight','Vessel / flight'],['last_location','Last known location'],['estimated_arrival','Estimated arrival']].map(([key,label])=><label key={key} className="text-caption font-bold text-content">{label}<input type={key==='estimated_arrival'?'datetime-local':'text'} value={shipment[key]||''} onChange={e=>setShipment({...shipment,[key]:e.target.value})} className="mt-1 h-10 w-full rounded-xl border border-line px-3 font-normal"/></label>)}<button disabled={busy==='shipment'} className="rounded-xl bg-ink-900 px-4 py-2.5 text-label font-bold text-white sm:col-span-2">Save shipment update</button></form></Card>
      <Card className="p-5 xl:col-span-2"><h2 className="font-extrabold text-content">Documents</h2><form onSubmit={upload} className="mt-4 grid gap-3 md:grid-cols-4"><input name="label" required placeholder="Document label" className="h-11 rounded-xl border border-line px-3"/><select name="kind" required className="h-11 rounded-xl border border-line px-3"><option value="supplier_invoice">Supplier invoice</option><option value="inspection">Inspection report</option><option value="bill_of_lading">Bill of lading</option><option value="customs">Customs document</option><option value="arrival">Arrival report</option></select><input name="document" required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="h-11 rounded-xl border border-line p-2"/><label className="flex items-center gap-2 text-label"><input name="customer_visible" value="true" type="checkbox"/>Customer can view</label><button disabled={busy==='document'} className="rounded-xl bg-brand px-4 py-2.5 text-label font-bold text-white md:col-span-4">Attach secure document</button></form>
        <div className="mt-4 divide-y divide-line-soft">{order.documents.map((d:any)=><div key={d.id} className="flex justify-between py-3 text-label"><span className="font-bold text-content">{d.label}</span><span className="text-content-muted">{d.customer_visible?'Customer visible':'Internal only'}</span></div>)}</div>
      </Card>
      <Card className="p-5 xl:col-span-2"><h2 className="font-extrabold text-content">Audit timeline</h2><ol className="mt-4 space-y-3">{order.events.map((e:any)=><li key={e.id} className="border-l-2 border-brand/25 pl-4"><p className="font-bold text-content">{e.summary}</p><p className="text-caption text-content-muted">{new Date(e.created_at).toLocaleString()}</p></li>)}</ol></Card>
    </div>
  </div>
}
