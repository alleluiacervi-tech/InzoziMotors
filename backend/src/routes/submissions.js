const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin, requireVerified } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const { notifyUser } = require('../lib/notify');

const router = express.Router();

const MAX_REFERENCE_IMAGES = 12;

// POST /submissions — seller submits a car for inspection.
// requireVerified, not requireAuth: identity is mandatory before a car can
// enter the pipeline (blueprint rule), and the UI gate alone is not enforcement.
router.post('/', requireVerified, async (req, res) => {
  const {
    make, model, year, mileage, condition, fuel_type, transmission,
    body_type, color, asking_price, notes, reference_images,
  } = req.body;
  if (!make || !model || !year) {
    return res.status(400).json({ error: 'make, model, and year are required' });
  }
  // reference_images lands in a TEXT[] column — anything but strings would
  // either crash the insert or store garbage the app then renders as an <img>.
  if (reference_images !== undefined && reference_images !== null) {
    if (!Array.isArray(reference_images)) {
      return res.status(400).json({ error: 'reference_images must be an array of image URLs' });
    }
    if (reference_images.length > MAX_REFERENCE_IMAGES) {
      return res.status(400).json({ error: `reference_images is limited to ${MAX_REFERENCE_IMAGES} images` });
    }
    if (reference_images.some((img) => typeof img !== 'string' || !img.trim())) {
      return res.status(400).json({ error: 'Each reference_images entry must be a non-empty string' });
    }
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO submissions
         (seller_id, make, model, year, mileage, condition, fuel_type,
          transmission, body_type, color, asking_price, notes, reference_images, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'under_review')
       RETURNING *`,
      [req.user.id, make, model, year, mileage, condition, fuel_type,
       transmission, body_type, color, asking_price || 0, notes,
       Array.isArray(reference_images) ? reference_images : null]
    );
    const sub = rows[0];

    await notifyUser(pool, {
      user_id: req.user.id,
      type: 'listing_update',
      title: 'Submission received',
      body: 'Your car has been submitted. Our team will review it within 24 hours.',
      meta: JSON.stringify({ submissionId: sub.id }),
    });

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

const SUBMISSION_STATUSES = ['under_review', 'approved', 'scheduled', 'inspecting', 'inspected', 'live', 'rejected'];

// Capacity check against inspection_centers (free-text centers pass through).
// Returns an error string when the center's daily capacity is exhausted.
async function centerCapacityError(center, date) {
  const centerRes = await pool.query(
    'SELECT id, daily_capacity FROM inspection_centers WHERE active = TRUE AND name ILIKE $1',
    [center]
  );
  if (!centerRes.rows.length) return null; // unknown/free-text center — no cap to enforce
  const cap = centerRes.rows[0].daily_capacity;
  const cntRes = await pool.query(
    `SELECT COUNT(*) FROM inspections
     WHERE center ILIKE $1 AND scheduled_date = $2 AND status IN ('scheduled', 'in_progress')`,
    [center, date]
  );
  if (Number(cntRes.rows[0].count) >= cap) {
    return `${center} is fully booked on ${date} — choose another day or center`;
  }
  return null;
}

// PATCH /submissions/:id — admin updates status (and optionally schedules inspection)
router.patch('/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const { status, admin_notes, center, scheduled_date, scheduled_time } = req.body;
  if (!SUBMISSION_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${SUBMISSION_STATUSES.join(', ')}` });
  }
  if (status === 'scheduled' && (!center || !scheduled_date || !scheduled_time)) {
    return res.status(400).json({ error: 'Scheduling requires center, scheduled_date, and scheduled_time' });
  }
  try {
    if (status === 'scheduled') {
      const capErr = await centerCapacityError(center, scheduled_date);
      if (capErr) return res.status(409).json({ error: capErr });
    }
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
         ON CONFLICT (submission_id) DO UPDATE
           SET center = EXCLUDED.center, scheduled_date = EXCLUDED.scheduled_date,
               scheduled_time = EXCLUDED.scheduled_time, scheduled_at = EXCLUDED.scheduled_at,
               status = 'scheduled'`,
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
      await notifyUser(pool, {
        user_id: sub.seller_id,
        type: 'listing_update',
        title: `Submission ${status}`,
        body: messages[status],
        meta: JSON.stringify({ submissionId: sub.id }),
      });
    }

    res.json(sub);
  } catch (err) {
    console.error('update submission error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /submissions/:id/schedule — seller books their own inspection slot
// (the app offers this right after submit; approval is implicit in confirming)
router.patch('/:id/schedule', requireAuth, requireUuid('id'), async (req, res) => {
  const { center, scheduled_date, scheduled_time } = req.body;
  if (!center || !scheduled_date || !scheduled_time) {
    return res.status(400).json({ error: 'center, scheduled_date, and scheduled_time are required' });
  }
  try {
    const capErr = await centerCapacityError(center, scheduled_date);
    if (capErr) return res.status(409).json({ error: capErr });

    const { rows } = await pool.query(
      `UPDATE submissions
       SET status = 'scheduled',
           inspection_center = $1, inspection_date = $2, inspection_time = $3
       WHERE id = $4 AND seller_id = $5 AND status IN ('under_review', 'approved', 'scheduled')
       RETURNING *`,
      [center, scheduled_date, scheduled_time, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Submission not found or not schedulable' });
    const sub = rows[0];

    const parsed = new Date(`${scheduled_date} ${scheduled_time}`);
    const scheduledAt = isNaN(parsed.getTime()) ? null : parsed;

    // Rescheduling updates the existing inspection instead of duplicating it
    await pool.query(
      `INSERT INTO inspections
         (submission_id, car_id, center, scheduled_date, scheduled_time, scheduled_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
       ON CONFLICT (submission_id) DO UPDATE
         SET center = EXCLUDED.center, scheduled_date = EXCLUDED.scheduled_date,
             scheduled_time = EXCLUDED.scheduled_time, scheduled_at = EXCLUDED.scheduled_at,
             status = 'scheduled'`,
      [sub.id, sub.car_id, center, scheduled_date, scheduled_time, scheduledAt]
    );

    await notifyUser(pool, {
      user_id: req.user.id,
      type: 'listing_update',
      title: 'Inspection booked',
      body: `Your inspection is booked at ${center} on ${scheduled_date} at ${scheduled_time}. Bring the car, your ID and any service records.`,
      meta: JSON.stringify({ submissionId: sub.id }),
    });

    res.json(sub);
  } catch (err) {
    console.error('schedule submission error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
