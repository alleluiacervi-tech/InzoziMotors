import 'server-only'
import { headers } from 'next/headers'
import { setForwardedHeadersResolver } from './api'

// ─────────────────────────────────────────────────────────────────────────────
// Who the visitor is, for the API (see setForwardedHeadersResolver in api.ts).
//
// Caddy strips any X-Forwarded-For a browser sends and writes the one address
// it settled on (ops/caddy/sawacars.Caddyfile), so the first entry here is the
// visitor. The API trusts exactly one hop, which on the container network is
// this server, so the address sent here is the address it records: for
// sign-in rate limits, sign-up screening and the team's Network view.
// ─────────────────────────────────────────────────────────────────────────────

setForwardedHeadersResolver(async () => {
  let incoming: Headers
  try {
    incoming = await headers()
  } catch {
    // Outside a request (build, a background task): nobody to forward.
    return {}
  }
  const out: Record<string, string> = {}
  const ip = incoming.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (ip) out['X-Forwarded-For'] = ip
  const country = incoming.get('cf-ipcountry')
  if (country) out['CF-IPCountry'] = country
  const agent = incoming.get('user-agent')
  if (agent) out['User-Agent'] = agent.slice(0, 300)
  return out
})
