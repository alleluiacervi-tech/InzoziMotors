const pool = require('../db');
const { log } = require('./log');

// Expo push delivery — no third-party SDK, just the public HTTP endpoint.
// backend/Dockerfile runs node:20-alpine, so global fetch (Node 18+) is available.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const CHUNK_SIZE = 100;             // Expo's documented per-request message cap
const TOKEN_RE = /^ExponentPushToken\[.+\]$/;

// A ticket only says Expo ACCEPTED the message. Whether Apple or Google took it
// is in the receipt, which Expo makes available some minutes later. Reading it
// is what turns "Android push silently does nothing" (missing FCM key) into a
// line in the logs. Expo documents 15 minutes as the point to ask.
const RECEIPT_DELAY_MS = 15 * 60 * 1000;

// Best-effort by contract: this never throws. A dead push service must not be
// able to fail the business write that triggered the notification.
//
// Returns { delivered, results } where results is one row per token:
//   { token, ok, error?, message?, receiptId? }
// `delivered` keeps its old meaning (tickets accepted) for existing callers.
async function sendExpoPushDetailed(tokens, { title, body, data } = {}) {
  const valid = [...new Set(
    (Array.isArray(tokens) ? tokens : []).filter((t) => typeof t === 'string' && TOKEN_RE.test(t))
  )];
  const results = [];
  if (!valid.length) return { delivered: 0, results };

  let delivered = 0;
  const receiptIds = [];
  for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
    const chunk = valid.slice(i, i + CHUNK_SIZE);
    const messages = chunk.map((to) => ({
      to,
      title: title || 'Sawa Cars',
      body: body || '',
      data: data || {},
      sound: 'default',
      channelId: 'default',
      priority: 'high',
    }));
    try {
      const resp = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      const json = await resp.json().catch(() => null);
      const tickets = json?.data;
      if (!Array.isArray(tickets)) {
        log.error('expo push: unexpected response', { status: resp.status });
        chunk.forEach((token) => results.push({ token, ok: false, error: 'NoResponse' }));
        continue;
      }
      tickets.forEach((ticket, idx) => {
        const token = chunk[idx];
        if (ticket?.status === 'error') {
          const error = ticket.details?.error || 'Error';
          results.push({ token, ok: false, error, message: ticket.message });
          // The app was uninstalled — stop sending to a token that can never land
          if (error === 'DeviceNotRegistered') pruneToken(token);
          else log.warn('expo push ticket error', { error, message: ticket.message });
        } else {
          delivered += 1;
          results.push({ token, ok: true, receiptId: ticket?.id || null });
          if (ticket?.id) receiptIds.push({ id: ticket.id, token });
        }
      });
    } catch (err) {
      log.error('expo push error', { error: err.message });
      chunk.forEach((token) => results.push({ token, ok: false, error: 'NetworkError' }));
    }
  }
  if (receiptIds.length) scheduleReceiptCheck(receiptIds);
  return { delivered, results };
}

async function sendExpoPush(tokens, message) {
  return (await sendExpoPushDetailed(tokens, message)).delivered;
}

// In-process and unref'd: the project has no scheduler on purpose, and a missed
// check (restart inside the 15 minutes) only means one batch is not audited.
function scheduleReceiptCheck(entries) {
  if (process.env.NODE_ENV === 'test') return;
  const timer = setTimeout(() => { checkReceipts(entries).catch(() => {}); }, RECEIPT_DELAY_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

// Asks Expo what Apple or Google said about each ticket. Never throws; an id
// missing from the answer means its receipt is not ready yet.
// Returns Map<id, { ok, error?, message? }>.
async function fetchReceipts(ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 300) {
    const slice = ids.slice(i, i + 300);
    try {
      const resp = await fetch(EXPO_RECEIPTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ids: slice }),
      });
      const json = await resp.json().catch(() => null);
      const receipts = json?.data;
      if (!receipts || typeof receipts !== 'object') continue;
      for (const [id, receipt] of Object.entries(receipts)) {
        if (receipt?.status === 'error') {
          out.set(id, { ok: false, error: receipt.details?.error || 'Error', message: receipt.message });
        } else if (receipt?.status === 'ok') {
          out.set(id, { ok: true });
        }
      }
    } catch (err) {
      log.error('expo receipts error', { error: err.message });
    }
  }
  return out;
}

async function checkReceipts(entries) {
  const byId = new Map(entries.map((e) => [e.id, e.token]));
  const receipts = await fetchReceipts([...byId.keys()]);
  for (const [id, receipt] of receipts) {
    if (receipt.ok) continue;
    if (receipt.error === 'DeviceNotRegistered') {
      await pruneToken(byId.get(id));
    } else {
      // InvalidCredentials / MismatchSenderId mean the APNs key or the FCM
      // config uploaded to EAS is wrong or missing: no device will receive.
      log.error('expo push receipt error', { error: receipt.error, message: receipt.message });
    }
  }
}

async function pruneToken(token) {
  if (!token) return;
  try {
    await pool.query('DELETE FROM device_tokens WHERE token = $1', [token]);
  } catch (err) {
    log.error('prune device token error', { error: err.message });
  }
}

module.exports = { sendExpoPush, sendExpoPushDetailed, pruneToken, checkReceipts, fetchReceipts };
