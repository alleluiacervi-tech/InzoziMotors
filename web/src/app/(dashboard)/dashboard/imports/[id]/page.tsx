import { notFound } from 'next/navigation'
import { Badge, Button, Card } from '@/components/ui'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { importOrders } from '@/lib/api'
import { requireUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import { acceptAgreementAction } from './actions'
import { PaymentProofForm } from './PaymentProofForm'

const money = (v: unknown) => `${new Intl.NumberFormat('en-RW').format(Number(v || 0))} RWF`

const GENERATED_DOCUMENT_LABELS: Record<string, string> = {
  import_quotation: 'Quotation',
  import_agreement: 'Service agreement',
  import_deposit_invoice: '50% deposit invoice',
}
const GENERATED_DOCUMENT_ORDER = ['import_quotation', 'import_agreement', 'import_deposit_invoice']

export default async function ImportOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getServerT()
  const { token } = await requireUser()
  const order = await importOrders.get(token, id).catch(() => null)
  if (!order) notFound()

  const agreement = order.agreements?.[0]
  const statusLabel = (s: string) => { const k = `dashboard.imports.status.${s}`; const v = t(k); return v === k ? String(s).replaceAll('_', ' ') : v }
  const milestoneLabel = (m: string) => { const k = `dashboard.imports.milestone.${m}`; const v = t(k); return v === k ? String(m).replaceAll('_', ' ') : v }
  const payStatusLabel = (s: string) => { const k = `dashboard.imports.paymentStatus.${s}`; const v = t(k); return v === k ? String(s) : v }

  // Every generated document this buyer is entitled to, by kind — so the
  // shelf below can say "issued" vs. "not yet issued" instead of a bare list.
  const generatedByKind = new Map<string, any>((order.generated_documents ?? []).map((d: any) => [d.kind, d]))
  const receiptFor = (paymentId: string) =>
    (order.generated_documents ?? []).find((d: any) => d.kind === 'import_payment_receipt' && d.subject_id === paymentId)

  return <>
    <PageHeader title={`${order.year || ''} ${order.make} ${order.model}`} description={`${order.order_ref} · ${t('dashboard.imports.importingFrom', { country: order.origin_country })}`} />
    <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <div className="space-y-5">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-caption font-extraboldst text-brand">{t('dashboard.imports.currentMilestone')}</p>
              <h2 className="mt-2 text-2xl font-black text-content">{statusLabel(order.status)}</h2>
            </div>
            <Badge tone="info">{order.order_ref}</Badge>
          </div>
          {order.quoted_total_rwf ? <p className="mt-5 text-3xl font-black text-content">{money(order.quoted_total_rwf)}</p> : null}
        </Card>

        {agreement && !agreement.accepted_at ? <Card className="p-6">
          <h2 className="text-xl font-black text-content">{t('dashboard.imports.agreementTitle')}</h2>
          <p className="mt-3 text-body leading-relaxed text-content-secondary">{t('dashboard.imports.agreementLine', { total: money(agreement.terms_snapshot.quoted_total_rwf), first: money(agreement.terms_snapshot.initial_payment_rwf), final: money(agreement.terms_snapshot.final_payment_rwf) })}</p>
          <p className="mt-3 text-label text-content-secondary">{agreement.terms_snapshot.terms}</p>
          <form action={acceptAgreementAction.bind(null, id)}><Button type="submit" className="mt-5">{t('dashboard.imports.acceptAgreement')}</Button></form>
        </Card> : null}

        <Card className="p-6">
          <h2 className="text-xl font-black text-content">{t('dashboard.imports.payments')}</h2>
          {order.payments.map((p: any) => {
            const awaitingProof = ['due', 'rejected'].includes(p.status) && order.agreement_accepted_at
            return <div key={p.id} className="mt-4 border-t border-line-soft pt-4">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-extrabold text-content">{milestoneLabel(p.milestone)}</p>
                  <p className="text-caption text-content-muted">{payStatusLabel(p.status)}</p>
                </div>
                <p className="font-black text-content">{money(p.amount_rwf)}</p>
              </div>
              {p.status === 'rejected' && p.rejection_reason ? (
                <p className="mt-3 rounded-lg bg-danger-tint px-3 py-2 text-caption font-bold text-danger-strong">{p.rejection_reason}</p>
              ) : null}
              {/* The "pay now" card: what the P0 audit finding was about — a
                  buyer accepted the agreement and was told to "pay using the
                  corporate bank instructions displayed on your official
                  order" while no client ever displayed any. See
                  docs/IMPORTS-AUDIT.md, P0. */}
              {awaitingProof && p.payment_instructions ? (
                <div className="mt-3 rounded-xl border border-brand/25 bg-brand-tint p-4">
                  <p className="text-caption font-extrabold text-brand">{t('dashboard.imports.payNow')}</p>
                  <dl className="mt-2 space-y-1.5 text-label">
                    <div className="flex justify-between gap-3"><dt className="text-content-muted">{t('dashboard.imports.bankName')}</dt><dd className="font-bold text-content">{p.payment_instructions.name}</dd></div>
                    {p.payment_instructions.account_name && p.payment_instructions.account_number ? <>
                      <div className="flex justify-between gap-3"><dt className="text-content-muted">{t('dashboard.imports.accountName')}</dt><dd className="font-bold text-content">{p.payment_instructions.account_name}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-content-muted">{t('dashboard.imports.accountNumber')}</dt><dd className="font-mono font-bold text-content">{p.payment_instructions.account_number}</dd></div>
                    </> : (
                      <p className="text-content-muted">{t('dashboard.imports.bankDetailsPending')}</p>
                    )}
                    <div className="flex justify-between gap-3"><dt className="text-content-muted">{t('dashboard.imports.paymentReference')}</dt><dd className="font-mono font-bold text-content">{p.reference}</dd></div>
                  </dl>
                  <p className="mt-3 text-caption text-content-muted">{t('dashboard.imports.payNowWarning')}</p>
                </div>
              ) : null}
              {awaitingProof ? <PaymentProofForm orderId={id} paymentId={p.id} /> : null}
              {p.status === 'verified' ? (
                receiptFor(p.id)
                  ? <a href={`/api/imports/${id}/payments/${p.id}/receipt`} className="mt-3 inline-block text-label font-bold text-brand">{t('dashboard.imports.downloadReceipt')}</a>
                  : null
              ) : null}
            </div>
          })}
        </Card>

        {/* The document shelf: `generated_documents` and customer-visible
            `import_documents` were already in this payload and no client
            rendered them — a buyer had no way to see their own quotation or
            agreement PDF. See docs/IMPORTS-AUDIT.md, P0. */}
        <Card className="p-6">
          <h2 className="text-xl font-black text-content">{t('dashboard.imports.documents')}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {GENERATED_DOCUMENT_ORDER.map((kind) => {
              const doc = generatedByKind.get(kind)
              return <div key={kind} className="rounded-xl border border-line-soft p-4">
                <p className="font-bold text-content">{GENERATED_DOCUMENT_LABELS[kind]}</p>
                <p className="mt-1 text-caption text-content-muted">{doc ? `${doc.document_number} · v${doc.version}` : t('dashboard.imports.documentNotIssued')}</p>
                {doc ? <a href={`/api/imports/${id}/generated-documents/${kind}`} className="mt-3 inline-block text-label font-bold text-brand">{t('dashboard.imports.downloadPdf')}</a> : null}
              </div>
            })}
          </div>
          {order.documents?.length ? <div className="mt-4 divide-y divide-line-soft border-t border-line-soft">
            {order.documents.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-3">
                <span className="text-label font-bold text-content">{d.label}</span>
                <a href={`/api/imports/documents/${d.id}`} className="text-label font-bold text-brand">{t('dashboard.imports.download')}</a>
              </div>
            ))}
          </div> : null}
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="p-6">
          <h2 className="font-black text-content">{t('dashboard.imports.shipment')}</h2>
          {order.shipment ? <dl className="mt-4 space-y-3 text-label">
            {[
              [t('dashboard.imports.carrier'), order.shipment.carrier],
              [t('dashboard.imports.bookingRef'), order.shipment.booking_reference],
              [t('dashboard.imports.lastLocation'), order.shipment.last_location],
              [t('dashboard.imports.estimatedArrival'), order.shipment.estimated_arrival && new Date(order.shipment.estimated_arrival).toLocaleString()],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-3"><dt className="text-content-muted">{k}</dt><dd className="font-bold text-content">{v}</dd></div>
            ))}
          </dl> : <p className="mt-3 text-label text-content-muted">{t('dashboard.imports.shipmentEmpty')}</p>}
        </Card>
        <Card className="p-6">
          <h2 className="font-black text-content">{t('dashboard.imports.timeline')}</h2>
          <ol className="mt-4 space-y-4">
            {order.events.map((e: any) => (
              <li key={e.id} className="border-l-2 border-brand/20 pl-4">
                <p className="font-bold text-content">{e.summary}</p>
                <p className="text-caption text-content-muted">{new Date(e.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  </>
}
