const pool = require('../db');
const { log } = require('./log');
const { pushToUsers, deliverRealtime } = require('./notify');
const { inQuietHours, quietHoursEnd } = require('./quiet-hours');

// Event-driven alert engine — no cron needed at this scale.
// Called when a listing goes live and when a live listing's price drops.
// The bulk INSERT..SELECT stays a single statement; RETURNING user_id only
// tells us who to push to, it does not change what matches.
//
// Calm by construction (docs/PUSH-NOTIFICATIONS-TODO.md, Phase 4):
//   - a saved search is told about a car ONCE (search_alert_log), however many
//     times the listing goes live -> review -> live again;
//   - a saved car's price-drop alert is sent at most once a day, and only for a
//     drop of at least 1%;
//   - the notification row and the in-app bell are immediate, but the PUSH
//     waits out quiet hours (21:00-07:00 Kigali) and is released by
//     releaseHeldPushes() at 07:00;
//   - a saved search set to 'daily' gets no instant alert: its matches are in
//     the daily summary (lib/daily-digest.js).

// A car's price is whole units of the car's own currency — francs, almost
// always. Both alerts used to print "$" in front of it, so a saved-car alert
// read "dropped from $20,000,000 to $18,000,000" for a car priced in RWF.
function formatCarPrice(amount, currency) {
  return `${currency || 'RWF'} ${Math.round(Number(amount)).toLocaleString('en-US')}`;
}

// A smaller change than this is a rounding of the asking price, not news.
const MIN_DROP_FRACTION = 0.01;
const PRICE_ALERT_COOLDOWN_HOURS = 24;

// What a held push needs to be sent later, in the recipient's language.
function heldPayload({ title, body, data, copy }) {
  return JSON.stringify({ title, body, data, copy });
}

// Notify owners of matching saved searches when a car goes live.
// filters shape (JSONB): { make, model, category, maxPrice, maxMileage }
// Single INSERT..SELECT — one statement regardless of how many searches match.
// maxPrice is a franc budget, so it is only compared with a franc price: a USD
// car's 13,000 is under every budget anyone set, and matched them all.
async function matchSavedSearches(car, { now = new Date() } = {}) {
  const label = `${car.title} (${formatCarPrice(car.price, car.currency)})`;
  const push = {
    title: 'New match for your search',
    body: `${label} matches a search you saved.`,
    data: { type: 'search_match', carId: car.id },
    copy: { key: 'search_match', vars: { label } },
  };
  const quiet = inQuietHours(now);
  try {
    const { rows, rowCount } = await pool.query(
      `WITH matched AS (
         SELECT ss.id AS saved_search_id, ss.user_id, ss.label
         FROM saved_searches ss
         JOIN users u ON u.id = ss.user_id AND u.alert_search_matches = TRUE
         WHERE ss.notify_enabled = TRUE
           AND ss.alert_mode = 'instant'
           AND COALESCE(ss.filters->>'listingType', 'sale') = 'sale'
           AND (ss.filters->>'make'  IS NULL OR ss.filters->>'make'  ILIKE $1)
           AND (ss.filters->>'model' IS NULL OR $2 ILIKE '%' || (ss.filters->>'model') || '%')
           AND (ss.filters->>'category' IS NULL OR ss.filters->>'category' ILIKE $3)
           AND (ss.filters->>'maxPrice'   IS NULL
                OR ($9 = 'RWF' AND (ss.filters->>'maxPrice')::int >= $4))
           AND (ss.filters->>'maxMileage' IS NULL OR (ss.filters->>'maxMileage')::int >= $5)
           AND ss.user_id <> $6
           -- A test account's car is never public, so nobody is told about it.
           AND NOT EXISTS (SELECT 1 FROM users seller WHERE seller.id = $6 AND seller.is_test)
       ),
       fresh AS (
         INSERT INTO search_alert_log (saved_search_id, car_id)
         SELECT saved_search_id, $8::uuid FROM matched
         ON CONFLICT (saved_search_id, car_id) DO NOTHING
         RETURNING saved_search_id
       )
       INSERT INTO notifications (user_id, type, title, body, meta, push_after, push_copy)
       SELECT m.user_id,
              'search_match',
              'New match for your search',
              $7 || ' matches your saved search "' || m.label || '".',
              json_build_object('carId', $8::uuid, 'savedSearchId', m.saved_search_id)::jsonb,
              $10::timestamptz,
              $11::jsonb
       FROM matched m
       JOIN fresh f ON f.saved_search_id = m.saved_search_id
       RETURNING *`,
      [car.make || '', car.model || '', car.body_type || '', car.price || 0,
       car.mileage || 0, car.seller_id, label, car.id, car.currency || 'RWF',
       quiet ? quietHoursEnd(now) : null, quiet ? heldPayload(push) : null]
    );
    // Live in-app delivery to every matched device (bell updates instantly).
    for (const row of rows) deliverRealtime(row);
    // One push batch for everyone matched. The in-app body names the specific
    // saved search; the push can't (one payload, many searches), so it stays
    // generic. In quiet hours the push is held for releaseHeldPushes().
    if (!quiet) pushToUsers(rows.map((r) => r.user_id), push);
    return rowCount;
  } catch (err) {
    log.error('saved-search match error', { error: err.message });
    return 0;
  }
}

// Notify everyone who saved a car when its price drops.
// Single INSERT..SELECT; `title` may be passed by callers that already have it.
async function notifyPriceDrop(carId, oldPrice, newPrice, title = null, currency = 'RWF', { now = new Date() } = {}) {
  oldPrice = Number(oldPrice);
  newPrice = Number(newPrice);
  if (!(newPrice < oldPrice)) return 0;
  if ((oldPrice - newPrice) / oldPrice < MIN_DROP_FRACTION) return 0;
  try {
    // A test account's car is never public (people may have saved it before
    // the account was marked), so its price changes are nobody's news.
    const seller = await pool.query(
      'SELECT u.is_test FROM cars c JOIN users u ON u.id = c.seller_id WHERE c.id = $1', [carId]
    );
    if (seller.rows[0]?.is_test) return 0;
    // At most one alert per car per day. The upsert only succeeds when there was
    // no alert, or the last one is older than the cooldown; a second drop inside
    // the day is not alerted (the car page still shows the new price).
    const claimed = await pool.query(
      `INSERT INTO price_alert_log (car_id, last_alerted_at, last_price)
       VALUES ($1, NOW(), $2)
       ON CONFLICT (car_id) DO UPDATE
         SET last_alerted_at = NOW(), last_price = EXCLUDED.last_price
         WHERE price_alert_log.last_alerted_at < NOW() - make_interval(hours => $3)
       RETURNING car_id`,
      [carId, newPrice, PRICE_ALERT_COOLDOWN_HOURS]
    );
    if (!claimed.rowCount) return 0;

    if (!title) {
      const carRes = await pool.query('SELECT title FROM cars WHERE id = $1', [carId]);
      title = carRes.rows[0]?.title || 'A car you saved';
    }
    const body = `${title} dropped from ${formatCarPrice(oldPrice, currency)} to ${formatCarPrice(newPrice, currency)}.`;
    const push = {
      title: 'Price drop on a saved car',
      body,
      data: { type: 'price_drop', carId, oldPrice, newPrice },
      copy: {
        key: 'price_drop',
        vars: { title, oldPrice: formatCarPrice(oldPrice, currency), newPrice: formatCarPrice(newPrice, currency) },
      },
    };
    const quiet = inQuietHours(now);
    const { rows, rowCount } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, meta, push_after, push_copy)
       SELECT sc.user_id, 'price_drop', 'Price drop on a saved car', $2,
              json_build_object('carId', $1::uuid, 'oldPrice', $3::numeric, 'newPrice', $4::numeric)::jsonb,
              $5::timestamptz, $6::jsonb
       FROM saved_cars sc
       JOIN users u ON u.id = sc.user_id AND u.alert_price_drops = TRUE
       WHERE sc.car_id = $1
       RETURNING *`,
      [carId, body, oldPrice, newPrice, quiet ? quietHoursEnd(now) : null, quiet ? heldPayload(push) : null]
    );
    for (const row of rows) deliverRealtime(row);
    if (!quiet) pushToUsers(rows.map((r) => r.user_id), push);
    return rowCount;
  } catch (err) {
    log.error('price-drop alert error', { error: err.message });
    return 0;
  }
}

// Sends the pushes that quiet hours held back. Called by the scheduler
// (lib/scheduler.js) every few minutes; safe to run on two servers at once
// (SKIP LOCKED), and a row is claimed (push_after cleared) in the same
// statement that selects it, so it can never be sent twice.
// A notification the person has already read in the app needs no push.
async function releaseHeldPushes({ now = new Date(), limit = 1000 } = {}) {
  try {
    const { rows } = await pool.query(
      `UPDATE notifications n
          SET push_after = NULL
         FROM (SELECT id FROM notifications
                WHERE push_after IS NOT NULL AND push_after <= $1
                ORDER BY push_after
                LIMIT $2
                FOR UPDATE SKIP LOCKED) due
        WHERE n.id = due.id
        RETURNING n.user_id, n.read, n.push_copy`,
      [now, limit]
    );
    const groups = new Map();
    for (const row of rows) {
      if (row.read || !row.push_copy) continue;
      const key = JSON.stringify(row.push_copy);
      if (!groups.has(key)) groups.set(key, { payload: row.push_copy, ids: [] });
      groups.get(key).ids.push(row.user_id);
    }
    for (const { payload, ids } of groups.values()) pushToUsers(ids, payload);
    return rows.length;
  } catch (err) {
    log.error('release held pushes error', { error: err.message });
    return 0;
  }
}

module.exports = { matchSavedSearches, notifyPriceDrop, releaseHeldPushes, formatCarPrice };
