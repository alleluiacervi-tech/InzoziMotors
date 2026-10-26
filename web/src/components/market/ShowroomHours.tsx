'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/context'
import { WEEK, kigaliClock, openStatus, type OpenStatus } from '@/lib/showroom-hours'
import type { BusinessDay, BusinessHours } from '@/lib/types'

const DAY_KEY: Record<BusinessDay, string> = {
  mon: 'market.profile.dayMon', tue: 'market.profile.dayTue', wed: 'market.profile.dayWed',
  thu: 'market.profile.dayThu', fri: 'market.profile.dayFri', sat: 'market.profile.daySat',
  sun: 'market.profile.daySun',
}

// A showroom's hours: one line saying whether it is open now and when that
// changes, with the week behind "See all hours". Worked out in the browser
// after it loads, never on the server: a cached page must not keep saying
// "open" after closing time.
export function ShowroomHours({ hours }: { hours: BusinessHours }) {
  const t = useT()
  const [now, setNow] = useState<{ today: BusinessDay; status: OpenStatus | null } | null>(null)

  useEffect(() => {
    const tick = () => setNow({ today: kigaliClock().day, status: openStatus(hours) })
    tick()
    const timer = setInterval(tick, 60_000)
    return () => clearInterval(timer)
  }, [hours])

  const status = now?.status
  const line = status
    ? t(`market.profile.${status.key}`, { time: status.time, day: status.day ? t(DAY_KEY[status.day]) : '' })
    : null
  const dot = status?.tone === 'open' ? 'bg-success' : status?.tone === 'soon' ? 'bg-warning' : 'bg-content-muted'

  return (
    <div>
      {line ? (
        <p className="flex items-center gap-2 text-body font-semibold text-content">
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
          {line}
        </p>
      ) : null}
      <details className="group mt-2">
        <summary className="inline-flex min-h-[44px] cursor-pointer list-none items-center gap-1 text-caption font-semibold text-content-secondary underline underline-offset-4 hover:text-content">
          {t('market.profile.seeAllHours')}
        </summary>
        <dl className="mt-1 divide-y divide-line-soft">
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
      </details>
    </div>
  )
}
