const pool = require('../db');

// Expo push delivery — no third-party SDK, just the public HTTP endpoint.
// backend/Dockerfile runs node:20-alpine, so global fetch (Node 18+) is available.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;             // Expo's documented per-request message cap
const TOKEN_RE = /^ExponentPushToken\[.+\]$/;

// Best-effort by contract: this never throws. A dead push service must not be
// able to fail the business write that triggered the notification.
async function sendExpoPush(tokens, { title, body, data } = {}) {
  const valid = [...new Set(
    (Array.isArray(tokens) ? tokens : []).filter((t) => typeof t === 'string' && TOKEN_RE.test(t))
  )];
  if (!valid.length) return 0;

  let delivered = 0;
  for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
    const chunk = valid.slice(i, i + CHUNK_SIZE);
    const messages = chunk.map((to) => ({
      to,
      title: title || 'Sawa',
      body: body || '',
      data: data || {},
      sound: 'default',
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
        console.error('expo push error: unexpected response', resp.status);
        continue;
      }
      tickets.forEach((ticket, idx) => {
        if (ticket?.status === 'error') {
          // The app was uninstalled — stop sending to a token that can never land
          if (ticket.details?.error === 'DeviceNotRegistered') pruneToken(chunk[idx]);
        } else {
          delivered += 1;
        }
      });
    } catch (err) {
      console.error('expo push error:', err.message);
    }
  }
  return delivered;
}

async function pruneToken(token) {
  try {
    await pool.query('DELETE FROM device_tokens WHERE token = $1', [token]);
  } catch (err) {
    console.error('prune device token error:', err.message);
  }
}

module.exports = { sendExpoPush, pruneToken };
