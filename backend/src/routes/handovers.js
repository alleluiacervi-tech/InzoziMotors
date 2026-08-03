const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUuid, paginate } = require('../middleware/validate');
const { parseIsoDate, isNotInPast, toDisplayDate } = require('../lib/dates');
const { recomputeTrustScore } = require('../lib/trust');
const { withTransaction } = require('../lib/tx');
const { notifyUser } = require('../lib/notify');

const router = express.Router();

// POST /handovers — buyer requests a car (slot optional; Sawa arranges)
router.post('/', requireAuth, async (req, res) => {
  const { car_id, center, handover_date, handover_time, contact_phone } = req.body;
  if (!car_id) {
    return res.status(400).json({ error: 'car_id is required' });
  }
  if (contact_phone && !/^\+?[0-9 ]{9,16}$/.test(contact_phone)) {
    return res.status(400).json({ error: 'contact_phone is not a valid phone number' });
  }
  // The slot is optional here — Sawa usually arranges it afterwards. When one
  // IS supplied it must be a real ISO date, so handover_on can be relied on for
  // ordering and day-based queries. handover_date stays as the display string.
  let slotDate = null;
  if (handover_date) {
    slotDate = parseIsoDate(handover_date);
    if (!slotDate) {
      return res.status(400).json({ error: 'handover_date must be an ISO date, for example 2026-08-12' });
    }
    if (!isNotInPast(slotDate)) {
      return res.status(400).json({ error: 'That date has already passed — choose an upcoming day' });
    }
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
            handover_on, handover_date, handover_time, contact_phone, agreed_price, status)
         VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10, 'pending')
         RETURNING *`,
        [booking_id, car_id, req.user.id, car.seller_id,
         center || null, slotDate, slotDate ? toDisplayDate(slotDate) : null,
         handover_time || null, contact_phone || null, car.price]
      );

      await client.query("UPDATE cars SET status = 'reserved' WHERE id = $1", [car_id]);

      await notifyUser(client, {
        user_id: req.user.id,
        type: 'handover',
        title: 'Request received',
        body: center && slotDate
          ? `Your slot for the ${car.title} is confirmed at ${center} on ${toDisplayDate(slotDate)} at ${handover_time}. The car is now reserved for you.`
          : `Your request for the ${car.title} is in — the car is reserved for you. We'll contact you shortly to arrange the handover.`,
        meta: JSON.stringify({ bookingId: booking_id, carId: car_id }),
      });
      await notifyUser(client, {
        user_id: car.seller_id,
        type: 'handover',
        title: 'A buyer wants your car',
        body: center && slotDate
          ? `A buyer has booked a handover for your ${car.title} at ${center} on ${toDisplayDate(slotDate)} at ${handover_time}. Please attend.`
          : `A buyer wants your ${car.title}. Sawa will coordinate the handover with both of you shortly.`,
        meta: JSON.stringify({ bookingId: booking_id, carId: car_id }),
      });

      return { status: 201, body: rows[0] };
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('book handover error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /handovers/my — buyer sees their bookings
router.get('/my', requireAuth, paginate(), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT h.*,
              c.title AS car_title, c.images AS car_images, c.price,
              u.name  AS seller_name
       FROM handovers h
       JOIN cars  c ON c.id = h.car_id
       JOIN users u ON u.id = h.seller_id
       WHERE h.buyer_id = $1
       ORDER BY h.booked_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, req.pagination.limit, req.pagination.offset]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /handovers/selling — seller sees handovers on their listings
router.get('/selling', requireAuth, paginate(), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT h.*,
              c.title AS car_title, c.images AS car_images, c.price,
              u.name AS buyer_name
       FROM handovers h
       JOIN cars  c ON c.id = h.car_id
       JOIN users u ON u.id = h.buyer_id
       WHERE h.seller_id = $1
       ORDER BY h.booked_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, req.pagination.limit, req.pagination.offset]
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
router.patch('/:id/confirm', requireAdmin, requireUuid('id'), async (req, res) => {
  const { center, handover_date, handover_time } = req.body || {};
  // Admin can set or correct the slot here; same ISO rule as booking, so
  // handover_on stays trustworthy whichever route wrote it.
  let slotDate = null;
  if (handover_date) {
    slotDate = parseIsoDate(handover_date);
    if (!slotDate) {
      return res.status(400).json({ error: 'handover_date must be an ISO date, for example 2026-08-12' });
    }
  }
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
             handover_on = COALESCE($2::date, handover_on),
             handover_date = COALESCE($3, handover_date),
             handover_time = COALESCE($4, handover_time)
         WHERE id = $5
         RETURNING *`,
        [center || null, slotDate, slotDate ? toDisplayDate(slotDate) : null, handover_time || null, h.id]
      );
      const updated = rows[0];

      const carRes = await client.query('SELECT title FROM cars WHERE id = $1', [h.car_id]);
      const carTitle = carRes.rows[0]?.title || 'the car';
      const slotText = updated.center && updated.handover_date
        ? ` Meet at ${updated.center} on ${updated.handover_date}${updated.handover_time ? ` at ${updated.handover_time}` : ''}.`
        : ' We will share the exact time and place shortly.';

      for (const [uid, title] of [[h.buyer_id, 'Handover confirmed'], [h.seller_id, 'Handover confirmed']]) {
        await notifyUser(client, {
          user_id: uid,
          type: 'handover',
          title,
          body: `The handover for the ${carTitle} is confirmed.${slotText}`,
          meta: JSON.stringify({ bookingId: h.booking_id, carId: h.car_id }),
        });
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
router.patch('/:id/complete', requireAdmin, requireUuid('id'), async (req, res) => {
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
      let commission = Math.round((h.agreed_price || 0) * rate);

      // Referral reward: an unconsumed redemption by this seller discounts
      // their next commission (blueprint: "commission discount on next listing")
      if (commission > 0) {
        const discountRate = parseFloat(process.env.REFERRAL_DISCOUNT || '0.2');
        const redemption = await client.query(
          `SELECT id FROM referral_redemptions
           WHERE redeemed_by = $1 AND consumed_at IS NULL
           ORDER BY redeemed_at ASC LIMIT 1 FOR UPDATE`,
          [h.seller_id]
        );
        if (redemption.rows.length) {
          commission = Math.round(commission * (1 - discountRate));
          await client.query(
            'UPDATE referral_redemptions SET consumed_at = NOW() WHERE id = $1',
            [redemption.rows[0].id]
          );
          await notifyUser(client, {
            user_id: h.seller_id,
            type: 'listing_update',
            title: 'Referral discount applied',
            body: `Your referral reward saved you ${Math.round(discountRate * 100)}% on this sale's commission.`,
            meta: JSON.stringify({ handoverId: h.id }),
          });
        }
      }

      if (commission > 0) {
        await client.query(
          `INSERT INTO platform_fees (handover_id, seller_id, fee_type, amount, status)
           VALUES ($1, $2, 'commission', $3, 'due')`,
          [h.id, h.seller_id, commission]
        );
      }

      const carRes = await client.query('SELECT title FROM cars WHERE id = $1', [h.car_id]);
      const carTitle = carRes.rows[0]?.title || 'your car';

      await notifyUser(client, {
        user_id: h.buyer_id,
        type: 'handover',
        title: 'Handover complete — car is yours!',
        body: `The ${carTitle} handover is confirmed by Sawa. Your 7-day return guarantee starts now.`,
        meta: JSON.stringify({ bookingId: h.booking_id, carId: h.car_id }),
      });
      await notifyUser(client, {
        user_id: h.seller_id,
        type: 'handover',
        title: 'Sale complete',
        body: `The handover for ${carTitle} has been confirmed by the Sawa team. The listing is now closed.`,
        meta: JSON.stringify({ bookingId: h.booking_id, carId: h.car_id }),
      });

      return { status: 200, body: { success: true } };
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('complete handover error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /handovers/:id/cancel — buyer cancels (pending or confirmed)
router.patch('/:id/cancel', requireAuth, requireUuid('id'), async (req, res) => {
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
      await notifyUser(client, {
        user_id: h.seller_id,
        type: 'handover',
        title: 'Handover cancelled',
        body: 'The buyer cancelled their request. Your listing is live again.',
        meta: JSON.stringify({ bookingId: h.booking_id, carId: h.car_id }),
      });
      return { status: 200, body: { success: true } };
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
