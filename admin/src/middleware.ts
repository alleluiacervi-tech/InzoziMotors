import { NextRequest, NextResponse } from 'next/server'

// Duplicated rather than imported from lib/session, which is 'server-only' and
// cannot be pulled into the Edge middleware bundle.
const SESSION_COOKIE = 'sawa_admin_session'

// /login is public, and the two route handlers under /api must never be
// redirected — they ARE the sign-in and proxy mechanism, and each enforces its
// own auth (the proxy 401s without a cookie).
const PUBLIC_PATHS = ['/login', '/api/session']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  // A fast redirect for the common case, NOT the security boundary: this only
  // sees that a cookie exists. The backend verifies the JWT and the admin role
  // on every proxied request, which is the correct place for it to fail.
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

// Route handlers under /api/backend still pass through so an expired session
// gets a clean 401 the client can act on, rather than an HTML redirect body.
export const config = { matcher: ['/((?!_next|favicon.ico|login|api/).*)'] }
