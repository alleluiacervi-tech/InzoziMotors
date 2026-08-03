import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_SESSION_COOKIE, BACKEND_URL } from '@/lib/session'

// ─────────────────────────────────────────────────────────────────────────────
// Same-origin proxy to the Sawa API.
//
// The admin dashboard used to hold its JWT in localStorage and in a
// JavaScript-readable cookie, and attach it from the browser. That is the
// highest-privilege token in the system — full pipeline control, plus the
// route that serves national ID scans — sitting in the one place any injected
// script can read it. The public website solved this properly (httpOnly
// cookie, every authenticated call made server-side); the admin app never got
// the same treatment, which is backwards given what it can do.
//
// The token now lives in an httpOnly cookie and is attached HERE, on the
// server. The browser never holds it. Every one of the eighteen client pages
// keeps working unchanged, because they all call through lib/api.ts and only
// its base URL moved.
//
// This proxy is not an authorization boundary — the backend still verifies the
// JWT and the admin role on every request. It exists so the credential never
// has to enter the browser to be used.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ path: string[] }> }

// Hop-by-hop and identity headers we must not blindly forward upstream.
const STRIP_REQUEST = new Set([
  'host', 'connection', 'content-length', 'authorization', 'cookie',
  'accept-encoding', 'transfer-encoding',
])
const STRIP_RESPONSE = new Set([
  'content-encoding', 'content-length', 'transfer-encoding', 'connection',
])

async function proxy(request: Request, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value

  if (!token) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const search = new URL(request.url).search
  const target = `${BACKEND_URL}/${path.map(encodeURIComponent).join('/')}${search}`

  const headers = new Headers()
  request.headers.forEach((value, key) => {
    if (!STRIP_REQUEST.has(key.toLowerCase())) headers.set(key, value)
  })
  headers.set('Authorization', `Bearer ${token}`)

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      // Streamed rather than buffered: the 36-angle photo upload can be tens of
      // megabytes, and reading it into memory first would be a needless spike.
      // `duplex` is required by the spec whenever a stream is the body.
      body: hasBody ? request.body : undefined,
      ...(hasBody ? { duplex: 'half' } : {}),
      redirect: 'manual',
      cache: 'no-store',
    } as RequestInit)
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the Sawa API.' },
      { status: 502 }
    )
  }

  const responseHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (!STRIP_RESPONSE.has(key.toLowerCase())) responseHeaders.set(key, value)
  })
  // Nothing an admin sees is cacheable by anything in between.
  responseHeaders.set('Cache-Control', 'no-store, private')

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const PUT = proxy
export const DELETE = proxy
