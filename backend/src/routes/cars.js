const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

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

  params.push(parseInt(limit), parseInt(offset));

  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS seller_name, u.trust_score AS seller_trust
       FROM cars c
       JOIN users u ON u.id = c.seller_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${safeSort} ${safeOrder}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('cars list error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /cars/:id/history — vehicle history card (buyers + public)
router.get('/:id/history', async (req, res) => {
  try {
    const carRes = await pool.query(
      `SELECT c.vin, c.make, c.model, c.year, c.mileage, c.drive_side,
              c.fuel_type, c.created_at, c.listed_at,
              u.name AS seller_name, u.completed_sales AS seller_sales
       FROM cars c
       JOIN users u ON u.id = c.seller_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!carRes.rows.length) return res.status(404).json({ error: 'Car not found' });
    const car = carRes.rows[0];

    // Count confirmed handovers = previous ownership transfers
    const ownersRes = await pool.query(
      `SELECT COUNT(*) FROM handovers WHERE car_id = $1 AND status = 'complete'`,
      [req.params.id]
    );
    const previousOwners = parseInt(ownersRes.rows[0].count);

    // Fetch inspection report summary
    const inspRes = await pool.query(
      `SELECT score, completed_at FROM inspections
       WHERE car_id = $1 AND status = 'complete'
       ORDER BY completed_at DESC LIMIT 1`,
      [req.params.id]
    );
    const inspection = inspRes.rows[0] || null;

    res.json({
      vin:              car.vin,
      make:             car.make,
      model:            car.model,
      year:             car.year,
      mileage_km:       car.mileage,
      drive_side:       car.drive_side,
      fuel_type:        car.fuel_type,
      listed_at:        car.listed_at,
      previous_owners:  previousOwners,
      import_origin:    car.drive_side === 'RHD' ? 'Japan' : 'Local / Other',
      rra_duty_paid:    true,          // Placeholder — connect RRA API when available
      mileage_verified: inspection !== null,
      accident_history: false,         // Placeholder — connect insurance API when available
      inspection_score: inspection?.score ?? null,
      inspection_date:  inspection?.completed_at ?? null,
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
      `SELECT c.*, u.name AS seller_name, u.trust_score AS seller_trust,
              u.response_rate AS seller_response_rate, u.completed_sales AS seller_sales,
              u.id_verified AS seller_id_verified
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
          inspected, inspection_score } = req.body;
  try {
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
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('create car error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /cars/:id/status  (admin changes status)
router.patch('/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
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
