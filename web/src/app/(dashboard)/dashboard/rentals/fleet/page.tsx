import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { EditRentalTermsForm } from '@/components/dashboard/EditRentalTermsForm'
import { ProposeRentalForm } from '@/components/dashboard/ProposeRentalForm'
import { RentalCalendarPanel, RentalCheckPanel, RentalPhotosPanel } from '@/components/dashboard/RentalFleetPanels'
import { Badge, Card, EmptyState } from '@/components/ui'
import { rentals } from '@/lib/api'
import { formatMoney } from '@/lib/business'
import { formatDay } from '@/lib/rental-dates'
import { getCurrentUser, getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import type { RentalCar } from '@/lib/types'

// The provider's own fleet: add a car (which asks Sawa for its Rental Check),
// see every car regardless of status, keep its Rental Check, rates and taken
// dates current. Publication itself is not here — status only ever moves via
// an admin.

const STATUS_TONE: Record<RentalCar['status'], 'success' | 'warning' | 'neutral' | 'danger'> = {
  active: 'success',
  pending_review: 'warning',
  maintenance: 'neutral',
  retired: 'danger',
}

export default async function RentalFleetPage() {
  const t = await getServerT()
  const user = await getCurrentUser()
  const token = await getToken()
  if (!user || !token) return null
  if (!(user.role === 'seller' && user.id_verified === 'approved' && user.business_verified === true)) {
    redirect('/dashboard/rentals')
  }

  const [cars, eligible] = await Promise.all([
    rentals.mine(token).catch(() => []),
    rentals.eligibleInspections(token).catch(() => []),
  ])

  return (
    <>
      <PageHeader title={t('dashboard.rentalFleet.title')} description={t('dashboard.rentalFleet.description')} />

      <div className="space-y-6">
        <ProposeRentalForm eligible={eligible} />

        {cars.length === 0 ? (
          <Card>
            <EmptyState icon="car" title={t('dashboard.rentalFleet.emptyTitle')} description={t('dashboard.rentalFleet.emptyBody')} />
          </Card>
        ) : (
          <ul className="space-y-4">
            {cars.map((car) => (
              <li key={car.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-body font-extrabold text-content">{car.title}</p>
                      <p className="mt-1 text-caption text-content-muted">{formatMoney(car.daily_rate)}{t('dashboard.rentalFleet.perDay')}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={STATUS_TONE[car.status]}>{t(`dashboard.rentalFleet.status.${car.status}`)}</Badge>
                      {car.subscription_status && car.subscription_status !== 'active' ? (
                        <Badge tone={car.subscription_status === 'none' ? 'neutral' : 'warning'}>
                          {t(`dashboard.rentalFleet.subscription.${car.subscription_status}`)}
                        </Badge>
                      ) : null}
                      {car.availability?.out_now && car.availability.back_on ? (
                        <Badge tone="info">{t('rentals.card.takenBack', { date: formatDay(car.availability.back_on) })}</Badge>
                      ) : null}
                    </div>
                  </div>

                  {car.status === 'pending_review' ? (
                    <p className="mt-3 rounded-xl bg-surface-alt p-3 text-caption text-content-secondary">
                      {t('dashboard.rentalFleet.pendingNote')}
                    </p>
                  ) : null}

                  <RentalCheckPanel car={car} />
                  {car.status !== 'retired' ? <RentalPhotosPanel car={car} /> : null}
                  {car.status !== 'retired' ? <RentalCalendarPanel car={car} periods={car.calendar_periods ?? []} /> : null}
                  <EditRentalTermsForm car={car} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
