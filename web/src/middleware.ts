import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'inzozi_session'

/**
 * Edge guard for the dashboard.
 *
 * This is a fast redirect for the common case, NOT the security boundary — the
 * cookie's mere presence is checked here, while its validity is proven by the
 * backend on every authenticated call (`requireAuth` verifies the JWT). A
 * forged cookie gets past this middleware and then fails at the API, which is
 * the correct place for it to fail.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSession = request.cookies.has(SESSION_COOKIE)

  if (pathname.startsWith('/dashboard') && !hasSession) {
    const signIn = new URL('/signin', request.url)
    // Bring them back to what they were reaching for after sign-in
    signIn.searchParams.set('next', pathname + search)
    return NextResponse.redirect(signIn)
  }

  // A signed-in visitor has no use for the auth screens
  if (hasSession && (pathname === '/signin' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/signin', '/signup'],
}
