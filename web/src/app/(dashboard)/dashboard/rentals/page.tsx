import Link from 'next/link'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Badge, Button, Card, EmptyState } from '@/components/ui'
import { rentals } from '@/lib/api'
import { getToken } from '@/lib/session'
import { cancelRentalInquiry } from './actions'

export default async function RentalInquiriesPage() {
  const token = await getToken(); if (!token) return null
  const items = await rentals.myInquiries(token).catch(() => [])
  return <><PageHeader title="Rental inquiries" description="Availability requests you sent to rental providers. These are not bookings and Sawa Cars does not process their payments or contracts." />
    {items.length === 0 ? <Card><EmptyState icon="calendar" title="No inquiries yet" description="Choose a rental, send your dates and let the verified provider confirm directly." action={<Button href="/rentals">Browse rentals</Button>} /></Card> : <ul className="space-y-4">{items.map((item) => <li key={item.id}><Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/rentals/${item.rental_car_id}`} className="text-body font-extrabold text-content hover:text-brand">{item.car_title || 'Rental vehicle'}</Link><p className="mt-1 text-caption text-content-muted">{item.inquiry_ref} · sent {new Date(item.created_at).toLocaleDateString()}</p></div><Badge tone={item.status === 'cancelled' ? 'neutral' : item.status === 'closed' ? 'success' : 'info'}>{item.status}</Badge></div><dl className="mt-4 grid gap-3 text-caption sm:grid-cols-3"><div><dt className="text-content-muted">Requested dates</dt><dd className="font-bold text-content">{item.start_date || 'Flexible'}{item.days ? ` · ${item.days} days` : ''}</dd></div><div><dt className="text-content-muted">Provider</dt><dd className="font-bold text-content">{item.provider_business_name || item.provider_name || 'Provider'}</dd></div><div><dt className="text-content-muted">Preferred reply</dt><dd className="font-bold text-content">{item.preferred_channel.replace('_', ' ')}</dd></div></dl>{item.message ? <p className="mt-4 rounded-xl bg-surface-alt p-3 text-caption text-content-secondary">{item.message}</p> : null}{['new', 'contacted'].includes(item.status) ? <form action={cancelRentalInquiry} className="mt-4"><input type="hidden" name="id" value={item.id} /><button className="min-h-11 rounded-xl border border-line px-4 text-caption font-bold text-content hover:bg-surface-alt">Cancel inquiry</button></form> : null}</Card></li>)}</ul>}
  </>
}
