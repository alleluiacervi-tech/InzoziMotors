import type { NextRequest } from 'next/server'
import { googleConfig, googleRedirectUri } from '@/lib/oauth'
import { complete, failure, readState } from '@/lib/oauth-flow'

// GET /api/auth/oauth/google/callback?code=&state=
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  if (params.get('error')) {
    // access_denied: they closed the chooser or said no. Not an error to them.
    return failure(params.get('error') === 'access_denied' ? 'cancelled' : 'failed')
  }
  const flow = readState(req, params.get('state'))
  if (!flow) return failure('expired')
  const code = params.get('code')
  if (!code) return failure('failed', flow.next)

  // The code is worth nothing without our client secret and the PKCE verifier
  // only this server holds, so an intercepted redirect cannot be replayed.
  const { clientId, clientSecret } = googleConfig()
  let idToken: string | undefined
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: googleRedirectUri(),
        grant_type: 'authorization_code',
        code_verifier: flow.verifier,
      }).toString(),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) console.error('google code exchange failed:', res.status, body.error)
    idToken = typeof body.id_token === 'string' ? body.id_token : undefined
  } catch (err) {
    console.error('google code exchange error:', (err as Error).message)
  }
  if (!idToken) return failure('failed', flow.next)
  return complete(flow, idToken)
}
