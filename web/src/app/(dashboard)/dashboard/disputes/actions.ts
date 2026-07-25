'use server'

import { revalidatePath } from 'next/cache'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { ApiError, disputes } from '@/lib/api'
import { getToken } from '@/lib/session'

/**
 * Raise a dispute under the 7-day guarantee.
 *
 * The server is the authority on eligibility — it re-checks that the handover
 * is complete, belongs to the caller, is inside the window, and has no open
 * dispute. The UI only decides which forms to show; these messages translate
 * each refusal it can still return.
 */
export async function raiseDisputeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const handoverId = String(formData.get('handover_id') || '')
  const reason = String(formData.get('reason') || '').trim()

  if (!handoverId) return { error: 'That handover could not be found.' }
  if (reason.length < 10) {
    return {
      fieldErrors: {
        reason: 'Tell us what is wrong in a sentence or two so our team can act on it.',
      },
    }
  }

  const token = await getToken()
  if (!token) return { error: 'Your session has expired. Sign in again.' }

  try {
    await disputes.raise(token, handoverId, reason)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) {
        return { error: 'We could not find a completed handover on your account for this car.' }
      }
      if (err.status === 400) {
        return { error: 'The 7-day window for this handover has closed. Contact support instead.' }
      }
      if (err.status === 409) {
        return { error: 'A dispute is already open for this handover. Our team is on it.' }
      }
    }
    return { error: describeError(err) }
  }

  revalidatePath('/dashboard/disputes')
  revalidatePath('/dashboard')
  return {
    ok: true,
    message: 'Dispute received. Our team reviews it and contacts both sides within 24 hours.',
  }
}
