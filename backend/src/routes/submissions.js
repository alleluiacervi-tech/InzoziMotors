const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUuid, paginate } = require('../middleware/validate');
const { activeCenter, centerCapacityError, readSlot } = require('../lib/inspection-scheduling');
const { vehicleJourney, sellerProgress } = require('../lib/vehicle-journey');
const { notifyUser } = require('../lib/notify');
const { recordAdminAction } = require('../lib/admin-audit');
const { withTransaction } = require('../lib/tx');

const router = express.Router();

const MAX_REFERENCE_IMAGES = 12;

const PURPOSES = ['sale', 'rental', 'both'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Field validation shared by the seller route and the admin intake route
 *  below. One copy: a second would drift, and the drift would show up as an
 *  admin-filed submission the seller's own dashboard refuses to render. Returns
 *  an error string, or null when the body is acceptable. */
function submissionFieldError(body) {
  const { make, model, year, mileage, asking_price, reference_images, purpose } = body;
  if (!make || !model || !year) return 'make, model, and year are required';
  if (!Number.isInteger(Number(year)) || Number(year) < 1900 || Number(year) > new Date().getFullYear() + 1) {
    return 'year must be a valid vehicle model year';
  }
  if (mileage != null && (!Number.isFinite(Number(mileage)) || Number(mileage) < 0)) {
    return 'mileage must be a non-negative number';
  }
  if (asking_price != null && (!Number.isFinite(Number(asking_price)) || Number(asking_price) < 0)) {
    return 'asking_price must be a non-negative number';
  }
  if (purpose !== undefined && !PURPOSES.includes(purpose)) {
    return `purpose must be one of: ${PURPOSES.join(', ')}`;
  }
  // reference_images lands in a TEXT[] column — anything but strings would
  // either crash the insert or store garbage the app then renders as an <img>.
  if (reference_images !== undefined && reference_images !== null) {
    if (!Array.isArray(reference_images)) return 'reference_images must be an array of image URLs';
    if (reference_images.length > MAX_REFERENCE_IMAGES) {
      return `reference_images is limited to ${MAX_REFERENCE_IMAGES} images`;
    }
    if (reference_images.some((img) => typeof img !== 'string' || !/^https:\/\//i.test(img.trim()))) {
      return 'Each reference image must use a secure HTTPS URL';
    }
  }
  return null;
}

// POST /submissions — seller submits a car for inspection.
// Identity approval happens during the team's inspection/onboarding workflow.
// Requiring it before submission made that workflow impossible for new sellers.
router.post('/', requireAuth, async (req, res) => {
  const {
    make, model, year, mileage, condition, fuel_type, transmission,
    body_type, color, asking_price, notes, reference_images,
  } = req.body;
  const fieldError = submissionFieldError(req.body);
  if (fieldError) return res.status(400).json({ error: fieldError });
  try {
    const seller = await pool.query(
      `SELECT role, account_status, deleted_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!seller.rowCount || seller.rows[0].role !== 'seller') {
      return res.status(403).json({ error: 'A seller account is required to submit a vehicle' });
    }
    if (seller.rows[0].account_status !== 'active' || seller.rows[0].deleted_at) {
      return res.status(403).json({ error: 'This seller account cannot submit vehicles' });
    }
    const { rows } = await pool.query(
      `INSERT INTO submissions
         (seller_id, make, model, year, mileage, condition, fuel_type,
          transmission, body_type, color, asking_price, notes, reference_images, status, purpose)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'under_review',$14)
       RETURNING *`,
      [req.user.id, make, model, year, mileage, condition, fuel_type,
       transmission, body_type, color, asking_price || 0, notes,
       Array.isArray(reference_images) ? reference_images : null,
       PURPOSES.includes(req.body.purpose) ? req.body.purpose : 'sale']
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

// POST /submissions/admin — the team files an intake on a provider's behalf.
//
// This is the missing rental intake. Until now the only way to reach an
// inspection was POST /submissions, which is requireAuth: the vehicle's owner
// had to sign in and file it themselves, and the record said "I want to sell
// this car". A rental operator with ten vans therefore had to file ten sale
// submissions for vehicles never intended for sale, and every screen downstream
// described them as cars awaiting publication as listings.
//
// The submission stays the right record — routes/rentals.js requires one as
// evidence, and that is a real safety property. What was missing was somewhere
// to say what the vehicle is FOR, and someone other than the owner being able
// to file it. Both are here; no gate changed.
//
// The seller still has to be a real, active seller account. An admin may file
// the paperwork; they may not invent the counterparty.
router.post('/admin', requireAdmin, async (req, res) => {
  const {
    seller_id, make, model, year, mileage, condition, fuel_type, transmission,
    body_type, color, asking_price, notes, reference_images,
  } = req.body;
  // Shape-checked before it reaches Postgres. `WHERE id = $1` against a
  // non-UUID raises SQLSTATE 22P02, which surfaces as a 500 — a server error
  // reported for what is plainly a bad request, and one an operator cannot act
  // on. requireUuid only guards path params, so the body needs this here.
  if (!seller_id || !UUID_RE.test(String(seller_id))) {
    return res.status(400).json({ error: 'seller_id must be a valid account id', field: 'seller_id' });
  }
  const fieldError = submissionFieldError(req.body);
  if (fieldError) return res.status(400).json({ error: fieldError });
  const purpose = PURPOSES.includes(req.body.purpose) ? req.body.purpose : 'sale';

  try {
    const created = await withTransaction(async (client) => {
      const seller = await client.query(
        `SELECT id, name, role, account_status, deleted_at, business_verified, seller_type
           FROM users WHERE id = $1`,
        [seller_id]
      );
      if (!seller.rowCount) { const e = new Error('Seller not found'); e.status = 404; throw e; }
      const profile = seller.rows[0];
      if (profile.role !== 'seller') {
        const e = new Error('That account is not a seller. Change the role in the user directory first.');
        e.status = 400; throw e;
      }
      if (profile.account_status !== 'active' || profile.deleted_at) {
        const e = new Error('That seller account is suspended or deleted.');
        e.status = 400; throw e;
      }
      // Named here, not enforced here. A rental intake can be filed for a
      // seller who is not yet business-verified — the inspection is worth doing
      // either way, and the flag can be granted while the car is at the centre.
      // What must not happen is the operator discovering the requirement only
      // when POST /rentals refuses, three steps later.
      const rentalBlocked = ['rental', 'both'].includes(purpose) && profile.business_verified !== true;

      const { rows } = await client.query(
        `INSERT INTO submissions
           (seller_id, make, model, year, mileage, condition, fuel_type,
            transmission, body_type, color, asking_price, notes, reference_images,
            status, purpose, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'under_review',$14,$15)
         RETURNING *`,
        [seller_id, make, model, year, mileage, condition, fuel_type,
         transmission, body_type, color, asking_price || 0, notes,
         Array.isArray(reference_images) ? reference_images : null,
         purpose, req.user.id]
      );
      const sub = rows[0];

      await notifyUser(client, {
        user_id: seller_id,
        type: 'listing_update',
        title: 'Vehicle submitted by our team',
        body: purpose === 'rental'
          ? 'Our team has registered your vehicle for rental listing. The next step is its 150-point inspection.'
          : 'Our team has submitted your vehicle on your behalf. The next step is its 150-point inspection.',
        meta: JSON.stringify({ submissionId: sub.id }),
      });

      await recordAdminAction(client, {
        actorId: req.user.id, action: 'submission.created_by_admin',
        targetType: 'submission', targetId: sub.id,
        summary: `${make} ${model} ${year} filed for ${profile.name} (${purpose})`,
        metadata: { seller_id, purpose, rental_provider_not_verified: rentalBlocked },
      });

      return { sub, rentalBlocked };
    });

    res.status(201).json({
      ...created.sub,
      // Surfaced at intake so the gap is fixed while the car is in the workshop,
      // rather than discovered at the last step.
      warnings: created.rentalBlocked
        ? ['This seller is not business-verified, so a rental vehicle cannot be published for them yet. '
           + 'Grant Verified business in the user directory before adding the car to the fleet.']
        : [],
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('admin submission error', { error: err.message });
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

// GET /submissions/progress — where each of MY cars has reached.
//
// One call for the whole page rather than one per submission, and a projection
// rather than the admin journey: see sellerProgress() in lib/vehicle-journey.js
// for why the seller's sentences are an allowlist instead of a filter.
router.get('/progress', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM submissions WHERE seller_id = $1 ORDER BY submitted_at DESC LIMIT 50',
      [req.user.id]
    );
    const progress = {};
    for (const row of rows) {
      const journey = await vehicleJourney(pool, 'submission', row.id);
      const view = sellerProgress(journey);
      if (view) progress[row.id] = view;
    }
    res.json(progress);
  } catch (err) {
    log.error('seller progress error', { error: err.message, userId: req.user.id });
    // The selling page must render without this. A seller who cannot see the
    // next step is inconvenienced; one who cannot see their cars is not.
    res.json({});
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

// Resolve a scheduling choice against live operational data. Both the stable
// Center lookup, capacity and slot validation are shared with the walk-in
// inspection path — see lib/inspection-scheduling.js. scheduleInspection below
// stays here because its ON CONFLICT (submission_id) upsert only makes sense
// for a submission.

const SUBMISSION_TRANSITIONS = {
  under_review: ['approved', 'scheduled', 'rejected'],
  approved: ['scheduled', 'rejected'],
  scheduled: ['under_review', 'rejected'],
  rejected: ['under_review'],
};

async function scheduleInspection(client, submission, center, slot, scheduledTime) {
  const selectedCenter = await activeCenter(client, center);
  if (!selectedCenter) {
    const error = new Error('Choose an active inspection center from the available list.');
    error.status = 400;
    throw error;
  }
  // Serialize bookings for one center/day so two simultaneous requests cannot
  // both see the final available slot and overbook it.
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext(lower($1) || ':' || $2::text))",
    [selectedCenter.id, slot.isoDate]
  );
  const capErr = await centerCapacityError(client, selectedCenter, slot.isoDate, submission.id);
  if (capErr) { const error = new Error(capErr); error.status = 409; throw error; }

  const existing = await client.query(
    'SELECT status FROM inspections WHERE submission_id = $1 FOR UPDATE',
    [submission.id]
  );
  if (existing.rowCount && existing.rows[0].status !== 'scheduled') {
    const error = new Error(`A ${existing.rows[0].status} inspection cannot be rescheduled.`);
    error.status = 409;
    throw error;
  }
  await client.query(
    `INSERT INTO inspections
       (submission_id, car_id, center, scheduled_on, scheduled_date, scheduled_time, scheduled_at, status)
     VALUES ($1, $2, $3, $4::date, $5, $6, $7, 'scheduled')
     ON CONFLICT (submission_id) DO UPDATE
       SET center = EXCLUDED.center, scheduled_on = EXCLUDED.scheduled_on,
           scheduled_date = EXCLUDED.scheduled_date,
           scheduled_time = EXCLUDED.scheduled_time, scheduled_at = EXCLUDED.scheduled_at
     WHERE inspections.status = 'scheduled'`,
    [submission.id, submission.car_id, selectedCenter.name, slot.isoDate, slot.display, scheduledTime, slot.at]
  );
  return selectedCenter.name;
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
  // A rejection is the one message the seller cannot act on without a reason.
  // The fallback below used to read "Contact us for details", which turned
  // every blank rejection into an inbound support thread — more work for the
  // admin who skipped the sentence than writing it would have cost.
  if (status === 'rejected' && String(admin_notes || '').trim().length < 4) {
    return res.status(400).json({
      error: 'Give the seller a reason for the rejection — it is sent to them and saved in the audit log.',
      code: 'REJECTION_REASON_REQUIRED',
    });
  }
  let slot = null;
  if (status === 'scheduled') {
    slot = readSlot({ scheduled_date, scheduled_time });
    if (slot.error) return res.status(400).json({ error: slot.error });
  }
  try {
    const result = await withTransaction(async (client) => {
      const current = await client.query('SELECT * FROM submissions WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (!current.rowCount) { const error = new Error('Submission not found'); error.status = 404; throw error; }
      const previous = current.rows[0].status;
      const allowed = SUBMISSION_TRANSITIONS[previous] || [];
      if (status !== previous && !allowed.includes(status)) {
        const error = new Error(`A ${previous} submission cannot move directly to ${status}.`);
        error.status = 409; error.code = 'INVALID_SUBMISSION_TRANSITION'; error.allowed = allowed; throw error;
      }
      const scheduledCenter = status === 'scheduled'
        ? await scheduleInspection(client, current.rows[0], center, slot, scheduled_time)
        : null;
      const { rows } = await client.query(
        `UPDATE submissions
         SET status = $1, admin_notes = COALESCE($2, admin_notes),
             inspection_center = CASE WHEN $1 = 'scheduled' THEN $5 ELSE inspection_center END,
             inspection_on = CASE WHEN $1 = 'scheduled' THEN $6::date ELSE inspection_on END,
             inspection_date = CASE WHEN $1 = 'scheduled' THEN $7 ELSE inspection_date END,
             inspection_time = CASE WHEN $1 = 'scheduled' THEN $8 ELSE inspection_time END,
             reviewed_at = NOW(), reviewer_id = $3
         WHERE id = $4 RETURNING *`,
        [status, admin_notes, req.user.id, req.params.id, scheduledCenter,
         slot?.isoDate || null, slot?.display || null, scheduled_time || null]
      );
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'submission.status_changed', targetType: 'submission', targetId: rows[0].id,
        summary: `${rows[0].year || ''} ${rows[0].make || ''} ${rows[0].model || ''} moved to ${status}`.trim(),
        metadata: { previous_status: previous, status, center: scheduledCenter, scheduled_date: scheduled_date || null, admin_notes: admin_notes || null },
      });
      return { sub: rows[0], scheduledCenter };
    });
    const { sub, scheduledCenter } = result;

    // Notify seller
    const messages = {
      scheduled: `Your inspection is booked at ${scheduledCenter || 'our center'} on ${slot?.display || 'a date TBC'} at ${scheduled_time || ''}.`,
      rejected: `Your submission was not accepted. Reason: ${admin_notes || sub.admin_notes || 'Contact us for details.'}`,
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
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code, allowed_transitions: err.allowed });
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
    const sub = await withTransaction(async (client) => {
      const current = await client.query(
        `SELECT * FROM submissions
         WHERE id = $1 AND seller_id = $2 AND status IN ('under_review', 'approved', 'scheduled')
         FOR UPDATE`,
        [req.params.id, req.user.id]
      );
      if (!current.rowCount) { const error = new Error('Submission not found or not schedulable'); error.status = 404; throw error; }
      const scheduledCenter = await scheduleInspection(client, current.rows[0], center, slot, scheduled_time);
      const { rows } = await client.query(
        `UPDATE submissions
         SET status = 'scheduled', inspection_center = $1, inspection_on = $2::date,
             inspection_date = $3, inspection_time = $4
         WHERE id = $5 RETURNING *`,
        [scheduledCenter, slot.isoDate, slot.display, scheduled_time, req.params.id]
      );
      return { ...rows[0], inspection_center: scheduledCenter };
    });

    await notifyUser(pool, {
      user_id: req.user.id,
      type: 'listing_update',
      title: 'Inspection booked',
      body: `Your inspection is booked at ${sub.inspection_center} on ${slot.display} at ${scheduled_time}. Bring the car, your ID and any service records.`,
      meta: JSON.stringify({ submissionId: sub.id }),
    });

    res.json(sub);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('schedule submission error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
