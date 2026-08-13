'use server'

import { revalidatePath } from 'next/cache'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { sellerListings } from '@/lib/api'
import { getToken } from '@/lib/session'
import { formatUSD } from '@/lib/business'

/**
 * Change the asking price on a live listing.
 *
 * PATCH /cars/:id/price is seller-scoped and live-only, and it does two things
 * beyond the write: it records the change in price_history (which drives the
 * sparkline on the listing) and, on a drop, notifies every buyer who saved the
 * car. The form says so before the seller commits.
 */
export async function updatePriceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get('id') || '')
  const raw = String(formData.get('price') || '').replace(/[,\s]/g, '')
  const price = Number(raw)

  if (!id) return { error: 'That listing could not be found.' }
  if (!raw) return { fieldErrors: { price: 'Enter a new price.' } }
  if (!Number.isFinite(price) || price <= 0) {
    return { fieldErrors: { price: 'Enter a price in Rwandan francs, digits only.' } }
  }

  const token = await getToken()
  if (!token) return { error: 'Your session has expired. Sign in again.' }

  try {
    await sellerListings.updatePrice(token, id, Math.round(price))
  } catch (err) {
    return { error: describeError(err, 'That price could not be saved.') }
  }

  revalidatePath('/dashboard/selling')
  return { ok: true, message: `Price updated to ${formatUSD(Math.round(price))}.` }
}
