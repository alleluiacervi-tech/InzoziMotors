'use server'

import { revalidatePath } from 'next/cache'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { cookies } from 'next/headers'
import { account, saved } from '@/lib/api'
import { DIGEST_ASKED_COOKIE } from '@/components/dashboard/digest-ask'
import { getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

// Saved cars and saved searches. Each action reads the token itself rather
// than accepting one from the form — a token that travels through a client
// component is a token in the page source.

export async function toggleSearchNotifyAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get('id') || '')
  // The form submits the state it wants, not the state it has, so a stale tab
  // cannot silently flip the toggle the other way.
  const notify = formData.get('notify') === 'on'

  const t = await getServerT()
  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }
  if (!id) return { error: t('dashboard.errors.searchNotFound') }

  try {
    await saved.updateSearch(token, id, { notify_enabled: notify })
  } catch (err) {
    return { error: describeError(err) }
  }

  revalidatePath('/dashboard/saved')
  return {
    ok: true,
    message: notify ? t('dashboard.messages.alertsOnSearch') : t('dashboard.messages.alertsOffSearch'),
  }
}

// Instant vs the daily summary, per saved search. Choosing the summary while it
// is switched off at the account would mean this search never alerts, so it
// switches the summary on and says so (same as the app).
export async function setSearchModeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get('id') || '')
  const mode = formData.get('mode') === 'daily' ? 'daily' : 'instant'

  const t = await getServerT()
  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }
  if (!id) return { error: t('dashboard.errors.searchNotFound') }

  try {
    await saved.updateSearch(token, id, { alert_mode: mode })
    let digestTurnedOn = false
    if (mode === 'daily') {
      const me = await account.me(token)
      if (me.alert_daily_digest !== true) {
        await account.updateProfile(token, { alert_daily_digest: true })
        digestTurnedOn = true
      }
    }
    revalidatePath('/dashboard/saved')
    if (digestTurnedOn) revalidatePath('/dashboard/profile')
    return {
      ok: true,
      message: digestTurnedOn
        ? t('dashboard.messages.digestOn')
        : mode === 'daily' ? t('dashboard.messages.searchModeDaily') : t('dashboard.messages.searchModeInstant'),
    }
  } catch (err) {
    return { error: describeError(err) }
  }
}

// The one-time ask on the Saved page. Yes switches the daily summary on; either
// answer is remembered in a cookie so the card never comes back (the profile
// switch owns the choice from then on).
export async function answerDigestAskAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const yes = formData.get('answer') === 'yes'
  const t = await getServerT()
  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }

  try {
    if (yes) await account.updateProfile(token, { alert_daily_digest: true })
  } catch (err) {
    return { error: describeError(err) }
  }
  const store = await cookies()
  store.set(DIGEST_ASKED_COOKIE, '1', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  revalidatePath('/dashboard/saved')
  if (yes) revalidatePath('/dashboard/profile')
  return { ok: true, message: yes ? t('dashboard.messages.digestOn') : t('dashboard.messages.digestDeclined') }
}

export async function deleteSearchAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get('id') || '')
  const t = await getServerT()
  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }
  if (!id) return { error: t('dashboard.errors.searchNotFound') }

  try {
    await saved.deleteSearch(token, id)
  } catch (err) {
    return { error: describeError(err) }
  }

  revalidatePath('/dashboard/saved')
  return { ok: true, message: t('dashboard.messages.searchDeleted') }
}

export async function unsaveCarAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const carId = String(formData.get('car_id') || '')
  const t = await getServerT()
  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }
  if (!carId) return { error: t('dashboard.errors.carNotFound') }

  try {
    // The endpoint is a toggle. It is only ever reached from a card that is
    // already saved, so the result is always an unsave.
    await saved.toggle(token, carId)
  } catch (err) {
    return { error: describeError(err) }
  }

  revalidatePath('/dashboard/saved')
  return { ok: true, message: t('dashboard.messages.removedFromSaved') }
}
