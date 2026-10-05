import crypto from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth as authApi, ApiError } from '@/lib/api'
import { googleEnabled, siteUrl } from '@/lib/oauth'
import { setSession } from '@/lib/session'
import { sameOriginPath } from '@/lib/same-origin-path'

// ─────────────────────────────────────────────────────────────────────────────
// Google One Tap: the account chooser Google draws in the corner of the page
// (components/auth/GoogleOneTap.tsx). Two halves, one URL:
//
//   GET   a nonce for this browser, kept in an httpOnly cookie scoped to this
//         path. Google writes it into the ID token it issues, so a token is
//         only accepted together with the cookie of the browser it was made
//         for: a token lifted from somewhere else is useless here.
//   POST  { credential, next } — the ID token Google handed the page. The
//         backend verifies it exactly as for the redirect flow (signature,
//         issuer, audience, expiry, nonce) and answers with the session token,
//         which becomes the same httpOnly cookie as any other sign-in.
//
// Only this site's own pages may post here: the Origin header must be ours,
// and the JSON body forces a CORS preflight on anything cross-site.
// ─────────────────────────────────────────────────────────────────────────────

const NONCE_COOKIE = 'sawa_onetap'
const COOKIE_PATH = '/api/auth/oauth/google/one-tap'
// Long enough for a prompt left open while someone reads the page.
const NONCE_TTL_SECONDS = 30 * 60

function cookieOptions() {
  return {
    httpOnly: true,
    secure: siteUrl().startsWith('https://'),
    sameSite: 'strict' as const,
    path: COOKIE_PATH,
    maxAge: NONCE_TTL_SECONDS,
  }
}

const json = (body: unknown, status = 200) => {
  const res = NextResponse.json(body, { status })
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export async function GET(req: NextRequest) {
  if (!googleEnabled()) return json({ error: 'unavailable' }, 404)
  // One nonce per browser while it lasts, so two open tabs do not invalidate
  // each other's prompt. Spent (cleared) by the first sign-in that uses it.
  const existing = req.cookies.get(NONCE_COOKIE)?.value
  const nonce = existing && /^[A-Za-z0-9_-]{43}$/.test(existing)
    ? existing
    : crypto.randomBytes(32).toString('base64url')
  const res = json({ nonce })
  res.cookies.set(NONCE_COOKIE, nonce, cookieOptions())
  return res
}

const SIGNIN_ERRORS: Record<string, string> = {
  EMAIL_IN_USE: 'email_in_use',
  EMAIL_REQUIRED: 'email_required',
  ADMIN_PASSWORD_ONLY: 'staff',
  ACCOUNT_UNAVAILABLE: 'unavailable_account',
  ACCOUNT_PURGED: 'purged',
  PROVIDER_DISABLED: 'unavailable',
  JWKS_UNAVAILABLE: 'unavailable',
}

function signinWith(params: Record<string, string>, next: string): string {
  const query = new URLSearchParams(params)
  if (next !== '/') query.set('next', next)
  return `/signin?${query.toString()}`
}

export async function POST(req: NextRequest) {
  if (!googleEnabled()) return json({ error: 'unavailable' }, 404)
  if (req.headers.get('origin') !== new URL(siteUrl()).origin) {
    return json({ error: 'forbidden' }, 403)
  }

  const body = await req.json().catch(() => null)
  const credential = typeof body?.credential === 'string' ? body.credential : ''
  const next = sameOriginPath(body?.next, '/')
  const nonce = req.cookies.get(NONCE_COOKIE)?.value

  const respond = (payload: Record<string, unknown>, status = 200) => {
    const res = json(payload, status)
    // Spent, whatever the outcome: one nonce, one attempt.
    res.cookies.delete({ name: NONCE_COOKIE, path: COOKIE_PATH })
    return res
  }

  if (!credential || !nonce) {
    return respond({ redirect: signinWith({ oauth_error: 'expired' }, next) }, 400)
  }

  try {
    const result = await authApi.oauthGoogle({ id_token: credential, nonce })
    await setSession(result.token)
    revalidatePath('/', 'layout')
    // A brand-new account gets the one short step Google cannot answer for
    // it: a phone number and buying-or-selling. Everyone else stays put.
    if (result.needs_profile) {
      return respond({ redirect: `/signup/complete?${new URLSearchParams({ next }).toString()}` })
    }
    return respond({ ok: true })
  } catch (err) {
    if (err instanceof ApiError && err.code === 'ACCOUNT_CLOSED') {
      const until = typeof err.data?.reopen_until === 'string' ? err.data.reopen_until.slice(0, 10) : ''
      return respond({ redirect: signinWith({ closed: 'google', until }, next) }, 403)
    }
    const code = err instanceof ApiError && err.code ? SIGNIN_ERRORS[err.code] : undefined
    return respond({ redirect: signinWith({ oauth_error: code || 'failed' }, next) }, err instanceof ApiError ? err.status || 400 : 502)
  }
}
