'use server'

import { revalidatePath } from 'next/cache'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { notifications } from '@/lib/api'
import { getToken } from '@/lib/session'

/** Mark one notification read. Plain form action: the worst case on failure is
 *  that it stays unread, which the next render shows honestly. */
export async function markReadAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') || '')
  const token = await getToken()
  if (!token || !id) return

  try {
    await notifications.markRead(token, id)
  } catch (err) {
    console.error('mark notification read failed:', (err as Error).message)
  }

  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
}

export async function markAllReadAction(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const token = await getToken()
  if (!token) return { error: 'Your session has expired. Sign in again.' }

  try {
    await notifications.markAllRead(token)
  } catch (err) {
    return { error: describeError(err) }
  }

  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
  return { ok: true, message: 'All notifications marked as read.' }
}
