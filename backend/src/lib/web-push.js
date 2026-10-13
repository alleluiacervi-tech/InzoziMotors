const webpush = require('web-push');
const pool = require('../db');
const { log } = require('./log');

// Web Push delivery for sawacars.com (G13 in docs/WEB-PARITY-PLAN.md).
//
// Ships OFF: nothing is sent, and GET /devices/web-push/config answers
// { enabled: false } so the website hides its toggle, until all three of
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT are set. Generate the
// pair once with `npx web-push generate-vapid-keys`; changing it later
// invalidates every browser subscription.
//
// Same contract as lib/push.js: best-effort, never throws, so a dead push
// service cannot fail the business write that triggered the notification.

// The server POSTs to whatever endpoint a browser hands it, so the endpoint is
// attacker-controlled input: without this list a subscription pointing at an
// internal address would turn every notification into a request from the API
// container (SSRF). These are the push services the major browsers use:
// Chrome, Samsung Internet and Opera (FCM), Firefox (Mozilla autopush),
// Safari 16+ (Apple), Edge (WNS).
const PUSH_HOSTS = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
];

const MAX_ENDPOINT = 1024;
const KEY_RE = /^[A-Za-z0-9_-]+={0,2}$/;
const TTL_SECONDS = 24 * 60 * 60;   // a day-old "new message" is still worth showing
const MAX_BODY = 600;               // payload limit is ~4 KB after encryption

function config() {
  const publicKey = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const subject = (process.env.VAPID_SUBJECT || '').trim();
  if (!publicKey || !privateKey || !/^(mailto:|https:\/\/)/.test(subject)) return null;
  return { publicKey, privateKey, subject };
}

function webPushConfigured() {
  return config() !== null;
}

function webPushPublicKey() {
  return config()?.publicKey || null;
}

function allowedEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint || endpoint.length > MAX_ENDPOINT) return false;
  let url;
  try { url = new URL(endpoint); } catch { return false; }
  if (url.protocol !== 'https:' || url.port || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return PUSH_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/** Validates a PushSubscription as the browser serialises it. Returns the
 *  normalised row fields, or null. */
function parseSubscription(sub) {
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!allowedEndpoint(endpoint)) return null;
  if (typeof p256dh !== 'string' || p256dh.length > 200 || !KEY_RE.test(p256dh)) return null;
  if (typeof auth !== 'string' || auth.length > 100 || !KEY_RE.test(auth)) return null;
  return { endpoint, p256dh, auth };
}

// Only ids and the type travel to the browser; the service worker turns them
// into a website URL. Anything else in meta (amounts, names) stays server-side.
const DATA_KEYS = ['type', 'conversationId', 'carId', 'submissionId', 'importOrderId', 'inquiryId', 'bookingId', 'disputeId'];

function buildPayload({ title, body, data } = {}) {
  const clean = {};
  for (const key of DATA_KEYS) {
    const value = data?.[key];
    if (typeof value === 'string' && value.length <= 64) clean[key] = value;
  }
  const text = String(body || '');
  return JSON.stringify({
    title: String(title || 'Sawa Cars').slice(0, 120),
    body: text.length > MAX_BODY ? `${text.slice(0, MAX_BODY - 1)}…` : text,
    // One notification per conversation: a burst of messages replaces rather
    // than stacks on the lock screen.
    tag: clean.conversationId ? `conversation:${clean.conversationId}` : undefined,
    data: clean,
  });
}

let sender = (subscription, payload, options) => webpush.sendNotification(subscription, payload, options);

/** Sends one notification to the given subscription rows
 *  ({ endpoint, p256dh, auth }). Returns one result per row:
 *  { endpoint, ok, error?, status? }. Prunes subscriptions the push service
 *  says are gone. */
async function sendWebPushDetailed(rows, message) {
  const cfg = config();
  const subs = (Array.isArray(rows) ? rows : []).filter((r) => r && allowedEndpoint(r.endpoint));
  if (!cfg || !subs.length) return [];

  const payload = buildPayload(message);
  const options = {
    TTL: TTL_SECONDS,
    urgency: 'high',
    timeout: 10000,
    vapidDetails: { subject: cfg.subject, publicKey: cfg.publicKey, privateKey: cfg.privateKey },
  };

  return Promise.all(subs.map(async (row) => {
    const subscription = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
    try {
      await sender(subscription, payload, options);
      markSuccess(row.endpoint);
      return { endpoint: row.endpoint, ok: true };
    } catch (err) {
      const status = err?.statusCode || null;
      if (status === 404 || status === 410) {
        await pruneSubscription(row.endpoint);
        return { endpoint: row.endpoint, ok: false, status, error: 'Expired' };
      }
      // 401/403 mean the VAPID pair is wrong or was rotated: no browser will
      // receive anything until it is fixed, so this is an error, not a warning.
      if (status === 401 || status === 403) log.error('web push rejected credentials', { status });
      else log.warn('web push error', { status, error: err?.message });
      return { endpoint: row.endpoint, ok: false, status, error: status ? `Http${status}` : 'NetworkError' };
    }
  }));
}

async function sendWebPushToUsers(userIds, message) {
  if (!webPushConfigured()) return 0;
  const ids = [...new Set((Array.isArray(userIds) ? userIds : []).filter(Boolean))];
  if (!ids.length) return 0;
  const { rows } = await pool.query(
    'SELECT endpoint, p256dh, auth FROM web_push_subscriptions WHERE user_id = ANY($1::uuid[])',
    [ids]
  );
  const results = await sendWebPushDetailed(rows, message);
  return results.filter((r) => r.ok).length;
}

function markSuccess(endpoint) {
  pool.query('UPDATE web_push_subscriptions SET last_success_at = NOW() WHERE endpoint = $1', [endpoint])
    .catch(() => {});
}

async function pruneSubscription(endpoint) {
  try {
    await pool.query('DELETE FROM web_push_subscriptions WHERE endpoint = $1', [endpoint]);
  } catch (err) {
    log.error('prune web push subscription error', { error: err.message });
  }
}

function _setSenderForTests(fn) {
  sender = fn;
}

module.exports = {
  webPushConfigured,
  webPushPublicKey,
  parseSubscription,
  allowedEndpoint,
  buildPayload,
  sendWebPushDetailed,
  sendWebPushToUsers,
  pruneSubscription,
  _setSenderForTests,
};
