import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PageHeader, PanelHeading } from '@/components/dashboard/PageHeader'
import { Pipeline, stageIndex } from '@/components/dashboard/Pipeline'
import { PriceEditor } from '@/components/dashboard/PriceEditor'
import { settled } from '@/components/dashboard/data'
import { Alert, Button, Card, EmptyState, Icon, StatusPill } from '@/components/ui'
import { sellerListings, submissions } from '@/lib/api'
import {
  CAR_STATUS_LABEL,
  SUBMISSION_STATUS_LABEL,
  formatDate,
  formatKm,
  formatRWF,
  formatUSD,
} from '@/lib/business'
import { getCurrentUser, getToken } from '@/lib/session'
import { SELLING_STEPS } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Selling',
  robots: { index: false, follow: false },
}

// ─────────────────────────────────────────────────────────────────────────────
// The seller side.
//
// Two different objects live here and they are easy to confuse: a *submission*
// is a car queued for inspection, a *listing* is the car after our team
// published it. A submission carries the pipeline; a listing carries the
// engagement numbers and the price control.
// ─────────────────────────────────────────────────────────────────────────────

export default async function SellingPage() {
  const user = await getCurrentUser()
  const token = await getToken()
  if (!user || !token) return null

  const verified = user.id_verified === 'approved'

  const [submissionResult, listingResult] = await Promise.allSettled([
    submissions.mine(token),
    sellerListings.mine(token),
  ])
  const mySubmissions = settled(submissionResult, [])
  const myListings = settled(listingResult, [])
  const failed = submissionResult.status === 'rejected' || listingResult.status === 'rejected'

  const live = myListings.filter((car) => car.status === 'live' || car.status === 'reserved')
  const closed = myListings.filter((car) => car.status === 'sold' || car.status === 'archived')

  return (
    <>
      <PageHeader
        title="Selling"
        description="Where each of your cars has reached. Only the Inzozi team publishes listings, and only after the 150-point inspection and the photo shoot — that is what makes every car on the marketplace real."
        action={
          verified ? (
            <Button href="/sell" size="sm">
              Submit a car
            </Button>
          ) : undefined
        }
      />

      {failed ? (
        <Alert tone="warning" title="Some of this page did not load" className="mb-6">
          Refresh to try again. Nothing on your account has changed.
        </Alert>
      ) : null}

      {!verified ? (
        <Card className="mb-8 p-6">
          <h2 className="text-title-sm font-extrabold text-content">
            Verify your identity to start selling
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-content-secondary">
            Sellers are verified before a car can enter the pipeline. It is a one-time check —
            a photo of your national ID and a selfie, captured in the Inzozi app — and it is the
            reason buyers trust what they see here. Nothing else on your account is affected.
          </p>

          <ol className="mt-5 space-y-4">
            {SELLING_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-caption font-extrabold text-content-secondary"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-content">{step.title}</p>
                  <p className="mt-0.5 text-caption leading-relaxed text-content-secondary">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button href="/download">Get the app to verify</Button>
            <Button href="/sell" variant="outline">
              How selling works
            </Button>
          </div>
        </Card>
      ) : null}

      {mySubmissions.length > 0 ? (
        <section aria-labelledby="pipeline">
          <PanelHeading
            id="pipeline"
            title="In the pipeline"
            hint={`${mySubmissions.length} ${mySubmissions.length === 1 ? 'car' : 'cars'}`}
          />
          <ul className="space-y-4">
            {mySubmissions.map((submission) => {
              const name =
                submission.car_title ||
                [submission.year, submission.make, submission.model].filter(Boolean).join(' ') ||
                'Submitted car'
              const rejected = submission.status === 'rejected'

              return (
                <li key={submission.id}>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-title-sm font-extrabold text-content">{name}</h3>
                        <p className="mt-1 text-caption text-content-muted">
                          Submitted {formatDate(submission.submitted_at)}
                          {submission.mileage ? ` · ${formatKm(submission.mileage)}` : ''}
                        </p>
                      </div>
                      <StatusPill
                        status={submission.status}
                        label={SUBMISSION_STATUS_LABEL[submission.status] ?? submission.status}
                      />
                    </div>

                    {submission.asking_price > 0 ? (
                      <p className="mt-3 text-caption text-content-secondary">
                        Asking{' '}
                        <span className="font-extrabold text-content">
                          {formatUSD(submission.asking_price)}
                        </span>{' '}
                        <span className="text-content-muted">
                          ({formatRWF(submission.asking_price)})
                        </span>
                      </p>
                    ) : null}

                    {rejected ? (
                      <Alert tone="warning" title="This submission needs your attention" className="mt-4">
                        {submission.admin_notes ??
                          'Our team could not accept this car as submitted. Contact us and we will explain what is needed.'}
                      </Alert>
                    ) : (
                      <div className="mt-5">
                        <Pipeline current={stageIndex(submission)} />
                      </div>
                    )}

                    {submission.inspection_center && submission.inspection_date ? (
                      <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-surface-alt px-4 py-3 text-caption text-content-secondary">
                        <Icon name="calendar" size={15} className="text-content-muted" />
                        Inspection at{' '}
                        <span className="font-bold text-content">
                          {submission.inspection_center}
                        </span>{' '}
                        on {submission.inspection_date}
                        {submission.inspection_time ? ` at ${submission.inspection_time}` : ''}. Bring
                        the car, your ID and any service records.
                      </p>
                    ) : null}

                    {submission.status === 'live' && submission.car_id ? (
                      <p className="mt-4">
                        <Link
                          href={`/cars/${submission.car_id}`}
                          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-brand hover:underline"
                        >
                          View the listing
                          <Icon name="arrow-right" size={15} />
                        </Link>
                      </p>
                    ) : null}
                  </Card>
                </li>
              )
            })}
          </ul>
        </section>
      ) : verified ? (
        <Card>
          <EmptyState
            icon="car"
            title="No cars in the pipeline"
            description="Tell us the make, model, mileage and what you want for it. We suggest a price range from real comparable sales, inspect the car at a center, photograph it, and publish the listing ourselves."
            action={<Button href="/sell">Submit a car</Button>}
          />
        </Card>
      ) : null}

      {live.length > 0 ? (
        <section className="mt-10" aria-labelledby="live-listings">
          <PanelHeading
            id="live-listings"
            title="Live listings"
            hint="Views and saves are counted in real time"
          />
          <ul className="space-y-4">
            {live.map((car) => (
              <li key={car.id}>
                <Card className="overflow-hidden">
                  <div className="sm:flex">
                    <div className="relative aspect-[4/3] bg-surface-alt sm:aspect-auto sm:w-48 sm:shrink-0">
                      {car.images?.[0] ? (
                        <Image
                          src={car.images[0]}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, 192px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="text-title-sm font-extrabold text-content">
                          <Link href={`/cars/${car.id}`} className="hover:text-brand">
                            {car.title}
                          </Link>
                        </h3>
                        <StatusPill
                          status={car.status}
                          label={CAR_STATUS_LABEL[car.status] ?? car.status}
                        />
                      </div>

                      <p className="mt-2">
                        <span className="text-[21px] font-extrabold tracking-[-0.02em] text-brand">
                          {formatUSD(car.price)}
                        </span>
                        <span className="ml-2 text-caption text-content-muted">
                          {formatRWF(car.price)}
                        </span>
                      </p>

                      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-line-soft pt-4">
                        <div>
                          <dt className="text-micro font-bold uppercase tracking-wide text-content-muted">
                            Views
                          </dt>
                          <dd className="text-title-sm font-extrabold text-content">{car.views}</dd>
                        </div>
                        <div>
                          <dt className="text-micro font-bold uppercase tracking-wide text-content-muted">
                            Saves
                          </dt>
                          <dd className="text-title-sm font-extrabold text-content">
                            {car.saves_count ?? car.saves ?? 0}
                          </dd>
                        </div>
                        {car.listed_at ? (
                          <div>
                            <dt className="text-micro font-bold uppercase tracking-wide text-content-muted">
                              Listed
                            </dt>
                            <dd className="text-title-sm font-extrabold text-content">
                              {formatDate(car.listed_at)}
                            </dd>
                          </div>
                        ) : null}
                      </dl>

                      <div className="mt-4">
                        {car.status === 'live' ? (
                          <PriceEditor
                            carId={car.id}
                            currentPrice={car.price}
                            title={car.title}
                          />
                        ) : (
                          <p className="text-caption leading-relaxed text-content-secondary">
                            A buyer has reserved this car, so the price is locked while we arrange
                            the handover. If the request is cancelled it goes back on sale
                            automatically.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {closed.length > 0 ? (
        <section className="mt-10" aria-labelledby="closed-listings">
          <PanelHeading id="closed-listings" title="Closed listings" />
          <Card className="p-2">
            <ul>
              {closed.map((car) => (
                <li key={car.id} className="hairline">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-content">{car.title}</p>
                      <p className="text-caption text-content-muted">
                        {formatUSD(car.price)}
                        {car.sold_at ? ` · sold ${formatDate(car.sold_at)}` : ''}
                      </p>
                    </div>
                    <StatusPill
                      status={car.status}
                      label={CAR_STATUS_LABEL[car.status] ?? car.status}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </>
  )
}
