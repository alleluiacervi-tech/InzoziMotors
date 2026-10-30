import Image from '@/components/ui/SafeImage'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import { Price } from '@/components/Price'
import { formatKm, isDemoListing } from '@/lib/business'
import { CRITICAL_ITEMS, PASS_THRESHOLD, SCORE_MAX } from '@/lib/inspection-policy'
import { getLocale, getServerT } from '@/lib/i18n/server'
import type { Car, InspectionReport } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// The hero's evidence: one real car from stock and its real inspection
// result. Every marketplace opens on a clean car; this one opens on a car AND
// the score a buyer reads before calling its seller — which is the whole
// product, shown instead of described.
//
// Three honest states:
//   report   the score, the ring, "N of 150 checks passed" and critical status.
//   car only the report did not load → the score alone (never a made-up
//            per-category result).
//   nothing  an empty yard or an unreachable API → the standard's three numbers.
// The 150-tick ruler is drawn only at full width (home/Standard.tsx).
// ─────────────────────────────────────────────────────────────────────────────

export async function Specimen({ car, report }: { car: Car | null; report: InspectionReport | null }) {
  const t = await getServerT()
  const locale = await getLocale()


  if (!car) {
    return (
      <article className="overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-alt">
          <Image
            src="/img/inspector-wheel-arch.jpg"
            alt={t('home.land.photoInspectorAlt')}
            fill
            priority
            sizes="(min-width: 1024px) 520px, 100vw"
            className="object-cover"
          />
        </div>
        <div className="p-5 sm:p-7">
          <p className="text-caption font-bold text-content-muted">{t('home.inspection.eyebrow')}</p>
          <p className="mt-2 text-title font-extrabold text-content">{t('home.land.standardTitle')}</p>
          {/* No car to show: the standard as its three numbers. The ruler is
              drawn only at full width (the homepage band), never squeezed. */}
          <dl className="mt-8 grid grid-cols-3 gap-4">
            {[
              { figure: SCORE_MAX, key: 'statItems' },
              { figure: PASS_THRESHOLD, key: 'statPass' },
              { figure: CRITICAL_ITEMS, key: 'statCritical' },
            ].map((s) => (
              <div key={s.key} className="min-w-0 border-t border-line pt-3">
                <dt className="sr-only">{t(`home.land.${s.key}`)}</dt>
                <dd>
                  <span className="tnum block text-headline font-black leading-none text-content">{s.figure}</span>
                  <span className="mt-1.5 block text-micro leading-snug text-content-muted">{t(`home.land.${s.key}`)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </article>
    )
  }

  const categories = report?.category_scores ?? []
  const hasResult = categories.length > 0
  const earned = categories.reduce((n, c) => n + c.earned, 0)
  const total = categories.reduce((n, c) => n + c.max_points, 0) || SCORE_MAX
  const score = report?.score ?? car.inspection_score ?? null
  const criticalFailures = report?.critical_failures?.length ?? 0
  const image = car.images?.[0]
  const demo = isDemoListing(car)
  const inspected = report?.completed_at
    ? new Date(report.completed_at).toLocaleDateString(locale, {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Kigali',
      })
    : null

  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <Link
        href={`/cars/${car.id}`}
        tabIndex={-1}
        aria-hidden="true"
        className="group relative block aspect-[16/10] overflow-hidden bg-surface-alt sm:aspect-[3/2]"
      >
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 560px, 100vw"
            className={`${demo ? 'object-contain p-4' : 'object-cover'} transition-transform duration-700 ease-brand group-hover:scale-[1.02]`}
          />
        ) : null}
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-pill bg-surface/95 px-3 py-1.5 text-micro font-bold text-content shadow-card backdrop-blur-sm">
          <Icon name="shield-check" size={13} aria-hidden="true" />
          {t('home.front.cert.best')}
        </span>
      </Link>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-micro font-semibold text-content-muted">
              {t('home.front.cert.title')}
            </p>
            <h2 className="mt-1 line-clamp-2 text-title-sm font-extrabold text-content">
              <Link href={`/cars/${car.id}`} className="hover:text-brand">
                {car.title}
              </Link>
            </h2>
            <p className="mt-0.5 text-caption text-content-secondary">
              {car.year} <span aria-hidden className="text-line">/</span> {formatKm(car.mileage)}
              {inspected ? (
                <>
                  {' '}<span aria-hidden className="text-line">/</span> {t('home.front.cert.inspected', { date: inspected })}
                </>
              ) : null}
            </p>
          </div>
          {score != null ? (
            <p className="shrink-0 text-right leading-none" aria-label={`${score} / ${SCORE_MAX}`}>
              <span className="tnum text-display font-black text-content">{score}</span>
              <span className="tnum text-title font-bold text-content-muted">/{SCORE_MAX}</span>
            </p>
          ) : null}
        </div>

        {/* No 150-tick ruler here: at card width the ticks merged into a
            barcode. The large score above carries it; the ruler is drawn only
            at full width (home/Standard.tsx). */}
        {hasResult ? (
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption font-semibold">
            <span className="tnum text-content">{t('home.land.checks', { earned, total })}</span>
            {criticalFailures === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-success-text">
                <Icon name="shield-check" size={14} aria-hidden="true" />
                {t('home.front.cert.noCritical')}
              </span>
            ) : null}
          </p>
        ) : null}

        <div className="mt-5 flex items-end justify-between gap-4 border-t border-line-soft pt-4">
          <Price amountRwf={car.price} />
          <Link
            href={`/cars/${car.id}`}
            className="group -my-2 inline-flex shrink-0 items-center gap-1.5 py-2 text-caption font-bold text-content"
          >
            {t('home.front.cert.view')}
            <Icon
              name="arrow-right"
              size={15}
              aria-hidden="true"
              className="transition-transform duration-300 ease-brand group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </article>
  )
}

export default Specimen
