'use client'
import { useActionState } from 'react'
import { paymentProofAction } from './actions'
import { Alert, Button, Field, Input } from '@/components/ui'

export function PaymentProofForm({orderId,paymentId}:{orderId:string;paymentId:string}){
  const action=paymentProofAction.bind(null,orderId,paymentId);const [state,formAction,pending]=useActionState(action,null)
  return <form action={formAction} className="mt-4 space-y-3 rounded-xl border border-line-soft p-4">{state?.error?<Alert tone="danger">{state.error}</Alert>:null}{state?.ok?<Alert tone="success">Proof submitted for finance review.</Alert>:null}<Field label="Bank transfer reference" htmlFor={`ref-${paymentId}`}><Input id={`ref-${paymentId}`} name="bank_reference" required placeholder="Transaction reference from Bank of Kigali"/></Field><Field label="Payment proof" htmlFor={`proof-${paymentId}`}><Input id={`proof-${paymentId}`} name="proof" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf"/></Field><Button type="submit" disabled={pending}>{pending?'Uploading…':'Submit payment proof'}</Button></form>
}
