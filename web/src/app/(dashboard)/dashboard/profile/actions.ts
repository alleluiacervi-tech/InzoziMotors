'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { ApiError, account } from '@/lib/api'
import { clearSession, getToken, setSession } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

// Profile and password. Validation here mirrors the backend's rules exactly —
// the same phone pattern, the same 6-character minimum — so a value that
// passes on screen never fails on the server.

const PHONE_PATTERN = /^\+?[0-9 ]{9,16}$/

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getServerT()
  const name = String(formData.get('name') || '').trim()
  const phone = String(formData.get('phone') || '').trim()
  const whatsapp = String(formData.get('whatsapp_phone') || '').trim()
  const phoneVisible = formData.get('phone_visible') === 'on'
  const whatsappVisible = formData.get('whatsapp_visible') === 'on'

  const fieldErrors: Record<string, string> = {}
  if (name.length < 2) fieldErrors.name = t('dashboard.validation.nameOnId')
  if (phone && !PHONE_PATTERN.test(phone)) {
    fieldErrors.phone = t('dashboard.validation.rwandanPhone')
  }
  if (whatsapp && !PHONE_PATTERN.test(whatsapp)) fieldErrors.whatsapp_phone = t('dashboard.validation.fullMobile')
  if (phoneVisible && !phone) fieldErrors.phone = t('dashboard.validation.addPhoneFirst')
  if (whatsappVisible && !whatsapp) fieldErrors.whatsapp_phone = t('dashboard.validation.addWhatsappFirst')
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }

  try {
    await account.updateProfile(token, {
      name, phone, whatsapp_phone: whatsapp,
      phone_visible: phoneVisible, whatsapp_visible: whatsappVisible,
    })
  } catch (err) {
    return { error: describeError(err, t('dashboard.errors.profileSaveFailed')) }
  }

  revalidatePath('/dashboard/profile')
  revalidatePath('/', 'layout')
  return { ok: true, message: t('dashboard.messages.detailsSaved') }
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getServerT()
  const current = String(formData.get('current_password') || '')
  const next = String(formData.get('new_password') || '')
  const confirm = String(formData.get('confirm_password') || '')

  const fieldErrors: Record<string, string> = {}
  if (!current) fieldErrors.current_password = t('dashboard.validation.enterCurrentPassword')
  if (next.length < 6) fieldErrors.new_password = t('dashboard.validation.passwordMin')
  else if (next === current) fieldErrors.new_password = t('dashboard.validation.passwordReuse')
  if (next !== confirm) fieldErrors.confirm_password = t('dashboard.validation.passwordsMatch')
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }

  try {
    // The backend revokes every previously-issued token and hands back a fresh
    // one for this session. Without re-storing it, the very next request from
    // this browser would 401 — the user would be signed out by their own
    // security action.
    const { token: renewed } = await account.changePassword(token, current, next)
    if (renewed) await setSession(renewed)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { fieldErrors: { current_password: t('dashboard.errors.passwordWrong') } }
    }
    return { error: describeError(err, t('dashboard.errors.passwordChangeFailed')) }
  }

  return {
    ok: true,
    message: t('dashboard.messages.passwordChanged'),
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
  const t = await getServerT()
  const password = String(formData.get('password') || '')
  const reason = String(formData.get('reason') || '')
  const note = String(formData.get('note') || '')
  const acknowledged = formData.get('acknowledge') === 'on'

  const fieldErrors: Record<string, string> = {}
  if (!reason) fieldErrors.reason = t('dashboard.validation.chooseReason')
  if (!password) fieldErrors.password = t('dashboard.validation.enterPasswordConfirm')
  if (!acknowledged) fieldErrors.acknowledge = t('dashboard.validation.confirmUnderstand')
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }

  try {
    await account.closeAccount(token, password, reason, note)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        return { fieldErrors: { password: t('dashboard.errors.passwordIncorrect') } }
      }
      if (err.status === 400 || err.status === 409) return { error: err.message }
    }
    return { error: describeError(err, t('dashboard.errors.accountCloseFailed')) }
  }

  await clearSession()
  revalidatePath('/', 'layout')
  // ?closed=1, not ?deleted=1: nothing has been deleted yet, and the landing
  // copy has to say so — it is where somebody who closed by mistake finds out
  // there is still a way back.
  redirect('/?closed=1')
}
