'use server'

import { revalidatePath } from 'next/cache'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { ApiError, account } from '@/lib/api'
import { getToken } from '@/lib/session'

// Profile and password. Validation here mirrors the backend's rules exactly —
// the same phone pattern, the same 6-character minimum — so a value that
// passes on screen never fails on the server.

const PHONE_PATTERN = /^\+?[0-9 ]{9,16}$/

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get('name') || '').trim()
  const phone = String(formData.get('phone') || '').trim()

  const fieldErrors: Record<string, string> = {}
  if (name.length < 2) fieldErrors.name = 'Enter the full name on your ID.'
  if (phone && !PHONE_PATTERN.test(phone)) {
    fieldErrors.phone = 'Use a Rwandan mobile number, for example +250 788 123 456.'
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const token = await getToken()
  if (!token) return { error: 'Your session has expired. Sign in again.' }

  try {
    // PATCH /auth/me COALESCEs, so an empty phone leaves the stored one alone
    // rather than wiping it — send the field only when it has a value.
    await account.updateProfile(token, phone ? { name, phone } : { name })
  } catch (err) {
    return { error: describeError(err, 'We could not save those details.') }
  }

  revalidatePath('/dashboard/profile')
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Your details are saved.' }
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const current = String(formData.get('current_password') || '')
  const next = String(formData.get('new_password') || '')
  const confirm = String(formData.get('confirm_password') || '')

  const fieldErrors: Record<string, string> = {}
  if (!current) fieldErrors.current_password = 'Enter your current password.'
  if (next.length < 6) fieldErrors.new_password = 'Use at least 6 characters.'
  else if (next === current) fieldErrors.new_password = 'Choose a password you have not used here.'
  if (next !== confirm) fieldErrors.confirm_password = 'Both passwords need to match.'
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const token = await getToken()
  if (!token) return { error: 'Your session has expired. Sign in again.' }

  try {
    await account.changePassword(token, current, next)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { fieldErrors: { current_password: 'That is not your current password.' } }
    }
    return { error: describeError(err, 'We could not change your password.') }
  }

  return { ok: true, message: 'Your password is changed. Other devices stay signed in.' }
}
