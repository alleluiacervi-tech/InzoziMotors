/* Sawa Cars service worker: browser notifications only (G13 in
 * docs/WEB-PARITY-PLAN.md). There is deliberately no fetch handler and no
 * offline cache: every page is live data, and a stale cached listing would be
 * a wrong price. Registered by the notifications toggle and the install card.
 *
 * Push payloads (backend/src/lib/web-push.js) carry a title, a body and ids
 * only; the URL a tap opens is resolved by /dashboard/notifications/open. */

const ID_KEYS = ['type', 'conversationId', 'carId', 'submissionId', 'importOrderId', 'inquiryId', 'rentalCarId', 'bookingId', 'disputeId']

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }
  const data = payload.data && typeof payload.data === 'object' ? payload.data : {}
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Sawa Cars', {
      body: payload.body || '',
      icon: '/brand/app-icon.png',
      badge: '/icon',
      tag: payload.tag || undefined,
      renotify: Boolean(payload.tag),
      data,
    })
  )
})

function targetUrl(data) {
  const params = new URLSearchParams()
  for (const key of ID_KEYS) {
    if (typeof data[key] === 'string' && data[key]) params.set(key, data[key])
  }
  const query = params.toString()
  return `/dashboard/notifications/open${query ? `?${query}` : ''}`
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(targetUrl(event.notification.data || {}), self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // Reuse an open Sawa Cars tab rather than stacking new ones.
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          await client.focus()
          if ('navigate' in client) return client.navigate(url)
          return undefined
        }
      }
      return self.clients.openWindow(url)
    })()
  )
})

// The browser rotated the subscription: make a new one with the same key and
// tell the site, or notifications stop without anyone noticing.
self.addEventListener('pushsubscriptionchange', (event) => {
  const oldSub = event.oldSubscription
  const key = oldSub && oldSub.options && oldSub.options.applicationServerKey
  if (!key) return
  event.waitUntil(
    (async () => {
      const sub = event.newSubscription ||
        (await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }))
      await fetch('/api/push/subscription', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldEndpoint: oldSub.endpoint, subscription: sub.toJSON() }),
      })
    })().catch(() => {})
  )
})
