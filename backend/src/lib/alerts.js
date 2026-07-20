const pool = require('../db');

// Event-driven alert engine — no cron needed at this scale.
// Called when a listing goes live and when a live listing's price drops.

// Notify owners of matching saved searches when a car goes live.
// filters shape (JSONB): { make, model, category, maxPrice, maxMileage }
// Single INSERT..SELECT — one statement regardless of how many searches match.
async function matchSavedSearches(car) {
  try {
    const { rowCount } = await pool.query(
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
         AND ss.user_id <> $6`,
      [car.make || '', car.model || '', car.body_type || '', car.price || 0,
       car.mileage || 0, car.seller_id,
       `${car.title} ($${Number(car.price).toLocaleString('en-US')})`, car.id]
    );
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
    const { rowCount } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, meta)
       SELECT sc.user_id, 'price_drop', 'Price drop on a saved car', $2,
              json_build_object('carId', $1::uuid, 'oldPrice', $3::numeric, 'newPrice', $4::numeric)::jsonb
       FROM saved_cars sc
       WHERE sc.car_id = $1`,
      [carId,
       `${title} dropped from $${Number(oldPrice).toLocaleString('en-US')} to $${Number(newPrice).toLocaleString('en-US')}.`,
       oldPrice, newPrice]
    );
    return rowCount;
  } catch (err) {
    console.error('price-drop alert error:', err.message);
    return 0;
  }
}

module.exports = { matchSavedSearches, notifyPriceDrop };
