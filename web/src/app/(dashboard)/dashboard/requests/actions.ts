'use server'

import { revalidatePath } from 'next/cache'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { handovers } from '@/lib/api'
import { getToken } from '@/lib/session'

/**
 * Cancel a purchase request.
 *
 * The backend does the real work inside a transaction: the handover moves to
 * cancelled, the car returns to `live`, and the seller is notified. It only
 * accepts pending and confirmed requests owned by the caller, so a stale page
 * offering the button on something else gets a 404 rather than a wrong write.
 */
export async function cancelHandoverAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get('id') || '')
  const token = await getToken()
  if (!token) return { error: 'Your session has expired. Sign in again.' }
  if (!id) return { error: 'That request could not be found.' }

  try {
    await handovers.cancel(token, id)
  } catch (err) {
    return { error: describeError(err, 'That request can no longer be cancelled.') }
  }

  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard')
  return { ok: true, message: 'Request cancelled. The car is back on the marketplace.' }
}
