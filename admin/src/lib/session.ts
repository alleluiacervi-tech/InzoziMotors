import 'server-only'
import { cookies } from 'next/headers'

// ─────────────────────────────────────────────────────────────────────────────
// Admin session — server only.
//
// Mirrors web/src/lib/session.ts deliberately: same reasoning, same shape, one
// pattern to understand across both browser surfaces. The admin app is the one
// that most needed it, since its token carries full pipeline control and can
// read national ID documents.
// ─────────────────────────────────────────────────────────────────────────────

export const ADMIN_SESSION_COOKIE = 'sawa_admin_session'

/** The API as seen from the Next SERVER, so it may be a private address
 *  (the Docker service name, or 127.0.0.1 on the VPS). Unlike the old
 *  NEXT_PUBLIC_API_URL this never reaches a browser, so the backend does not
 *  have to be internet-reachable for the dashboard to work. */
export const BACKEND_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000'
).replace(/\/+$/, '')

/** Shorter than the 30-day JWT on purpose. An admin session is the most
 *  dangerous thing to leave lying around on a shared operations laptop, and
 *  signing in again is cheap. */
const MAX_AGE_SECONDS = 60 * 60 * 12

export async function setAdminSession(token: string): Promise<void> {
  const store = await cookies()
  store.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict', // stricter than the public site: no cross-site navigation needs it
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies()
  store.delete(ADMIN_SESSION_COOKIE)
}

export async function getAdminToken(): Promise<string | null> {
  return (await cookies()).get(ADMIN_SESSION_COOKIE)?.value ?? null
}

/** Confirms a token belongs to an admin before we hand it a session. The
 *  backend is the authority; this never decodes the JWT locally. */
export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return false
    const user = (await res.json()) as { role?: string }
    return user.role === 'admin'
  } catch {
    return false
  }
}
