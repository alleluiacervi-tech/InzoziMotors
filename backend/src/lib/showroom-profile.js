// ─────────────────────────────────────────────────────────────────────────────
// What a storefront says about a seller beyond its cars: a showroom's own
// details (written by the team), and how quickly the seller really replies.
//
// Everything here is either typed in by a person who checked it, or measured.
// The old profile numbers were neither: "completed sales" and "reviews" came
// from the retired deal flow and could only ever read 0, and "response rate"
// was a cached 100% that nothing recalculated when people replied. Those are
// gone from the storefronts; this is what replaces them.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ABOUT_MAX = 1200;
const ADDRESS_MAX = 240;

const minutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Opening hours, one entry per day: null when closed, otherwise
 * { open: 'HH:MM', close: 'HH:MM' } with open before close (no overnight
 * opening; nobody sells cars at 2 a.m.). A missing day means closed, and the
 * stored value always has all seven keys so clients never guess.
 *
 * Returns { ok: true, value } or { ok: false, error }. `null` clears the hours.
 */
function normalizeHours(input) {
  if (input === null || input === undefined || input === '') return { ok: true, value: null };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'business_hours must be an object with one entry per day' };
  }
  const unknown = Object.keys(input).filter((key) => !DAYS.includes(key));
  if (unknown.length) return { ok: false, error: `Unknown day in business_hours: ${unknown[0]}` };
  const value = {};
  for (const day of DAYS) {
    const entry = input[day];
    if (entry === null || entry === undefined || entry === false) { value[day] = null; continue; }
    if (typeof entry !== 'object' || !TIME_RE.test(String(entry.open)) || !TIME_RE.test(String(entry.close))) {
      return { ok: false, error: `Opening hours for ${day} must be times like 08:00 and 18:00` };
    }
    if (minutes(entry.open) >= minutes(entry.close)) {
      return { ok: false, error: `On ${day} the showroom must open before it closes` };
    }
    value[day] = { open: entry.open, close: entry.close };
  }
  // Seven closed days is not a schedule; it is the same as saying nothing.
  if (DAYS.every((day) => value[day] === null)) return { ok: true, value: null };
  return { ok: true, value };
}

/** Trimmed text or null; { ok:false } when longer than `max`. */
function normalizeText(input, max, field) {
  if (input === null || input === undefined) return { ok: true, value: null };
  const value = String(input).replace(/\r\n/g, '\n').trim();
  if (!value) return { ok: true, value: null };
  if (value.length > max) return { ok: false, error: `${field} must be ${max} characters or fewer` };
  return { ok: true, value };
}

const normalizeAbout = (input) => normalizeText(input, ABOUT_MAX, 'business_about');
const normalizeAddress = (input) => normalizeText(input, ADDRESS_MAX, 'business_address');

// ── How quickly the seller replies ───────────────────────────────────────────
//
// For each conversation a buyer opened with this seller in the last 180 days:
// the time from the buyer's first message to the seller's first reply. One
// conversation per buyer-seller pair (migration 0041), so this measures how a
// new enquiry is answered. A conversation younger than a day that is still
// unanswered is left out rather than counted against the seller.
//
// Shown only when it means something: at least MIN_CONVERSATIONS enquiries and
// at least half of them answered. Otherwise the storefront says nothing about
// replies, which is honest, rather than printing a flattering default.
const MIN_CONVERSATIONS = 3;

const REPLY_STATS_SQL = `
  SELECT COUNT(*)::int AS asked,
         COUNT(r.replied_at)::int AS answered,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (r.replied_at - f.asked_at)))
           FILTER (WHERE r.replied_at IS NOT NULL) AS median_seconds
    FROM conversations c
    JOIN LATERAL (
      SELECT MIN(m.created_at) AS asked_at FROM messages m
       WHERE m.conversation_id = c.id AND m.sender_id = c.buyer_id
    ) f ON f.asked_at IS NOT NULL
    LEFT JOIN LATERAL (
      SELECT MIN(m.created_at) AS replied_at FROM messages m
       WHERE m.conversation_id = c.id AND m.sender_id = c.seller_id AND m.created_at >= f.asked_at
    ) r ON TRUE
   WHERE c.seller_id = $1
     AND f.asked_at > NOW() - INTERVAL '180 days'
     AND (r.replied_at IS NOT NULL OR f.asked_at < NOW() - INTERVAL '24 hours')`;

/** 'within_hour' | 'within_hours' | 'within_day' | null, from the stats row. */
function replyTimeBucket(stats) {
  const asked = Number(stats?.asked) || 0;
  const answered = Number(stats?.answered) || 0;
  const median = stats?.median_seconds == null ? null : Number(stats.median_seconds);
  if (asked < MIN_CONVERSATIONS || answered * 2 < asked || median == null || !Number.isFinite(median)) return null;
  if (median <= 3600) return 'within_hour';
  if (median <= 4 * 3600) return 'within_hours';
  if (median <= 24 * 3600) return 'within_day';
  return null;
}

/** Reads the stats and returns the bucket; never throws (a profile without it is fine). */
async function sellerReplyTime(db, sellerId) {
  try {
    const { rows } = await db.query(REPLY_STATS_SQL, [sellerId]);
    return replyTimeBucket(rows[0]);
  } catch {
    return null;
  }
}

module.exports = {
  DAYS,
  ABOUT_MAX,
  ADDRESS_MAX,
  MIN_CONVERSATIONS,
  REPLY_STATS_SQL,
  normalizeHours,
  normalizeAbout,
  normalizeAddress,
  replyTimeBucket,
  sellerReplyTime,
};
