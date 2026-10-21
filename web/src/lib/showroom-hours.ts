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
