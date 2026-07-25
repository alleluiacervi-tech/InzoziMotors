const pool = require('../db');
const { pushToUsers } = require('./notify');

// Event-driven alert engine — no cron needed at this scale.
// Called when a listing goes live and when a live listing's price drops.
// The bulk INSERT..SELECT stays a single statement; RETURNING user_id only
// tells us who to push to, it does not change what matches.

// Notify owners of matching saved searches when a car goes live.
// filters shape (JSONB): { make, model, category, maxPrice, maxMileage }
// Single INSERT..SELECT — one statement regardless of how many searches match.
async function matchSavedSearches(car) {
  try {
    const { rows, rowCount } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, meta)
       SELECT ss.user_id,
              'search_match',
              'New match for your search',
              $7 || ' matches your saved search "' || ss.label || '".',
              json_build_object('carId', $8::uuid, 'savedSearchId', ss.id)::jsonb
       FROM saved_searches ss
       WHERE ss.notify_enabled = TRUE
         AND (ss.filters->>'make'  IS NULL OR ss.filters->>'make'  ILIKE $1)
         AND (ss.filters->>'model' IS NULL OR $2 ILIKE '%' || (ss.filters->>'model') || '%')
         AND (ss.filters->>'category' IS NULL OR ss.filters->>'category' ILIKE $3)
         AND (ss.filters->>'maxPrice'   IS NULL OR (ss.filters->>'maxPrice')::int   >= $4)
         AND (ss.filters->>'maxMileage' IS NULL OR (ss.filters->>'maxMileage')::int >= $5)
         AND ss.user_id <> $6
       RETURNING user_id`,
      [car.make || '', car.model || '', car.body_type || '', car.price || 0,
       car.mileage || 0, car.seller_id,
       `${car.title} ($${Number(car.price).toLocaleString('en-US')})`, car.id]
    );
    // One push batch for everyone matched. The in-app body names the specific
    // saved search; the push can't (one payload, many searches), so it stays generic.
    pushToUsers(rows.map((r) => r.user_id), {
      title: 'New match for your search',
      body: `${car.title} ($${Number(car.price).toLocaleString('en-US')}) matches a search you saved.`,
      data: { type: 'search_match', carId: car.id },
    });
    return rowCount;
  } catch (err) {
    console.error('saved-search match error:', err.message);
    return 0;
  }
}

// Notify everyone who saved a car when its price drops.
// Single INSERT..SELECT; `title` may be passed by callers that already have it.
async function notifyPriceDrop(carId, oldPrice, newPrice, title = null) {
  if (!(newPrice < oldPrice)) return 0;
  try {
    if (!title) {
      const carRes = await pool.query('SELECT title FROM cars WHERE id = $1', [carId]);
      title = carRes.rows[0]?.title || 'A car you saved';
    }
    const body = `${title} dropped from $${Number(oldPrice).toLocaleString('en-US')} to $${Number(newPrice).toLocaleString('en-US')}.`;
    const { rows, rowCount } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, meta)
       SELECT sc.user_id, 'price_drop', 'Price drop on a saved car', $2,
              json_build_object('carId', $1::uuid, 'oldPrice', $3::numeric, 'newPrice', $4::numeric)::jsonb
       FROM saved_cars sc
       WHERE sc.car_id = $1
       RETURNING user_id`,
      [carId, body, oldPrice, newPrice]
    );
    pushToUsers(rows.map((r) => r.user_id), {
      title: 'Price drop on a saved car',
      body,
      data: { type: 'price_drop', carId, oldPrice, newPrice },
    });
    return rowCount;
  } catch (err) {
    console.error('price-drop alert error:', err.message);
    return 0;
  }
}

module.exports = { matchSavedSearches, notifyPriceDrop };
