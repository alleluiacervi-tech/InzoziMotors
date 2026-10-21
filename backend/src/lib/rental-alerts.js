// Alerts for cars for hire (docs/PUSH-NOTIFICATIONS-TODO.md, phase 6).
//
// A rental car is public by PREDICATE (routes/rentals.js: a passing Rental Check,
// a paid subscription, an eligible provider), so there is no single place where
// it "goes live". announceNewRentals() runs on the scheduler, finds public cars
// it has not announced, stamps rental_cars.first_listed_at ONCE (that claim is
// the only thing that lets a car be announced), and tells the saved searches
// that target rentals.
//
// Wording rules from CLAUDE.md apply: a rental alert says a car for hire was
// listed. It never says a car is available or booked; Sawa is not a booking
// system and the provider's calendar is the provider's.

const pool = require('../db');
const { log } = require('./log');
const { pushToUsers, deliverRealtime } = require('./notify');
const { inQuietHours, quietHoursEnd } = require('./quiet-hours');

// The public-catalogue rule, from the router that owns it. Required when called,
// not at load, so this file and the router can never deadlock on each other.
function publicRentalSql() {
  // eslint-disable-next-line global-require
  return require('../routes/rentals').PUBLIC_RENTAL;
}

// FROM/WHERE for "this rental car is in the public catalogue right now". `rc` is
// the rental car, `u` its provider. Identical to the catalogue's own query.
function publicRentalFromWhere() {
  const { RENTAL_EVIDENCE, ACTIVE_RENTAL_SUBSCRIPTION, RENTAL_EVIDENCE_OK } = publicRentalSql();
  return `FROM rental_cars rc JOIN users u ON u.id = rc.provider_id
       ${RENTAL_EVIDENCE}
       ${ACTIVE_RENTAL_SUBSCRIPTION}
       WHERE rc.status = 'active' AND u.role = 'seller'
         AND u.id_verified = 'approved' AND u.business_verified = TRUE
         AND u.account_status = 'active' AND u.deleted_at IS NULL AND u.is_test = FALSE
         AND ${RENTAL_EVIDENCE_OK}`;
}

// The filters a saved rental search can hold (all optional):
//   { listingType: 'rental', make, model, category, location, maxDailyRate, query }
// `query` is a loose keyword over the car's title, make, model and category.
const matchSql = ({ instantOnly }) => `
  ss.filters->>'listingType' = 'rental'
  AND ss.notify_enabled = TRUE
  ${instantOnly ? "AND ss.alert_mode = 'instant'" : ''}
  AND (ss.filters->>'make'     IS NULL OR rc.make     ILIKE ss.filters->>'make')
  AND (ss.filters->>'model'    IS NULL OR rc.model    ILIKE '%' || (ss.filters->>'model') || '%')
  AND (ss.filters->>'category' IS NULL OR rc.category ILIKE ss.filters->>'category')
  AND (ss.filters->>'location' IS NULL OR rc.location ILIKE '%' || (ss.filters->>'location') || '%')
  AND (ss.filters->>'maxDailyRate' IS NULL OR (ss.filters->>'maxDailyRate')::int >= rc.daily_rate)
  AND (ss.filters->>'query' IS NULL OR (
        rc.title ILIKE '%' || (ss.filters->>'query') || '%'
        OR rc.make ILIKE '%' || (ss.filters->>'query') || '%'
        OR rc.model ILIKE '%' || (ss.filters->>'query') || '%'
        OR rc.category ILIKE '%' || (ss.filters->>'query') || '%'))`;

// Tells the saved searches that target rentals about one newly public car, once
// per search, holding the push through quiet hours exactly like a sale match.
async function matchRentalSearches(car, { now = new Date() } = {}) {
  const quiet = inQuietHours(now);
  const push = {
    title: 'New car for hire',
    body: `${car.title} was just listed for hire.`,
    data: { type: 'search_match', rentalCarId: car.id, listingType: 'rental' },
    copy: { key: 'rental_match', vars: { title: car.title } },
  };
  try {
    const { rows } = await pool.query(
      `WITH matched AS (
         SELECT ss.id AS saved_search_id, ss.user_id, ss.label
           FROM saved_searches ss
           JOIN users su ON su.id = ss.user_id AND su.alert_search_matches = TRUE
           JOIN rental_cars rc ON rc.id = $1
          WHERE ${matchSql({ instantOnly: true })}
            AND ss.user_id <> rc.provider_id
       ),
       fresh AS (
         INSERT INTO rental_search_alert_log (saved_search_id, rental_car_id)
         SELECT saved_search_id, $1::uuid FROM matched
         ON CONFLICT (saved_search_id, rental_car_id) DO NOTHING
         RETURNING saved_search_id
       )
       INSERT INTO notifications (user_id, type, title, body, meta, push_after, push_copy)
       SELECT m.user_id, 'search_match', 'New car for hire',
              $2 || ' was just listed for hire.',
              json_build_object('rentalCarId', $1::uuid, 'savedSearchId', m.saved_search_id, 'listingType', 'rental')::jsonb,
              $3::timestamptz, $4::jsonb
         FROM matched m JOIN fresh f ON f.saved_search_id = m.saved_search_id
       RETURNING *`,
      [car.id, car.title, quiet ? quietHoursEnd(now) : null, quiet ? JSON.stringify(push) : null]
    );
    for (const row of rows) deliverRealtime(row);
    if (!quiet) pushToUsers(rows.map((r) => r.user_id), push);
    return rows.length;
  } catch (err) {
    log.error('rental search match error', { error: err.message });
    return 0;
  }
}

// Finds public rental cars not yet announced and announces each exactly once.
// Safe on two servers: the UPDATE ... WHERE first_listed_at IS NULL is the claim.
async function announceNewRentals({ now = new Date(), limit = 50 } = {}) {
  let announced = 0;
  try {
    const { rows } = await pool.query(
      `SELECT rc.id, rc.title ${publicRentalFromWhere()}
          AND rc.first_listed_at IS NULL
        ORDER BY rc.created_at
        LIMIT $1`,
      [limit]
    );
    for (const car of rows) {
      const claimed = await pool.query(
        `UPDATE rental_cars SET first_listed_at = $2 WHERE id = $1 AND first_listed_at IS NULL RETURNING id`,
        [car.id, now]
      );
      if (!claimed.rowCount) continue;
      announced += 1;
      await matchRentalSearches(car, { now });
    }
  } catch (err) {
    log.error('announce new rentals error', { error: err.message });
  }
  return announced;
}

// For the daily summary: public rental cars first listed since `since`...
async function countNewRentals(since) {
  const { rows: [row] } = await pool.query(
    `SELECT COUNT(*)::int AS n ${publicRentalFromWhere()} AND rc.first_listed_at > $1`,
    [since]
  );
  return row.n;
}

// ...and, per person, how many of those match a rental search they saved
// (instant or daily: the summary counts both, like it does for cars for sale).
async function rentalMatchCounts(userIds, since) {
  const { RENTAL_EVIDENCE, ACTIVE_RENTAL_SUBSCRIPTION, RENTAL_EVIDENCE_OK } = publicRentalSql();
  const { rows } = await pool.query(
    `SELECT ss.user_id, COUNT(DISTINCT rc.id)::int AS matches
       FROM saved_searches ss
       JOIN users su ON su.id = ss.user_id AND su.alert_search_matches = TRUE
       JOIN rental_cars rc ON rc.first_listed_at > $2 AND rc.status = 'active'
       JOIN users u ON u.id = rc.provider_id
       ${RENTAL_EVIDENCE}
       ${ACTIVE_RENTAL_SUBSCRIPTION}
      WHERE ss.user_id = ANY($1::uuid[])
        AND ${matchSql({ instantOnly: false })}
        AND ss.user_id <> rc.provider_id
        AND u.role = 'seller' AND u.id_verified = 'approved' AND u.business_verified = TRUE
        AND u.account_status = 'active' AND u.deleted_at IS NULL AND u.is_test = FALSE
        AND ${RENTAL_EVIDENCE_OK}
      GROUP BY ss.user_id`,
    [userIds, since]
  );
  return new Map(rows.map((r) => [r.user_id, r.matches]));
}

module.exports = {
  announceNewRentals, matchRentalSearches, publicRentalFromWhere, countNewRentals, rentalMatchCounts,
};
