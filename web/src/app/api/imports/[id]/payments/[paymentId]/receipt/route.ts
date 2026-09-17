import { NextResponse } from 'next/server'
import { API_URL } from '@/lib/api'
import { getToken } from '@/lib/session'

// Streams one verified-payment receipt PDF. Same cookie-to-Bearer pattern as
// the sibling routes under api/imports — see
// api/imports/[id]/generated-documents/[kind]/route.ts for why this exists.

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string; paymentId: string }> }

export async function GET(request: Request, ctx: Ctx): Promise<Response> {
  const { id, paymentId } = await ctx.params
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Sign in to view this receipt.' }, { status: 401 })
  }

  const download = new URL(request.url).searchParams.get('download')
  const query = download === '0' ? '?download=0' : ''

  let upstream: Response
  try {
    upstream = await fetch(
      `${API_URL}/imports/${encodeURIComponent(id)}/payments/${encodeURIComponent(paymentId)}/receipt/file${query}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    )
  } catch {
    return NextResponse.json({ error: 'Could not reach Sawa Cars.' }, { status: 502 })
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: upstream.status === 404 ? 'Receipt not found.' : 'Could not load the receipt.' },
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
