const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { recomputeTrustScore } = require('../lib/trust');

const router = express.Router();

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// POST /handovers — buyer requests a car (slot optional; Inzozi arranges)
router.post('/', requireAuth, async (req, res) => {
  const { car_id, center, handover_date, handover_time, contact_phone } = req.body;
  if (!car_id) {
    return res.status(400).json({ error: 'car_id is required' });
  }
  if (contact_phone && !/^\+?[0-9 ]{9,16}$/.test(contact_phone)) {
    return res.status(400).json({ error: 'contact_phone is not a valid phone number' });
  }
  try {
    const result = await withTransaction(async (client) => {
      // Lock the car row so two buyers can't reserve simultaneously
      const carRes = await client.query(
        "SELECT * FROM cars WHERE id = $1 AND status = 'live' FOR UPDATE",
        [car_id]
      );
      if (!carRes.rows.length) return { status: 409, body: { error: 'Car is no longer available' } };
      const car = carRes.rows[0];
      if (car.seller_id === req.user.id) {
        return { status: 400, body: { error: 'You cannot request your own listing' } };
      }

      const booking_id = 'BK-' + Date.now().toString(36).toUpperCase();
      const { rows } = await client.query(
        `INSERT INTO handovers
           (booking_id, car_id, buyer_id, seller_id, center,
            handover_date, handover_time, contact_phone, agreed_price, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
         RETURNING *`,
        [booking_id, car_id, req.user.id, car.seller_id,
         center || null, handover_date || null, handover_time || null,
         contact_phone || null, car.price]
      );

      await client.query("UPDATE cars SET status = 'reserved' WHERE id = $1", [car_id]);

      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, meta)
         VALUES ($1, 'handover', 'Request received', $2, $3)`,
        [req.user.id,
         center && handover_date
           ? `Your slot for the ${car.title} is confirmed at ${center} on ${handover_date} at ${handover_time}. The car is now reserved for you.`
           : `Your request for the ${car.title} is in — the car is reserved for you. We'll contact you shortly to arrange the handover.`,
         JSON.stringify({ bookingId: booking_id, carId: car_id })]
      );
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, meta)
         VALUES ($1, 'handover', 'A buyer wants your car', $2, $3)`,
        [car.seller_id,
         center && handover_date
           ? `A buyer has booked a handover for your ${car.title} at ${center} on ${handover_date} at ${handover_time}. Please attend.`
           : `A buyer wants your ${car.title}. Inzozi will coordinate the handover with both of you shortly.`,
         JSON.stringify({ bookingId: booking_id, carId: car_id })]
      );

      return { status: 201, body: rows[0] };
    });
    res.status(result.status).json(result.body);
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

// GET /handovers/selling — seller sees handovers on their listings
router.get('/selling', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT h.*,
              c.title AS car_title, c.images AS car_images, c.price,
              u.name AS buyer_name
       FROM handovers h
       JOIN cars  c ON c.id = h.car_id
       JOIN users u ON u.id = h.buyer_id
       WHERE h.seller_id = $1
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
  const allowed = ['pending', 'confirmed', 'complete', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status filter' });
  }
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

// PATCH /handovers/:id/confirm — admin confirms the arrangement (pending → confirmed).
// Optionally sets/updates the agreed slot at the same time.
router.patch('/:id/confirm', requireAdmin, async (req, res) => {
  const { center, handover_date, handover_time } = req.body || {};
  try {
    const result = await withTransaction(async (client) => {
      const hRes = await client.query(
        "SELECT * FROM handovers WHERE id = $1 FOR UPDATE", [req.params.id]
      );
      if (!hRes.rows.length) return { status: 404, body: { error: 'Handover not found' } };
      const h = hRes.rows[0];
      if (h.status !== 'pending') {
        return { status: 409, body: { error: `Handover is ${h.status}, not pending` } };
      }

      const { rows } = await client.query(
        `UPDATE handovers
         SET status = 'confirmed',
             center = COALESCE($1, center),
             handover_date = COALESCE($2, handover_date),
             handover_time = COALESCE($3, handover_time)
         WHERE id = $4
         RETURNING *`,
        [center || null, handover_date || null, handover_time || null, h.id]
      );
      const updated = rows[0];

      const carRes = await client.query('SELECT title FROM cars WHERE id = $1', [h.car_id]);
      const carTitle = carRes.rows[0]?.title || 'the car';
      const slotText = updated.center && updated.handover_date
        ? ` Meet at ${updated.center} on ${updated.handover_date}${updated.handover_time ? ` at ${updated.handover_time}` : ''}.`
        : ' We will share the exact time and place shortly.';

      for (const [uid, title] of [[h.buyer_id, 'Handover confirmed'], [h.seller_id, 'Handover confirmed']]) {
        await client.query(
          `INSERT INTO notifications (user_id, type, title, body, meta)
           VALUES ($1, 'handover', $2, $3, $4)`,
          [uid, title,
           `The handover for the ${carTitle} is confirmed.${slotText}`,
           JSON.stringify({ bookingId: h.booking_id, carId: h.car_id })]
        );
      }

      return { status: 200, body: updated };
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('confirm handover error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /handovers/:id/complete — admin marks the sale done (confirmed/pending → complete).
// Idempotent: re-completing is a 409, so completed_sales can never double-increment.
router.patch('/:id/complete', requireAdmin, async (req, res) => {
  try {
    const result = await withTransaction(async (client) => {
      const hRes = await client.query(
        'SELECT * FROM handovers WHERE id = $1 FOR UPDATE', [req.params.id]
      );
      if (!hRes.rows.length) return { status: 404, body: { error: 'Handover not found' } };
      const h = hRes.rows[0];
      if (!['pending', 'confirmed'].includes(h.status)) {
        return { status: 409, body: { error: `Handover is already ${h.status}` } };
      }

      await client.query(
        `UPDATE handovers
         SET status = 'complete', confirmed_by = $1, confirmed_at = NOW()
         WHERE id = $2`,
        [req.user.id, h.id]
      );
      await client.query(
        "UPDATE cars SET status = 'sold', sold_at = NOW() WHERE id = $1", [h.car_id]
      );
      await client.query(
        'UPDATE users SET completed_sales = completed_sales + 1 WHERE id = $1', [h.seller_id]
      );
      await recomputeTrustScore(h.seller_id, client);

      // Record the success commission — the revenue event of the business model
      const rate = parseFloat(process.env.COMMISSION_RATE || '0.05');
      const commission = Math.round((h.agreed_price || 0) * rate);
      if (commission > 0) {
        await client.query(
          `INSERT INTO platform_fees (handover_id, seller_id, fee_type, amount, status)
           VALUES ($1, $2, 'commission', $3, 'due')`,
          [h.id, h.seller_id, commission]
        );
      }

      const carRes = await client.query('SELECT title FROM cars WHERE id = $1', [h.car_id]);
      const carTitle = carRes.rows[0]?.title || 'your car';

      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, meta)
         VALUES ($1, 'handover', 'Handover complete — car is yours!', $2, $3)`,
        [h.buyer_id,
         `The ${carTitle} handover is confirmed by Inzozi. Your 7-day return guarantee starts now.`,
         JSON.stringify({ bookingId: h.booking_id, carId: h.car_id })]
      );
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, meta)
         VALUES ($1, 'handover', 'Sale complete', $2, $3)`,
        [h.seller_id,
         `The handover for ${carTitle} has been confirmed by the Inzozi team. The listing is now closed.`,
         JSON.stringify({ bookingId: h.booking_id, carId: h.car_id })]
      );

      return { status: 200, body: { success: true } };
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('complete handover error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /handovers/:id/cancel — buyer cancels (pending or confirmed)
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const result = await withTransaction(async (client) => {
      const hRes = await client.query(
        `SELECT * FROM handovers
         WHERE id = $1 AND buyer_id = $2 AND status IN ('pending', 'confirmed')
         FOR UPDATE`,
        [req.params.id, req.user.id]
      );
      if (!hRes.rows.length) {
        return { status: 404, body: { error: 'Handover not found or cannot be cancelled' } };
      }
      const h = hRes.rows[0];
      await client.query("UPDATE handovers SET status = 'cancelled' WHERE id = $1", [h.id]);
      await client.query("UPDATE cars SET status = 'live' WHERE id = $1", [h.car_id]);
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, meta)
         VALUES ($1, 'handover', 'Handover cancelled', $2, $3)`,
        [h.seller_id,
         'The buyer cancelled their request. Your listing is live again.',
         JSON.stringify({ bookingId: h.booking_id, carId: h.car_id })]
      );
      return { status: 200, body: { success: true } };
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
