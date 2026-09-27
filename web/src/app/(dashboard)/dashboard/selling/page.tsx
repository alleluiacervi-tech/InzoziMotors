import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PageHeader, PanelHeading } from '@/components/dashboard/PageHeader'
import { NextStep } from '@/components/dashboard/NextStep'
import { Pipeline, stageIndex } from '@/components/dashboard/Pipeline'
import { PriceEditor } from '@/components/dashboard/PriceEditor'
import { ListingStatusControls } from '@/components/market/ListingStatusControls'
import { settled } from '@/components/dashboard/data'
import { Alert, Button, Card, EmptyState, Icon, StatusPill } from '@/components/ui'
import { sellerListings, submissions } from '@/lib/api'
import { CAR_STATUS_LABEL, SUBMISSION_STATUS_LABEL, formatDate, formatKm, formatMoney } from '@/lib/business'
import { getCurrentUser, getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import { SELLING_STEPS } from '@/lib/site'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('dashboard.meta.selling'),
    robots: { index: false, follow: false },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The seller side.
//
// Two different objects live here and they are easy to confuse: a *submission*
// is a car queued for inspection, a *listing* is the car after our team
// published it. A submission carries the pipeline; a listing carries the
// engagement numbers and the price control.
// ─────────────────────────────────────────────────────────────────────────────

// Submissions the seller may still book or rebook a slot for — the statuses
// PATCH /submissions/:id/schedule accepts.
const BOOKABLE = new Set(['under_review', 'approved', 'scheduled'])

export default async function SellingPage({ searchParams }: { searchParams: Promise<{ booked?: string }> }) {
  const t = await getServerT()
  const user = await getCurrentUser()
  const token = await getToken()
  const { booked } = await searchParams
  if (!user || !token) return null

  const verified = user.id_verified === 'approved'

  const [submissionResult, listingResult, progressResult] = await Promise.allSettled([
    submissions.mine(token),
    sellerListings.mine(token),
    submissions.progress(token),
  ])
  const mySubmissions = settled(submissionResult, [])
  const myListings = settled(listingResult, [])
  // Progress is additive: if it fails the cards still render, minus one line.
  const progress = settled(progressResult, {})
  const failed = submissionResult.status === 'rejected' || listingResult.status === 'rejected'

  // Live and paused are both the seller's to manage; paused cars used to be
  // on no list at all (F15 in docs/WEB-PARITY-PLAN.md).
  const active = myListings.filter((car) => car.status === 'live' || car.status === 'paused')
  const closed = myListings.filter((car) => car.status === 'sold' || car.status === 'archived')

  return (
    <>
      <PageHeader
        title={t('dashboard.selling.title')}
        description={t('dashboard.selling.description')}
        action={<Button href="/sell/submit" size="sm">{t('onboarding.selling.submitCar')}</Button>}
      />

      {booked ? (
        <Alert tone="success" title={t('onboarding.selling.bookedTitle')} className="mb-6">
          {t('onboarding.selling.bookedBody')}
        </Alert>
      ) : null}

      {failed ? (
        <Alert tone="warning" title={t('dashboard.common.someFailedTitle')} className="mb-6">
          {t('dashboard.common.someFailedBody')}
        </Alert>
      ) : null}

      {!verified ? (
        <Card className="mb-8 p-6">
          <h2 className="text-title-sm font-extrabold text-content">
            {t('dashboard.selling.verifyTitle')}
          </h2>
          <p className="mt-2 max-w-prose text-caption leading-relaxed text-content-secondary">
            {t('dashboard.selling.verifyBody')}
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
                  <p className="text-caption font-extrabold text-content">{step.title}</p>
                  <p className="mt-0.5 text-caption leading-relaxed text-content-secondary">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button href="/dashboard/verify">
              {t(user.id_verified === 'pending' ? 'onboarding.selling.checkVerification' : 'onboarding.selling.verifyNow')}
            </Button>
            <Button href="/sell" variant="outline">
              {t('dashboard.selling.howSellingWorks')}
            </Button>
          </div>
        </Card>
      ) : null}

      {mySubmissions.length > 0 ? (
        <section aria-labelledby="pipeline">
          <PanelHeading
            id="pipeline"
            title={t('dashboard.selling.pipelineHeading')}
            hint={t(mySubmissions.length === 1 ? 'dashboard.selling.carCountOne' : 'dashboard.selling.carCountOther', { count: mySubmissions.length })}
          />
          <ul className="space-y-4">
            {mySubmissions.map((submission) => {
              const name =
                submission.car_title ||
                [submission.year, submission.make, submission.model].filter(Boolean).join(' ') ||
                t('dashboard.selling.submittedFallback')
              const rejected = submission.status === 'rejected'

              return (
                <li key={submission.id}>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-title-sm font-extrabold text-content">{name}</h3>
                        <p className="mt-1 text-caption text-content-muted">
                          {t('dashboard.selling.submitted', { date: formatDate(submission.submitted_at) })}
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
                        {t('dashboard.selling.asking')}{' '}
                        <span className="font-extrabold text-content">
                          { formatMoney(submission.asking_price) }
                        </span>
                      </p>
                    ) : null}

                    {rejected ? (
                      <Alert tone="warning" title={t('dashboard.selling.rejectedTitle')} className="mt-4">
                        {submission.admin_notes ??
                          t('dashboard.selling.rejectedFallback')}
                      </Alert>
                    ) : (
                      <div className="mt-5">
                        <Pipeline current={stageIndex(submission)} />
                        {/* How far, then what now. */}
                        <NextStep progress={progress[submission.id]} />
                      </div>
                    )}

                    {submission.inspection_center && submission.inspection_date ? (
                      <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-surface-alt px-4 py-3 text-caption text-content-secondary">
                        <Icon name="calendar" size={15} className="text-content-muted" />
                        {t('dashboard.selling.inspectionLine', {
                          center: submission.inspection_center,
                          date: submission.inspection_date,
                          time: submission.inspection_time ? t('dashboard.selling.inspectionTime', { time: submission.inspection_time }) : '',
                        })}
                      </p>
                    ) : null}

                    {BOOKABLE.has(submission.status) ? (
                      <p className="mt-4">
                        <Link
                          href={`/dashboard/selling/${submission.id}/schedule`}
                          className="inline-flex min-h-[44px] items-center gap-1.5 text-caption font-bold text-brand hover:underline"
                        >
                          <Icon name="calendar" size={15} />
                          {t(submission.inspection_date ? 'onboarding.selling.changeSlot' : 'onboarding.selling.bookInspection')}
                        </Link>
                      </p>
                    ) : null}

                    {submission.status === 'live' && submission.car_id ? (
                      <p className="mt-4">
                        <Link
                          href={`/cars/${submission.car_id}`}
                          className="inline-flex min-h-[44px] items-center gap-1.5 text-caption font-bold text-brand hover:underline"
                        >
                          {t('dashboard.selling.viewListing')}
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
            title={t('dashboard.selling.pipelineEmptyTitle')}
            description={t('dashboard.selling.pipelineEmptyBody')}
            action={<Button href="/sell/submit">{t('dashboard.selling.submitCar')}</Button>}
          />
        </Card>
      ) : null}

      {active.length > 0 ? (
        <section className="mt-10" aria-labelledby="live-listings">
          <PanelHeading
            id="live-listings"
            title={t('market.listing.heading')}
            hint={t('market.listing.hint')}
          />
          <ul className="space-y-4">
            {active.map((car) => {
              const daysLive = car.listed_at
                ? Math.max(0, Math.floor((Date.now() - new Date(car.listed_at).getTime()) / 86_400_000))
                : null
              const metrics = [
                { label: t('market.listing.views'), value: car.views ?? 0 },
                { label: t('market.listing.saves'), value: car.saves_count ?? car.saves ?? 0 },
                { label: t('market.listing.enquiries'), value: car.inquiries_count ?? 0 },
                { label: t('market.listing.contacts'), value: car.contacts_count ?? 0 },
                ...(daysLive !== null ? [{ label: t('market.listing.daysLive'), value: daysLive }] : []),
              ]
              return (
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
                            {car.status === 'live' ? (
                              <Link href={`/cars/${car.id}`} className="hover:text-brand">
                                {car.title}
                              </Link>
                            ) : (
                              car.title
                            )}
                          </h3>
                          <StatusPill
                            status={car.status}
                            label={CAR_STATUS_LABEL[car.status] ?? car.status}
                          />
                        </div>

                        <p className="mt-2">
                          <span className="text-price font-extrabold tracking-[-0.02em] text-brand">
                            {formatMoney(car.price)}
                          </span>
                        </p>

                        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-line-soft pt-4">
                          {metrics.map((metric) => (
                            <div key={metric.label}>
                              <dt className="text-micro font-bold text-content-muted">{metric.label}</dt>
                              <dd className="tnum text-title-sm font-extrabold text-content">{metric.value}</dd>
                            </div>
                          ))}
                        </dl>
                        <p className="mt-2 text-micro text-content-muted">{t('market.listing.allTime')}</p>

                        <div className="mt-4">
                          {car.status === 'live' ? (
                            <PriceEditor carId={car.id} currentPrice={car.price} title={car.title} />
                          ) : (
                            <p className="text-caption leading-relaxed text-content-secondary">
                              {t('market.listing.pausedNote')}
                            </p>
                          )}
                        </div>

                        <ListingStatusControls carId={car.id} status={car.status === 'live' ? 'live' : 'paused'} />
                      </div>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {closed.length > 0 ? (
        <section className="mt-10" aria-labelledby="closed-listings">
          <PanelHeading id="closed-listings" title={t('market.listing.closedHeading')} />
          <Card className="p-2">
            <ul>
              {closed.map((car) => (
                <li key={car.id} className="hairline">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-caption font-bold text-content">{car.title}</p>
                      <p className="text-caption text-content-muted">
                        {formatMoney(car.price)}
                        {car.sold_at ? ` · ${t('market.listing.soldOn', { date: formatDate(car.sold_at) })}` : ''}
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
