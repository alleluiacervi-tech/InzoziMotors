const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /submissions — seller submits a car for inspection
router.post('/', requireAuth, async (req, res) => {
  const {
    make, model, year, mileage, condition, fuel_type, transmission,
    body_type, color, asking_price, notes,
  } = req.body;
  if (!make || !model || !year || !asking_price) {
    return res.status(400).json({ error: 'make, model, year, and asking_price are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO submissions
         (seller_id, make, model, year, mileage, condition, fuel_type,
          transmission, body_type, color, asking_price, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'under_review')
       RETURNING *`,
      [req.user.id, make, model, year, mileage, condition, fuel_type,
       transmission, body_type, color, asking_price, notes]
    );
    const sub = rows[0];

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, meta)
       VALUES ($1, 'listing_update', 'Submission received', $2, $3)`,
      [
        req.user.id,
        'Your car has been submitted. Our team will review it within 24 hours.',
        JSON.stringify({ submissionId: sub.id }),
      ]
    );

    res.status(201).json(sub);
  } catch (err) {
    console.error('submission error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /submissions — seller sees their own submissions
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, c.title AS car_title, c.images AS car_images, c.status AS listing_status
       FROM submissions s
       LEFT JOIN cars c ON c.id = s.car_id
       WHERE s.seller_id = $1
       ORDER BY s.submitted_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /submissions/admin/all — admin sees all submissions
router.get('/admin/all', requireAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    const params = [];
    let where = '';
    if (status) { params.push(status); where = 'WHERE s.status = $1'; }
    const { rows } = await pool.query(
      `SELECT s.*, u.name AS seller_name, u.email AS seller_email,
              c.title AS car_title
       FROM submissions s
       JOIN users u ON u.id = s.seller_id
       LEFT JOIN cars c ON c.id = s.car_id
       ${where}
       ORDER BY s.submitted_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /submissions/:id — admin updates status (and optionally schedules inspection)
router.patch('/:id', requireAdmin, async (req, res) => {
  const { status, admin_notes, center, scheduled_date, scheduled_time } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE submissions
       SET status = $1, admin_notes = COALESCE($2, admin_notes),
           reviewed_at = NOW(), reviewer_id = $3
       WHERE id = $4
       RETURNING *`,
      [status, admin_notes, req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Submission not found' });
    const sub = rows[0];

    // Create inspection record when scheduling
    if (status === 'scheduled' && center) {
      const scheduledAt = scheduled_date && scheduled_time
        ? new Date(`${scheduled_date} ${scheduled_time}`)
        : null;

      await pool.query(
        `INSERT INTO inspections
           (submission_id, car_id, center, scheduled_date, scheduled_time, scheduled_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
         ON CONFLICT DO NOTHING`,
        [sub.id, sub.car_id, center, scheduled_date, scheduled_time, scheduledAt]
      );
    }

    // Notify seller
    const messages = {
      scheduled: `Your inspection is booked at ${center || 'our center'} on ${scheduled_date || 'a date TBC'} at ${scheduled_time || ''}.`,
      rejected: `Your submission was not accepted. Reason: ${admin_notes || 'Contact us for details.'}`,
      live: 'Your car is now live on the marketplace!',
    };
    if (messages[status]) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, meta)
         VALUES ($1, 'listing_update', $2, $3, $4)`,
        [sub.seller_id, `Submission ${status}`, messages[status],
         JSON.stringify({ submissionId: sub.id })]
      );
    }

    res.json(sub);
  } catch (err) {
    console.error('update submission error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
