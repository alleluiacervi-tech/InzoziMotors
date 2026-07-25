import type { Metadata } from 'next'
import Link from 'next/link'
import { DisputeForm } from '@/components/dashboard/DisputeForm'
import { PageHeader, PanelHeading } from '@/components/dashboard/PageHeader'
import { settled } from '@/components/dashboard/data'
import { Alert, Card, EmptyState, StatusPill } from '@/components/ui'
import { disputes, handovers } from '@/lib/api'
import { RETURN_WINDOW_DAYS, daysLeftInReturnWindow, formatDate } from '@/lib/business'
import { getToken } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Disputes',
  robots: { index: false, follow: false },
}

// ─────────────────────────────────────────────────────────────────────────────
// The 7-day drive-it guarantee, made actionable.
//
// Eligibility mirrors POST /disputes exactly: the handover must be complete,
// owned by this account, inside the window measured from confirmed_at (the
// moment admin completed it), and free of an already-open dispute. Showing a
// form the server would reject is worse than showing none.
// ─────────────────────────────────────────────────────────────────────────────

const TERMS = [
  {
    when: 'Days 1–7 after handover',
    what: 'Full refund if the car does not match its published inspection report.',
  },
  {
    when: 'Change of mind',
    what: 'Accepted with a reconditioning fee for cleaning and re-inspection.',
  },
  {
    when: 'Over 300 km driven',
    what: 'A per-km usage charge is applied to the refund.',
  },
  {
    when: 'After 7 days',
    what: 'The sale is final. Warranty questions go through our support team.',
  },
]

export default async function DisputesPage() {
  const token = await getToken()
  if (!token) return null

  const [disputeResult, handoverResult] = await Promise.allSettled([
    disputes.mine(token),
    handovers.mine(token),
  ])
  const myDisputes = settled(disputeResult, [])
  const myHandovers = settled(handoverResult, [])
  const failed = disputeResult.status === 'rejected' || handoverResult.status === 'rejected'

  const openHandoverIds = new Set(
    myDisputes.filter((d) => d.status === 'open').map((d) => d.handover_id)
  )

  const eligible = myHandovers.filter(
    (h) =>
      h.status === 'complete' &&
      daysLeftInReturnWindow(h.confirmed_at) > 0 &&
      !openHandoverIds.has(h.id)
  )

  return (
    <>
      <PageHeader
        title="Disputes"
        description={`Every certified purchase comes with a ${RETURN_WINDOW_DAYS}-day decision window. Drive it, live with it — and if it does not match its inspection report, bring it back to any Inzozi center.`}
      />

      {failed ? (
        <Alert tone="warning" title="Some of this page did not load" className="mb-6">
          Refresh to try again. Nothing on your account has changed.
        </Alert>
      ) : null}

      <section aria-labelledby="guarantee-terms">
        <PanelHeading id="guarantee-terms" title="How the guarantee works" />
        <Card className="p-2">
          <dl>
            {TERMS.map((term) => (
              <div key={term.when} className="hairline flex flex-col gap-1 p-4 sm:flex-row sm:gap-6">
                <dt className="text-[13px] font-extrabold text-content sm:w-52 sm:shrink-0">
                  {term.when}
                </dt>
                <dd className="text-[13px] leading-relaxed text-content-secondary">{term.what}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <p className="mt-3 text-[13px] leading-relaxed text-content-muted">
          Returns are handled at the center where the handover took place.{' '}
          <Link href="/legal/guarantee" className="font-bold text-brand hover:underline">
            Read the full terms
          </Link>
          .
        </p>
      </section>

      {eligible.length > 0 ? (
        <section className="mt-10" aria-labelledby="raise-dispute">
          <PanelHeading
            id="raise-dispute"
            title="Raise a dispute"
            hint={`${eligible.length} ${eligible.length === 1 ? 'purchase is' : 'purchases are'} still in the window`}
          />
          <ul className="space-y-4">
            {eligible.map((handover) => {
              const daysLeft = daysLeftInReturnWindow(handover.confirmed_at)
              return (
                <li key={handover.id}>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-[15px] font-extrabold text-content">
                        {handover.car_title ?? 'Your purchase'}
                      </h3>
                      <p className="text-[13px] text-content-muted">
                        Reference {handover.booking_id} · {daysLeft}{' '}
                        {daysLeft === 1 ? 'day' : 'days'} left
                      </p>
                    </div>
                    <div className="mt-4">
                      <DisputeForm
                        handoverId={handover.id}
                        carTitle={handover.car_title ?? 'car'}
                        daysLeft={daysLeft}
                      />
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="my-disputes">
        <PanelHeading id="my-disputes" title="Your disputes" />
        {myDisputes.length === 0 ? (
          <Card>
            <EmptyState
              icon="shield-check"
              title="No disputes"
              description={
                eligible.length > 0
                  ? 'Nothing raised so far. If the car does not match its report, use the form above and our team takes it from there.'
                  : 'Nothing raised, and nothing currently inside the 7-day window. If a car you bought does not match its inspection report, this is where you tell us.'
              }
            />
          </Card>
        ) : (
          <ul className="space-y-4">
            {myDisputes.map((dispute) => (
              <li key={dispute.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-extrabold text-content">
                        {dispute.car_title ?? 'Purchase'}
                      </h3>
                      <p className="mt-1 text-[13px] text-content-muted">
                        {dispute.booking_id ? `Reference ${dispute.booking_id} · ` : ''}
                        raised {formatDate(dispute.created_at)}
                      </p>
                    </div>
                    <StatusPill
                      status={dispute.status}
                      label={
                        dispute.status === 'open'
                          ? 'Under review'
                          : dispute.status === 'resolved'
                          ? 'Resolved'
                          : 'Not upheld'
                      }
                    />
                  </div>

                  <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-content-secondary">
                    {dispute.reason}
                  </p>

                  {dispute.status === 'open' ? (
                    <p className="mt-4 rounded-xl bg-surface-alt px-4 py-3 text-[13px] leading-relaxed text-content-secondary">
                      Our team reviews this and contacts you and the seller within 24 hours. Keep the
                      car at the agreed condition until we have spoken.
                    </p>
                  ) : (
                    <div className="mt-4 rounded-xl bg-surface-alt px-4 py-3">
                      <p className="text-[13px] font-extrabold text-content">
                        Closed {formatDate(dispute.resolved_at)}
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-content-secondary">
                        {dispute.resolution ??
                          'Our team recorded the outcome without a written note. Contact support if you need the detail.'}
                      </p>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
