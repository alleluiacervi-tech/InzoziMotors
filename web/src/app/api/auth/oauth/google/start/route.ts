import { NextResponse, type NextRequest } from 'next/server'
import { googleConfig, googleEnabled, googleRedirectUri } from '@/lib/oauth'
import { failure, pkceChallenge, randomToken, writeState, type FlowState } from '@/lib/oauth-flow'
import { sameOriginPath } from '@/lib/same-origin-path'

// GET /api/auth/oauth/google/start?next=&role=&reopen=1
// Where the "Continue with Google" button points. A plain link, so it works
// without JavaScript and on every phone browser, and never a popup.
export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const next = sameOriginPath(url.searchParams.get('next'), '/dashboard')
  if (!googleEnabled()) return failure('unavailable', next)

  const roleParam = url.searchParams.get('role')
  const flow: FlowState = {
    state: randomToken(),
    nonce: randomToken(),
    verifier: randomToken(48),
    next,
    role: roleParam === 'seller' || roleParam === 'buyer' ? roleParam : undefined,
    reopen: url.searchParams.get('reopen') === '1',
    at: Date.now(),
  }

  const target = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  target.search = new URLSearchParams({
    client_id: googleConfig().clientId,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: pkceChallenge(flow.verifier),
    code_challenge_method: 'S256',
    // Always show the account chooser: on a shared family laptop the
    // signed-in Google account is often not the person at the keyboard.
    prompt: 'select_account',
  }).toString()

  const res = NextResponse.redirect(target, 302)
  writeState(res, flow)
  res.headers.set('Cache-Control', 'no-store')
  return res
}
