'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/context'
import { WEEK, kigaliClock, openState, type OpenState } from '@/lib/showroom-hours'
import type { BusinessDay, BusinessHours } from '@/lib/types'

const DAY_KEY: Record<BusinessDay, string> = {
  mon: 'market.profile.dayMon', tue: 'market.profile.dayTue', wed: 'market.profile.dayWed',
  thu: 'market.profile.dayThu', fri: 'market.profile.dayFri', sat: 'market.profile.daySat',
  sun: 'market.profile.daySun',
}

// A showroom's week, with "Open now" or "Closed now" in Kigali time. The badge
// and today's highlight are worked out in the browser after it loads, never on
// the server: a cached page must not keep saying "open" after closing time.
export function ShowroomHours({ hours }: { hours: BusinessHours }) {
  const t = useT()
  const [now, setNow] = useState<{ today: BusinessDay; status: OpenState } | null>(null)

  useEffect(() => {
    const tick = () => setNow({ today: kigaliClock().day, status: openState(hours) })
    tick()
    const timer = setInterval(tick, 60_000)
    return () => clearInterval(timer)
  }, [hours])

  let badge: React.ReactNode = null
  if (now) {
    const { status } = now
    const detail = status.open
      ? t('market.profile.closesAt', { time: status.closesAt })
      : status.opensAt && status.laterToday
        ? t('market.profile.opensTodayAt', { time: status.opensAt })
        : status.opensAt && status.opensDay
          ? t('market.profile.opensAt', { day: t(DAY_KEY[status.opensDay]), time: status.opensAt })
          : null
    badge = (
      <p className="flex flex-wrap items-center gap-2 text-caption">
        <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-bold ${
          status.open ? 'bg-success-tint text-success-text' : 'bg-surface-alt text-content-secondary'
        }`}>
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status.open ? 'bg-success' : 'bg-content-muted'}`} />
          {status.open ? t('market.profile.openNow') : t('market.profile.closedNow')}
        </span>
        {detail ? <span className="text-content-secondary">{detail}</span> : null}
      </p>
    )
  }

  return (
    <div>
      {badge}
      <dl className="mt-3 divide-y divide-line-soft">
        {WEEK.map((day) => {
          const slot = hours[day]
          const isToday = now?.today === day
          return (
            <div key={day} className={`flex items-baseline justify-between gap-4 py-2 text-caption ${isToday ? 'font-bold text-content' : 'text-content-secondary'}`}>
              <dt>
                {t(DAY_KEY[day])}
                {isToday ? <span className="text-content-muted"> · {t('market.profile.today')}</span> : null}
              </dt>
              <dd className="tnum">{slot ? `${slot.open} – ${slot.close}` : t('market.profile.closed')}</dd>
            </div>
          )
        })}
      </dl>
      <p className="mt-2 text-micro text-content-muted">{t('market.profile.kigaliTime')}</p>
    </div>
  )
}
