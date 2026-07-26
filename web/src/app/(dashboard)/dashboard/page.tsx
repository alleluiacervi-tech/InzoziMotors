import Link from 'next/link'
import { HandoverRow } from '@/components/dashboard/HandoverRow'
import { PageHeader, PanelHeading } from '@/components/dashboard/PageHeader'
import { StatTile } from '@/components/dashboard/StatTile'
import { getNotifications, settled } from '@/components/dashboard/data'
import { notificationTarget } from '@/components/dashboard/meta'
import { Alert, Badge, Button, Card, EmptyState, Icon, type IconName } from '@/components/ui'
import { handovers, saved, submissions } from '@/lib/api'
import {
  SUBMISSION_STATUS_LABEL,
  daysLeftInReturnWindow,
  formatRelative,
} from '@/lib/business'
import { getCurrentUser, getToken } from '@/lib/session'
import type { Handover } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// Overview.
//
// Four independent calls, all in flight together. allSettled rather than all,
// because one failing endpoint should cost the visitor one panel — not the
// whole page. Every figure shown is the length of a list the API returned.
// ─────────────────────────────────────────────────────────────────────────────

type NextStep = { icon: IconName; title: string; body: string; href: string; cta: string }

/** The concrete thing to do next, derived only from live records. */
function buildNextSteps(list: Handover[], savedCount: number): NextStep[] {
  const steps: NextStep[] = []

  const inWindow = list.find(
    (h) => h.status === 'complete' && daysLeftInReturnWindow(h.confirmed_at) > 0
  )
  if (inWindow) {
    const days = daysLeftInReturnWindow(inWindow.confirmed_at)
    steps.push({
      icon: 'shield-check',
      title: `${days} ${days === 1 ? 'day' : 'days'} left in your guarantee window`,
      body: `Drive the ${inWindow.car_title ?? 'car'}. If it does not match its inspection report, return it to any Inzozi center for a full refund.`,
      href: '/dashboard/requests',
      cta: 'See the terms',
    })
  }

  const confirmed = list.find((h) => h.status === 'confirmed')
  if (confirmed) {
    steps.push({
      icon: 'calendar',
      title: 'Your handover is confirmed',
      body: confirmed.center && confirmed.handover_date
        ? `Meet us at ${confirmed.center} on ${confirmed.handover_date}${confirmed.handover_time ? ` at ${confirmed.handover_time}` : ''}. Bring your national ID and payment.`
        : 'Our team is finalising the time and place with you and the seller.',
      href: '/dashboard/requests',
      cta: 'View request',
    })
  }

  const pending = list.filter((h) => h.status === 'pending').length
  if (pending > 0) {
    steps.push({
      icon: 'clock',
      title: pending === 1 ? 'One request is being confirmed' : `${pending} requests are being confirmed`,
      body: 'The car is reserved for you. We contact you on WhatsApp within 24 hours to arrange the handover at a center.',
      href: '/dashboard/requests',
      cta: 'View requests',
    })
  }

  if (savedCount === 0) {
    steps.push({
      icon: 'search',
      title: 'Save the cars you are weighing up',
      body: 'Saved cars keep their price history in one place, and we tell you the moment one of them drops.',
      href: '/cars',
      cta: 'Browse certified cars',
    })
  }

  return steps.slice(0, 3)
}

export default async function DashboardOverviewPage() {
  const user = await getCurrentUser()
  const token = await getToken()
  if (!user || !token) return null // layout has already redirected

  const [savedResult, handoverResult, notificationResult, submissionResult] =
    await Promise.allSettled([
      saved.cars(token),
      handovers.mine(token),
      getNotifications(),
      submissions.mine(token),
    ])

  const savedCars = settled(savedResult, [])
  const myHandovers = settled(handoverResult, [])
  const myNotifications = settled(notificationResult, [])
  const mySubmissions = settled(submissionResult, [])

  const somethingFailed = [savedResult, handoverResult, submissionResult].some(
    (r) => r.status === 'rejected'
  )

  const openRequests = myHandovers.filter(
    (h) => h.status === 'pending' || h.status === 'confirmed'
  ).length
  const unread = myNotifications.filter((n) => !n.read).length
  const firstName = user.name.trim().split(' ')[0]

  const nothingYet =
    savedCars.length === 0 &&
    myHandovers.length === 0 &&
    myNotifications.length === 0 &&
    mySubmissions.length === 0

  const nextSteps = buildNextSteps(myHandovers, savedCars.length)

  return (
    <>
      <PageHeader
        title={`Hello, ${firstName}`}
        description="Everything you have running with Inzozi Motors — your saved cars, your requests and where each car you sell has reached."
      />

      {somethingFailed ? (
        <Alert tone="warning" title="Part of your dashboard did not load" className="mb-6">
          We could not reach one of our services. Refresh the page to try again — nothing on your
          account has changed.
        </Alert>
      ) : null}

      {nothingYet ? (
        <Card>
          <EmptyState
            icon="car"
            title="Your account is ready"
            description="Every car on Inzozi passes a 150-point inspection before it is listed, and every purchase carries a 7-day guarantee. Start with the cars available now — saving one takes a tap, and costs nothing."
            action={
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button href="/cars">Browse certified cars</Button>
                <Button href="/sell" variant="outline">
                  Sell your car
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatTile
              label="Saved"
              value={savedCars.length}
              icon="heart"
              href="/dashboard/saved"
              hint={savedCars.length === 1 ? 'car on your shortlist' : 'cars on your shortlist'}
            />
            <StatTile
              label="Requests"
              value={openRequests}
              icon="key"
              href="/dashboard/requests"
              hint="awaiting handover"
            />
            <StatTile
              label="Unread"
              value={unread}
              icon="bell"
              href="/dashboard/notifications"
              hint="updates from our team"
            />
            <StatTile
              label="Selling"
              value={mySubmissions.length}
              icon="car"
              href="/dashboard/selling"
              hint={mySubmissions.length === 1 ? 'car in the pipeline' : 'cars in the pipeline'}
            />
          </div>

          {nextSteps.length > 0 ? (
            <section className="mt-8" aria-labelledby="next-steps">
              <PanelHeading id="next-steps" title="What happens next" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {nextSteps.map((step) => (
                  <Card key={step.title} className="flex flex-col p-5">
                    <Icon name={step.icon} size={20} className="text-content-secondary" />
                    <h3 className="mt-3 text-body font-extrabold text-content">{step.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-content-secondary">
                      {step.body}
                    </p>
                    <Link
                      href={step.href}
                      className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-brand hover:underline"
                    >
                      {step.cta}
                      <Icon name="arrow-right" size={15} />
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="recent-updates">
              <PanelHeading id="recent-updates" title="Latest updates" />
              <Card className="p-2">
                {myNotifications.length === 0 ? (
                  <EmptyState
                    icon="bell"
                    title="Nothing yet"
                    description="Price drops on cars you saved, handover confirmations and messages from our team all land here."
                    className="py-10"
                  />
                ) : (
                  <ul>
                    {myNotifications.slice(0, 4).map((notification) => {
                      const target = notificationTarget(notification)
                      return (
                        <li key={notification.id} className="hairline">
                          <div className="flex items-start gap-3 p-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3
                                  className={`text-sm ${notification.read ? 'font-semibold text-content-secondary' : 'font-extrabold text-content'}`}
                                >
                                  {notification.title}
                                </h3>
                                {notification.read ? null : <Badge tone="info">New</Badge>}
                              </div>
                              <p className="mt-1 line-clamp-2 text-caption leading-relaxed text-content-secondary">
                                {notification.body}
                              </p>
                              <time
                                dateTime={notification.created_at}
                                className="mt-1 block text-micro text-content-muted"
                              >
                                {formatRelative(notification.created_at)}
                              </time>
                            </div>
                            {target ? (
                              <Link
                                href={target.href}
                                className="inline-flex min-h-[44px] shrink-0 items-center text-caption font-bold text-brand hover:underline"
                              >
                                {target.label}
                              </Link>
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {myNotifications.length > 4 ? (
                  <div className="px-3">
                    <Link
                      href="/dashboard/notifications"
                      className="inline-flex min-h-[44px] items-center text-sm font-bold text-brand hover:underline"
                    >
                      All notifications
                    </Link>
                  </div>
                ) : null}
              </Card>
            </section>

            <section aria-labelledby="recent-requests">
              <PanelHeading id="recent-requests" title="Your requests" />
              <Card className="p-2">
                {myHandovers.length === 0 ? (
                  <EmptyState
                    icon="key"
                    title="No requests yet"
                    description="Requesting a car reserves it for you and costs nothing. Payment only ever happens in person at an Inzozi center."
                    className="py-10"
                    action={<Button href="/cars" size="sm" variant="outline">Browse cars</Button>}
                  />
                ) : (
                  <ul>
                    {myHandovers.slice(0, 3).map((handover) => (
                      <li key={handover.id} className="hairline">
                        <HandoverRow handover={handover} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>
          </div>

          {mySubmissions.length > 0 ? (
            <section className="mt-8" aria-labelledby="selling-summary">
              <PanelHeading
                id="selling-summary"
                title="Cars you are selling"
                action={
                  <Link
                    href="/dashboard/selling"
                    className="inline-flex min-h-[44px] items-center text-sm font-bold text-brand hover:underline"
                  >
                    Full pipeline
                  </Link>
                }
              />
              <Card className="p-2">
                <ul>
                  {mySubmissions.slice(0, 3).map((submission) => (
                    <li key={submission.id} className="hairline">
                      <Link
                        href="/dashboard/selling"
                        className="flex items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-surface-alt"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-content">
                            {submission.car_title ??
                              [submission.year, submission.make, submission.model]
                                .filter(Boolean)
                                .join(' ')}
                          </span>
                          <span className="block text-caption text-content-muted">
                            {SUBMISSION_STATUS_LABEL[submission.status] ?? submission.status}
                          </span>
                        </span>
                        <Icon name="chevron-right" size={16} className="text-content-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}
        </>
      )}
    </>
  )
}
