const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const { uploadPhotos, publicUploadUrl, verifyImageContent } = require('../middleware/upload');
const { withTransaction } = require('../lib/tx');
const { notifyUser } = require('../lib/notify');

const { sendRentalBooked } = require('../lib/mailer');

const router = express.Router();

// One definition of "booked ranges" — used by list, detail, and (as the
// overlap predicate below) the booking route itself.
const BOOKED_RANGES_SQL = `
  COALESCE(
    (SELECT json_agg(json_build_object('start_date', b.start_date, 'days', b.days))
     FROM rental_bookings b
     WHERE b.rental_car_id = rc.id
       AND b.status IN ('upcoming', 'active')
       AND b.start_date + b.days >= CURRENT_DATE),
    '[]'
  ) AS booked_ranges`;

// Weekly rate kicks in per full week; remainder at the daily rate.
// Mirrors calcTripCost in the mobile app — the server is the authority.
function tripCost(car, days) {
  const weeks = Math.floor(days / 7);
  const remainder = days % 7;
  const subtotal = weeks * (car.weekly_rate || car.daily_rate * 7) + remainder * car.daily_rate;
  return { subtotal, deposit: car.deposit, total: subtotal + car.deposit };
}

const AIRPORT_FEE = 20;

// GET /rentals — active fleet, with each car's booked date ranges so the
// app can grey out unavailable days
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rc.*, ${BOOKED_RANGES_SQL}
       FROM rental_cars rc
       WHERE rc.status = 'active'
       ORDER BY rc.daily_rate ASC`
    );
    res.json(rows);
  } catch (err) {
    log.error('rentals list error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /rentals/bookings/my — renter's bookings
router.get('/bookings/my', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, rc.title AS car_title, rc.images AS car_images, rc.location AS car_location
       FROM rental_bookings b
       JOIN rental_cars rc ON rc.id = b.rental_car_id
       WHERE b.renter_id = $1
       ORDER BY b.booked_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /rentals/bookings — admin overview
router.get('/bookings', requireAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    const params = [];
    let where = '';
    if (status) { params.push(status); where = 'WHERE b.status = $1'; }
    const { rows } = await pool.query(
      `SELECT b.*, rc.title AS car_title, u.name AS renter_name, u.phone AS renter_phone
       FROM rental_bookings b
       JOIN rental_cars rc ON rc.id = b.rental_car_id
       JOIN users u ON u.id = b.renter_id
       ${where}
       ORDER BY b.start_date ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /rentals/:id — car detail with booked ranges
router.get('/:id', requireUuid('id'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rc.*, ${BOOKED_RANGES_SQL}
       FROM rental_cars rc WHERE rc.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Rental car not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rentals/:id/book — renter books; server computes cost + checks overlap
router.post('/:id/book', requireAuth, requireUuid('id'), async (req, res) => {
  const { start_date, days, pickup_window, airport_pickup, center } = req.body;
  const numDays = parseInt(days);
  if (!start_date || !numDays || numDays < 1) {
    return res.status(400).json({ error: 'start_date and days are required' });
  }
  try {
    // Row-lock the car so two concurrent requests can't both pass the overlap
    // check — same pattern as handover booking.
    const booking = await withTransaction(async (client) => {
      const carRes = await client.query(
        "SELECT * FROM rental_cars WHERE id = $1 AND status = 'active' FOR UPDATE",
        [req.params.id]
      );
      if (!carRes.rows.length) {
        const e = new Error('Rental car not found'); e.status = 404; throw e;
      }
      const car = carRes.rows[0];
      if (numDays < car.min_days) {
        const e = new Error(`Minimum rental is ${car.min_days} days`); e.status = 400; throw e;
      }

      // Overlap check: [start, start+days) against existing upcoming/active bookings
      const overlap = await client.query(
        `SELECT 1 FROM rental_bookings
         WHERE rental_car_id = $1
           AND status IN ('upcoming', 'active')
           AND start_date < $2::date + $3::int
           AND start_date + days > $2::date
         LIMIT 1`,
        [car.id, start_date, numDays]
      );
      if (overlap.rows.length) {
        const e = new Error('Selected dates are no longer available'); e.status = 409; throw e;
      }

      const cost = tripCost(car, numDays);
      const pickupFee = airport_pickup ? AIRPORT_FEE : 0;
      const bookingRef = 'RB-' + Date.now().toString(36).toUpperCase();

      const { rows } = await client.query(
        `INSERT INTO rental_bookings
           (booking_ref, rental_car_id, renter_id, start_date, days, pickup_window,
            center, airport_pickup, subtotal, deposit, pickup_fee, total, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'upcoming')
         RETURNING *`,
        [bookingRef, car.id, req.user.id, start_date, numDays, pickup_window || null,
         center || null, !!airport_pickup, cost.subtotal, cost.deposit, pickupFee,
         cost.total + pickupFee]
      );

      await notifyUser(client, {
        user_id: req.user.id,
        type: 'listing_update',
        title: 'Rental booking confirmed',
        body: `${car.title} is reserved from ${start_date} for ${numDays} day${numDays > 1 ? 's' : ''}. Bring your driving licence and ID — payment is at the center.`,
        meta: JSON.stringify({ bookingRef, rentalCarId: car.id }),
      });

      // car_title rides along for the confirmation email — RETURNING * only
      // covers the bookings row, and "your rental car" is a poor receipt.
      return { ...rows[0], car_title: car.title };
    });

    pool.query('SELECT email, name FROM users WHERE id = $1', [req.user.id])
      .then(({ rows: u }) => u[0] && sendRentalBooked(
        u[0].email, u[0].name, booking.car_title || 'your rental car',
        booking.start_date, booking.days, booking.booking_ref
      ))
      .catch(() => {});

    res.status(201).json(booking);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('rental booking error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /rentals/bookings/:id/status — check-in (active), return (completed), cancel
// Renter can transition their own booking; center staff (admin) can transition any.
router.patch('/bookings/:id/status', requireAuth, requireUuid('id'), async (req, res) => {
  const { status, record } = req.body;
  const ALLOWED = { upcoming: ['active', 'cancelled'], active: ['completed'] };
  if (!status) return res.status(400).json({ error: 'status is required' });
  try {
    const isAdmin = req.user.role === 'admin';
    const cur = await pool.query(
      `SELECT * FROM rental_bookings WHERE id = $1${isAdmin ? '' : ' AND renter_id = $2'}`,
      isAdmin ? [req.params.id] : [req.params.id, req.user.id]
    );
    if (!cur.rows.length) return res.status(404).json({ error: 'Booking not found' });
    const booking = cur.rows[0];
    if (!(ALLOWED[booking.status] || []).includes(status)) {
      return res.status(400).json({ error: `Cannot go from ${booking.status} to ${status}` });
    }

    const recordCol = status === 'active' ? 'pickup_record' : status === 'completed' ? 'return_record' : null;
    const { rows } = await pool.query(
      `UPDATE rental_bookings
       SET status = $1${recordCol ? `, ${recordCol} = COALESCE(${recordCol}, '{}'::jsonb) || $3` : ''}
       WHERE id = $2
       RETURNING *`,
      recordCol
        ? [status, req.params.id, JSON.stringify(record || { agreed_at: new Date().toISOString() })]
        : [status, req.params.id]
    );

    if (status === 'completed') {
      await pool.query('UPDATE rental_cars SET trips = trips + 1 WHERE id = $1', [booking.rental_car_id]);
    }

    res.json(rows[0]);
  } catch (err) {
    log.error('rental status error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Admin fleet CRUD ──────────────────────────────────────────────────────────

// POST /rentals — admin adds a car to the fleet
router.post('/', requireAdmin, async (req, res) => {
  const { title, make, model, year, category, seats, fuel, transmission, mileage,
          daily_rate, weekly_rate, deposit, min_days, inspection_score, location, images } = req.body;
  if (!title || !daily_rate) {
    return res.status(400).json({ error: 'title and daily_rate are required' });
  }
  if (!Number.isFinite(Number(daily_rate)) || Number(daily_rate) <= 0) {
    return res.status(400).json({ error: 'daily_rate must be a positive number' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO rental_cars
         (title, make, model, year, category, seats, fuel, transmission, mileage,
          daily_rate, weekly_rate, deposit, min_days, inspection_score, location, images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [title, make, model, year, category, seats || 5, fuel, transmission, mileage,
       daily_rate, weekly_rate || daily_rate * 6, deposit || 0, min_days || 1,
       inspection_score, location, images || []]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    log.error('rental create error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /rentals/:id — admin edits fleet car (rates, status active|maintenance|retired)
router.patch('/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const EDITABLE = ['title', 'daily_rate', 'weekly_rate', 'deposit', 'min_days',
                    'location', 'images', 'status', 'mileage'];
  const updates = [];
  const params = [];
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) {
      params.push(req.body[field]);
      updates.push(`${field} = $${params.length}`);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No editable fields provided' });
  if (req.body.status && !['active', 'maintenance', 'retired'].includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE rental_cars SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: 'Rental car not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rentals/bookings/:bookingId/photos — condition photos at pickup/return
// (:bookingId param name matters — the upload middleware keys the storage
// folder on it, landing files in uploads/rentals/<bookingId>)
router.post('/bookings/:bookingId/photos', requireAuth, requireUuid('bookingId'), uploadPhotos.array('photos', 12), verifyImageContent, async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No photos uploaded' });
  const { stage = 'pickup' } = req.body; // pickup | return
  if (!['pickup', 'return'].includes(stage)) {
    return res.status(400).json({ error: 'stage must be pickup or return' });
  }
  try {
    const owner = req.user.role === 'admin' ? '' : ' AND renter_id = $2';
    const params = req.user.role === 'admin' ? [req.params.bookingId] : [req.params.bookingId, req.user.id];
    const cur = await pool.query(`SELECT * FROM rental_bookings WHERE id = $1${owner}`, params);
    if (!cur.rows.length) return res.status(404).json({ error: 'Booking not found' });

    const urls = req.files.map((f) => publicUploadUrl(req, f));
    const col = stage === 'pickup' ? 'pickup_record' : 'return_record';
    const { rows } = await pool.query(
      `UPDATE rental_bookings
       SET ${col} = COALESCE(${col}, '{}'::jsonb) || jsonb_build_object('photos', $1::jsonb)
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(urls), req.params.bookingId]
    );
    res.json(rows[0]);
  } catch (err) {
    log.error('booking photos error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
