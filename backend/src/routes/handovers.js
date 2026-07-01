const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /handovers — buyer books a handover slot
router.post('/', requireAuth, async (req, res) => {
  const { car_id, center, handover_date, handover_time } = req.body;
  if (!car_id || !center || !handover_date || !handover_time) {
    return res.status(400).json({
      error: 'car_id, center, handover_date, and handover_time are required',
    });
  }
  try {
    const carRes = await pool.query(
      "SELECT * FROM cars WHERE id = $1 AND status = 'live'",
      [car_id]
    );
    if (!carRes.rows.length) {
      return res.status(409).json({ error: 'Car is no longer available' });
    }
    const car = carRes.rows[0];
    const booking_id = 'BK-' + Date.now().toString(36).toUpperCase();

    const { rows } = await pool.query(
      `INSERT INTO handovers
         (booking_id, car_id, buyer_id, seller_id, center,
          handover_date, handover_time, agreed_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [booking_id, car_id, req.user.id, car.seller_id,
       center, handover_date, handover_time, car.price]
    );
    const handover = rows[0];

    await pool.query("UPDATE cars SET status = 'reserved' WHERE id = $1", [car_id]);

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, meta)
       VALUES ($1, 'handover', 'Handover slot booked', $2, $3)`,
      [
        req.user.id,
        `Your slot for the ${car.title} is confirmed at ${center} on ${handover_date} at ${handover_time}. The car is now reserved for you.`,
        JSON.stringify({ bookingId: booking_id, carId: car_id }),
      ]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, meta)
       VALUES ($1, 'handover', 'A buyer has booked a handover', $2, $3)`,
      [
        car.seller_id,
        `A buyer has booked a handover for your ${car.title} at ${center} on ${handover_date} at ${handover_time}. Please attend.`,
        JSON.stringify({ bookingId: booking_id, carId: car_id }),
      ]
    );

    res.status(201).json(handover);
  } catch (err) {
    console.error('book handover error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /handovers/my — buyer sees their bookings
router.get('/my', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT h.*,
              c.title AS car_title, c.images AS car_images, c.price,
              u.name  AS seller_name
       FROM handovers h
       JOIN cars  c ON c.id = h.car_id
       JOIN users u ON u.id = h.seller_id
       WHERE h.buyer_id = $1
       ORDER BY h.booked_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /handovers — admin sees all handovers (filter by status)
router.get('/', requireAdmin, async (req, res) => {
  const { status = 'pending' } = req.query;
  try {
    const { rows } = await pool.query(
      `SELECT h.*,
              c.title AS car_title, c.make, c.model, c.year,
              buyer.name  AS buyer_name,  buyer.phone  AS buyer_phone,
              seller.name AS seller_name, seller.phone AS seller_phone
       FROM handovers h
       JOIN cars  c ON c.id = h.car_id
       JOIN users buyer  ON buyer.id  = h.buyer_id
       JOIN users seller ON seller.id = h.seller_id
       WHERE h.status = $1
       ORDER BY h.booked_at ASC`,
      [status]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /handovers/:id/confirm — admin confirms handover → marks sold
router.patch('/:id/confirm', requireAdmin, async (req, res) => {
  try {
    const hRes = await pool.query('SELECT * FROM handovers WHERE id = $1', [req.params.id]);
    if (!hRes.rows.length) return res.status(404).json({ error: 'Handover not found' });
    const h = hRes.rows[0];

    await pool.query(
      `UPDATE handovers
       SET status = 'complete', confirmed_by = $1, confirmed_at = NOW()
       WHERE id = $2`,
      [req.user.id, h.id]
    );

    await pool.query(
      "UPDATE cars SET status = 'sold', sold_at = NOW() WHERE id = $1",
      [h.car_id]
    );

    await pool.query(
      'UPDATE users SET completed_sales = completed_sales + 1 WHERE id = $1',
      [h.seller_id]
    );

    const carRes = await pool.query('SELECT title FROM cars WHERE id = $1', [h.car_id]);
    const carTitle = carRes.rows[0]?.title || 'your car';

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, meta)
       VALUES ($1, 'handover', 'Handover confirmed — car is yours!', $2, $3)`,
      [
        h.buyer_id,
        `The ${carTitle} handover is confirmed by Inzozi. Your 7-day return guarantee starts now.`,
        JSON.stringify({ bookingId: h.booking_id, carId: h.car_id }),
      ]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, meta)
       VALUES ($1, 'handover', 'Sale complete', $2, $3)`,
      [
        h.seller_id,
        `The handover for ${carTitle} has been confirmed by the Inzozi team. The listing is now closed.`,
        JSON.stringify({ bookingId: h.booking_id, carId: h.car_id }),
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('confirm handover error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /handovers/:id/cancel — buyer cancels
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const hRes = await pool.query(
      "SELECT * FROM handovers WHERE id = $1 AND buyer_id = $2 AND status = 'pending'",
      [req.params.id, req.user.id]
    );
    if (!hRes.rows.length) {
      return res.status(404).json({ error: 'Handover not found or cannot be cancelled' });
    }
    const h = hRes.rows[0];
    await pool.query("UPDATE handovers SET status = 'cancelled' WHERE id = $1", [h.id]);
    await pool.query("UPDATE cars SET status = 'live' WHERE id = $1", [h.car_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
