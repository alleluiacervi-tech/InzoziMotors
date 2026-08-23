import Link from 'next/link'
import { PageHeader, PanelHeading } from '@/components/dashboard/PageHeader'
import { StatTile } from '@/components/dashboard/StatTile'
import { getNotifications, settled } from '@/components/dashboard/data'
import { notificationTarget } from '@/components/dashboard/meta'
import { Alert, Badge, Button, Card, EmptyState, Icon } from '@/components/ui'
import { rentals, saved, submissions } from '@/lib/api'
import { SUBMISSION_STATUS_LABEL, formatRelative } from '@/lib/business'
import { getCurrentUser, getToken } from '@/lib/session'

export default async function DashboardOverviewPage() {
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
    <PageHeader title={`Hello, ${firstName}`} description="Your shortlists, rental inquiries, seller submissions and platform updates in one place." />
    {failed ? <Alert tone="warning" title="Part of your dashboard did not load" className="mb-6">Refresh to try again. No account data was changed.</Alert> : null}
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatTile label="Saved" value={savedCars.length} icon="heart" href="/dashboard/saved" hint="vehicle shortlist" />
      <StatTile label="Rental inquiries" value={activeInquiries} icon="calendar" href="/dashboard/rentals" hint="awaiting or contacted" />
      <StatTile label="Unread" value={unread} icon="bell" href="/dashboard/notifications" hint="platform updates" />
      <StatTile label="Selling" value={selling.length} icon="car" href="/dashboard/selling" hint="vehicles in review" />
    </div>

    <Card className="mt-8 border-brand/20 bg-brand-tint p-5"><div className="flex gap-3"><Icon name="info" size={20} className="mt-0.5 shrink-0 text-brand" /><div><h2 className="font-extrabold text-content">Your deals remain yours</h2><p className="mt-1 text-caption leading-relaxed text-content-secondary">Sawa Cars does not hold funds or confirm a sale or rental. Verify the other party, vehicle and documents, then record your price, payment, delivery and cancellation terms in your own written agreement.</p><Link href="/how-it-works" className="mt-2 inline-flex min-h-11 items-center text-caption font-bold text-brand">Review the safety steps <Icon name="arrow-right" size={15} className="ml-1" /></Link></div></div></Card>

    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section><PanelHeading id="updates" title="Latest updates" /><Card className="p-2">{notes.length === 0 ? <EmptyState icon="bell" title="Nothing yet" description="Price changes, messages and listing updates appear here." className="py-10" /> : <ul>{notes.slice(0, 5).map((note) => { const target = notificationTarget(note); return <li key={note.id} className="hairline"><div className="flex items-start gap-3 p-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-caption font-bold text-content">{note.title}</h3>{!note.read ? <Badge tone="info">New</Badge> : null}</div><p className="mt-1 line-clamp-2 text-caption text-content-secondary">{note.body}</p><time className="mt-1 block text-micro text-content-muted">{formatRelative(note.created_at)}</time></div>{target ? <Link href={target.href} className="inline-flex min-h-11 items-center text-caption font-bold text-brand">{target.label}</Link> : null}</div></li>})}</ul>}</Card></section>
      <section><PanelHeading id="inquiries" title="Rental inquiries" /><Card className="p-2">{inquiries.length === 0 ? <EmptyState icon="calendar" title="No rental inquiries" description="Ask a verified provider to confirm dates and terms directly." className="py-10" action={<Button href="/rentals" size="sm" variant="outline">Browse rentals</Button>} /> : <ul>{inquiries.slice(0, 5).map((item) => <li key={item.id} className="hairline"><Link href="/dashboard/rentals" className="flex min-h-16 items-center justify-between rounded-xl p-3 hover:bg-surface-alt"><span><span className="block text-caption font-bold text-content">{item.car_title || item.inquiry_ref}</span><span className="text-micro text-content-muted">{item.inquiry_ref} · {item.status}</span></span><Icon name="chevron-right" size={16} /></Link></li>)}</ul>}</Card></section>
    </div>

    {selling.length ? <section className="mt-8"><PanelHeading id="selling" title="Vehicles you are selling" action={<Link href="/dashboard/selling" className="inline-flex min-h-11 items-center text-caption font-bold text-brand">Full pipeline</Link>} /><Card className="p-2"><ul>{selling.slice(0, 3).map((item) => <li key={item.id} className="hairline"><Link href="/dashboard/selling" className="flex items-center justify-between rounded-xl p-3 hover:bg-surface-alt"><span><span className="block text-caption font-bold text-content">{item.car_title ?? [item.year, item.make, item.model].filter(Boolean).join(' ')}</span><span className="text-caption text-content-muted">{SUBMISSION_STATUS_LABEL[item.status] ?? item.status}</span></span><Icon name="chevron-right" size={16} /></Link></li>)}</ul></Card></section> : null}
  </>
}
