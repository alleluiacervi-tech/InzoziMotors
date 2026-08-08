import 'server-only'
import { cache } from 'react'
import { ApiError, notifications } from '@/lib/api'
import { getToken } from '@/lib/session'
import type { AppNotification } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// Server-side data helpers for the dashboard.
//
// Everything here runs with the token read from the httpOnly cookie and is
// never cached across users (lib/api forces `no-store` whenever a token is
// present). The React `cache` wrappers only dedupe within a single render —
// the shell and the page both want the notification count, and that should
// cost one request, not two.
// ─────────────────────────────────────────────────────────────────────────────

/** Notifications for the signed-in user. Never throws: the shell must render
 *  even when the API is down, otherwise an outage logs everyone out visually. */
export const getNotifications = cache(async (): Promise<AppNotification[]> => {
  const token = await getToken()
  if (!token) return []
  try {
    return await notifications.list(token)
  } catch (err) {
    console.error('dashboard notifications failed:', (err as Error).message)
    return []
  }
})

export const getUnreadCount = cache(async (): Promise<number> => {
  const list = await getNotifications()
  return list.filter((n) => !n.read).length
})

/** Unwraps one leg of a Promise.allSettled so a single failed call degrades to
 *  an empty section instead of taking the whole page down. */
export function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback
}

/** Turns an API rejection into something a person can act on. */
export function describeError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return 'We could not reach Sawa Cars. Please try again.'
    return err.message
  }
  return fallback
}
