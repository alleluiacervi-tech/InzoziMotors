'use server'

import { ApiError, cars } from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// The free valuation.
//
// GET /cars/valuation/estimate is genuinely public — no token, no account, the
// same endpoint the app calls. This action exists for two reasons: it keeps the
// API base URL server-side, and it flattens the two shapes the endpoint returns
// into states the form can render without inventing anything.
//
// The endpoint answers with a real estimate OR with `{ comparables: 0, message }`
// when the catalogue is too thin. The second case is normalised to `empty` here
// so the UI cannot accidentally render `undefined` as a price.
// ─────────────────────────────────────────────────────────────────────────────

export type ValuationFieldErrors = Partial<Record<'make' | 'year' | 'mileage', string>>

export type ValuationState =
  | { status: 'idle' }
  | { status: 'invalid'; fieldErrors: ValuationFieldErrors }
  | { status: 'error'; message: string }
  | { status: 'empty'; make: string; year: number; message: string }
  | {
      status: 'ok'
      make: string
      year: number
      /** Null when the seller left it blank — the API then values at its
       *  60,000 km reference, and the UI has to say so. */
      mileage: number | null
      comparables: number
      low: number
      high: number
      market_avg: number | null
      range_seen: { low: number; high: number } | null
    }

/** Cars older than this are rare enough in the catalogue that a market
 *  estimate would be built on almost nothing. */
const EARLIEST_YEAR = 1990
const MAX_MILEAGE = 1_000_000

export async function estimateValuationAction(
  _prev: ValuationState,
  formData: FormData
): Promise<ValuationState> {
  const make = String(formData.get('make') || '').trim()
  const yearRaw = String(formData.get('year') || '').trim()
  const mileageRaw = String(formData.get('mileage') || '').trim()

  const maxYear = new Date().getFullYear() + 1
  const year = Number(yearRaw)
  const mileage = mileageRaw ? Number(mileageRaw) : null

  const fieldErrors: ValuationFieldErrors = {}
  if (make.length < 2) {
    fieldErrors.make = 'Enter the make — Toyota, Nissan, Mercedes.'
  }
  if (!yearRaw || !Number.isInteger(year) || year < EARLIEST_YEAR || year > maxYear) {
    fieldErrors.year = `Enter a year between ${EARLIEST_YEAR} and ${maxYear}.`
  }
  if (mileage !== null && (!Number.isFinite(mileage) || mileage <= 0 || mileage > MAX_MILEAGE)) {
    fieldErrors.mileage = 'Enter the odometer reading in kilometres, or leave it blank.'
  }
  if (Object.keys(fieldErrors).length) return { status: 'invalid', fieldErrors }

  try {
    const result = await cars.valuation({
      make,
      year,
      ...(mileage !== null ? { mileage } : {}),
    })

    // Guard on the numbers themselves, not just the count: a range is only
    // shown when the API actually sent both ends of it.
    if (!result.comparables || typeof result.low !== 'number' || typeof result.high !== 'number') {
      return {
        status: 'empty',
        make,
        year,
        message:
          result.message ||
          'There are not enough comparable cars on Sawa to price this one yet.',
      }
    }

    return {
      status: 'ok',
      make,
      year,
      mileage,
      comparables: result.comparables,
      low: result.low,
      high: result.high,
      market_avg: typeof result.market_avg === 'number' ? result.market_avg : null,
      range_seen:
        result.range_seen &&
        typeof result.range_seen.low === 'number' &&
        typeof result.range_seen.high === 'number'
          ? { low: result.range_seen.low, high: result.range_seen.high }
          : null,
    }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isNetworkError) {
        return { status: 'error', message: 'We could not reach Sawa. Please try again.' }
      }
      return { status: 'error', message: err.message }
    }
    return { status: 'error', message: 'Something went wrong. Please try again.' }
  }
}
