import { NextResponse } from 'next/server'
import {
  BACKEND_URL,
  clearAdminSession,
  setAdminSession,
  verifyAdminToken,
} from '@/lib/session'

// ─────────────────────────────────────────────────────────────────────────────
// Admin session lifecycle. The only two places a token is written or cleared.
//
// POST — either credentials (the login form) or an existing token (the hand-off
//        from the public website, which arrives in a URL fragment). Both are
//        proven against the backend before a cookie is issued, and the role is
//        checked here rather than trusted from a decoded payload.
// DELETE — sign out.
//
// The response NEVER contains the token. That is the whole point: the browser
// posts credentials and receives a cookie it cannot read.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: { email?: string; password?: string; token?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // ── Hand-off from the website: a token we must verify before trusting ──
  if (body.token) {
    if (!(await verifyAdminToken(body.token))) {
      return NextResponse.json(
        { error: 'That sign-in link is not valid for an admin account.' },
        { status: 403 }
      )
    }
    await setAdminSession(body.token)
    return NextResponse.json({ ok: true })
  }

  // ── Normal credential sign-in ──
  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: 'Could not reach the Sawa API.' }, { status: 502 })
  }

  const data = (await upstream.json().catch(() => ({}))) as {
    token?: string
    user?: { role?: string; name?: string }
    error?: string
  }

  if (!upstream.ok || !data.token) {
    // Pass the backend's own wording through, including its rate-limit message.
    return NextResponse.json(
      { error: data.error || 'That email and password do not match.' },
      { status: upstream.status === 429 ? 429 : 401 }
    )
  }

  if (data.user?.role !== 'admin') {
    // A valid buyer or seller must not get an operations session.
    return NextResponse.json({ error: 'Admin access only.' }, { status: 403 })
  }

  await setAdminSession(data.token)
  return NextResponse.json({ ok: true, name: data.user?.name ?? null })
}

export async function DELETE() {
  await clearAdminSession()
  return NextResponse.json({ ok: true })
}
