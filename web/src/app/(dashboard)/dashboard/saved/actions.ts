'use server'

import { revalidatePath } from 'next/cache'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { saved } from '@/lib/api'
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
    await saved.updateSearch(token, id, notify)
  } catch (err) {
    return { error: describeError(err) }
  }

  revalidatePath('/dashboard/saved')
  return {
    ok: true,
    message: notify ? t('dashboard.messages.alertsOnSearch') : t('dashboard.messages.alertsOffSearch'),
  }
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
