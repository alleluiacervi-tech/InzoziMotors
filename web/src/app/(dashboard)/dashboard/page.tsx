import Link from 'next/link'
import { PageHeader, PanelHeading } from '@/components/dashboard/PageHeader'
import { StatTile } from '@/components/dashboard/StatTile'
import { getNotifications, settled } from '@/components/dashboard/data'
import { notificationTarget } from '@/components/dashboard/meta'
import { Alert, Badge, Button, Card, EmptyState, Icon } from '@/components/ui'
import { rentals, saved, submissions } from '@/lib/api'
import { SUBMISSION_STATUS_LABEL, formatRelative } from '@/lib/business'
import { getCurrentUser, getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

export default async function DashboardOverviewPage() {
  const t = await getServerT()
  const user = await getCurrentUser(); const token = await getToken()
  if (!user || !token) return null
  const [savedResult, inquiryResult, notificationResult, submissionResult] = await Promise.allSettled([
    saved.cars(token), rentals.myInquiries(token), getNotifications(), submissions.mine(token),
  ])
  const savedCars = settled(savedResult, []); const inquiries = settled(inquiryResult, []); const notes = settled(notificationResult, []); const selling = settled(submissionResult, [])
  const failed = [savedResult, inquiryResult, submissionResult].some((result) => result.status === 'rejected')
  const unread = notes.filter((note) => !note.read).length
  const activeInquiries = inquiries.filter((item) => ['new', 'contacted'].includes(item.status)).length
  const firstName = user.name.trim().split(' ')[0]
  return <>
    <PageHeader title={t('dashboard.overview.title', { name: firstName })} description={t('dashboard.overview.description')} />
    {failed ? <Alert tone="warning" title={t('dashboard.common.partFailedTitle')} className="mb-6">{t('dashboard.common.partFailedBody')}</Alert> : null}
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatTile label={t('dashboard.overview.statSavedLabel')} value={savedCars.length} icon="heart" href="/dashboard/saved" hint={t('dashboard.overview.statSavedHint')} />
      <StatTile label={t('dashboard.overview.statRentalsLabel')} value={activeInquiries} icon="calendar" href="/dashboard/rentals" hint={t('dashboard.overview.statRentalsHint')} />
      <StatTile label={t('dashboard.overview.statUnreadLabel')} value={unread} icon="bell" href="/dashboard/notifications" hint={t('dashboard.overview.statUnreadHint')} />
      <StatTile label={t('dashboard.overview.statSellingLabel')} value={selling.length} icon="car" href="/dashboard/selling" hint={t('dashboard.overview.statSellingHint')} />
    </div>

    <Card className="mt-8 border-brand/20 bg-brand-tint p-5"><div className="flex gap-3"><Icon name="info" size={20} className="mt-0.5 shrink-0 text-brand" /><div><h2 className="font-extrabold text-content">{t('dashboard.overview.dealsTitle')}</h2><p className="mt-1 text-caption leading-relaxed text-content-secondary">{t('dashboard.overview.dealsBody')}</p><Link href="/how-it-works" className="mt-2 inline-flex min-h-11 items-center text-caption font-bold text-brand">{t('dashboard.overview.dealsLink')} <Icon name="arrow-right" size={15} className="ml-1" /></Link></div></div></Card>

    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section><PanelHeading id="updates" title={t('dashboard.overview.updatesTitle')} /><Card className="p-2">{notes.length === 0 ? <EmptyState icon="bell" title={t('dashboard.overview.updatesEmptyTitle')} description={t('dashboard.overview.updatesEmptyBody')} className="py-10" /> : <ul>{notes.slice(0, 5).map((note) => { const target = notificationTarget(note); return <li key={note.id} className="hairline"><div className="flex items-start gap-3 p-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-caption font-bold text-content">{note.title}</h3>{!note.read ? <Badge tone="info">{t('dashboard.common.new')}</Badge> : null}</div><p className="mt-1 line-clamp-2 text-caption text-content-secondary">{note.body}</p><time className="mt-1 block text-micro text-content-muted">{formatRelative(note.created_at)}</time></div>{target ? <Link href={target.href} className="inline-flex min-h-11 items-center text-caption font-bold text-brand">{t(target.labelKey)}</Link> : null}</div></li>})}</ul>}</Card></section>
      <section><PanelHeading id="inquiries" title={t('dashboard.overview.inquiriesTitle')} /><Card className="p-2">{inquiries.length === 0 ? <EmptyState icon="calendar" title={t('dashboard.overview.inquiriesEmptyTitle')} description={t('dashboard.overview.inquiriesEmptyBody')} className="py-10" action={<Button href="/rentals" size="sm" variant="outline">{t('dashboard.overview.browseRentals')}</Button>} /> : <ul>{inquiries.slice(0, 5).map((item) => <li key={item.id} className="hairline"><Link href="/dashboard/rentals" className="flex min-h-16 items-center justify-between rounded-xl p-3 hover:bg-surface-alt"><span><span className="block text-caption font-bold text-content">{item.car_title || item.inquiry_ref}</span><span className="text-micro text-content-muted">{item.inquiry_ref} · {t(`dashboard.rentals.status.${item.status}`)}</span></span><Icon name="chevron-right" size={16} /></Link></li>)}</ul>}</Card></section>
    </div>

    {selling.length ? <section className="mt-8"><PanelHeading id="selling" title={t('dashboard.overview.sellingTitle')} action={<Link href="/dashboard/selling" className="inline-flex min-h-11 items-center text-caption font-bold text-brand">{t('dashboard.overview.fullPipeline')}</Link>} /><Card className="p-2"><ul>{selling.slice(0, 3).map((item) => <li key={item.id} className="hairline"><Link href="/dashboard/selling" className="flex items-center justify-between rounded-xl p-3 hover:bg-surface-alt"><span><span className="block text-caption font-bold text-content">{item.car_title ?? [item.year, item.make, item.model].filter(Boolean).join(' ')}</span><span className="text-caption text-content-muted">{SUBMISSION_STATUS_LABEL[item.status] ?? item.status}</span></span><Icon name="chevron-right" size={16} /></Link></li>)}</ul></Card></section> : null}
  </>
}
