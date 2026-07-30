import { NextResponse } from 'next/server'
import { getCurrentUser, getToken } from '@/lib/session'

// ─────────────────────────────────────────────────────────────────────────────
// Admin hand-off — lets an admin who signed in through the normal website
// navbar jump into the admin dashboard without logging in twice.
//
// The JWT lives in an httpOnly cookie the browser can't read, so the hand-off
// happens here on the server: verify the caller really is an admin, then
// redirect to the dashboard's login page with the token in the URL FRAGMENT.
// Fragments are never sent to any server or logged in access logs; the login
// page consumes it client-side and immediately strips it from history.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'

export async function GET(request: Request) {
  const token = await getToken()
  const user = await getCurrentUser()

  if (!token || !user) {
    return NextResponse.redirect(new URL('/signin?next=/admin-portal', request.url))
  }
  if (user.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return NextResponse.redirect(`${ADMIN_URL}/login#token=${encodeURIComponent(token)}`)
}
