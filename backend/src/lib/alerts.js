const pool = require('../db');

// Event-driven alert engine — no cron needed at this scale.
// Called when a listing goes live and when a live listing's price drops.

// Notify owners of matching saved searches when a car goes live.
// filters shape (JSONB): { make, model, category, maxPrice, maxMileage }
async function matchSavedSearches(car) {
  try {
    const { rows } = await pool.query(
      `SELECT ss.id, ss.user_id, ss.label, ss.filters
       FROM saved_searches ss
       WHERE ss.notify_enabled = TRUE
         AND (ss.filters->>'make'  IS NULL OR ss.filters->>'make'  ILIKE $1)
         AND (ss.filters->>'model' IS NULL OR $2 ILIKE '%' || (ss.filters->>'model') || '%')
         AND (ss.filters->>'category' IS NULL OR ss.filters->>'category' ILIKE $3)
         AND (ss.filters->>'maxPrice'   IS NULL OR (ss.filters->>'maxPrice')::int   >= $4)
         AND (ss.filters->>'maxMileage' IS NULL OR (ss.filters->>'maxMileage')::int >= $5)
         AND ss.user_id <> $6`,
      [car.make || '', car.model || '', car.body_type || '', car.price || 0, car.mileage || 0, car.seller_id]
    );
    for (const ss of rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, meta)
         VALUES ($1, 'search_match', 'New match for your search', $2, $3)`,
        [ss.user_id,
         `${car.title} ($${Number(car.price).toLocaleString('en-US')}) matches your saved search "${ss.label}".`,
         JSON.stringify({ carId: car.id, savedSearchId: ss.id })]
      );
    }
    return rows.length;
  } catch (err) {
    console.error('saved-search match error:', err.message);
    return 0;
  }
}

// Notify everyone who saved a car when its price drops.
async function notifyPriceDrop(carId, oldPrice, newPrice) {
  if (!(newPrice < oldPrice)) return 0;
  try {
    const carRes = await pool.query('SELECT title FROM cars WHERE id = $1', [carId]);
    const title = carRes.rows[0]?.title || 'A car you saved';
    const { rows } = await pool.query(
      'SELECT user_id FROM saved_cars WHERE car_id = $1', [carId]
    );
    for (const r of rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, meta)
         VALUES ($1, 'price_drop', 'Price drop on a saved car', $2, $3)`,
        [r.user_id,
         `${title} dropped from $${Number(oldPrice).toLocaleString('en-US')} to $${Number(newPrice).toLocaleString('en-US')}.`,
         JSON.stringify({ carId, oldPrice, newPrice })]
      );
    }
    return rows.length;
  } catch (err) {
    console.error('price-drop alert error:', err.message);
    return 0;
  }
}

module.exports = { matchSavedSearches, notifyPriceDrop };
