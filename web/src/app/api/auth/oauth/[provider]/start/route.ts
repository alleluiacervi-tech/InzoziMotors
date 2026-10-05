import { NextResponse, type NextRequest } from 'next/server'
import { appleConfig, enabledProviders, googleConfig, redirectUri, type OAuthProvider } from '@/lib/oauth'
import { failure, pkceChallenge, randomToken, writeState, type FlowState } from '@/lib/oauth-flow'
import { sameOriginPath } from '@/lib/same-origin-path'

// GET /api/auth/oauth/:provider/start?next=&role=&reopen=1
// Where the "Continue with Google / Apple" buttons point. A plain link, so it
// works without JavaScript and on every phone browser, and never a popup.
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params
  const url = req.nextUrl
  const next = sameOriginPath(url.searchParams.get('next'), '/dashboard')
  if (provider !== 'google' && provider !== 'apple') return failure('failed', next)
  if (!enabledProviders()[provider as OAuthProvider]) return failure('unavailable', next, provider as OAuthProvider)

  const roleParam = url.searchParams.get('role')
  const flow: FlowState = {
    provider: provider as OAuthProvider,
    state: randomToken(),
    nonce: randomToken(),
    next,
    role: roleParam === 'seller' || roleParam === 'buyer' ? roleParam : undefined,
    reopen: url.searchParams.get('reopen') === '1',
    at: Date.now(),
  }

  let target: URL
  if (flow.provider === 'google') {
    flow.verifier = randomToken(48)
    target = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    target.search = new URLSearchParams({
      client_id: googleConfig().clientId,
      redirect_uri: redirectUri('google'),
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
  } else {
    target = new URL('https://appleid.apple.com/auth/authorize')
    target.search = new URLSearchParams({
      client_id: appleConfig().servicesId,
      redirect_uri: redirectUri('apple'),
      response_type: 'code id_token',
      // Asking for name and email requires form_post.
      response_mode: 'form_post',
      scope: 'name email',
      state: flow.state,
      nonce: flow.nonce,
    }).toString()
  }

  const res = NextResponse.redirect(target, 302)
  writeState(res, flow)
  res.headers.set('Cache-Control', 'no-store')
  return res
}
