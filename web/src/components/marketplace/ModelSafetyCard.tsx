import type { ReactNode } from 'react'
import { Card, Icon } from '@/components/ui'
import { cars as carsApi } from '@/lib/api'
import { formatDate } from '@/lib/business'
import { getServerT } from '@/lib/i18n/server'
import type { ModelSafety } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// Recalls, owner complaints and crash ratings for this car's MODEL, from NHTSA
// (backend lib/model-safety.js). Never about this car: the footer says so, and
// nothing here is phrased as if it were.
//
// Renders nothing when NHTSA does not know the model (most Japan-market cars),
// is unreachable, or contradicts itself: "0 recalls" for a model nobody
// checked would read as a clean bill of health. Loaded on its own, inside a
// Suspense boundary, so a slow lookup never holds up the listing.
// ─────────────────────────────────────────────────────────────────────────────

const RECALLS_SHOWN = 4

/** NHTSA writes components in capitals ("ELECTRICAL SYSTEM:12V/24V/48V
 *  BATTERY"). Sentence case reads as information rather than alarm. */
function humanize(component: string): string {
  const text = component.toLowerCase().replace(/\s*:\s*/g, ' · ').replace(/\b(\d+)v\b/g, '$1V')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" size={14} className={i < value ? 'fill-current text-content' : 'text-line'} />
      ))}
    </span>
  )
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-alt px-4 py-3">
      <p className="text-micro font-bold text-content-muted">{label}</p>
      <p className="mt-1 text-title-sm font-extrabold tabular-nums text-content">{value}</p>
      {sub ? <p className="mt-0.5 text-micro text-content-muted">{sub}</p> : null}
    </div>
  )
}

export async function ModelSafetyCard({ carId }: { carId: string }) {
  const data: ModelSafety | null = await carsApi.modelSafety(carId).catch(() => null)
  if (!data || data.status !== 'covered') return null
  const recallsKnown = data.recalls_known !== false && data.recall_count != null
  const complaints = data.complaints ?? null
  const rating = data.rating ?? null
  if (!recallsKnown && !complaints && !rating) return null
  const t = await getServerT()
  const { vehicle } = data
  const recalls = data.recalls ?? []

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line-soft p-5 sm:p-6">
        <p className="text-caption font-bold text-content-muted">{t('cars.safety.eyebrow')}</p>
        <h2 className="mt-2 text-title font-extrabold text-content">
          {t('cars.safety.title', { year: vehicle.year, make: vehicle.make, model: vehicle.model })}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {recallsKnown ? (
            <Stat label={t('cars.safety.recalls')} value={data.recall_count ? data.recall_count : t('cars.safety.none')} />
          ) : null}
          {complaints ? (
            <Stat label={t('cars.safety.complaints')} value={complaints.total.toLocaleString('en-US')} />
          ) : null}
          {rating ? (
            <Stat
              label={t('cars.safety.rating')}
              value={rating.min === rating.max ? rating.max : `${rating.min}–${rating.max}`}
              sub={
                <span className="inline-flex items-center gap-1.5">
                  <Stars value={rating.max} />
                  <span className="sr-only">{t('cars.safety.ratingValue', { stars: rating.max })}</span>
                </span>
              }
            />
          ) : null}
        </div>
      </div>

      {recallsKnown && recalls.length ? (
        <section aria-labelledby="model-recalls" className="p-5 sm:p-6">
          <h3 id="model-recalls" className="text-body font-extrabold text-content">{t('cars.safety.recallsTitle')}</h3>
          <ul className="mt-3 divide-y divide-line-soft">
            {recalls.slice(0, RECALLS_SHOWN).map((recall) => (
              <li key={recall.campaign} className="py-3 first:pt-0 last:pb-0">
                <details className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-caption font-bold text-content">{humanize(recall.component)}</span>
                      <span className="block text-micro text-content-muted">
                        {recall.reported_on ? formatDate(recall.reported_on) : null}
                        {recall.reported_on ? ' · ' : null}
                        {recall.campaign}
                      </span>
                    </span>
                    <Icon name="chevron-down" size={16} className="mt-1 shrink-0 text-content-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 space-y-2 text-caption leading-relaxed text-content-secondary">
                    <p>{recall.summary}</p>
                    {recall.remedy ? (
                      <p>
                        <strong className="font-semibold text-content">{t('cars.safety.remedy')}:</strong> {recall.remedy}
                      </p>
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
          {recalls.length > RECALLS_SHOWN || (data.recall_count ?? 0) > recalls.length ? (
            <p className="mt-3 text-micro text-content-muted">
              {t('cars.safety.moreRecalls', { count: (data.recall_count ?? recalls.length) - RECALLS_SHOWN })}
            </p>
          ) : null}
        </section>
      ) : null}

      {complaints && complaints.top_components.length ? (
        <section aria-labelledby="model-complaints" className="border-t border-line-soft p-5 sm:p-6">
          <h3 id="model-complaints" className="text-body font-extrabold text-content">{t('cars.safety.complaintAreas')}</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {complaints.top_components.map((item) => (
              <li
                key={item.component}
                className="inline-flex items-center gap-2 rounded-pill bg-surface-alt px-3 py-1.5 text-micro font-semibold text-content-secondary"
              >
                <span>{humanize(item.component)}</span>
                <span className="tabular-nums text-content-muted">{item.count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="border-t border-line-soft bg-surface-alt/40 p-4 sm:p-5">
        <p className="flex gap-2 text-caption leading-relaxed text-content-muted">
          <Icon name="info" size={15} className="mt-0.5 shrink-0" />
          <span>
            {t('cars.safety.disclaimer')}
            {data.fetched_at ? <> {t('cars.safety.checked', { date: formatDate(data.fetched_at) })}.</> : null}
          </span>
        </p>
      </div>
    </Card>
  )
}

export default ModelSafetyCard
