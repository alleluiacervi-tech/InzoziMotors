import 'server-only'
import crypto from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth as authApi, ApiError } from './api'
import { setSession } from './session'
import { sameOriginPath } from './same-origin-path'
import { siteUrl, type OAuthProvider } from './oauth'

// ─────────────────────────────────────────────────────────────────────────────
// The website's half of "Continue with Google / Apple".
//
// start  → a random state, a nonce and (for Google) a PKCE verifier go into a
//          short-lived httpOnly cookie, and the browser is sent to the provider
// back   → the callback checks the returned state against that cookie, gets an
//          ID token (Google: by exchanging the code server-side; Apple: posted
//          straight back), and hands it to the backend, which verifies it and
//          answers with a session token. That token becomes the same httpOnly
//          session cookie a password sign-in sets; the browser never sees it.
//
// Apple returns with a cross-site POST (response_mode=form_post), and a
// SameSite=Lax cookie is not sent on one, so on HTTPS the state cookie is
// SameSite=None; Secure. It holds nothing worth stealing — random values that
// are useless once this one round trip ends — and lives ten minutes.
// ─────────────────────────────────────────────────────────────────────────────

export const STATE_COOKIE = 'sawa_oauth'
const STATE_TTL_MS = 10 * 60 * 1000
const COOKIE_PATH = '/api/auth/oauth'

export type FlowState = {
  provider: OAuthProvider
  state: string
  nonce: string
  verifier?: string
  next: string
  role?: 'buyer' | 'seller'
  reopen?: boolean
  at: number
}

const b64url = (buf: Buffer) => buf.toString('base64url')
export const randomToken = (bytes = 32) => b64url(crypto.randomBytes(bytes))
export const pkceChallenge = (verifier: string) => b64url(crypto.createHash('sha256').update(verifier).digest())

function cookieOptions() {
  const secure = siteUrl().startsWith('https://')
  return {
    httpOnly: true,
    secure,
    sameSite: (secure ? 'none' : 'lax') as 'none' | 'lax',
    path: COOKIE_PATH,
    maxAge: STATE_TTL_MS / 1000,
  }
}

export function writeState(res: NextResponse, flow: FlowState) {
  res.cookies.set(STATE_COOKIE, b64url(Buffer.from(JSON.stringify(flow))), cookieOptions())
}

/** The flow this callback belongs to, or null when it is missing, stale, for
 *  another provider, or its state does not match. */
export function readState(req: NextRequest, provider: OAuthProvider, returnedState: string | null): FlowState | null {
  const raw = req.cookies.get(STATE_COOKIE)?.value
  if (!raw || !returnedState) return null
  let flow: FlowState
  try {
    flow = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (flow.provider !== provider || Date.now() - flow.at > STATE_TTL_MS) return null
  const a = Buffer.from(String(flow.state))
  const b = Buffer.from(String(returnedState))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  return { ...flow, next: sameOriginPath(flow.next, '/dashboard') }
}

function clearState(res: NextResponse) {
  res.cookies.set(STATE_COOKIE, '', { ...cookieOptions(), maxAge: 0 })
}

/** 303 so that Apple's POST becomes a GET on the page we land on. */
function go(path: string): NextResponse {
  const res = NextResponse.redirect(new URL(path, siteUrl()), 303)
  clearState(res)
  return res
}

export function failure(code: string, next = '/dashboard', provider?: OAuthProvider): NextResponse {
  const params = new URLSearchParams({ oauth_error: code })
  if (provider) params.set('provider', provider)
  if (next && next !== '/dashboard') params.set('next', next)
  return go(`/signin?${params.toString()}`)
}

/** Hand the provider's ID token to the backend and finish the sign-in. */
export async function complete(
  provider: OAuthProvider,
  flow: FlowState,
  token: { id_token: string; full_name?: string | null; authorization_code?: string | null },
): Promise<NextResponse> {
  try {
    const result = await authApi.oauth(provider, {
      ...token,
      nonce: flow.nonce,
      role: flow.role,
      reopen: flow.reopen || undefined,
    })
    await setSession(result.token)
    revalidatePath('/', 'layout')
    // A provider gives a name and an email but never a phone number, and has
    // not asked "buying or selling?". Both are one short step away.
    if (result.needs_profile) {
      const params = new URLSearchParams({ next: flow.next })
      if (flow.role) params.set('role', flow.role)
      return go(`/signup/complete?${params.toString()}`)
    }
    return go(flow.next)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === 'ACCOUNT_CLOSED') {
        const until = typeof err.data?.reopen_until === 'string' ? err.data.reopen_until.slice(0, 10) : ''
        const params = new URLSearchParams({ closed: provider, until })
        if (flow.next !== '/dashboard') params.set('next', flow.next)
        return go(`/signin?${params.toString()}`)
      }
      const known: Record<string, string> = {
        EMAIL_IN_USE: 'email_in_use',
        EMAIL_REQUIRED: 'email_required',
        ADMIN_PASSWORD_ONLY: 'staff',
        ACCOUNT_UNAVAILABLE: 'unavailable_account',
        ACCOUNT_PURGED: 'purged',
        PROVIDER_DISABLED: 'unavailable',
        JWKS_UNAVAILABLE: 'unavailable',
      }
      return failure((err.code && known[err.code]) || 'failed', flow.next, provider)
    }
    return failure('failed', flow.next, provider)
  }
}
