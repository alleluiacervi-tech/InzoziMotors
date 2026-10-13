'use server'

import { devices, ApiError, type PushTestResult, type WebPushSubscriptionJSON } from '@/lib/api'
import { getServerT } from '@/lib/i18n/server'
import { getToken } from '@/lib/session'
import { forgetPushEndpoint, rememberPushEndpoint } from '@/lib/web-push-session'

// Browser notifications (G13). The browser creates the subscription; these
// actions hand it to the API with the session the browser cannot read.

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

const KEY_RE = /^[A-Za-z0-9_-]+={0,2}$/

function isSubscription(value: unknown): value is WebPushSubscriptionJSON {
  const sub = value as WebPushSubscriptionJSON | null
  return (
    typeof sub?.endpoint === 'string' &&
    sub.endpoint.startsWith('https://') &&
    sub.endpoint.length <= 1024 &&
    typeof sub.keys?.p256dh === 'string' &&
    KEY_RE.test(sub.keys.p256dh) &&
    typeof sub.keys?.auth === 'string' &&
    KEY_RE.test(sub.keys.auth)
  )
}

async function failure(err: unknown): Promise<{ ok: false; error: string }> {
  const t = await getServerT()
  if (err instanceof ApiError && err.status === 401) return { ok: false, error: t('dashboard.errors.sessionExpired') }
  return { ok: false, error: t('dashboard.push.error') }
}

export async function webPushStatusAction(endpoint: string): Promise<Result<{ subscribed: boolean }>> {
  const token = await getToken()
  if (!token || typeof endpoint !== 'string' || !endpoint) return { ok: true, subscribed: false }
  try {
    const { subscribed } = await devices.webPushStatus(token, endpoint)
    return { ok: true, subscribed }
  } catch (err) {
    return failure(err)
  }
}

export async function enableWebPushAction(subscription: unknown): Promise<Result> {
  const token = await getToken()
  if (!token) return failure(new ApiError('', 401))
  if (!isSubscription(subscription)) return failure(null)
  try {
    await devices.saveWebPush(token, {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    })
    await rememberPushEndpoint(subscription.endpoint)
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}

export async function disableWebPushAction(endpoint: string): Promise<Result> {
  const token = await getToken()
  if (!token) return failure(new ApiError('', 401))
  if (typeof endpoint !== 'string' || !endpoint) return failure(null)
  try {
    await devices.deleteWebPush(token, endpoint)
    await forgetPushEndpoint()
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}

export async function sendTestPushAction(): Promise<Result<{ result: PushTestResult }>> {
  const token = await getToken()
  if (!token) return failure(new ApiError('', 401))
  try {
    return { ok: true, result: await devices.test(token) }
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) return { ok: false, error: err.message }
    return failure(err)
  }
}
