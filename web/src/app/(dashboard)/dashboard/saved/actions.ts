'use server'

import { revalidatePath } from 'next/cache'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { saved } from '@/lib/api'
import { getToken } from '@/lib/session'

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

  const token = await getToken()
  if (!token) return { error: 'Your session has expired. Sign in again.' }
  if (!id) return { error: 'That search could not be found.' }

  try {
    await saved.updateSearch(token, id, notify)
  } catch (err) {
    return { error: describeError(err) }
  }

  revalidatePath('/dashboard/saved')
  return {
    ok: true,
    message: notify ? 'Alerts on for this search.' : 'Alerts off for this search.',
  }
}

export async function deleteSearchAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get('id') || '')
  const token = await getToken()
  if (!token) return { error: 'Your session has expired. Sign in again.' }
  if (!id) return { error: 'That search could not be found.' }

  try {
    await saved.deleteSearch(token, id)
  } catch (err) {
    return { error: describeError(err) }
  }

  revalidatePath('/dashboard/saved')
  return { ok: true, message: 'Search deleted.' }
}

export async function unsaveCarAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const carId = String(formData.get('car_id') || '')
  const token = await getToken()
  if (!token) return { error: 'Your session has expired. Sign in again.' }
  if (!carId) return { error: 'That car could not be found.' }

  try {
    // The endpoint is a toggle. It is only ever reached from a card that is
    // already saved, so the result is always an unsave.
    await saved.toggle(token, carId)
  } catch (err) {
    return { error: describeError(err) }
  }

  revalidatePath('/dashboard/saved')
  return { ok: true, message: 'Removed from saved.' }
}
