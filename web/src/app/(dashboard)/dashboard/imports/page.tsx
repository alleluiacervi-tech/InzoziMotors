import { Card, EmptyState, Badge, Button } from '@/components/ui'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { importOrders } from '@/lib/api'
import { requireUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

const money = (v: number | string) => `${new Intl.NumberFormat('en-RW').format(Number(v || 0))} RWF`

export default async function ImportsPage() {
  const t = await getServerT()
  const { token } = await requireUser()
  const orders = await importOrders.mine(token).catch(() => [])
  const statusLabel = (s: string) => { const k = `dashboard.imports.status.${s}`; const v = t(k); return v === k ? String(s).replaceAll('_', ' ') : v }
  return <>
    <PageHeader title={t('dashboard.imports.title')} description={t('dashboard.imports.description')} />
    {!orders.length ? <EmptyState icon="car" title={t('dashboard.imports.emptyTitle')} description={t('dashboard.imports.emptyBody')} /> :
      <div className="space-y-4">{orders.map((o) => <Card key={o.id} className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row">
          <div><p className="text-caption font-extrabold text-brand">{o.order_ref}</p><h2 className="mt-1 text-xl font-black text-content">{o.year || ''} {o.make} {o.model}</h2><p className="mt-1 text-body text-content-secondary">{t('dashboard.imports.importingFrom', { country: o.origin_country })}</p></div>
          <div className="sm:text-right"><Badge>{statusLabel(String(o.status))}</Badge>{o.quoted_total_rwf ? <p className="mt-2 font-extrabold text-content">{money(o.quoted_total_rwf)}</p> : null}</div>
        </div>
        <div className="mt-5 rounded-xl bg-surface-alt p-4 text-label text-content-secondary">{t('dashboard.imports.dueNotice')}</div>
        <Button href={`/dashboard/imports/${o.id}`} variant="secondary" className="mt-4">{t('dashboard.imports.openOrder')}</Button>
      </Card>)}</div>}
  </>
}
