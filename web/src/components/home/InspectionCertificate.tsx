import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import { ScoreRing } from '@/components/brand/ScoreRing'
import { Price } from '@/components/Price'
import { formatKm, isDemoListing } from '@/lib/business'
import { PASS_THRESHOLD, SCORE_MAX } from '@/lib/inspection-policy'
import { getServerT } from '@/lib/i18n/server'
import type { Car, InspectionReport } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// THE HERO'S ONE BOLD THING: a real inspection certificate, for a real car in
// stock right now.
//
// Every marketplace in this market opens on a clean car. A car is what they
// sell; evidence is what Sawa sells, so the front page shows the evidence —
// the best-scoring listing's own report, category by category, with its
// critical-failure count. Nothing here is illustrative: the bars are that
// car's earned points from GET /inspections/report/:id, and when a report is
// unavailable the card falls back to the one number the listing itself
// carries (its score) rather than inventing a breakdown.
//
// The bars fill once, left to right, on load — the page's single orchestrated
// motion. prefers-reduced-motion stops it (globals.css kill-switch).
// ─────────────────────────────────────────────────────────────────────────────

export async function InspectionCertificate({
  car,
  report,
}: {
  car: Car
  report: InspectionReport | null
}) {
  const t = await getServerT()
  const score = report?.score ?? car.inspection_score ?? 0
  const image = car.images?.[0]
  const demo = isDemoListing(car)
  const inspected = report?.completed_at
    ? new Date(report.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <article className="relative overflow-hidden rounded-3xl bg-surface shadow-float ring-1 ring-line">
      <Link href={`/cars/${car.id}`} className="group block" aria-label={`${car.title} — ${t('home.front.cert.view')}`}>
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-alt">
          {image ? (
            <Image
              src={image}
              alt={t(demo ? 'cars.card.altPreview' : 'cars.card.altReal', { title: car.title })}
              fill
              priority
              sizes="(min-width: 1024px) 520px, 100vw"
              className={`${demo ? 'object-contain p-3' : 'object-cover'} transition-transform duration-700 ease-brand group-hover:scale-[1.03]`}
            />
          ) : null}
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-pill bg-surface/95 px-3 py-1.5 text-micro font-bold text-content shadow-card backdrop-blur-sm">
            <Icon name="shield-check" size={13} className="text-brand" aria-hidden="true" />
            {t('home.front.cert.best')}
          </span>
        </div>
      </Link>

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <ScoreRing score={score} size={72} />
          <div className="min-w-0 flex-1">
            <p className="text-micro font-semibold text-content-muted">{t('home.front.cert.title')}</p>
            <h2 className="mt-0.5 line-clamp-2 text-title-sm font-extrabold text-content">
              <Link href={`/cars/${car.id}`} className="hover:text-brand">
                {car.title}
              </Link>
            </h2>
            <p className="mt-1 text-caption text-content-secondary">
              {car.year} <span aria-hidden className="text-line">/</span> {formatKm(car.mileage)}
            </p>
          </div>
        </div>

        {report?.category_scores?.length ? (
          <ul className="mt-5 space-y-2" aria-label={t('home.front.cert.title')}>
            {report.category_scores.map((cat, i) => (
              <li key={cat.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,12.5rem)_1fr_auto]">
                <span className="truncate text-micro font-semibold text-content-secondary">
                  {t(`home.inspection.category.${cat.id}`)}
                </span>
                <span className="order-3 col-span-2 h-1.5 overflow-hidden rounded-pill bg-surface-alt sm:order-none sm:col-span-1" aria-hidden="true">
                  <span
                    className={`block h-full origin-left animate-grow rounded-pill ${
                      cat.earned >= cat.max_points ? 'bg-content' : 'bg-brand'
                    }`}
                    style={{
                      width: `${(cat.earned / cat.max_points) * 100}%`,
                      animationDelay: `${250 + i * 70}ms`,
                    }}
                  />
                </span>
                <span className="text-right text-micro font-bold tabular-nums text-content">
                  {cat.earned}
                  <span className="font-normal text-content-muted">/{cat.max_points}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          // No per-category report to show: draw the car's score on the
          // 0–150 scale with the publication bar marked, which is true from
          // the listing alone.
          <div className="mt-5" aria-hidden="true">
            <div className="relative h-1.5 rounded-pill bg-surface-alt">
              <span
                className="absolute inset-y-0 left-0 block origin-left animate-grow rounded-pill bg-brand"
                style={{ width: `${(score / SCORE_MAX) * 100}%`, animationDelay: '250ms' }}
              />
              <span
                className="absolute -top-1 h-3.5 w-0.5 rounded bg-content"
                style={{ left: `${(PASS_THRESHOLD / SCORE_MAX) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-micro text-content-muted">
              {t('home.front.cert.bar', { threshold: PASS_THRESHOLD })}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-soft pt-4 text-micro font-semibold">
          {/* Only claimed when the report itself says so. */}
          {report && (report.critical_failures?.length ?? 0) === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-success-text">
              <Icon name="shield-check" size={14} aria-hidden="true" />
              {t('home.front.cert.noCritical')}
            </span>
          ) : null}
          {inspected ? (
            <span className="text-content-muted">{t('home.front.cert.inspected', { date: inspected })}</span>
          ) : null}
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <Price amountRwf={car.price} />
          <Link
            href={`/cars/${car.id}`}
            className="-my-2 inline-flex shrink-0 items-center gap-1.5 py-2 text-caption font-bold text-content hover:text-brand"
          >
            {t('home.front.cert.view')}
            <Icon name="arrow-right" size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export default InspectionCertificate
