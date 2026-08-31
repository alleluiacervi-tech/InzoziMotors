import type { Metadata } from 'next'
import { PageHeader, PanelHeading } from '@/components/dashboard/PageHeader'
import { SavedSearchRow } from '@/components/dashboard/SavedSearchRow'
import { UnsaveButton } from '@/components/dashboard/UnsaveButton'
import { settled } from '@/components/dashboard/data'
import { CarCard } from '@/components/marketplace/CarCard'
import { Alert, Button, Card, EmptyState } from '@/components/ui'
import { saved } from '@/lib/api'
import { getToken } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Saved',
  robots: { index: false, follow: false },
}

// Saved cars and saved searches. Both are per-user, so both are fetched with
// the cookie token and never cached.

export default async function SavedPage() {
  const token = await getToken()
  if (!token) return null

  const [carsResult, searchesResult] = await Promise.allSettled([
    saved.cars(token),
    saved.searches(token),
  ])

  const cars = settled(carsResult, [])
  const searches = settled(searchesResult, [])
  const failed = carsResult.status === 'rejected' || searchesResult.status === 'rejected'

  return (
    <>
      <PageHeader
        title="Saved"
        description="Your shortlist and your standing alerts. We notify you when a saved car drops in price, and when a car matching a saved search is certified and listed."
      />

      {failed ? (
        <Alert tone="warning" title="Some of this page did not load" className="mb-6">
          Refresh to try again. Nothing on your account has changed.
        </Alert>
      ) : null}

      <section aria-labelledby="saved-cars">
        <PanelHeading
          id="saved-cars"
          title="Saved cars"
          hint={cars.length > 0 ? `${cars.length} ${cars.length === 1 ? 'car' : 'cars'}` : undefined}
        />

        {cars.length === 0 ? (
          <Card>
            <EmptyState
              icon="heart"
              title="No saved cars yet"
              description="Saving a car keeps it in one place and puts you first in line for a price drop. It costs nothing and the seller is not notified."
              action={<Button href="/cars">Browse certified cars</Button>}
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
          title="Saved searches"
          hint={
            searches.length > 0
              ? `${searches.length} ${searches.length === 1 ? 'alert' : 'alerts'}`
              : undefined
          }
        />

        {searches.length === 0 ? (
          <Card>
            <EmptyState
              icon="search"
              title="No saved searches"
              description="Set the filters you care about — a Toyota RAV4 under RWF 30,000,000, say — then save the search. We will tell you the moment a car that matches passes inspection."
              action={
                <Button href="/cars" variant="outline">
                  Start a search
                </Button>
              }
            />
          </Card>
        ) : (
          <Card>
            <ul>
              {searches.map((search) => (
                <SavedSearchRow key={search.id} search={search} />
              ))}
            </ul>
          </Card>
        )}
      </section>
    </>
  )
}
