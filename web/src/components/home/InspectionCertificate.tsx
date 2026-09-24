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
// One real inspection report, set as a document: the car's identity in the
// header, its score ring, then its own category scores.
//
// Everything on it belongs to one listing in stock: the bars are that car's
// earned points from GET /inspections/report/:id, and when no valid report is
// available the card falls back to the one number the listing itself carries
// (its score, drawn on the 0–150 scale with the publication bar) rather than
// inventing a breakdown.
//
// The photo is a thumbnail, not a banner. A seller's photograph can be any
// shape — a wide side profile, a tall phone shot — and a banner crops it into
// a door; a small frame shows whatever the listing has without making the
// report depend on it.
//
// The bars fill once, left to right: the page's one orchestrated motion.
// prefers-reduced-motion stops it (globals.css kill-switch).
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
    <article className="overflow-hidden rounded-3xl bg-surface shadow-float ring-1 ring-line">
      {/* Document header: a tinted band holding the car's identity and score. */}
      <div className="flex items-center gap-4 border-b border-line-soft bg-surface-alt/60 p-4 sm:p-5">
        {image ? (
          <Link
            href={`/cars/${car.id}`}
            className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-surface ring-1 ring-line-soft sm:h-[4.5rem] sm:w-28"
            tabIndex={-1}
            aria-hidden="true"
          >
            <Image src={image} alt="" fill sizes="112px" className={demo ? 'object-contain p-1' : 'object-cover'} />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-micro font-semibold text-content-muted">{t('home.front.cert.title')}</p>
          <h3 className="mt-0.5 line-clamp-2 text-body font-extrabold leading-snug text-content sm:text-title-sm">
            <Link href={`/cars/${car.id}`} className="hover:text-brand">
              {car.title}
            </Link>
          </h3>
          <p className="mt-0.5 text-caption text-content-secondary">
            {car.year} <span aria-hidden className="text-line">/</span> {formatKm(car.mileage)}
          </p>
        </div>
        <ScoreRing score={score} size={64} className="hidden sm:inline-grid" />
        <ScoreRing score={score} size={52} className="sm:hidden" />
      </div>

      <div className="p-4 sm:p-6">
        {report?.category_scores?.length ? (
          <ul className="space-y-2.5" aria-label={t('home.front.cert.title')}>
            {report.category_scores.map((cat, i) => (
              <li
                key={cat.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,14rem)_1fr_auto]"
              >
                <span className="min-w-0 text-caption font-semibold leading-snug text-content-secondary">
                  {t(`home.inspection.category.${cat.id}`)}
                </span>
                <span
                  className="order-3 col-span-2 h-1.5 overflow-hidden rounded-pill bg-surface-alt sm:order-none sm:col-span-1"
                  aria-hidden="true"
                >
                  <span
                    className={`block h-full origin-left animate-grow rounded-pill ${
                      cat.earned >= cat.max_points ? 'bg-content' : 'bg-brand'
                    }`}
                    style={{ width: `${(cat.earned / cat.max_points) * 100}%`, animationDelay: `${150 + i * 70}ms` }}
                  />
                </span>
                <span className="text-right text-caption font-bold tabular-nums text-content">
                  {cat.earned}
                  <span className="font-normal text-content-muted">/{cat.max_points}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div aria-hidden="true">
            <div className="relative h-1.5 rounded-pill bg-surface-alt">
              <span
                className="absolute inset-y-0 left-0 block origin-left animate-grow rounded-pill bg-brand"
                style={{ width: `${(score / SCORE_MAX) * 100}%`, animationDelay: '150ms' }}
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
