import type { RentalCar } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// Informational rental arithmetic only. Providers confirm availability, price,
// deposits, payment and contract terms directly with renters.
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

export function formatRating(rating: RentalCar['rating']): string | null {
  const value = Number(rating)
  if (!Number.isFinite(value) || value <= 0) return null
  return value.toFixed(1)
}

export interface AvailableDay {
  key: string
  date: Date
  available: boolean
}

export function availabilityWindow(
  ranges: RentalCar['booked_ranges'] = [],
  daysCount = 14
): AvailableDay[] {
  const days: AvailableDay[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const parsedRanges = (ranges || []).map((r) => {
    const start = new Date(r.start_date).getTime()
    const end = start + (r.days || 1) * 24 * 60 * 60 * 1000
    return { start, end }
  })

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
    const time = d.getTime()
    const isBooked = parsedRanges.some((r) => time >= r.start && time <= r.end)
    days.push({
      key: d.toISOString().slice(0, 10),
      date: d,
      available: !isBooked,
    })
  }

  return days
}
