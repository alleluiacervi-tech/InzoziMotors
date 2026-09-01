'use server'

import { revalidatePath } from 'next/cache'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { notifications } from '@/lib/api'
import { getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

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
  const t = await getServerT()
  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }

  try {
    await notifications.markAllRead(token)
  } catch (err) {
    return { error: describeError(err) }
  }

  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
  return { ok: true, message: t('dashboard.messages.allMarked') }
}
