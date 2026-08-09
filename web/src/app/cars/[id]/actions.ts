'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, handovers } from '@/lib/api'
import { getToken } from '@/lib/session'

// ─────────────────────────────────────────────────────────────────────────────
// Requesting a car.
//
// This reserves the car and nothing else. No money moves — there is no payment
// anywhere in the product — so the action's only job is to create the handover
// record the Sawa team works from, and to say honestly what happens next.
//
// The token is read from the httpOnly cookie on the server. The browser posts a
// phone number and a car id; it never holds the JWT.
// ─────────────────────────────────────────────────────────────────────────────

export type RequestState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'done'; bookingId: string }

/** Same shape the backend enforces (routes/handovers.js), checked here too so a
 *  typo comes back instantly instead of after a round trip. */
const PHONE = /^\+?[0-9 ]{9,16}$/

export async function requestCarAction(
  _previous: RequestState,
  formData: FormData
): Promise<RequestState> {
  const carId = String(formData.get('car_id') || '').trim()
  const phone = String(formData.get('contact_phone') || '').trim()

  if (!carId) {
    return { status: 'error', message: 'Something went wrong. Reload the page and try again.' }
  }
  if (phone && !PHONE.test(phone)) {
    return {
      status: 'error',
      message: 'Enter a number we can reach you on, for example +250 788 000 000.',
    }
  }

  const token = await getToken()
  if (!token) {
    return {
      status: 'error',
      message: 'Your session has expired. Sign in again to request this car.',
    }
  }

  try {
    const handover = await handovers.book(token, {
      car_id: carId,
      contact_phone: phone || undefined,
    })

    // The car is now reserved, so both the listing and the browse grid are stale.
    revalidatePath(`/cars/${carId}`)
    revalidatePath('/cars')

    return { status: 'done', bookingId: handover.booking_id }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isNetworkError) {
        return { status: 'error', message: 'We could not reach Sawa Cars. Please try again.' }
      }
      if (err.status === 401) {
        return { status: 'error', message: 'Your session has expired. Sign in again to continue.' }
      }
      if (err.status === 409) {
        return {
          status: 'error',
          message: 'Another buyer reserved this car moments ago. It will return to the marketplace if they release it.',
        }
      }
      // 400 covers "you cannot request your own listing" and phone validation —
      // the backend's wording is already the right wording for a buyer.
      return { status: 'error', message: err.message }
    }
    return { status: 'error', message: 'Something went wrong. Please try again.' }
  }
}
