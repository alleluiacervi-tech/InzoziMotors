const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

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
      `SELECT rc.*,
              COALESCE(
                (SELECT json_agg(json_build_object('start_date', b.start_date, 'days', b.days))
                 FROM rental_bookings b
                 WHERE b.rental_car_id = rc.id
                   AND b.status IN ('upcoming', 'active')
                   AND b.start_date + b.days >= CURRENT_DATE),
                '[]'
              ) AS booked_ranges
       FROM rental_cars rc
       WHERE rc.status = 'active'
       ORDER BY rc.daily_rate ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('rentals list error:', err.message);
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
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rc.*,
              COALESCE(
                (SELECT json_agg(json_build_object('start_date', b.start_date, 'days', b.days))
                 FROM rental_bookings b
                 WHERE b.rental_car_id = rc.id
                   AND b.status IN ('upcoming', 'active')
                   AND b.start_date + b.days >= CURRENT_DATE),
                '[]'
              ) AS booked_ranges
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
router.post('/:id/book', requireAuth, async (req, res) => {
  const { start_date, days, pickup_window, airport_pickup, center } = req.body;
  const numDays = parseInt(days);
  if (!start_date || !numDays || numDays < 1) {
    return res.status(400).json({ error: 'start_date and days are required' });
  }
  try {
    const carRes = await pool.query(
      "SELECT * FROM rental_cars WHERE id = $1 AND status = 'active'",
      [req.params.id]
    );
    if (!carRes.rows.length) return res.status(404).json({ error: 'Rental car not found' });
    const car = carRes.rows[0];
    if (numDays < car.min_days) {
      return res.status(400).json({ error: `Minimum rental is ${car.min_days} days` });
    }

    // Overlap check: [start, start+days) against existing upcoming/active bookings
    const overlap = await pool.query(
      `SELECT 1 FROM rental_bookings
       WHERE rental_car_id = $1
         AND status IN ('upcoming', 'active')
         AND start_date < $2::date + $3::int
         AND start_date + days > $2::date
       LIMIT 1`,
      [car.id, start_date, numDays]
    );
    if (overlap.rows.length) {
      return res.status(409).json({ error: 'Selected dates are no longer available' });
    }

    const cost = tripCost(car, numDays);
    const pickupFee = airport_pickup ? AIRPORT_FEE : 0;
    const bookingRef = 'RB-' + Date.now().toString(36).toUpperCase();

    const { rows } = await pool.query(
      `INSERT INTO rental_bookings
         (booking_ref, rental_car_id, renter_id, start_date, days, pickup_window,
          center, airport_pickup, subtotal, deposit, pickup_fee, total, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'upcoming')
       RETURNING *`,
      [bookingRef, car.id, req.user.id, start_date, numDays, pickup_window || null,
       center || null, !!airport_pickup, cost.subtotal, cost.deposit, pickupFee,
       cost.total + pickupFee]
    );
    const booking = rows[0];

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, meta)
       VALUES ($1, 'listing_update', 'Rental booking confirmed', $2, $3)`,
      [req.user.id,
       `${car.title} is reserved from ${start_date} for ${numDays} day${numDays > 1 ? 's' : ''}. Bring your driving licence and ID — payment is at the center.`,
       JSON.stringify({ bookingRef, rentalCarId: car.id })]
    );

    res.status(201).json(booking);
  } catch (err) {
    console.error('rental booking error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /rentals/bookings/:id/status — check-in (active), return (completed), cancel
// Renter can transition their own booking; the condition record is attached
// by staff at the counter (or the renter's agreement stamp in the app).
router.patch('/bookings/:id/status', requireAuth, async (req, res) => {
  const { status, record } = req.body;
  const ALLOWED = { upcoming: ['active', 'cancelled'], active: ['completed'] };
  if (!status) return res.status(400).json({ error: 'status is required' });
  try {
    const cur = await pool.query(
      'SELECT * FROM rental_bookings WHERE id = $1 AND renter_id = $2',
      [req.params.id, req.user.id]
    );
    if (!cur.rows.length) return res.status(404).json({ error: 'Booking not found' });
    const booking = cur.rows[0];
    if (!(ALLOWED[booking.status] || []).includes(status)) {
      return res.status(400).json({ error: `Cannot go from ${booking.status} to ${status}` });
    }

    const recordCol = status === 'active' ? 'pickup_record' : status === 'completed' ? 'return_record' : null;
    const { rows } = await pool.query(
      `UPDATE rental_bookings
       SET status = $1${recordCol ? `, ${recordCol} = $4` : ''}
       WHERE id = $2 AND renter_id = $3
       RETURNING *`,
      recordCol
        ? [status, req.params.id, req.user.id, JSON.stringify(record || { agreed_at: new Date().toISOString() })]
        : [status, req.params.id, req.user.id]
    );

    if (status === 'completed') {
      await pool.query('UPDATE rental_cars SET trips = trips + 1 WHERE id = $1', [booking.rental_car_id]);
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('rental status error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
