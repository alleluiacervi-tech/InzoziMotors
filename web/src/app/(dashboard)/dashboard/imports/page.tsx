import { Card, EmptyState, Badge, Button } from '@/components/ui'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { importOrders } from '@/lib/api'
import { requireUser } from '@/lib/session'

const money = (v: number | string) => `${new Intl.NumberFormat('en-RW').format(Number(v || 0))} RWF`

export default async function ImportsPage() {
  const { token } = await requireUser()
  const orders = await importOrders.mine(token).catch(() => [])
  return <>
    <PageHeader title="My vehicle imports" description="Track your verified order from quotation and first payment through shipping, Kigali inspection and handover." />
    {!orders.length ? <EmptyState icon="car" title="No import orders yet" description="Ask Sawa Cars for a verified landed-price quotation before making any payment." /> :
      <div className="space-y-4">{orders.map((o) => <Card key={o.id} className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row">
          <div><p className="text-caption font-extrabold text-brand">{o.order_ref}</p><h2 className="mt-1 text-xl font-black text-content">{o.year || ''} {o.make} {o.model}</h2><p className="mt-1 text-body text-content-secondary">Importing from {o.origin_country}</p></div>
          <div className="sm:text-right"><Badge>{String(o.status).replaceAll('_',' ')}</Badge>{o.quoted_total_rwf ? <p className="mt-2 font-extrabold text-content">{money(o.quoted_total_rwf)}</p> : null}</div>
        </div>
        <div className="mt-5 rounded-xl bg-surface-alt p-4 text-label text-content-secondary">Payments become due only after Sawa issues the written quotation and agreement. Pay only to the corporate bank account shown on your official order.</div>
        <Button href={`/dashboard/imports/${o.id}`} variant="secondary" className="mt-4">Open order</Button>
      </Card>)}</div>}
  </>
}
