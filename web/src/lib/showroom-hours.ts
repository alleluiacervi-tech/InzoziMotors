// ─────────────────────────────────────────────────────────────────────────────
// A showroom's opening hours, read in Kigali time.
//
// Rwanda keeps Central Africa Time (UTC+2) all year, with no daylight saving,
// so a fixed offset is exact. Mirrored by the app (src/utils/showroomHours.js);
// change both together.
// ─────────────────────────────────────────────────────────────────────────────
import type { BusinessDay, BusinessHours } from './types'

export const WEEK: BusinessDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1000

/** Today's weekday and the minutes since midnight, in Kigali. */
export function kigaliClock(now: Date = new Date()): { day: BusinessDay; minutes: number } {
  const local = new Date(now.getTime() + KIGALI_OFFSET_MS)
  const day = WEEK[(local.getUTCDay() + 6) % 7] // getUTCDay: 0 = Sunday
  return { day, minutes: local.getUTCHours() * 60 + local.getUTCMinutes() }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export type OpenState =
  | { open: true; closesAt: string }
  | { open: false; opensAt: string | null; opensDay: BusinessDay | null; laterToday: boolean }

/** Open right now, and until when; or closed, and when it next opens. */
export function openState(hours: BusinessHours, now: Date = new Date()): OpenState {
  const { day, minutes } = kigaliClock(now)
  const today = hours[day]
  if (today && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    return { open: true, closesAt: today.close }
  }
  if (today && minutes < toMinutes(today.open)) {
    return { open: false, opensAt: today.open, opensDay: day, laterToday: true }
  }
  const index = WEEK.indexOf(day)
  for (let step = 1; step <= 7; step += 1) {
    const next = WEEK[(index + step) % 7]
    const slot = hours[next]
    if (slot) return { open: false, opensAt: slot.open, opensDay: next, laterToday: false }
  }
  return { open: false, opensAt: null, opensDay: null, laterToday: false }
}

/** "Closes soon" for the last hour, so nobody sets off for a showroom about to shut. */
export const CLOSING_SOON_MIN = 60

export type OpenStatusKey =
  | 'statusOpenUntil' | 'statusClosesSoon' | 'statusOpensToday' | 'statusOpensTomorrow'
  | 'statusClosedTodayOpensTomorrow' | 'statusOpensDay' | 'statusClosedTodayOpensDay'

export type OpenStatus = { tone: 'open' | 'soon' | 'closed'; key: OpenStatusKey; time: string; day?: BusinessDay }

/**
 * The one line a buyer needs: can I go now, and if not, when. Always names the
 * day ("today", "tomorrow", "Monday"); null when there are no hours. Keys are
 * under market.profile in the messages. Mirrors openStatus in the app.
 */
export function openStatus(hours: BusinessHours | null | undefined, now: Date = new Date()): OpenStatus | null {
  if (!hours) return null
  const { day, minutes } = kigaliClock(now)
  const today = hours[day]
  if (today && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    return toMinutes(today.close) - minutes <= CLOSING_SOON_MIN
      ? { tone: 'soon', key: 'statusClosesSoon', time: today.close }
      : { tone: 'open', key: 'statusOpenUntil', time: today.close }
  }
  if (today && minutes < toMinutes(today.open)) return { tone: 'closed', key: 'statusOpensToday', time: today.open }
  const index = WEEK.indexOf(day)
  for (let step = 1; step <= 7; step += 1) {
    const next = WEEK[(index + step) % 7]
    const slot = hours[next]
    if (!slot) continue
    if (step === 1) {
      return { tone: 'closed', key: today ? 'statusOpensTomorrow' : 'statusClosedTodayOpensTomorrow', time: slot.open }
    }
    return { tone: 'closed', key: today ? 'statusOpensDay' : 'statusClosedTodayOpensDay', time: slot.open, day: next }
  }
  return null
}

export type OpenStatusLabels = Record<OpenStatusKey, string> & { days: Record<BusinessDay, string> }

/** The labels OpenStatusLine needs, read once on the server. */
export function openStatusLabels(t: (key: string) => string): OpenStatusLabels {
  const keys: OpenStatusKey[] = [
    'statusOpenUntil', 'statusClosesSoon', 'statusOpensToday', 'statusOpensTomorrow',
    'statusClosedTodayOpensTomorrow', 'statusOpensDay', 'statusClosedTodayOpensDay',
  ]
  const labels = Object.fromEntries(keys.map((k) => [k, t(`market.profile.${k}`)])) as Record<OpenStatusKey, string>
  return {
    ...labels,
    days: {
      mon: t('market.profile.dayMon'), tue: t('market.profile.dayTue'), wed: t('market.profile.dayWed'),
      thu: t('market.profile.dayThu'), fri: t('market.profile.dayFri'), sat: t('market.profile.daySat'),
      sun: t('market.profile.daySun'),
    },
  }
}
