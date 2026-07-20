const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { matchSavedSearches, notifyPriceDrop } = require('../lib/alerts');

const router = express.Router();

// GET /cars — browse with optional filters
router.get('/', async (req, res) => {
  const { make, model, min_price, max_price, min_year, max_year,
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

  const safeSort = ['listed_at', 'price', 'mileage', 'year', 'views'].includes(sort) ? sort : 'listed_at';
  const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

  const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);
  params.push(safeLimit, safeOffset);

  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS seller_name, u.trust_score AS seller_trust,
              (SELECT COUNT(*)::int FROM saved_cars sc WHERE sc.car_id = c.id) AS saves_count
       FROM cars c
       JOIN users u ON u.id = c.seller_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY (c.featured_until IS NOT NULL AND c.featured_until > NOW()) DESC,
                ${safeSort} ${safeOrder}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
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
router.get('/:id/history', async (req, res) => {
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

// GET /cars/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS seller_name, u.phone AS seller_phone,
              u.trust_score AS seller_trust,
              u.response_rate AS seller_response_rate, u.completed_sales AS seller_sales,
              u.id_verified AS seller_id_verified,
              (SELECT COUNT(*)::int FROM saved_cars sc WHERE sc.car_id = c.id) AS saves_count,
              COALESCE((SELECT json_agg(json_build_object('price', ph.price, 'at', ph.changed_at) ORDER BY ph.changed_at)
                        FROM price_history ph WHERE ph.car_id = c.id), '[]') AS price_history
       FROM cars c
       JOIN users u ON u.id = c.seller_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Car not found' });
    // increment view count (fire-and-forget)
    pool.query('UPDATE cars SET views = views + 1 WHERE id = $1', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /cars/save/:id  (toggle save)
router.post('/save/:id', requireAuth, async (req, res) => {
  const { id: car_id } = req.params;
  const user_id = req.user.id;
  try {
    const existing = await pool.query(
      'SELECT 1 FROM saved_cars WHERE user_id = $1 AND car_id = $2',
      [user_id, car_id]
    );
    if (existing.rows.length) {
      await pool.query('DELETE FROM saved_cars WHERE user_id = $1 AND car_id = $2', [user_id, car_id]);
      await pool.query('UPDATE cars SET saves = GREATEST(0, saves - 1) WHERE id = $1', [car_id]);
      return res.json({ saved: false });
    }
    await pool.query('INSERT INTO saved_cars (user_id, car_id) VALUES ($1, $2)', [user_id, car_id]);
    await pool.query('UPDATE cars SET saves = saves + 1 WHERE id = $1', [car_id]);
    res.json({ saved: true });
  } catch (err) {
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
router.patch('/:id', requireAdmin, async (req, res) => {
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
router.patch('/:id/price', requireAuth, async (req, res) => {
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
router.patch('/:id/feature', requireAdmin, async (req, res) => {
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

router.patch('/:id/status', requireAdmin, async (req, res) => {
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
