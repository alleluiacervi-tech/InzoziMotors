'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  backTodayAction, confirmCalendarAction, markTakenAction, removePeriodAction, requestCheckAction,
} from '@/app/(dashboard)/dashboard/rentals/fleet/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Alert, Badge, Field, Icon, Input, LiveRegion } from '@/components/ui'
import { postUpload, prepareForUpload } from '@/lib/image-prep'
import { useT } from '@/lib/i18n/context'
import { addDays, formatDay, kigaliToday } from '@/lib/rental-dates'
import type { RentalCar, RentalCheckStatus } from '@/lib/types'

// The two things a rental provider keeps up to date per car, besides rates:
// its Sawa Rental Check (backend lib/rental-check-policy.js) and the days it is
// out (lib/rental-calendar.js). Both read what the server derived — status,
// merged periods, freshness — so web, app and admin show the same answer.

const CHECK_TONE: Record<RentalCheckStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  passed: 'success',
  expiring: 'warning',
  legacy: 'neutral',
  requested: 'info',
  none: 'danger',
  failed: 'danger',
  expired: 'danger',
}

/** Statuses where asking for a (new) check is the provider's next move. */
const CAN_REQUEST: RentalCheckStatus[] = ['none', 'failed', 'expired', 'expiring', 'legacy']

export function RentalCheckPanel({ car }: { car: RentalCar }) {
  const t = useT()
  const [state, action] = useActionState(requestCheckAction, null)
  const status = car.check_status ?? 'none'
  const check = car.rental_check?.kind === 'rental_check' ? car.rental_check : null

  return (
    <section aria-label={t('dashboard.rentalFleet.check.title')} className="mt-4 rounded-xl border border-line-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-caption font-extrabold text-content">{t('dashboard.rentalFleet.check.title')}</h3>
        <Badge tone={CHECK_TONE[status]}>{t(`dashboard.rentalFleet.check.status.${status}`)}</Badge>
      </div>

      {check ? (
        <p className="mt-2 text-micro leading-relaxed text-content-secondary">
          {t('dashboard.rentalFleet.check.detail', {
            passed: check.passed_count,
            total: check.total,
            date: formatDay(check.checked_on),
            insurance: formatDay(check.insurance_valid_until),
            technical: formatDay(check.technical_control_valid_until),
          })}
        </p>
      ) : null}

      {check?.failed?.length ? (
        <div className="mt-2">
          <p className="text-micro font-bold text-content">
            {t(check.passed ? 'dashboard.rentalFleet.check.noted' : 'dashboard.rentalFleet.check.fix')}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-micro text-content-secondary">
            {check.failed.map((item) => (
              <li key={item.id}>{item.label}{item.note ? `: ${item.note}` : ''}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {status === 'none' || status === 'requested' ? (
        <p className="mt-2 text-micro leading-relaxed text-content-muted">{t('dashboard.rentalFleet.check.explain')}</p>
      ) : null}

      {CAN_REQUEST.includes(status) && car.status !== 'retired' ? (
        <form action={action} className="mt-3">
          <input type="hidden" name="id" value={car.id} />
          <SubmitButton size="sm" variant="outline" pendingLabel="…">{t('dashboard.rentalFleet.check.request')}</SubmitButton>
        </form>
      ) : null}
      {state?.error ? <Alert tone="danger" className="mt-3">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success" className="mt-3">{state.message}</Alert> : null}
      <LiveRegion>{state?.error || (state?.ok ? state.message : '')}</LiveRegion>
    </section>
  )
}

export function RentalCalendarPanel({ car, periods }: {
  car: RentalCar
  periods: { id: string; starts_on: string; ends_on: string }[]
}) {
  const t = useT()
  const [addState, addAction] = useActionState(markTakenAction, null)
  const [rowState, rowAction] = useActionState(removePeriodAction, null)
  const [backState, backAction] = useActionState(backTodayAction, null)
  const [confirmState, confirmAction] = useActionState(confirmCalendarAction, null)
  const today = kigaliToday()
  const yesterday = addDays(today, -1)
  const availability = car.availability
  const lastState = [addState, rowState, backState, confirmState].find((s) => s?.error || s?.ok) ?? null
  const stale = availability && (availability.freshness === 'stale' || availability.freshness === 'aging')

  return (
    <section aria-label={t('dashboard.rentalFleet.calendar.title')} className="mt-4 rounded-xl border border-line-soft p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-caption font-extrabold text-content">{t('dashboard.rentalFleet.calendar.title')}</h3>
        <p className="text-micro text-content-muted">
          {availability?.updated_at
            ? t('dashboard.rentalFleet.calendar.updated', { date: formatDay(availability.updated_at.slice(0, 10)) })
            : t('dashboard.rentalFleet.calendar.neverUpdated')}
        </p>
      </div>
      <p className="mt-1 text-micro leading-relaxed text-content-muted">{t('dashboard.rentalFleet.calendar.hint')}</p>

      {stale && periods.length ? (
        <Alert tone="warning" className="mt-3">{t('dashboard.rentalFleet.calendar.stale')}</Alert>
      ) : null}

      {periods.length ? (
        <ul className="mt-3 divide-y divide-line-soft rounded-lg border border-line-soft">
          {periods.map((period) => {
            const outNow = period.starts_on <= today && period.ends_on >= today
            return (
              <li key={period.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="text-caption font-semibold text-content">
                  {t('dashboard.rentalFleet.calendar.range', { from: formatDay(period.starts_on), to: formatDay(period.ends_on) })}
                </span>
                <span className="flex gap-1.5">
                  {outNow ? (
                    <form action={backAction}>
                      <input type="hidden" name="id" value={car.id} />
                      <input type="hidden" name="period_id" value={period.id} />
                      <input type="hidden" name="yesterday" value={yesterday} />
                      <button className="min-h-[40px] rounded-lg border border-line px-3 text-micro font-bold text-content hover:bg-surface-alt">
                        {t('dashboard.rentalFleet.calendar.backToday')}
                      </button>
                    </form>
                  ) : null}
                  <form action={rowAction}>
                    <input type="hidden" name="id" value={car.id} />
                    <input type="hidden" name="period_id" value={period.id} />
                    <button className="min-h-[40px] rounded-lg px-3 text-micro font-bold text-content-muted hover:bg-surface-alt hover:text-content">
                      {t('dashboard.rentalFleet.calendar.remove')}
                    </button>
                  </form>
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-3 text-micro text-content-muted">{t('dashboard.rentalFleet.calendar.empty')}</p>
      )}

      <form action={addAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="id" value={car.id} />
        <Field label={t('dashboard.rentalFleet.calendar.from')} htmlFor={`busy-from-${car.id}`}>
          <Input id={`busy-from-${car.id}`} name="starts_on" type="date" min={today} defaultValue={today} required />
        </Field>
        <Field label={t('dashboard.rentalFleet.calendar.to')} htmlFor={`busy-to-${car.id}`}>
          <Input id={`busy-to-${car.id}`} name="ends_on" type="date" min={today} required />
        </Field>
        <SubmitButton size="sm" pendingLabel="…">{t('dashboard.rentalFleet.calendar.add')}</SubmitButton>
      </form>

      <form action={confirmAction} className="mt-2">
        <input type="hidden" name="id" value={car.id} />
        <button className="min-h-[40px] text-micro font-bold text-content-secondary underline-offset-2 hover:text-content hover:underline">
          {t('dashboard.rentalFleet.calendar.upToDate')}
        </button>
      </form>

      {lastState?.error ? <Alert tone="danger" className="mt-3">{lastState.error}</Alert> : null}
      <LiveRegion>{lastState?.error || (lastState?.ok ? lastState.message : '')}</LiveRegion>
    </section>
  )
}

const PHOTO_LIMIT = 10 * 1024 * 1024

/** Listing photos for one car: the gallery, and an upload straight from the
 *  phone or computer (through /api/upload/rental, which holds the session). */
export function RentalPhotosPanel({ car }: { car: RentalCar }) {
  const t = useT()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const images = car.images ?? []

  async function onFiles(files: FileList | null) {
    if (!files?.length || busy) return
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      for (const file of Array.from(files).slice(0, 6)) {
        const prepared = await prepareForUpload(file, PHOTO_LIMIT)
        body.append('photos', prepared, prepared.name)
      }
      await postUpload(`/api/upload/rental?car=${encodeURIComponent(car.id)}`, body)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.rentalFleet.photos.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label={t('dashboard.rentalFleet.photos.title')} className="mt-4 rounded-xl border border-line-soft p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-caption font-extrabold text-content">{t('dashboard.rentalFleet.photos.title')}</h3>
        <p className="text-micro text-content-muted">{t('dashboard.rentalFleet.photos.count', { count: images.length })}</p>
      </div>
      {images.length ? (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.slice(0, 12).map((src) => (
            <li key={src} className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-alt">
              {/* eslint-disable-next-line @next/next/no-img-element -- a provider's own thumbnails, any host */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-micro text-content-muted">{t('dashboard.rentalFleet.photos.none')}</p>
      )}
      <label className={`mt-3 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-caption font-bold text-content hover:bg-surface-alt ${busy ? 'pointer-events-none opacity-60' : ''}`}>
        <Icon name="camera" size={16} />
        {busy ? t('dashboard.rentalFleet.photos.uploading') : t('dashboard.rentalFleet.photos.add')}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { void onFiles(e.target.files); e.target.value = '' }} />
      </label>
      {error ? <Alert tone="danger" className="mt-3">{error}</Alert> : null}
    </section>
  )
}
