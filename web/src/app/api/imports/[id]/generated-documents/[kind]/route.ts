import { NextResponse } from 'next/server'
import { API_URL } from '@/lib/api'
import { getToken } from '@/lib/session'

// ─────────────────────────────────────────────────────────────────────────────
// Streams one generated import document (quotation, agreement, deposit
// invoice) to its entitled reader. Same pattern as
// api/documents/[id]/route.ts: the backend only accepts a Bearer JWT, the
// web keeps that JWT in an httpOnly cookie precisely so client-side
// JavaScript can never read it, so a plain <a href> download link cannot
// attach it — this route reads the cookie server-side and attaches the
// header for that one request.
//
// Before this route existed, `generated_documents` came back in the
// `/imports/:id` payload and no web page ever rendered a link to it: a
// buyer had no in-product way to see their own quotation or agreement PDF.
// See docs/IMPORTS-AUDIT.md, P0.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string; kind: string }> }

export async function GET(request: Request, ctx: Ctx): Promise<Response> {
  const { id, kind } = await ctx.params
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Sign in to view this document.' }, { status: 401 })
  }

  const download = new URL(request.url).searchParams.get('download')
  const query = download === '0' ? '?download=0' : ''

  let upstream: Response
  try {
    upstream = await fetch(
      `${API_URL}/imports/${encodeURIComponent(id)}/generated-documents/${encodeURIComponent(kind)}/file${query}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    )
  } catch {
    return NextResponse.json({ error: 'Could not reach Sawa Cars.' }, { status: 502 })
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: upstream.status === 404 ? 'Document not found.' : 'Could not load the document.' },
      { status: upstream.status }
    )
  }

  const headers = new Headers()
  for (const name of ['content-type', 'content-disposition', 'referrer-policy', 'x-content-type-options']) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }
  headers.set('Cache-Control', 'no-store, private')

  return new NextResponse(upstream.body, { status: 200, headers })
}
