import { Icon } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'
import { formatDay } from '@/lib/rental-dates'
import type { RentalCar } from '@/lib/types'

// What a renter is told about a rental car beyond its photos and price: the
// Sawa Rental Check (what Sawa itself saw, and when) and the provider's own
// calendar (what the provider says, and how recently). Each is attributed to
// whoever said it. Nothing here says "available", "booked" or "guaranteed":
// Sawa is not a party to the rental (CLAUDE.md).

export async function RentalCheckCard({ car }: { car: RentalCar }) {
  const check = car.rental_check?.kind === 'rental_check' ? car.rental_check : null
  if (!check) return null
  const t = await getServerT()
  return (
    <section aria-labelledby="rental-check-heading" className="rounded-3xl border border-line-soft bg-surface p-5 shadow-card sm:p-7">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success-tint text-success">
          <Icon name="shield-check" size={20} />
        </span>
        <div className="min-w-0">
          <h2 id="rental-check-heading" className="text-title font-extrabold text-content">{t('rentals.check.title')}</h2>
          <p className="mt-1 text-body leading-relaxed text-content-secondary">
            {t('rentals.check.summary', { date: formatDay(check.checked_on), passed: check.passed_count, total: check.total })}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface-alt px-4 py-3">
          <dt className="text-micro font-bold text-content-muted">{t('rentals.check.documents')}</dt>
          <dd className="mt-1 text-caption font-semibold text-content">{t('rentals.check.insurance', { date: formatDay(check.insurance_valid_until) })}</dd>
          <dd className="text-caption font-semibold text-content">{t('rentals.check.technical', { date: formatDay(check.technical_control_valid_until) })}</dd>
        </div>
        <div className="rounded-2xl bg-surface-alt px-4 py-3">
          <dt className="text-micro font-bold text-content-muted">{t('rentals.check.coversTitle')}</dt>
          <dd className="mt-1 text-caption leading-relaxed text-content-secondary">{t('rentals.check.covers')}</dd>
        </div>
      </dl>

      {check.disclosures.length ? (
        <div className="mt-4">
          <p className="text-caption font-bold text-content">{t('rentals.check.disclosuresTitle')}</p>
          <ul className="mt-1.5 space-y-1">
            {check.disclosures.map((item) => (
              <li key={item.id} className="flex gap-2 text-caption text-content-secondary">
                <Icon name="info" size={15} className="mt-0.5 shrink-0 text-content-muted" />
                <span>{item.label}{item.note ? `: ${item.note}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 text-micro leading-relaxed text-content-muted">{t('rentals.check.note')}</p>
    </section>
  )
}

export async function RentalCalendarCard({ car }: { car: RentalCar }) {
  const t = await getServerT()
  const availability = car.availability
  const busy = availability?.busy ?? []
  const fresh = availability && (availability.freshness === 'fresh' || availability.freshness === 'aging')
  return (
    <section aria-labelledby="availability-heading" className="rounded-3xl border border-line-soft bg-surface p-5 shadow-card sm:p-7">
      <h2 id="availability-heading" className="text-title font-extrabold text-content">{t('rentals.calendar.title')}</h2>

      {availability?.out_now && availability.back_on ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-surface-alt px-3 py-1.5 text-caption font-bold text-content">
          <Icon name="clock" size={15} />
          {t('rentals.calendar.outNow', { date: formatDay(availability.back_on) })}
        </p>
      ) : null}

      {availability?.freshness === 'never' ? (
        <p className="mt-3 text-body leading-relaxed text-content-secondary">{t('rentals.calendar.never')}</p>
      ) : (
        <>
          {busy.length ? (
            <>
              <p className="mt-4 text-caption font-bold text-content">{t('rentals.calendar.takenList')}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {busy.map((range) => (
                  <li key={range.from} className="rounded-xl border border-line-soft px-3 py-1.5 text-caption font-semibold text-content">
                    {range.from === range.to
                      ? formatDay(range.from)
                      : t('rentals.calendar.range', { from: formatDay(range.from), to: formatDay(range.to) })}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-body text-content-secondary">{t('rentals.calendar.none')}</p>
          )}
          {availability?.updated_at ? (
            <p className="mt-3 text-micro text-content-muted">
              {fresh
                ? t('rentals.calendar.updated', { date: formatDay(availability.updated_at.slice(0, 10)) })
                : t('rentals.calendar.stale')}
            </p>
          ) : null}
        </>
      )}

      <p className="mt-3 text-micro leading-relaxed text-content-muted">{t('rentals.calendar.footnote')}</p>
      <p className="mt-2 text-micro leading-relaxed text-content-muted">{t('rentals.detail.availabilityBody')}</p>
    </section>
  )
}
