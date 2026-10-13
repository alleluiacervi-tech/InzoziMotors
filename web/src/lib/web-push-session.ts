import 'server-only'
import { cookies } from 'next/headers'
import { devices } from './api'
import { getToken } from './session'

// The browser subscription this sign-in turned on, remembered in an httpOnly
// cookie so signing out can stop the pushes. The browser keeps its
// subscription (only it can drop one), but the API forgets it, so nothing
// meant for this account reaches whoever uses the browser next.

export const PUSH_ENDPOINT_COOKIE = 'sawa_push_ep'

export async function rememberPushEndpoint(endpoint: string): Promise<void> {
  const store = await cookies()
  store.set(PUSH_ENDPOINT_COOKIE, endpoint, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}

export async function forgetPushEndpoint(): Promise<void> {
  const store = await cookies()
  store.delete(PUSH_ENDPOINT_COOKIE)
}

/** Called on sign-out, before the session cookie goes. Never throws and never
 *  waits long: a slow API must not be what keeps someone signed in. */
export async function dropPushSubscriptionForSignOut(): Promise<void> {
  const store = await cookies()
  const endpoint = store.get(PUSH_ENDPOINT_COOKIE)?.value
  if (!endpoint) return
  const token = await getToken()
  if (token) await devices.deleteWebPush(token, endpoint, 3000).catch(() => {})
  store.delete(PUSH_ENDPOINT_COOKIE)
}
