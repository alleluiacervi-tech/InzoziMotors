import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  // Token is stored client-side; the middleware just guards SSR navigation.
  // The real auth check happens in the client layout via the API /auth/me call.
  // If a user manually hits a protected page without JS (e.g. curl), they get redirected.
  const token = req.cookies.get('inzozi_admin_token')?.value
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next|favicon.ico|login).*)'] }
