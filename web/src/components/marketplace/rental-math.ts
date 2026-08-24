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
