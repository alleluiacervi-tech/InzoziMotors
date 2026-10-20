const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendExpoPushDetailed, fetchReceipts, pruneToken } = require('../lib/push');
const {
  webPushConfigured, webPushPublicKey, parseSubscription, sendWebPushDetailed,
} = require('../lib/web-push');

const router = express.Router();

const TOKEN_RE = /^ExponentPushToken\[.+\]$/;
const PLATFORMS = ['ios', 'android', 'web'];

// POST /devices/token — register (or refresh) this device's Expo push token
router.post('/token', requireAuth, async (req, res) => {
  const { token, platform } = req.body;
  if (!token || !TOKEN_RE.test(token)) {
    return res.status(400).json({ error: 'token must be a valid Expo push token' });
  }
  if (platform && !PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `platform must be one of: ${PLATFORMS.join(', ')}` });
  }
  try {
    // A phone can change hands or be re-used after logout — the token always
    // follows whoever logged in last, so pushes never reach the wrong account.
    const { rows } = await pool.query(
      `INSERT INTO device_tokens (user_id, token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             platform = COALESCE(EXCLUDED.platform, device_tokens.platform)
       RETURNING *`,
      [req.user.id, token, platform || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    log.error('register device token error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /devices/token — unregister on logout
router.delete('/token', requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM device_tokens WHERE token = $1 AND user_id = $2',
      [token, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Token not found for this account' });
    res.json({ success: true });
  } catch (err) {
    log.error('delete device token error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /devices/tokens — the caller's own registered devices (debugging aid)
router.get('/tokens', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, token, platform, created_at FROM device_tokens WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /devices/test — send a notification to the caller's own devices.
//
// Answers the question every push problem starts with: "is it the phone, the
// credentials, or the server?" Each device reports whether Expo accepted the
// message and, if not, why (DeviceNotRegistered, InvalidCredentials…). An
// Android phone with no FCM config shows up here as an error, not as silence.
// Limited to one per 20 seconds per account, and only ever to your own tokens.
const lastTest = new Map();
const RECEIPT_WAIT_MS = process.env.NODE_ENV === 'test' ? 10 : 1500;
const RECEIPT_ATTEMPTS = 3;
router.post('/test', requireAuth, async (req, res) => {
  const now = Date.now();
  if (now - (lastTest.get(req.user.id) || 0) < 20000) {
    return res.status(429).json({ error: 'Please wait a few seconds before sending another test.' });
  }
  lastTest.set(req.user.id, now);
  try {
    const message = {
      title: 'Sawa Cars',
      body: 'Notifications are working on this device.',
      data: { type: 'test' },
    };
    const [{ rows }, web] = await Promise.all([
      pool.query('SELECT token, platform FROM device_tokens WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT endpoint, p256dh, auth FROM web_push_subscriptions WHERE user_id = $1', [req.user.id]),
    ]);
    const platformOf = new Map(rows.map((r) => [r.token, r.platform || 'unknown']));
    const [{ results }, webResults] = await Promise.all([
      rows.length ? sendExpoPushDetailed(rows.map((r) => r.token), message) : { results: [] },
      sendWebPushDetailed(web.rows, message),
    ]);
    // A ticket only means Expo accepted the message. Apple or Google's answer
    // (a wrong APNs key, a missing FCM key) is in the receipt, usually ready in
    // a second or two, so the test waits briefly for it rather than reporting
    // success that never reaches the phone. Still pending after that = 'pending'.
    const receipts = new Map();
    let waiting = results.filter((r) => r.ok && r.receiptId).map((r) => r.receiptId);
    for (let attempt = 0; waiting.length && attempt < RECEIPT_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, RECEIPT_WAIT_MS));
      for (const [id, receipt] of await fetchReceipts(waiting)) receipts.set(id, receipt);
      waiting = waiting.filter((id) => !receipts.has(id));
    }
    const devices = [
      ...results.map((r) => {
        const receipt = r.receiptId ? receipts.get(r.receiptId) : null;
        if (!r.ok) return { platform: platformOf.get(r.token), ok: false, error: r.error || null, receipt: null };
        if (receipt && !receipt.ok) {
          if (receipt.error === 'DeviceNotRegistered') pruneToken(r.token);
          else log.error('expo push receipt error', { error: receipt.error, message: receipt.message });
          return { platform: platformOf.get(r.token), ok: false, error: receipt.error, receipt: 'error' };
        }
        return { platform: platformOf.get(r.token), ok: true, error: null, receipt: receipt ? 'ok' : 'pending' };
      }),
      ...webResults.map((r) => ({ platform: 'browser', ok: r.ok, error: r.error || null })),
    ];
    res.json({ sent: devices.filter((d) => d.ok).length, devices });
  } catch (err) {
    log.error('test push error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Web Push (sawacars.com) ──────────────────────────────────────────────────
// A browser subscription lives in its own table (migration 0059); see
// lib/web-push.js for why the endpoint is checked against known push services.

// Keeps the table bounded: a person rarely uses more than a few browsers, and
// the oldest subscription is the one most likely to be dead already.
const MAX_WEB_SUBSCRIPTIONS = 10;

// GET /devices/web-push/config — public. { enabled:false } hides the toggle.
router.get('/web-push/config', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(webPushConfigured()
    ? { enabled: true, publicKey: webPushPublicKey() }
    : { enabled: false });
});

// GET /devices/web-push — is this browser subscribed for the caller?
// The endpoint is passed in the query because only the browser knows it.
router.get('/web-push', requireAuth, async (req, res) => {
  const endpoint = typeof req.query.endpoint === 'string' ? req.query.endpoint : '';
  if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });
  try {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM web_push_subscriptions WHERE endpoint = $1 AND user_id = $2',
      [endpoint, req.user.id]
    );
    res.json({ subscribed: rowCount > 0 });
  } catch (err) {
    log.error('web push status error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /devices/web-push — save (or move to the caller) this browser's subscription
router.post('/web-push', requireAuth, async (req, res) => {
  if (!webPushConfigured()) {
    return res.status(503).json({ error: 'Browser notifications are not switched on yet.', code: 'WEB_PUSH_DISABLED' });
  }
  const sub = parseSubscription(req.body?.subscription);
  if (!sub) return res.status(400).json({ error: 'subscription is not a valid browser push subscription' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Same rule as device_tokens: the subscription follows whoever turned
    // notifications on last in this browser.
    await client.query(
      `INSERT INTO web_push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
             created_at = NOW()`,
      [req.user.id, sub.endpoint, sub.p256dh, sub.auth]
    );
    await client.query(
      `DELETE FROM web_push_subscriptions
        WHERE user_id = $1
          AND id NOT IN (SELECT id FROM web_push_subscriptions WHERE user_id = $1
                          ORDER BY created_at DESC LIMIT $2)`,
      [req.user.id, MAX_WEB_SUBSCRIPTIONS]
    );
    await client.query('COMMIT');
    res.status(201).json({ subscribed: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    log.error('save web push subscription error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /devices/web-push — turn notifications off in this browser. Idempotent:
// a subscription that is already gone is the state the caller asked for.
router.delete('/web-push', requireAuth, async (req, res) => {
  const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
  if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });
  try {
    await pool.query(
      'DELETE FROM web_push_subscriptions WHERE endpoint = $1 AND user_id = $2',
      [endpoint, req.user.id]
    );
    res.json({ subscribed: false });
  } catch (err) {
    log.error('delete web push subscription error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
