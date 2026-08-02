import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/session'
import { safePath } from '@/app/(auth)/_lib/params'

// ─────────────────────────────────────────────────────────────────────────────
// Session teardown for a cookie the backend no longer accepts.
//
// The bug this exists to kill: middleware.ts guards /dashboard on the mere
// PRESENCE of the session cookie, while the dashboard layout guards on whether
// the backend still honours the JWT inside it. A cookie that is present but
// stale — expired after 30 days, invalidated by a JWT_SECRET rotation, or left
// behind by a deleted account — satisfied the first check and failed the
// second, so the two guards bounced the request between /dashboard and /signin
// until the browser gave up with ERR_TOO_MANY_REDIRECTS. The user could not
// even reach the sign-in page to fix it without clearing cookies by hand.
//
// Deleting the cookie is the only thing that breaks the cycle, and it cannot be
// done from a Server Component render — only from a Route Handler or a Server
// Action. Hence this route: the layout sends stale sessions here, the cookie is
// expired on the response, and the redirect to /signin then passes the
// middleware cleanly because there is no longer a cookie to misread.
//
// Not in the middleware matcher, so it is reached without interference.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  const url = new URL(request.url)
  const next = safePath(url.searchParams.get('next') ?? '', '/dashboard')

  const signIn = new URL('/signin', url.origin)
  signIn.searchParams.set('next', next)
  // Lets the sign-in page explain the bounce rather than appearing for no reason.
  signIn.searchParams.set('expired', '1')

  const response = NextResponse.redirect(signIn)
  // Set rather than delete: an explicit already-expired cookie on the same path
  // is the one instruction every browser honours, including when the original
  // was written with attributes we would otherwise have to match exactly.
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return response
}
