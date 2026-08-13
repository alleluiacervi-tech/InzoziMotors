const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth, requireAdmin, requireVerified } = require('../middleware/auth');
const { requireUuid, paginate } = require('../middleware/validate');
const { parseIsoDate, isNotInPast, toTimestamp, toDisplayDate } = require('../lib/dates');
const { notifyUser } = require('../lib/notify');
const { recordAdminAction } = require('../lib/admin-audit');

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
    log.error('submission error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /submissions — seller sees their own submissions
router.get('/', requireAuth, paginate(), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, c.title AS car_title, c.images AS car_images, c.status AS listing_status
       FROM submissions s
       LEFT JOIN cars c ON c.id = s.car_id
       WHERE s.seller_id = $1
       ORDER BY s.submitted_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, req.pagination.limit, req.pagination.offset]
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
//
// Counts on scheduled_on (DATE), not the old scheduled_date text column. That
// column held "2026-08-12" from the admin dashboard and "Aug 12" from the app,
// compared as strings — so two bookings for the same day never matched each
// other and daily_capacity did not hold at all. See migrations/0002.
async function centerCapacityError(center, isoDate) {
  const centerRes = await pool.query(
    'SELECT id, daily_capacity FROM inspection_centers WHERE active = TRUE AND name ILIKE $1',
    [center]
  );
  if (!centerRes.rows.length) return null; // unknown/free-text center — no cap to enforce
  const cap = centerRes.rows[0].daily_capacity;
  const cntRes = await pool.query(
    `SELECT COUNT(*) FROM inspections
     WHERE lower(center) = lower($1) AND scheduled_on = $2::date
       AND status IN ('scheduled', 'in_progress')`,
    [center, isoDate]
  );
  if (Number(cntRes.rows[0].count) >= cap) {
    return `${center} is fully booked on ${toDisplayDate(isoDate)} — choose another day or center`;
  }
  return null;
}

// One validation path for both scheduling routes. Returns { isoDate, display,
// at } or an { error } the caller turns into a 400.
function readSlot({ scheduled_date, scheduled_time }) {
  const isoDate = parseIsoDate(scheduled_date);
  if (!isoDate) {
    return { error: 'scheduled_date must be an ISO date, for example 2026-08-12' };
  }
  if (!isNotInPast(isoDate)) {
    return { error: 'That date has already passed — choose an upcoming day' };
  }
  const at = toTimestamp(isoDate, scheduled_time);
  if (!at) {
    return { error: 'scheduled_time must look like "10:00 AM"' };
  }
  return { isoDate, display: toDisplayDate(isoDate), at };
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
  let slot = null;
  if (status === 'scheduled') {
    slot = readSlot({ scheduled_date, scheduled_time });
    if (slot.error) return res.status(400).json({ error: slot.error });
  }
  try {
    if (status === 'scheduled') {
      const capErr = await centerCapacityError(center, slot.isoDate);
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

    // Create inspection record when scheduling. scheduled_on is what the
    // capacity check and every ordering read; scheduled_date is kept as the
    // display string the app still renders.
    if (status === 'scheduled' && center) {
      await pool.query(
        `INSERT INTO inspections
           (submission_id, car_id, center, scheduled_on, scheduled_date, scheduled_time, scheduled_at, status)
         VALUES ($1, $2, $3, $4::date, $5, $6, $7, 'scheduled')
         ON CONFLICT (submission_id) DO UPDATE
           SET center = EXCLUDED.center, scheduled_on = EXCLUDED.scheduled_on,
               scheduled_date = EXCLUDED.scheduled_date,
               scheduled_time = EXCLUDED.scheduled_time, scheduled_at = EXCLUDED.scheduled_at,
               status = 'scheduled'`,
        [sub.id, sub.car_id, center, slot.isoDate, slot.display, scheduled_time, slot.at]
      );
    }

    // Notify seller
    const messages = {
      scheduled: `Your inspection is booked at ${center || 'our center'} on ${slot?.display || 'a date TBC'} at ${scheduled_time || ''}.`,
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
    await recordAdminAction(pool, {
      actorId: req.user.id, action: 'submission.status_changed', targetType: 'submission', targetId: sub.id,
      summary: `${sub.year || ''} ${sub.make || ''} ${sub.model || ''} moved to ${status}`.trim(),
      metadata: { status, center: center || null, scheduled_date: scheduled_date || null, admin_notes: admin_notes || null },
    });

    res.json(sub);
  } catch (err) {
    log.error('update submission error', { error: err.message });
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
  const slot = readSlot({ scheduled_date, scheduled_time });
  if (slot.error) return res.status(400).json({ error: slot.error });

  try {
    const capErr = await centerCapacityError(center, slot.isoDate);
    if (capErr) return res.status(409).json({ error: capErr });

    const { rows } = await pool.query(
      `UPDATE submissions
       SET status = 'scheduled',
           inspection_center = $1, inspection_on = $2::date,
           inspection_date = $3, inspection_time = $4
       WHERE id = $5 AND seller_id = $6 AND status IN ('under_review', 'approved', 'scheduled')
       RETURNING *`,
      [center, slot.isoDate, slot.display, scheduled_time, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Submission not found or not schedulable' });
    const sub = rows[0];

    // Rescheduling updates the existing inspection instead of duplicating it
    await pool.query(
      `INSERT INTO inspections
         (submission_id, car_id, center, scheduled_on, scheduled_date, scheduled_time, scheduled_at, status)
       VALUES ($1, $2, $3, $4::date, $5, $6, $7, 'scheduled')
       ON CONFLICT (submission_id) DO UPDATE
         SET center = EXCLUDED.center, scheduled_on = EXCLUDED.scheduled_on,
             scheduled_date = EXCLUDED.scheduled_date,
             scheduled_time = EXCLUDED.scheduled_time, scheduled_at = EXCLUDED.scheduled_at,
             status = 'scheduled'`,
      [sub.id, sub.car_id, center, slot.isoDate, slot.display, scheduled_time, slot.at]
    );

    await notifyUser(pool, {
      user_id: req.user.id,
      type: 'listing_update',
      title: 'Inspection booked',
      body: `Your inspection is booked at ${center} on ${slot.display} at ${scheduled_time}. Bring the car, your ID and any service records.`,
      meta: JSON.stringify({ submissionId: sub.id }),
    });

    res.json(sub);
  } catch (err) {
    log.error('schedule submission error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
