'use server'

import { revalidatePath } from 'next/cache'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { ApiError, referrals } from '@/lib/api'
import { getToken } from '@/lib/session'

/**
 * Redeem someone else's referral code.
 *
 * The three refusals the backend can return are all things the person can fix
 * or needs explaining, so each gets its own sentence rather than a generic
 * failure: 404 unknown code, 400 own code, 409 already redeemed.
 */
export async function redeemReferralAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const code = String(formData.get('code') || '').trim().toUpperCase()

  if (!code) return { fieldErrors: { code: 'Enter the code you were given.' } }
  if (!/^[A-Z0-9]{4,20}$/.test(code)) {
    return { fieldErrors: { code: 'Codes are letters and numbers only, like INZ4F2A9C.' } }
  }

  const token = await getToken()
  if (!token) return { error: 'Your session has expired. Sign in again.' }

  try {
    await referrals.redeem(token, code)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) {
        return { fieldErrors: { code: 'No account has that code. Check the spelling.' } }
      }
      if (err.status === 400) {
        return { fieldErrors: { code: 'That is your own code — someone else has to use it.' } }
      }
      if (err.status === 409) {
        return { fieldErrors: { code: 'You have already redeemed this code.' } }
      }
    }
    return { error: describeError(err) }
  }

  revalidatePath('/dashboard/referrals')
  return {
    ok: true,
    message: 'Code applied. The discount comes off the commission on your next completed sale.',
  }
}
