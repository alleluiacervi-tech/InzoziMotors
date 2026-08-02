const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const { withTransaction } = require('../lib/tx');
const { matchSavedSearches, notifyPriceDrop } = require('../lib/alerts');

const router = express.Router();

// ─── Market intelligence ──────────────────────────────────────────────────────
// The app used to fabricate "below market %" / "listed N days ago" from a
// hardcoded table; the server is the only honest source of these numbers.
// Two LATERAL passes per row — never an N+1 round trip. Exact make+model within
// ±2 years first; if that pool is thin, fall back to make+body_type within ±3.
// Fewer than 3 comparables is noise, not a market: market_avg stays NULL.
const MIN_COMPARABLES = 3;

const MARKET_LATERALS = `
       LEFT JOIN LATERAL (
         SELECT AVG(x.price)::int AS avg_price, COUNT(*)::int AS n
         FROM cars x
         WHERE x.id <> c.id AND x.status IN ('live', 'sold') AND x.price > 0
           AND x.make ILIKE c.make AND x.model ILIKE c.model
           AND x.year BETWEEN c.year - 2 AND c.year + 2
       ) mk ON TRUE
       LEFT JOIN LATERAL (
         SELECT AVG(x.price)::int AS avg_price, COUNT(*)::int AS n
         FROM cars x
         WHERE x.id <> c.id AND x.status IN ('live', 'sold') AND x.price > 0
           AND x.make ILIKE c.make AND x.body_type ILIKE c.body_type
           AND x.year BETWEEN c.year - 3 AND c.year + 3
       ) bt ON TRUE
       LEFT JOIN LATERAL (
         SELECT CASE WHEN mk.n >= ${MIN_COMPARABLES} THEN mk.avg_price
                     WHEN bt.n >= ${MIN_COMPARABLES} THEN bt.avg_price END AS market_avg,
                CASE WHEN mk.n >= ${MIN_COMPARABLES} THEN mk.n
                     WHEN bt.n >= ${MIN_COMPARABLES} THEN bt.n ELSE 0 END AS comparables
       ) mkt ON TRUE`;

// below_market is clamped at 0 so the app can render it unconditionally;
// market_diff keeps its sign (negative = under market).
const MARKET_COLUMNS = `
              mkt.market_avg, mkt.comparables,
              GREATEST(0, COALESCE(mkt.market_avg, c.price) - c.price) AS below_market,
              CASE WHEN mkt.market_avg IS NOT NULL AND mkt.market_avg > 0
                   THEN ROUND(((c.price - mkt.market_avg)::numeric / mkt.market_avg) * 100)::int
              END AS market_diff,
              CASE WHEN c.listed_at IS NOT NULL
                   THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - c.listed_at)) / 86400)::int
              END AS listed_days`;

// GET /cars — browse with optional filters
router.get('/', async (req, res) => {
  const { q, make, model, min_price, max_price, min_year, max_year,
          fuel_type, transmission, body_type, drive_side, status,
          sort = 'listed_at', order = 'desc', limit = 20, offset = 0 } = req.query;

  // Restrict public browse to live listings; status param is only honoured for admins
  const conditions = [`status = '${['live'].includes(status) ? status : 'live'}'`];
  const params = [];

  if (make)          { params.push(make);          conditions.push(`make ILIKE $${params.length}`); }
  if (model)         { params.push(`%${model}%`);  conditions.push(`model ILIKE $${params.length}`); }
  if (min_price)     { params.push(min_price);     conditions.push(`price >= $${params.length}`); }
  if (max_price)     { params.push(max_price);     conditions.push(`price <= $${params.length}`); }
  if (min_year)      { params.push(min_year);      conditions.push(`year >= $${params.length}`); }
  if (max_year)      { params.push(max_year);      conditions.push(`year <= $${params.length}`); }
  if (fuel_type)     { params.push(fuel_type);     conditions.push(`fuel_type = $${params.length}`); }
  if (transmission)  { params.push(transmission);  conditions.push(`transmission = $${params.length}`); }
  if (body_type)     { params.push(body_type);     conditions.push(`body_type = $${params.length}`); }
  if (drive_side)    { params.push(drive_side);    conditions.push(`drive_side = $${params.length}`); }

  // Free-text box in the app. Every term must match somewhere across the
  // vehicle's identifying fields, so "toyota suv" narrows instead of widening.
  // ILIKE over a handful of columns is right at this catalogue size; swap for
  // a tsvector index when the inventory outgrows a few thousand rows.
  if (q && String(q).trim()) {
    String(q).trim().split(/\s+/).slice(0, 6).forEach((term) => {
      params.push(`%${term}%`);
      conditions.push(
        `(title ILIKE $${params.length} OR make ILIKE $${params.length}
          OR model ILIKE $${params.length} OR body_type ILIKE $${params.length})`
      );
    });
  }

  const safeSort = ['listed_at', 'price', 'mileage', 'year', 'views'].includes(sort) ? sort : 'listed_at';
  const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

  const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);
  params.push(safeLimit, safeOffset);

  try {
    // Paginate first, enrich second: the market laterals then run for one page
    // of cars, not the whole table. Ordering is repeated outside the CTE
    // because a join makes no promise about preserving row order.
    const { rows } = await pool.query(
      `WITH page AS (
         SELECT c.*
         FROM cars c
         WHERE ${conditions.join(' AND ')}
         ORDER BY (c.featured_until IS NOT NULL AND c.featured_until > NOW()) DESC,
                  c.${safeSort} ${safeOrder}
         LIMIT $${params.length - 1} OFFSET $${params.length}
       )
       SELECT c.*, u.name AS seller_name, u.trust_score AS seller_trust,
              (SELECT COUNT(*)::int FROM saved_cars sc WHERE sc.car_id = c.id) AS saves_count,
${MARKET_COLUMNS}
       FROM page c
       JOIN users u ON u.id = c.seller_id
${MARKET_LATERALS}
       ORDER BY (c.featured_until IS NOT NULL AND c.featured_until > NOW()) DESC,
                c.${safeSort} ${safeOrder}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('cars list error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /cars/:id/history — vehicle history card (buyers + public).
// Facts derive from real data where it exists (inspection checklist, price
// history, verified seller); anything unknown is labelled unknown, not faked.
router.get('/:id/history', requireUuid('id'), async (req, res) => {
  try {
    const carRes = await pool.query(
      `SELECT c.vin, c.make, c.model, c.year, c.mileage, c.drive_side,
              c.fuel_type, c.created_at, c.listed_at, c.inspection_score, c.inspected,
              u.name AS seller_name, u.completed_sales AS seller_sales,
              u.id_verified AS seller_id_verified
       FROM cars c
       JOIN users u ON u.id = c.seller_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!carRes.rows.length) return res.status(404).json({ error: 'Car not found' });
    const car = carRes.rows[0];

    const inspRes = await pool.query(
      `SELECT checklist_results, score, completed_at FROM inspections
       WHERE car_id = $1 AND status = 'complete'
       ORDER BY completed_at DESC LIMIT 1`,
      [req.params.id]
    );
    const checklist = inspRes.rows[0]?.checklist_results || null;
    const docVerdict = (item) => (checklist ? checklist[item] || 'unknown' : 'unknown');

    res.json({
      vin: car.vin || null,
      vin_verified: checklist ? docVerdict('VIN match') === 'pass' : false,
      make: car.make, model: car.model, year: car.year,
      drive_side: car.drive_side,
      import_origin: car.drive_side === 'RHD' ? 'Japan (typical for RHD)' : 'Unknown',
      mileage: car.mileage,
      mileage_verified: checklist ? docVerdict('Odometer reading') === 'pass' : false,
      rra_duty_paid: docVerdict('RRA duty paid stamp'),
      registration: docVerdict('Registration / logbook'),
      service_history: docVerdict('Service history'),
      insurance_valid: docVerdict('Insurance valid'),
      inspection_score: car.inspection_score,
      inspected_at: inspRes.rows[0]?.completed_at || null,
      seller: {
        name: car.seller_name,
        id_verified: car.seller_id_verified === 'approved',
        completed_sales: car.seller_sales,
      },
      accident_history: 'No insurance-partner data yet',
    });
  } catch (err) {
    console.error('history error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Best-effort identity for otherwise-public routes: sets req.user when a valid
// token is present, and simply carries on when one is not. Used where the
// RESPONSE differs for a signed-in caller but the route itself stays public.
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET); } catch { /* anonymous */ }
  }
  next();
}

// GET /cars/:id
// Public, because the catalogue is the indexable part of the product — but the
// seller's personal phone number is NOT part of the catalogue. Listing ids are
// published in the sitemap, so returning it here made every seller's number
// enumerable by anyone who could count. It is now released only to a signed-in
// buyer with a live handover on this specific car; everyone else, crawlers
// included, gets null and the Sawa business line.
router.get('/:id', requireUuid('id'), optionalAuth, async (req, res) => {
  try {
    // price_history is ordered oldest-first, so element 0 is the original
    // listing price. A car with no recorded changes returns [] — nothing is
    // synthesised; the app renders an empty history rather than a fake one.
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS seller_name, u.phone AS seller_phone,
              u.trust_score AS seller_trust,
              u.response_rate AS seller_response_rate, u.completed_sales AS seller_sales,
              u.id_verified AS seller_id_verified,
              (SELECT COUNT(*)::int FROM saved_cars sc WHERE sc.car_id = c.id) AS saves_count,
              COALESCE((SELECT json_agg(json_build_object('price', ph.price, 'at', ph.changed_at) ORDER BY ph.changed_at)
                        FROM price_history ph WHERE ph.car_id = c.id), '[]') AS price_history,
${MARKET_COLUMNS}
       FROM cars c
       JOIN users u ON u.id = c.seller_id
${MARKET_LATERALS}
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Car not found' });
    const car = rows[0];

    // Statuses a car reaches only by having been published. Anything else
    // (under_review, scheduled, inspecting, archived) describes a car that was
    // never on the marketplace, so it is not public — 404, not 403, because the
    // existence of the row is itself the thing not to confirm.
    const PUBLICLY_VISIBLE = ['live', 'reserved', 'sold'];
    const isInsider =
      req.user && (req.user.role === 'admin' || req.user.id === car.seller_id);
    if (!PUBLICLY_VISIBLE.includes(car.status) && !isInsider) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Who may see the seller's number: the seller themselves, an admin, or a
    // buyer who has an open/completed handover on this car (the only point at
    // which the two parties need to reach each other directly).
    let maySeeSellerPhone = false;
    if (req.user) {
      if (req.user.role === 'admin' || req.user.id === car.seller_id) {
        maySeeSellerPhone = true;
      } else {
        const { rows: h } = await pool.query(
          `SELECT 1 FROM handovers
           WHERE car_id = $1 AND buyer_id = $2
             AND status IN ('pending', 'confirmed', 'complete')
           LIMIT 1`,
          [req.params.id, req.user.id]
        );
        maySeeSellerPhone = h.length > 0;
      }
    }
    if (!maySeeSellerPhone) car.seller_phone = null;

    // Fire-and-forget, but never unhandled: a DB blip here must not become an
    // unhandled rejection that takes the process down under --unhandled-rejections.
    pool.query('UPDATE cars SET views = views + 1 WHERE id = $1', [req.params.id])
      .catch((err) => console.error('view counter:', err.message));

    res.json(car);
  } catch (err) {
    console.error('car detail error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /cars/save/:id  (toggle save)
//
// cars.saves is a cached counter that every read path already ignores in favour
// of a live COUNT(*) over saved_cars — see saves_count in the queries above, and
// mapCar in the mobile app. It was maintained by a read, then a write, then a
// second write, none of them in a transaction: two taps racing produced a count
// that disagreed with the table, permanently.
//
// The whole toggle is now one statement pair inside a transaction, and the
// counter is DERIVED from the table rather than incremented, so it cannot drift
// from the thing it is meant to summarise even if a write is lost.
router.post('/save/:id', requireAuth, requireUuid('id'), async (req, res) => {
  const { id: car_id } = req.params;
  const user_id = req.user.id;
  try {
    const result = await withTransaction(async (client) => {
      // ON CONFLICT DO NOTHING + rowCount tells us whether this was an insert
      // or an existing row, without a separate SELECT to race against.
      const ins = await client.query(
        `INSERT INTO saved_cars (user_id, car_id) VALUES ($1, $2)
         ON CONFLICT (user_id, car_id) DO NOTHING`,
        [user_id, car_id]
      );
      const saved = ins.rowCount > 0;
      if (!saved) {
        await client.query(
          'DELETE FROM saved_cars WHERE user_id = $1 AND car_id = $2',
          [user_id, car_id]
        );
      }
      await client.query(
        `UPDATE cars SET saves = (SELECT COUNT(*) FROM saved_cars WHERE car_id = $1)
         WHERE id = $1`,
        [car_id]
      );
      return { saved };
    });
    res.json(result);
  } catch (err) {
    // A car_id that does not exist violates the foreign key — a client error.
    if (err.code === '23503') {
      return res.status(404).json({ error: 'Car not found' });
    }
    console.error('toggle save error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /cars/saved/list
router.get('/saved/list', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS seller_name, u.trust_score AS seller_trust
       FROM saved_cars sc
       JOIN cars c ON c.id = sc.car_id
       JOIN users u ON u.id = c.seller_id
       WHERE sc.user_id = $1
       ORDER BY sc.saved_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Admin-only routes ────────────────────────────────────────────────────────

// POST /cars  (admin creates a listing after inspection)
router.post('/', requireAdmin, async (req, res) => {
  const { seller_id, title, make, model, year, mileage, fuel_type, transmission,
          body_type, color, price, location, drive_side, vin, description, images,
          inspected, inspection_score, submission_id } = req.body;
  if (!seller_id || !title || !make || !model) {
    return res.status(400).json({ error: 'seller_id, title, make, and model are required' });
  }
  if (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
    return res.status(400).json({ error: 'price must be a non-negative number' });
  }
  try {
    // ID is checked in person at the inspection center; admin marks the seller
    // approved there. A listing cannot go live for an unverified seller.
    const sellerRes = await pool.query('SELECT id_verified FROM users WHERE id = $1', [seller_id]);
    if (!sellerRes.rows.length) return res.status(404).json({ error: 'Seller not found' });
    if (sellerRes.rows[0].id_verified !== 'approved') {
      return res.status(400).json({
        error: "Seller is not ID-verified yet. Verify them at the center (Users → approve) before publishing.",
      });
    }
    const { rows } = await pool.query(
      `INSERT INTO cars
         (seller_id, title, make, model, year, mileage, fuel_type, transmission,
          body_type, color, price, location, drive_side, vin, description, images,
          inspected, inspection_score, status, listed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'live',NOW())
       RETURNING *`,
      [seller_id, title, make, model, year, mileage, fuel_type, transmission,
       body_type, color, price, location, drive_side, vin, description, images,
       inspected, inspection_score]
    );
    const car = rows[0];

    if (car.price != null) {
      await pool.query(
        `INSERT INTO price_history (car_id, price, changed_by) VALUES ($1, $2, $3)`,
        [car.id, car.price, req.user.id]
      );
    }
    // Fire saved-search matches (fire-and-forget; failures only log)
    matchSavedSearches(car);

    // Link back to submission and inspection tables if this listing was promoted from pipeline
    if (submission_id) {
      await pool.query(
        'UPDATE submissions SET car_id = $1, status = \'live\' WHERE id = $2',
        [car.id, submission_id]
      );
      await pool.query(
        'UPDATE inspections SET car_id = $1 WHERE submission_id = $2',
        [car.id, submission_id]
      );
    }

    res.status(201).json(car);
  } catch (err) {
    console.error('create car error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /cars/:id/status  (admin changes status)
// GET /cars/seller/mine — seller's own listings with engagement stats
router.get('/seller/mine', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*)::int FROM saved_cars sc WHERE sc.car_id = c.id) AS saves_count,
              (SELECT COUNT(*)::int FROM conversations cv WHERE cv.car_id = c.id) AS inquiries_count
       FROM cars c
       WHERE c.seller_id = $1
       ORDER BY c.listed_at DESC NULLS LAST`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /cars/valuation/estimate?make=&year=&mileage= — market-based estimate
router.get('/valuation/estimate', async (req, res) => {
  const { make, year, mileage } = req.query;
  if (!make || !year) return res.status(400).json({ error: 'make and year are required' });
  const y = parseInt(year);
  if (!Number.isFinite(y)) return res.status(400).json({ error: 'year must be a number' });
  try {
    const { rows } = await pool.query(
      `SELECT AVG(price)::int AS avg_price, COUNT(*)::int AS comparables,
              MIN(price)::int AS low_seen, MAX(price)::int AS high_seen
       FROM cars
       WHERE make ILIKE $1 AND year BETWEEN $2 AND $3
         AND status IN ('live', 'sold') AND price > 0`,
      [make, y - 2, y + 2]
    );
    const { avg_price, comparables, low_seen, high_seen } = rows[0];
    if (!comparables || !avg_price) {
      return res.json({ comparables: 0, message: 'Not enough market data for this make/year yet' });
    }
    // Light mileage adjustment: ±5% per 20k km away from 60k reference
    const km = parseInt(mileage) || 60000;
    const adj = Math.max(0.7, Math.min(1.15, 1 - ((km - 60000) / 20000) * 0.05));
    const mid = Math.round(avg_price * adj);
    res.json({
      comparables,
      low: Math.round(mid * 0.92),
      high: Math.round(mid * 1.08),
      market_avg: avg_price,
      range_seen: { low: low_seen, high: high_seen },
    });
  } catch (err) {
    console.error('valuation error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /cars/:id — admin edits listing fields; price changes are recorded
router.patch('/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const EDITABLE = ['title', 'price', 'description', 'location', 'mileage', 'color', 'drive_side', 'images'];
  const updates = [];
  const params = [];
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) {
      params.push(req.body[field]);
      updates.push(`${field} = $${params.length}`);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No editable fields provided' });
  if (req.body.price !== undefined && (!Number.isFinite(Number(req.body.price)) || Number(req.body.price) < 0)) {
    return res.status(400).json({ error: 'price must be a non-negative number' });
  }
  try {
    const before = await pool.query('SELECT price FROM cars WHERE id = $1', [req.params.id]);
    if (!before.rows.length) return res.status(404).json({ error: 'Car not found' });

    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE cars SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (req.body.price !== undefined && Number(req.body.price) !== Number(before.rows[0].price)) {
      await pool.query(
        `INSERT INTO price_history (car_id, price, changed_by) VALUES ($1, $2, $3)`,
        [req.params.id, Number(req.body.price), req.user.id]
      );
      notifyPriceDrop(req.params.id, Number(before.rows[0].price), Number(req.body.price));
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('edit car error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /cars/:id/price — seller changes the price of their own live listing.
// No status regression; price history + price-drop alerts fire like admin edits.
router.patch('/:id/price', requireAuth, requireUuid('id'), async (req, res) => {
  const price = Number(req.body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: 'price must be a positive number' });
  }
  try {
    const before = await pool.query(
      "SELECT price FROM cars WHERE id = $1 AND seller_id = $2 AND status = 'live'",
      [req.params.id, req.user.id]
    );
    if (!before.rows.length) {
      return res.status(404).json({ error: 'Live listing not found for this seller' });
    }
    const oldPrice = Number(before.rows[0].price);

    const { rows } = await pool.query(
      'UPDATE cars SET price = $1 WHERE id = $2 RETURNING *',
      [price, req.params.id]
    );
    if (price !== oldPrice) {
      await pool.query(
        'INSERT INTO price_history (car_id, price, changed_by) VALUES ($1, $2, $3)',
        [req.params.id, price, req.user.id]
      );
      notifyPriceDrop(req.params.id, oldPrice, price, rows[0].title);
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('seller price edit error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /cars/:id/feature — admin boosts a listing to the top of browse.
// Records the featured fee ('due' — collected offline like commissions).
router.patch('/:id/feature', requireAdmin, requireUuid('id'), async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.body.days) || 7, 1), 30);
  const fee = Math.max(parseInt(req.body.fee) || 0, 0);
  try {
    const { rows } = await pool.query(
      `UPDATE cars SET featured_until = NOW() + ($1 || ' days')::interval
       WHERE id = $2 AND status = 'live' RETURNING *`,
      [String(days), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Live listing not found' });
    if (fee > 0) {
      await pool.query(
        `INSERT INTO platform_fees (seller_id, fee_type, amount, status)
         VALUES ($1, 'featured', $2, 'due')`,
        [rows[0].seller_id, fee]
      );
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('feature car error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/status', requireAdmin, requireUuid('id'), async (req, res) => {
  // 'removed' is the admin-dashboard verb for archiving a listing
  const status = req.body.status === 'removed' ? 'archived' : req.body.status;
  const allowed = ['under_review', 'scheduled', 'inspecting', 'live', 'reserved', 'sold', 'archived'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const extra = status === 'sold' ? ', sold_at = NOW()' : '';
    const { rows } = await pool.query(
      `UPDATE cars SET status = $1${extra} WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Car not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
