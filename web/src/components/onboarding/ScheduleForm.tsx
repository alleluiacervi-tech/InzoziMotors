'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { scheduleInspectionAction } from '@/app/(dashboard)/dashboard/selling/[id]/schedule/actions'
import { Alert, Icon } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import type { InspectionCenter } from '@/lib/types'

// G6 in docs/WEB-PARITY-PLAN.md — the app's InspectionSchedulingScreen: pick a
// centre, one of the next ten days starting tomorrow, and an hourly slot from
// 8 AM to 4 PM. Days are counted in Kigali, where the centres are, so the list
// is the same whatever timezone the browser is in.

const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM']
const DAYS_AHEAD = 10
const ZONE = 'Africa/Kigali'

function upcomingDays() {
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'short' })
  const month = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, month: 'short' })
  const day = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, day: 'numeric' })
  const now = Date.now()
  return Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const at = new Date(now + (i + 1) * 86_400_000)
    return { iso: iso.format(at), weekday: weekday.format(at), day: day.format(at), month: month.format(at) }
  })
}

export function ScheduleForm({
  submissionId,
  centers,
}: {
  submissionId: string
  centers: InspectionCenter[]
}) {
  const t = useT()
  const router = useRouter()
  const [days] = useState(upcomingDays)
  const [center, setCenter] = useState<InspectionCenter | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chosenDay = days.find((d) => d.iso === date)

  async function confirm() {
    if (!center || !date || !time || busy) return
    setBusy(true)
    setError(null)
    const result = await scheduleInspectionAction(submissionId, center.name, date, time)
    if (!result.ok) {
      setError(result.error)
      setBusy(false)
      return
    }
    router.push(`/dashboard/selling?booked=${encodeURIComponent(submissionId)}`)
    router.refresh()
  }

  if (!centers.length) {
    return <Alert tone="info">{t('onboarding.schedule.noCenters')}</Alert>
  }

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="text-caption font-extrabold text-content">{t('onboarding.schedule.center')}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {centers.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer gap-3 rounded-2xl border border-line-soft bg-surface p-4 has-[:checked]:border-brand has-[:checked]:bg-brand/5"
            >
              <input
                type="radio"
                name="center"
                checked={center?.id === c.id}
                onChange={() => setCenter(c)}
                className="mt-1 h-4 w-4 accent-brand"
              />
              <span className="min-w-0">
                <span className="block text-caption font-extrabold text-content">{c.name}</span>
                {c.address || c.area ? (
                  <span className="mt-0.5 block text-micro text-content-muted">{c.address || c.area}</span>
                ) : null}
                <span className="mt-1 block text-micro text-content-muted">
                  {t('onboarding.schedule.capacity', { count: c.daily_capacity })}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-caption font-extrabold text-content">{t('onboarding.schedule.date')}</legend>
        <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => (
            <label
              key={d.iso}
              className="flex w-16 shrink-0 cursor-pointer flex-col items-center rounded-2xl border border-line-soft bg-surface py-3 has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-brand-on"
            >
              <input type="radio" name="date" checked={date === d.iso} onChange={() => setDate(d.iso)} className="sr-only" />
              <span className="text-micro font-bold opacity-80">{d.weekday}</span>
              <span className="text-title-sm font-extrabold">{d.day}</span>
              <span className="text-micro opacity-80">{d.month}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {date ? (
        <fieldset>
          <legend className="text-caption font-extrabold text-content">{t('onboarding.schedule.time')}</legend>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {TIME_SLOTS.map((slot) => (
              <label
                key={slot}
                className="cursor-pointer rounded-xl border border-line-soft bg-surface py-2.5 text-center text-caption font-bold text-content has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-brand-on"
              >
                <input type="radio" name="time" checked={time === slot} onChange={() => setTime(slot)} className="sr-only" />
                {slot}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {center && chosenDay && time ? (
        <div className="rounded-2xl border border-line-soft bg-surface-alt p-4">
          <p className="text-caption font-extrabold text-content">{t('onboarding.schedule.summary')}</p>
          <p className="mt-2 flex items-center gap-2 text-caption text-content-secondary">
            <Icon name="location" size={15} /> {center.name}
          </p>
          <p className="mt-1 flex items-center gap-2 text-caption text-content-secondary">
            <Icon name="calendar" size={15} /> {chosenDay.weekday}, {chosenDay.month} {chosenDay.day} · {time}
          </p>
          <p className="mt-3 text-micro text-content-muted">{t('onboarding.schedule.arrive')}</p>
        </div>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <button
        type="button"
        onClick={confirm}
        disabled={!center || !date || !time || busy}
        className="h-12 w-full rounded-xl bg-brand px-6 text-body font-bold text-brand-on disabled:opacity-50"
      >
        {busy ? t('onboarding.schedule.booking') : t('onboarding.schedule.confirm')}
      </button>
      {!center || !date || !time ? (
        <p className="text-center text-micro text-content-muted">{t('onboarding.schedule.incomplete')}</p>
      ) : null}
    </div>
  )
}

export default ScheduleForm
