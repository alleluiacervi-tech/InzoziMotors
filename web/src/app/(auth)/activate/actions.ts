'use server'

import { redirect } from 'next/navigation'
import { auth, ApiError } from '@/lib/api'
import { setSession } from '@/lib/session'

export type ActivateState = { error?: string } | null

// Activation for any admin-created account. The destination follows the account
// we just activated rather than being hardcoded — this used to always land on
// the seller dashboard, which is the wrong room for a buyer.
export async function activateAccount(_prev: ActivateState, formData: FormData): Promise<ActivateState> {
  const token = String(formData.get('token') || '')
  const password = String(formData.get('password') || '')
  const confirm = String(formData.get('confirm') || '')
  if (password.length < 8) return { error: 'Use at least 8 characters.' }
  if (password !== confirm) return { error: 'Both passwords must match.' }

  let destination = '/dashboard'
  try {
    const result = await auth.acceptInvite(token, password)
    await setSession(result.token)
    if (result.user?.role === 'seller') destination = '/dashboard/selling'
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Could not activate this account.' }
  }
  redirect(destination)
}
