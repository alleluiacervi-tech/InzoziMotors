import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { DigestAskCard } from '@/components/dashboard/DigestAskCard'
import { DIGEST_ASKED_COOKIE } from '@/components/dashboard/digest-ask'
import { PageHeader, PanelHeading } from '@/components/dashboard/PageHeader'
import { SavedSearchRow } from '@/components/dashboard/SavedSearchRow'
import { UnsaveButton } from '@/components/dashboard/UnsaveButton'
import { settled } from '@/components/dashboard/data'
import { CarCard } from '@/components/marketplace/CarCard'
import { Alert, Button, Card, EmptyState } from '@/components/ui'
import { saved } from '@/lib/api'
import { getCurrentUser, getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('dashboard.meta.saved'),
    robots: { index: false, follow: false },
  }
}

// Saved cars and saved searches. Both are per-user, so both are fetched with
// the cookie token and never cached.

export default async function SavedPage() {
  const t = await getServerT()
  const token = await getToken()
  if (!token) return null

  const [carsResult, searchesResult] = await Promise.allSettled([
    saved.cars(token),
    saved.searches(token),
  ])

  const cars = settled(carsResult, [])
  const searches = settled(searchesResult, [])
  const failed = carsResult.status === 'rejected' || searchesResult.status === 'rejected'

  // Asked once, right after someone has a saved search, and never again whichever
  // way they answer. Not asked at all if the summary is already on.
  const user = await getCurrentUser()
  const asked = (await cookies()).get(DIGEST_ASKED_COOKIE)?.value === '1'
  const askForDigest = searches.length > 0 && user?.alert_daily_digest !== true && !asked

  return (
    <>
      <PageHeader
        title={t('dashboard.saved.title')}
        description={t('dashboard.saved.description')}
      />

      {failed ? (
        <Alert tone="warning" title={t('dashboard.common.someFailedTitle')} className="mb-6">
          {t('dashboard.common.someFailedBody')}
        </Alert>
      ) : null}

      <section aria-labelledby="saved-cars">
        <PanelHeading
          id="saved-cars"
          title={t('dashboard.saved.carsHeading')}
          hint={cars.length > 0 ? t(cars.length === 1 ? 'dashboard.saved.carCountOne' : 'dashboard.saved.carCountOther', { count: cars.length }) : undefined}
        />

        {cars.length === 0 ? (
          <Card>
            <EmptyState
              icon="heart"
              title={t('dashboard.saved.carsEmptyTitle')}
              description={t('dashboard.saved.carsEmptyBody')}
              action={<Button href="/cars">{t('dashboard.saved.browseCertified')}</Button>}
            />
          </Card>
        ) : (
          <ul className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cars.map((car, index) => (
              <li key={car.id} className="min-w-0">
                <CarCard car={car} priority={index < 3} />
                <UnsaveButton carId={car.id} title={car.title} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="saved-searches">
        <PanelHeading
          id="saved-searches"
          title={t('dashboard.saved.searchesHeading')}
          hint={
            searches.length > 0
              ? t(searches.length === 1 ? 'dashboard.saved.alertCountOne' : 'dashboard.saved.alertCountOther', { count: searches.length })
              : undefined
          }
        />

        {searches.length === 0 ? (
          <Card>
            <EmptyState
              icon="search"
              title={t('dashboard.saved.searchesEmptyTitle')}
              description={t('dashboard.saved.searchesEmptyBody')}
              action={
                <Button href="/cars" variant="outline">
                  {t('dashboard.saved.startSearch')}
                </Button>
              }
            />
          </Card>
        ) : (
          <>
          {askForDigest ? <DigestAskCard /> : null}
          <Card>
            <ul>
              {searches.map((search) => (
                <SavedSearchRow key={search.id} search={search} />
              ))}
            </ul>
          </Card>
          </>
        )}
      </section>
    </>
  )
}
