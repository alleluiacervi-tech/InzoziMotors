import type { Metadata } from 'next'
import { PageHeader, PanelHeading } from '@/components/dashboard/PageHeader'
import { RequestCard } from '@/components/dashboard/RequestCard'
import { describeError } from '@/components/dashboard/data'
import { Alert, Button, Card, EmptyState } from '@/components/ui'
import { handovers } from '@/lib/api'
import { getToken } from '@/lib/session'
import type { Handover } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Requests',
  robots: { index: false, follow: false },
}

// Purchase requests, split into what is still moving and what is closed.
// A request is a reservation, never a payment — the copy on every card says so.

export default async function RequestsPage() {
  const token = await getToken()
  if (!token) return null

  let mine: Handover[] = []
  let error: string | null = null
  try {
    mine = await handovers.mine(token)
  } catch (err) {
    error = describeError(err)
  }

  const active = mine.filter((h) => h.status === 'pending' || h.status === 'confirmed')
  const past = mine.filter((h) => h.status === 'complete' || h.status === 'cancelled')

  return (
    <>
      <PageHeader
        title="Requests"
        description="Every car you have asked for. Requesting reserves the car and costs nothing — payment happens in person at a Sawa center on the day of handover."
      />

      {error ? (
        <Alert tone="warning" title="We could not load your requests" className="mb-6">
          {error}
        </Alert>
      ) : null}

      {!error && mine.length === 0 ? (
        <Card>
          <EmptyState
            icon="key"
            title="No requests yet"
            description="When you find a car you want, request it. We reserve it in your name, take it off the marketplace, and arrange the handover at a center near you."
            action={<Button href="/cars">Browse certified cars</Button>}
          />
        </Card>
      ) : null}

      {active.length > 0 ? (
        <section aria-labelledby="active-requests">
          <PanelHeading
            id="active-requests"
            title="In progress"
            hint={`${active.length} ${active.length === 1 ? 'request' : 'requests'}`}
          />
          <ul className="space-y-4">
            {active.map((handover) => (
              <li key={handover.id}>
                <RequestCard handover={handover} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className={active.length > 0 ? 'mt-10' : ''} aria-labelledby="past-requests">
          <PanelHeading
            id="past-requests"
            title="Closed"
            hint={`${past.length} ${past.length === 1 ? 'request' : 'requests'}`}
          />
          <ul className="space-y-4">
            {past.map((handover) => (
              <li key={handover.id}>
                <RequestCard handover={handover} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
