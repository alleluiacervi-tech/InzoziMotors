import { NextResponse } from 'next/server'
import { API_URL } from '@/lib/api'
import { getToken } from '@/lib/session'

// ─────────────────────────────────────────────────────────────────────────────
// Streams one inspection report PDF to its entitled reader.
//
// The backend's report route only accepts `Authorization: Bearer <jwt>`
// (backend/src/middleware/auth.js) — it has no cookie or query-token
// fallback, on purpose. The web keeps that JWT in an httpOnly cookie
// (lib/session.ts) precisely so client-side JavaScript can never read it,
// which also means a plain `<a href>` download link cannot attach it. This
// route reads the cookie server-side and attaches the header for that one
// request, so the browser never needs the token at all.
//
// Scoped to exactly one backend route, not a general proxy: the backend
// itself still decides who may read which report (owner, or a live
// report_entitlements row — see GET /inspections/:id/report/customer-file),
// so a stranger's id here still 404s upstream. This route only removes the
// "how does the header get attached" problem.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Sign in to view this report.' }, { status: 401 })
  }

  // Forwarded verbatim: ?download=1 asks the backend for Content-Disposition:
  // attachment instead of inline, same distinction the admin console uses.
  const download = new URL(request.url).searchParams.get('download')
  const query = download === '1' ? '?download=1' : ''

  let upstream: Response
  try {
    upstream = await fetch(`${API_URL}/inspections/${encodeURIComponent(id)}/report/customer-file${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: 'Could not reach Sawa Cars.' }, { status: 502 })
  }

  if (!upstream.ok) {
    // 404 on a mismatch too — the backend deliberately never reveals whether
    // an inspection exists to someone without a live entitlement to it.
    return NextResponse.json(
      { error: upstream.status === 404 ? 'Report not found.' : 'Could not load the report.' },
      { status: upstream.status }
    )
  }

  const headers = new Headers()
  for (const name of ['content-type', 'content-disposition', 'referrer-policy', 'x-content-type-options']) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }
  // A report reflects the entitlement checked at request time — never cached
  // by anything in between, the same rule the admin proxy applies.
  headers.set('Cache-Control', 'no-store, private')

  return new NextResponse(upstream.body, { status: 200, headers })
}
