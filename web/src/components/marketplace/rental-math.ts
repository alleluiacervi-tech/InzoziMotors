import type { RentalCar } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// Rental arithmetic, mirroring tripCost() in backend/src/routes/rentals.js:
// full weeks bill at the weekly rate, the remainder at the daily rate, deposit
// on top. The server is the authority — a booking is priced there. This exists
// so the website can preview the same number before anyone picks up a phone,
// and it must be changed in the same commit as the backend.
// ─────────────────────────────────────────────────────────────────────────────

export interface TripCost {
  days: number
  subtotal: number
  deposit: number
  total: number
}

export function tripCost(
  car: Pick<RentalCar, 'daily_rate' | 'weekly_rate' | 'deposit'>,
  days: number
): TripCost {
  const safeDays = Math.max(1, Math.floor(days))
  const weeks = Math.floor(safeDays / 7)
  const remainder = safeDays % 7
  const weekly = car.weekly_rate || car.daily_rate * 7
  const subtotal = weeks * weekly + remainder * car.daily_rate
  return { days: safeDays, subtotal, deposit: car.deposit, total: subtotal + car.deposit }
}

/** Airport meet-and-greet, matching AIRPORT_FEE in the rentals route. */
export const AIRPORT_PICKUP_FEE = 20

// ─── Availability ────────────────────────────────────────────────────────────

/** Day key in UTC. Rendered server-side only, so there is no client clock to
 *  disagree with and no hydration mismatch to worry about. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseStart(value: string): Date | null {
  // Postgres DATE columns arrive either as "2026-08-01" or as a full timestamp,
  // depending on the driver's date handling. Both mean the same day.
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Every day already taken by an upcoming or active booking. */
export function bookedDays(ranges: RentalCar['booked_ranges']): Set<string> {
  const taken = new Set<string>()
  for (const range of ranges ?? []) {
    const start = parseStart(String(range.start_date))
    const days = Number(range.days)
    if (!start || !Number.isFinite(days) || days < 1) continue
    for (let i = 0; i < days; i += 1) {
      const day = new Date(start)
      day.setUTCDate(day.getUTCDate() + i)
      taken.add(dayKey(day))
    }
  }
  return taken
}

export interface AvailabilityDay {
  key: string
  date: Date
  available: boolean
}

/** The next `count` days from today, each marked from the real booking rows. */
export function availabilityWindow(
  ranges: RentalCar['booked_ranges'],
  count = 14
): AvailabilityDay[] {
  const taken = bookedDays(ranges)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() + index)
    const key = dayKey(date)
    return { key, date, available: !taken.has(key) }
  })
}

export function formatRating(rating: RentalCar['rating']): string | null {
  const value = Number(rating)
  if (!Number.isFinite(value) || value <= 0) return null
  return value.toFixed(1)
}
