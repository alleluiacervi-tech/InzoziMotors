'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { ApiError, account } from '@/lib/api'
import { clearSession, getToken, setSession } from '@/lib/session'

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
  const whatsapp = String(formData.get('whatsapp_phone') || '').trim()
  const phoneVisible = formData.get('phone_visible') === 'on'
  const whatsappVisible = formData.get('whatsapp_visible') === 'on'

  const fieldErrors: Record<string, string> = {}
  if (name.length < 2) fieldErrors.name = 'Enter the full name on your ID.'
  if (phone && !PHONE_PATTERN.test(phone)) {
    fieldErrors.phone = 'Use a Rwandan mobile number, for example +250 788 123 456.'
  }
  if (whatsapp && !PHONE_PATTERN.test(whatsapp)) fieldErrors.whatsapp_phone = 'Use a full mobile number, for example +250 788 123 456.'
  if (phoneVisible && !phone) fieldErrors.phone = 'Add a phone number before making it available.'
  if (whatsappVisible && !whatsapp) fieldErrors.whatsapp_phone = 'Add a WhatsApp number before making it available.'
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const token = await getToken()
  if (!token) return { error: 'Your session has expired. Sign in again.' }

  try {
    await account.updateProfile(token, {
      name, phone, whatsapp_phone: whatsapp,
      phone_visible: phoneVisible, whatsapp_visible: whatsappVisible,
    })
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
    // The backend revokes every previously-issued token and hands back a fresh
    // one for this session. Without re-storing it, the very next request from
    // this browser would 401 — the user would be signed out by their own
    // security action.
    const { token: renewed } = await account.changePassword(token, current, next)
    if (renewed) await setSession(renewed)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { fieldErrors: { current_password: 'That is not your current password.' } }
    }
    return { error: describeError(err, 'We could not change your password.') }
  }

  return {
    ok: true,
    message: 'Your password is changed. Any other device signed in to Sawa Cars has been signed out.',
  }
}

// ─── Account deletion ─────────────────────────────────────────────────────────
// Apple 5.1.1(v) requires deletion to be initiable in-app; Google Play requires
// a publicly reachable web URL for it too (see /account/delete, which points
// signed-out visitors here). The backend does the real work — this validates,
// translates the two refusals that are the user's to act on, and tears down the
// session cookie so the browser is not left holding a token for a dead account.
export async function deleteAccountAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const password = String(formData.get('password') || '')
  const reason = String(formData.get('reason') || '')
  const note = String(formData.get('note') || '')
  const acknowledged = formData.get('acknowledge') === 'on'

  const fieldErrors: Record<string, string> = {}
  if (!reason) fieldErrors.reason = 'Choose a reason so we know what to fix.'
  if (!password) fieldErrors.password = 'Enter your password to confirm.'
  if (!acknowledged) fieldErrors.acknowledge = 'Please confirm you understand what happens next.'
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const token = await getToken()
  if (!token) return { error: 'Your session has expired. Sign in again.' }

  try {
    await account.closeAccount(token, password, reason, note)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        return { fieldErrors: { password: 'That password is not correct.' } }
      }
      if (err.status === 400 || err.status === 409) return { error: err.message }
    }
    return { error: describeError(err, 'We could not close your account.') }
  }

  await clearSession()
  revalidatePath('/', 'layout')
  // ?closed=1, not ?deleted=1: nothing has been deleted yet, and the landing
  // copy has to say so — it is where somebody who closed by mistake finds out
  // there is still a way back.
  redirect('/?closed=1')
}
