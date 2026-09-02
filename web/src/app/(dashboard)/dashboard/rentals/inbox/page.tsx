import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Badge, Button, Card, EmptyState, Icon } from '@/components/ui'
import { rentals } from '@/lib/api'
import { getCurrentUser, getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import { markInquiryClosed, markInquiryContacted } from './actions'

// The provider's incoming availability requests — the other half of the
// inquiry the renter sends from a rental's detail page. Sawa never arranges
// the deal; this page exists so the provider has somewhere to see it landed.

export default async function RentalInboxPage() {
  const t = await getServerT()
  const user = await getCurrentUser()
  const token = await getToken()
  if (!user || !token) return null
  if (!(user.role === 'seller' && user.id_verified === 'approved' && user.business_verified === true)) {
    redirect('/dashboard/rentals')
  }

  const items = await rentals.providerInquiries(token).catch(() => [])

  return (
    <>
      <PageHeader title={t('dashboard.rentalInbox.title')} description={t('dashboard.rentalInbox.description')} />

      {items.length === 0 ? (
        <Card>
          <EmptyState icon="mail" title={t('dashboard.rentalInbox.emptyTitle')} description={t('dashboard.rentalInbox.emptyBody')} />
        </Card>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/rentals/${item.rental_car_id}`} className="text-body font-extrabold text-content hover:text-brand">
                      {item.car_title || t('dashboard.rentalFleet.emptyTitle')}
                    </Link>
                    <p className="mt-1 text-caption text-content-muted">
                      {item.inquiry_ref} · {item.renter_name || t('dashboard.rentalInbox.renterFallback')}
                    </p>
                  </div>
                  <Badge tone={item.status === 'cancelled' ? 'neutral' : item.status === 'closed' ? 'success' : item.status === 'contacted' ? 'info' : 'warning'}>
                    {t(`dashboard.rentals.status.${item.status}`)}
                  </Badge>
                </div>

                <dl className="mt-4 grid gap-3 text-caption sm:grid-cols-3">
                  <div>
                    <dt className="text-content-muted">{t('dashboard.rentals.requestedDates')}</dt>
                    <dd className="font-bold text-content">
                      {item.start_date || t('dashboard.rentals.flexible')}
                      {item.days ? ` · ${t('dashboard.rentals.days', { count: item.days })}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-content-muted">{t('dashboard.rentalInbox.pickup')}</dt>
                    <dd className="font-bold text-content">{item.pickup_location || t('dashboard.rentalInbox.pickupFallback')}</dd>
                  </div>
                  <div>
                    <dt className="text-content-muted">{t('dashboard.rentals.preferredReply')}</dt>
                    <dd className="font-bold text-content">{t(`dashboard.rentals.channel.${item.preferred_channel}`)}</dd>
                  </div>
                </dl>

                {item.message ? (
                  <p className="mt-4 rounded-xl bg-surface-alt p-3 text-caption text-content-secondary">{item.message}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
                  {item.preferred_channel === 'phone' && item.renter_phone ? (
                    <a href={`tel:${item.renter_phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-caption font-bold text-content hover:bg-surface-alt">
                      <Icon name="phone" size={14} />{item.renter_phone}
                    </a>
                  ) : null}
                  {item.preferred_channel === 'whatsapp' && item.renter_whatsapp ? (
                    <a href={`https://wa.me/${item.renter_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-caption font-bold text-content hover:bg-surface-alt">
                      <Icon name="whatsapp" size={14} />{t('dashboard.rentalInbox.whatsapp')}
                    </a>
                  ) : null}
                  {item.status === 'new' ? (
                    <form action={markInquiryContacted}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button type="submit" variant="secondary" size="sm">{t('dashboard.rentalInbox.markContacted')}</Button>
                    </form>
                  ) : null}
                  {['new', 'contacted'].includes(item.status) ? (
                    <form action={markInquiryClosed}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="h-9 rounded-lg border border-line px-3 text-caption font-bold text-content-secondary hover:bg-surface-alt">
                        {t('dashboard.rentalInbox.markClosed')}
                      </button>
                    </form>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
