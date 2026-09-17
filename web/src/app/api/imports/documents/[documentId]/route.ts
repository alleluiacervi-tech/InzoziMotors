import { NextResponse } from 'next/server'
import { API_URL } from '@/lib/api'
import { getToken } from '@/lib/session'

// Streams one supporting import document (supplier invoice, inspection
// report, bill of lading, etc.) that an admin marked customer-visible. Same
// cookie-to-Bearer pattern as the sibling routes under api/imports.

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ documentId: string }> }

export async function GET(_request: Request, ctx: Ctx): Promise<Response> {
  const { documentId } = await ctx.params
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Sign in to view this document.' }, { status: 401 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${API_URL}/imports/documents/${encodeURIComponent(documentId)}/file`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
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
  for (const name of ['content-type', 'referrer-policy', 'x-content-type-options']) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }
  headers.set('Cache-Control', 'no-store, private')

  return new NextResponse(upstream.body, { status: 200, headers })
}
