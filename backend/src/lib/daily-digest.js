// The once-a-day "new on Sawa" summary (docs/PUSH-NOTIFICATIONS-TODO.md, Phase 5).
//
// Decisions, so the next reader does not have to re-derive them:
//   - Covers ALL sale cars that went live in the last 24 hours, with the count
//     that match the person's saved searches beside it. The summary is for
//     everyone who opted in; saved searches make it more useful, not required.
//   - Never sent on a day with nothing new.
//   - Goes out between 18:00 and 21:00 Kigali (lib/quiet-hours.js). A send missed
//     at 18:00 catches up until 21:00; after that the day is skipped.
//   - Opt-in only (users.alert_daily_digest defaults to FALSE): a summary of
//     every new car is promotional, which App Store guideline 4.5.4 allows only
//     with explicit consent and an in-app way out.
//   - At most once per Kigali day per person. Each person is CLAIMED (their
//     last_digest_on is stamped) before anything is sent, so a restart, a second
//     server or an overlapping run can lose a day for someone, never repeat it.

const pool = require('../db');
const { log } = require('./log');
const { notifyMany } = require('./notify');
const { inDigestWindow, kigaliToday } = require('./quiet-hours');
const { publiclyVisibleSql } = require('./inspection-evidence');
const { countNewRentals, rentalMatchCounts } = require('./rental-alerts');

const WINDOW_HOURS = 24;
const BATCH = 200;

// Counts, for the people just claimed, the new cars that match at least one of
// their saved searches. Same rules as matchSavedSearches (lib/alerts.js): the
// same filters, a franc budget only against a franc price, never their own car,
// and nothing for someone who switched search-match alerts off.
async function matchCounts(userIds, since) {
  const { rows } = await pool.query(
    `SELECT ss.user_id, COUNT(DISTINCT c.id)::int AS matches
       FROM saved_searches ss
       JOIN users u ON u.id = ss.user_id AND u.alert_search_matches = TRUE
       JOIN cars c ON c.status = 'live' AND c.first_live_at > $2
                  AND c.seller_id <> ss.user_id
       JOIN users seller ON seller.id = c.seller_id
      WHERE ss.user_id = ANY($1::uuid[])
        AND ss.notify_enabled = TRUE
        AND COALESCE(ss.filters->>'listingType', 'sale') = 'sale'
        AND ${publiclyVisibleSql('c', 'seller')}
        AND (ss.filters->>'make'  IS NULL OR c.make ILIKE ss.filters->>'make')
        AND (ss.filters->>'model' IS NULL OR c.model ILIKE '%' || (ss.filters->>'model') || '%')
        AND (ss.filters->>'category' IS NULL OR c.body_type ILIKE ss.filters->>'category')
        AND (ss.filters->>'maxPrice' IS NULL
             OR (COALESCE(c.currency, 'RWF') = 'RWF' AND (ss.filters->>'maxPrice')::int >= c.price))
        AND (ss.filters->>'maxMileage' IS NULL OR (ss.filters->>'maxMileage')::int >= COALESCE(c.mileage, 0))
      GROUP BY ss.user_id`,
    [userIds, since]
  );
  return new Map(rows.map((r) => [r.user_id, r.matches]));
}

// Returns { sent, total, reason? }. `now` is injectable for tests.
async function runDailyDigest({ now = new Date() } = {}) {
  if (!inDigestWindow(now)) return { sent: 0, total: 0, reason: 'outside-window' };
  const today = kigaliToday(now);
  const since = new Date(now.getTime() - WINDOW_HOURS * 3_600_000);

  const { rows: [{ total }] } = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM cars c JOIN users eligible_seller ON eligible_seller.id = c.seller_id
      WHERE c.status = 'live' AND c.first_live_at > $1
        AND ${publiclyVisibleSql('c', 'eligible_seller')}`,
    [since]
  );
  // Cars for hire are their own line: "For hire: 4". Counted by the same rule
  // the rental catalogue uses (lib/rental-alerts.js).
  const rentals = await countNewRentals(since).catch((err) => {
    log.error('daily digest rental count error', { error: err.message });
    return 0;
  });
  if (!total && !rentals) return { sent: 0, total: 0, rentals: 0, reason: 'nothing-new' };

  let sent = 0;
  for (;;) {
    // Claim a batch: stamp today's date first, then send. SKIP LOCKED lets two
    // servers split the work instead of fighting over the same people.
    const { rows: claimed } = await pool.query(
      `UPDATE users SET last_digest_on = $1::date
        WHERE id IN (
          SELECT id FROM users
           WHERE alert_daily_digest = TRUE
             AND account_status = 'active'
             AND deleted_at IS NULL
             AND (last_digest_on IS NULL OR last_digest_on < $1::date)
           ORDER BY id
           LIMIT $2
           FOR UPDATE SKIP LOCKED)
        RETURNING id`,
      [today, BATCH]
    );
    if (!claimed.length) break;

    const ids = claimed.map((r) => r.id);
    const failed = (what) => (err) => {
      log.error(`daily digest ${what} count error`, { error: err.message });
      return new Map();
    };
    const saleMatches = await matchCounts(ids, since).catch(failed('match'));
    const hireMatches = rentals ? await rentalMatchCounts(ids, since).catch(failed('rental match')) : new Map();
    const rows = ids.map((id) => {
      const matches = (saleMatches.get(id) || 0) + (hireMatches.get(id) || 0);
      // One line of parts; a part that is zero is left out. English is kept on the
      // row (the Notification Center text); the push is re-rendered per language.
      const parts = [];
      if (total) parts.push({ key: 'digest_total', vars: { total }, text: `New cars today: ${total}` });
      if (rentals) parts.push({ key: 'digest_hire', vars: { rentals }, text: `For hire: ${rentals}` });
      if (matches) parts.push({ key: 'digest_matches', vars: { matches }, text: `Matching your searches: ${matches}` });
      return {
        user_id: id,
        type: 'daily_digest',
        title: 'New on Sawa today',
        body: parts.map((p) => p.text).join(' · '),
        meta: { newToday: true, total, rentals, matches },
        copy: { key: 'daily_digest', parts: parts.map(({ key, vars }) => ({ key, vars })) },
      };
    });
    try {
      await notifyMany(pool, rows);
      sent += rows.length;
    } catch (err) {
      log.error('daily digest send error', { error: err.message });
    }
    if (claimed.length < BATCH) break;
  }
  if (sent) log.info('daily digest sent', { sent, total, rentals });
  return { sent, total, rentals };
}

module.exports = { runDailyDigest, matchCounts };
