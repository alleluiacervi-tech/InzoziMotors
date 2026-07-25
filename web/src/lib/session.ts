import 'server-only'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { account, ApiError } from './api'
import type { User } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Session handling — server only.
//
// The mobile app keeps its JWT in SecureStore because it owns its process. A
// browser does not: any script on the page can read localStorage, so a token
// there is one XSS away from full account takeover. The web therefore stores the
// same backend JWT in an httpOnly, SameSite=Lax cookie that JavaScript cannot
// read, and every authenticated call is made from the server.
//
// The backend is unchanged — it still sees `Authorization: Bearer <jwt>`.
// ─────────────────────────────────────────────────────────────────────────────

export const SESSION_COOKIE = 'inzozi_session'

/** Mirrors JWT_EXPIRES_IN (30d) in the backend so the cookie and the token
 *  expire together — a cookie that outlives its token produces silent 401s. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export async function getToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

export async function setSession(token: string): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function clearSession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/**
 * The signed-in user, or null. Wrapped in React's `cache` so a layout, a page
 * and three components asking "who is this?" in one render produce ONE call to
 * /auth/me rather than five.
 *
 * A 401 means the token is stale (expired, or the account was removed). We
 * return null rather than throwing so pages can degrade to the signed-out view;
 * the cookie is cleared on the next explicit sign-in or sign-out.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = await getToken()
  if (!token) return null
  try {
    return await account.me(token)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    // A backend outage should not masquerade as "signed out" — but there is
    // nothing better to show, so log and treat as anonymous.
    console.error('session lookup failed:', (err as Error).message)
    return null
  }
})

/** For pages that must not render at all without a user. Layout-level guards
 *  in `(dashboard)/layout.tsx` handle redirects; this is the belt-and-braces. */
export async function requireUser(): Promise<{ user: User; token: string }> {
  const token = await getToken()
  const user = await getCurrentUser()
  if (!token || !user) {
    throw new Error('UNAUTHENTICATED')
  }
  return { user, token }
}
