import Link from 'next/link'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Badge, Button, Card, EmptyState } from '@/components/ui'
import { rentals } from '@/lib/api'
import { getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import { cancelRentalInquiry } from './actions'

export default async function RentalInquiriesPage() {
  const t = await getServerT()
  const token = await getToken(); if (!token) return null
  const items = await rentals.myInquiries(token).catch(() => [])
  const channelLabel = (c: string) => { const k = `dashboard.rentals.channel.${c}`; const v = t(k); return v === k ? c.replace('_', ' ') : v }
  return <><PageHeader title={t('dashboard.rentals.title')} description={t('dashboard.rentals.description')} />
    {items.length === 0 ? <Card><EmptyState icon="calendar" title={t('dashboard.rentals.emptyTitle')} description={t('dashboard.rentals.emptyBody')} action={<Button href="/rentals">{t('dashboard.rentals.browse')}</Button>} /></Card> : <ul className="space-y-4">{items.map((item) => <li key={item.id}><Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/rentals/${item.rental_car_id}`} className="text-body font-extrabold text-content hover:text-brand">{item.car_title || t('dashboard.rentals.vehicleFallback')}</Link><p className="mt-1 text-caption text-content-muted">{item.inquiry_ref} · {t('dashboard.rentals.sent', { date: new Date(item.created_at).toLocaleDateString() })}</p></div><Badge tone={item.status === 'cancelled' ? 'neutral' : item.status === 'closed' ? 'success' : 'info'}>{t(`dashboard.rentals.status.${item.status}`)}</Badge></div><dl className="mt-4 grid gap-3 text-caption sm:grid-cols-3"><div><dt className="text-content-muted">{t('dashboard.rentals.requestedDates')}</dt><dd className="font-bold text-content">{item.start_date || t('dashboard.rentals.flexible')}{item.days ? ` · ${t('dashboard.rentals.days', { count: item.days })}` : ''}</dd></div><div><dt className="text-content-muted">{t('dashboard.rentals.provider')}</dt><dd className="font-bold text-content">{item.provider_business_name || item.provider_name || t('dashboard.rentals.providerFallback')}</dd></div><div><dt className="text-content-muted">{t('dashboard.rentals.preferredReply')}</dt><dd className="font-bold text-content">{channelLabel(item.preferred_channel)}</dd></div></dl>{item.message ? <p className="mt-4 rounded-xl bg-surface-alt p-3 text-caption text-content-secondary">{item.message}</p> : null}{['new', 'contacted'].includes(item.status) ? <form action={cancelRentalInquiry} className="mt-4"><input type="hidden" name="id" value={item.id} /><button className="min-h-11 rounded-xl border border-line px-4 text-caption font-bold text-content hover:bg-surface-alt">{t('dashboard.rentals.cancelInquiry')}</button></form> : null}</Card></li>)}</ul>}
  </>
}
