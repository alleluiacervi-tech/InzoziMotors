const pool = require('../db');
const { log } = require('./log');
const { clientIp, clientCountry, clientAgent, isInternalIp } = require('./client-ip');

// ─────────────────────────────────────────────────────────────────────────────
// Which addresses each account is used from (user_ip_addresses, migration 0069).
//
// One row per account and address, so a person moving between home Wi-Fi, a
// phone network and another country shows up as separate rows with their own
// first and last seen times; the newest last_seen_at is where they are now.
//
// Sign-up and sign-in always write. Signed-in requests write at most once per
// account and address every few minutes (an in-memory throttle), so a busy
// session costs one small upsert per window, not one per request. A second
// server instance has its own throttle; the only effect is an extra upsert.
// ─────────────────────────────────────────────────────────────────────────────

const REQUEST_WINDOW_MS = 5 * 60 * 1000;
const MAX_TRACKED = 50_000;
const lastWrite = new Map();

async function recordIp(db, userId, req, source) {
  const ip = clientIp(req);
  // An internal address is one of this server's own containers calling on
  // someone's behalf without saying who: never where the person is.
  if (!userId || !ip || isInternalIp(ip)) return;
  await db.query(
    `INSERT INTO user_ip_addresses (user_id, ip, country, first_source, last_source, user_agent)
     VALUES ($1, $2, $3, $4, $4, $5)
     ON CONFLICT (user_id, ip) DO UPDATE
        SET last_seen_at = NOW(),
            seen_count   = user_ip_addresses.seen_count + 1,
            last_source  = EXCLUDED.last_source,
            country      = COALESCE(EXCLUDED.country, user_ip_addresses.country),
            user_agent   = COALESCE(EXCLUDED.user_agent, user_ip_addresses.user_agent)`,
    [userId, ip, clientCountry(req), source, clientAgent(req)]
  );
  lastWrite.set(`${userId}|${ip}`, Date.now());
}

/** Fire-and-forget for sign-in and sign-up: never slows or fails the response. */
function noteIp(userId, req, source) {
  recordIp(pool, userId, req, source).catch((err) => {
    log.warn('ip activity write failed', { error: err.message });
  });
}

/** For every signed-in request; throttled per account and address. */
function noteRequestIp(userId, req) {
  const ip = clientIp(req);
  if (!userId || !ip || isInternalIp(ip)) return;
  const key = `${userId}|${ip}`;
  const last = lastWrite.get(key);
  if (last && Date.now() - last < REQUEST_WINDOW_MS) return;
  if (lastWrite.size >= MAX_TRACKED) lastWrite.clear();
  lastWrite.set(key, Date.now());
  noteIp(userId, req, 'request');
}

module.exports = { recordIp, noteIp, noteRequestIp };
