'use client'
import { useActionState } from 'react'
import { paymentProofAction } from './actions'
import { Alert, Button, Field, Input } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

export function PaymentProofForm({orderId,paymentId}:{orderId:string;paymentId:string}){
  const t=useT()
  const action=paymentProofAction.bind(null,orderId,paymentId);const [state,formAction,pending]=useActionState(action,null)
  return <form action={formAction} className="mt-4 space-y-3 rounded-xl border border-line-soft p-4">{state?.error?<Alert tone="danger">{state.error}</Alert>:null}{state?.ok?<Alert tone="success">{t('dashboard.imports.proofSubmitted')}</Alert>:null}<Field label={t('dashboard.imports.bankRef')} htmlFor={`ref-${paymentId}`}><Input id={`ref-${paymentId}`} name="bank_reference" required placeholder={t('dashboard.imports.bankRefPlaceholder')}/></Field><Field label={t('dashboard.imports.paymentProof')} htmlFor={`proof-${paymentId}`}><Input id={`proof-${paymentId}`} name="proof" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf"/></Field><Button type="submit" disabled={pending}>{pending?t('dashboard.imports.uploading'):t('dashboard.imports.submitProof')}</Button></form>
}
