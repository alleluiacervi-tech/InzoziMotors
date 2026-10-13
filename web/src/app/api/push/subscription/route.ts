import { NextResponse, type NextRequest } from 'next/server'
import { ApiError, devices, type WebPushSubscriptionJSON } from '@/lib/api'
import { siteUrl } from '@/lib/oauth'
import { getToken } from '@/lib/session'
import { PUSH_ENDPOINT_COOKIE, rememberPushEndpoint } from '@/lib/web-push-session'

// PUT { oldEndpoint, subscription } — called by public/sw.js when the browser
// rotates a push subscription (`pushsubscriptionchange`). Without it the API
// keeps the dead endpoint and this browser silently stops getting
// notifications. A service worker cannot call a Server Action, so this is the
// one route handler; the session cookie rides along on the same-origin fetch.
//
// Only a subscription this browser had turned on is replaced: the old
// endpoint must match the one remembered at sign-in, so a stray call can
// neither subscribe a browser nobody asked for nor move someone else's.

const KEY_RE = /^[A-Za-z0-9_-]+={0,2}$/

function isSubscription(value: unknown): value is WebPushSubscriptionJSON {
  const sub = value as WebPushSubscriptionJSON | null
  return (
    typeof sub?.endpoint === 'string' &&
    sub.endpoint.startsWith('https://') &&
    sub.endpoint.length <= 1024 &&
    typeof sub.keys?.p256dh === 'string' && KEY_RE.test(sub.keys.p256dh) &&
    typeof sub.keys?.auth === 'string' && KEY_RE.test(sub.keys.auth)
  )
}

export async function PUT(req: NextRequest) {
  if (req.headers.get('origin') !== new URL(siteUrl()).origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const token = await getToken()
  const remembered = req.cookies.get(PUSH_ENDPOINT_COOKIE)?.value
  if (!token || !remembered) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const oldEndpoint = typeof body?.oldEndpoint === 'string' ? body.oldEndpoint : null
  if (!isSubscription(body?.subscription) || (oldEndpoint && oldEndpoint !== remembered)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  try {
    await devices.saveWebPush(token, body.subscription)
    if (remembered !== body.subscription.endpoint) {
      await devices.deleteWebPush(token, remembered).catch(() => {})
    }
    await rememberPushEndpoint(body.subscription.endpoint)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const status = err instanceof ApiError && err.status >= 400 && err.status < 500 ? err.status : 502
    return NextResponse.json({ error: 'Could not save the subscription' }, { status })
  }
}
