'use server'

import { account, ApiError } from '@/lib/api'
import { getToken } from '@/lib/session'

/**
 * Mints a fresh, 60-second socket ticket (D2 in docs/WEB-PARITY-PLAN.md) for
 * the signed-in user. The session JWT never reaches browser JavaScript, so
 * `useSocket()` calls this — through a Server Action, over the cookie's own
 * session — every time it opens or re-opens the realtime connection.
 *
 * Returns null when there is no session or the backend refuses one (session
 * revoked, suspended, closed): the socket layer treats that as "stay
 * disconnected", never as an error to surface.
 */
export async function getSocketTicket(): Promise<string | null> {
  const token = await getToken()
  if (!token) return null
  try {
    const { ticket } = await account.socketTicket(token)
    return ticket
  } catch (err) {
    if (err instanceof ApiError) return null
    throw err
  }
}
