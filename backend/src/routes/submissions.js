const express = require('express');
const fs = require('fs');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUuid, paginate } = require('../middleware/validate');
const { activeCenter, centerCapacityError, readSlot } = require('../lib/inspection-scheduling');
const { vehicleJourney, sellerProgress } = require('../lib/vehicle-journey');
const { notifyUser } = require('../lib/notify');
const { recordAdminAction } = require('../lib/admin-audit');
const { withTransaction } = require('../lib/tx');
const { createInvitedAccount } = require('../lib/accounts');
const { sendAccountInvite } = require('../lib/mailer');
const { uploadPhotos, verifyImageContent, resolveUploadUrl } = require('../middleware/upload');
const { compressUploads } = require('../middleware/image-compress');
const { stripUploadMetadata } = require('../middleware/strip-metadata');

const router = express.Router();

const MAX_REFERENCE_IMAGES = 12;
// Per request. Both clients offer two slots (front, side); a little headroom
// lets a retry send them together without the cap being the thing that fails.
const REFERENCE_PHOTOS_PER_REQUEST = 4;
const REFERENCE_PHOTO_STATUSES = ['under_review', 'approved', 'scheduled'];

const PURPOSES = ['sale', 'rental', 'both'];
// 'rental' stays a valid stored value (older rows carry it) but is no longer
// filed. A car only for hire is listed on the 10-point Rental Check, added in
// the rental fleet (POST /rentals, or POST /rentals/propose by the provider):
// a submission only leads to the 150-point sale inspection, which a hire car
// does not need. 'both' still files one, because the car is also for sale.
const RENTAL_ONLY_ERROR = 'A car only for rental does not need the 150-point inspection. '
  + 'Add it in Rentals → Fleet and record its 10-point Rental Check there.';
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
  if (purpose === 'rental') return RENTAL_ONLY_ERROR;
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
// Since the 10-point Rental Check (Oct 2026) a car only for hire is refused
// here (RENTAL_USES_FLEET) and added in the rental fleet instead: this route
// leads only to the 150-point inspection. Sale, and sale-and-rental, remain.
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
  // Either an account that already exists, or enough to create one. A person who
  // drives to the office with a car has never used the app and has no id to
  // give; requiring one meant the operator had to leave the intake, create an
  // account somewhere else, and come back — with a customer standing there.
  const walkIn = req.body?.seller && typeof req.body.seller === 'object' ? req.body.seller : null;
  if (!seller_id && !walkIn) {
    return res.status(400).json({
      error: 'Choose an existing seller, or give a name and email to create one.',
      field: 'seller_id',
    });
  }
  if (seller_id && !UUID_RE.test(String(seller_id))) {
    return res.status(400).json({ error: 'seller_id must be a valid account id', field: 'seller_id' });
  }
  const walkInName = walkIn ? String(walkIn.name || '').trim().replace(/\s+/g, ' ') : '';
  const walkInEmail = walkIn ? String(walkIn.email || '').trim().toLowerCase() : '';
  if (walkIn && !seller_id) {
    if (!walkInName || walkInName.length > 120) {
      return res.status(400).json({ error: 'Give the seller a name', field: 'seller.name' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(walkInEmail)) {
      return res.status(400).json({
        error: 'Give a valid email — it is how they receive the link to set a password and follow the car.',
        field: 'seller.email',
      });
    }
  }
  const fieldError = submissionFieldError(req.body);
  if (fieldError) {
    return res.status(400).json({
      error: fieldError,
      ...(req.body.purpose === 'rental' ? { code: 'RENTAL_USES_FLEET', field: 'purpose' } : {}),
    });
  }
  const purpose = PURPOSES.includes(req.body.purpose) ? req.body.purpose : 'sale';

  try {
    const created = await withTransaction(async (client) => {
      let profile;
      let sellerUserId = seller_id;
      let invite = null;

      if (!sellerUserId) {
        // The walk-in. Created exactly as the walk-in inspection creates its
        // customer: no password is set, so nothing can be signed into until the
        // person follows the emailed link and chooses one. A showroom is a
        // deliberate onboarding decision made elsewhere, so this always makes an
        // individual seller — an operator can promote it afterwards.
        const created = await createInvitedAccount(client, {
          accountType: 'individual_seller',
          name: walkInName,
          email: walkInEmail,
          phone: walkIn?.phone ? String(walkIn.phone).trim().slice(0, 40) : null,
          businessName: null,
          invitedBy: req.user.id,
        });
        if (created.conflict) {
          const e = new Error('An account already uses that email — search for it and select it instead.');
          e.status = 409; e.code = 'ACCOUNT_EXISTS'; throw e;
        }
        profile = { ...created.user, business_verified: created.user.business_verified };
        sellerUserId = created.user.id;
        invite = created.token;
      } else {
        const seller = await client.query(
          `SELECT id, name, email, role, account_status, deleted_at, business_verified, seller_type
             FROM users WHERE id = $1`,
          [sellerUserId]
        );
        if (!seller.rowCount) { const e = new Error('Seller not found'); e.status = 404; throw e; }
        profile = seller.rows[0];
        if (profile.role !== 'seller') {
          const e = new Error('That account is not a seller. Change the role in the user directory first.');
          e.status = 400; throw e;
        }
        if (profile.account_status !== 'active' || profile.deleted_at) {
          const e = new Error('That seller account is suspended or deleted.');
          e.status = 400; throw e;
        }
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
        [sellerUserId, make, model, year, mileage, condition, fuel_type,
         transmission, body_type, color, asking_price || 0, notes,
         Array.isArray(reference_images) ? reference_images : null,
         purpose, req.user.id]
      );
      const sub = rows[0];

      await notifyUser(client, {
        user_id: sellerUserId,
        type: 'listing_update',
        title: 'Vehicle submitted by our team',
        body: 'Our team has submitted your vehicle on your behalf. The next step is its 150-point inspection.',
        meta: JSON.stringify({ submissionId: sub.id }),
      });

      await recordAdminAction(client, {
        actorId: req.user.id, action: 'submission.created_by_admin',
        targetType: 'submission', targetId: sub.id,
        summary: `${make} ${model} ${year} filed for ${profile.name} (${purpose})`,
        metadata: {
          seller_id: sellerUserId, purpose,
          rental_provider_not_verified: rentalBlocked,
          walk_in: Boolean(invite),
        },
      });

      return { sub, rentalBlocked, profile, invite };
    });

    // Mailed after the commit — a mail outage must never lose the intake, and
    // the vehicle is already in the system either way.
    let invitationSent = false;
    if (created.invite) {
      invitationSent = await sendAccountInvite(created.profile.email, created.profile.name, {
        accountType: 'individual_seller', businessName: null, token: created.invite,
      });
    }

    const warnings = [];
    if (created.rentalBlocked) {
      warnings.push('This seller is not business-verified, so a rental vehicle cannot be published for '
        + 'them yet. Grant Verified business in the user directory before adding the car to the fleet.');
    }
    if (created.invite && !invitationSent) {
      // The account exists and the car is booked in either way; what is missing
      // is the person's way into it. Saying so beats a silent half-success.
      warnings.push(`The account was created but the invitation email to ${created.profile.email} could `
        + 'not be sent. Use Reset password in the user directory to send them a link.');
    }

    res.status(201).json({
      ...created.sub,
      seller: created.profile
        ? { id: created.profile.id, name: created.profile.name, email: created.profile.email }
        : null,
      // True when this intake created the account as well as the submission.
      seller_created: Boolean(created.invite),
      invitation_sent: invitationSent,
      // Surfaced at intake so a gap is fixed while the car is in the workshop,
      // rather than discovered at the last step.
      warnings,
    });
  } catch (err) {
    // The code travels with the message: a client that must tell 'this email is
    // taken' from any other 409 cannot do it by matching prose.
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
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
              c.title AS car_title, c.status AS car_status,
              -- So each row can offer its real next step (open the inspection,
              -- create the listing) instead of a dead end.
              insp.id AS inspection_id, insp.status AS inspection_status,
              insp.score AS inspection_score, insp.passed AS inspection_passed
       FROM submissions s
       JOIN users u ON u.id = s.seller_id
       LEFT JOIN cars c ON c.id = s.car_id
       LEFT JOIN LATERAL (
         SELECT i.id, i.status, i.score, i.passed FROM inspections i
          WHERE i.submission_id = s.id LIMIT 1
       ) insp ON TRUE
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

// POST /submissions/:id/close — admin: take a vehicle off the pipeline.
//
// For the seller who is not going ahead, the car that will not be listed, the
// appointment nobody came to. The status machine above only lets a submission
// be rejected before its inspection, so a car that had been inspected — and in
// particular one that scored badly — could never leave the pipeline board.
// This closes it from any stage short of a public listing, in one step:
//
//   · a booked appointment with nothing recorded against it is released, so
//     the bay's slot frees up; an inspection that started or finished is kept,
//     because it is evidence and may carry a fee;
//   · a draft listing that never went public is archived;
//   · the submission is marked rejected with the reason, which is what the
//     seller is told, and which Reopen (→ under review) can undo.
//
// `notify: false` skips the seller's notification — for test entries, a
// duplicate, or a seller who has already been told in person. The audit row
// records which it was.
//
// A car that is public (live, paused or sold) is refused: that is a listing,
// and Listings is where it is paused, sold or removed.
router.post('/:id/close', requireAdmin, requireUuid('id'), async (req, res) => {
  const reason = String(req.body?.reason || '').trim().slice(0, 1000);
  const notify = req.body?.notify !== false;
  if (reason.length < 4) {
    return res.status(400).json({ error: 'Give the reason — it is kept in the audit log, and sent to the seller if they are told.', code: 'REASON_REQUIRED' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const current = await client.query('SELECT * FROM submissions WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (!current.rowCount) { const e = new Error('Submission not found'); e.status = 404; throw e; }
      const sub = current.rows[0];
      if (sub.status === 'rejected') { const e = new Error('This submission is already closed.'); e.status = 409; throw e; }

      const inspection = (await client.query(
        `SELECT i.id, i.status, i.car_id,
                (SELECT COUNT(*)::int FROM platform_fees f
                  WHERE f.inspection_id = i.id AND f.status <> 'waived') AS fees
           FROM inspections i WHERE i.submission_id = $1 FOR UPDATE OF i`,
        [sub.id]
      )).rows[0] || null;

      // The listing is linked from either side (submissions.car_id or
      // inspections.car_id — see routes/cars.js), so both are read.
      const carId = sub.car_id || (inspection && inspection.car_id) || null;
      const car = carId
        ? (await client.query('SELECT id, status, title FROM cars WHERE id = $1 FOR UPDATE', [carId])).rows[0]
        : null;
      if (car && ['live', 'paused', 'sold'].includes(car.status)) {
        const e = new Error('This car is already a listing. Pause it, mark it sold or remove it from Listings instead.');
        e.status = 409; e.code = 'IS_A_LISTING'; throw e;
      }

      let releasedAppointment = false;
      if (inspection && inspection.status === 'scheduled' && inspection.fees === 0) {
        await client.query('DELETE FROM inspections WHERE id = $1', [inspection.id]);
        releasedAppointment = true;
      }

      let archivedListing = false;
      if (car && !['archived', 'rejected'].includes(car.status)) {
        await client.query(
          `UPDATE cars SET status = 'archived', archived_at = NOW(), archive_reason = $2 WHERE id = $1`,
          [car.id, reason]
        );
        archivedListing = true;
      }

      const { rows } = await client.query(
        `UPDATE submissions SET status = 'rejected', admin_notes = $2, reviewed_at = NOW(), reviewer_id = $3
          WHERE id = $1 RETURNING *`,
        [sub.id, reason, req.user.id]
      );
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'submission.closed', targetType: 'submission', targetId: sub.id,
        summary: `${sub.year || ''} ${sub.make || ''} ${sub.model || ''} closed`.replace(/\s+/g, ' ').trim(),
        metadata: {
          reason, previous_status: sub.status, seller_notified: notify,
          released_appointment: releasedAppointment,
          kept_inspection: inspection && !releasedAppointment ? inspection.id : null,
          archived_listing: archivedListing ? car.id : null,
        },
      });
      return { submission: rows[0], released_appointment: releasedAppointment, archived_listing: archivedListing };
    });

    if (notify) {
      await notifyUser(pool, {
        user_id: result.submission.seller_id,
        type: 'listing_update',
        title: 'Submission closed',
        body: `Your submission was closed. Reason: ${reason}`,
        meta: JSON.stringify({ submissionId: result.submission.id }),
      });
    }
    res.json({ ...result, seller_notified: notify });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
    log.error('close submission error', { error: err.message });
    res.status(500).json({ error: 'Could not close the submission' });
  }
});

// PATCH /submissions/:id/schedule — seller books their own inspection slot
// (the app offers this right after submit; approval is implicit in confirming)
// ─── Reference photos (B2 / P2-D3 in docs/WEB-PARITY-PLAN.md) ────────────────
// Both clients collected "a quick reference shot" of the car and neither could
// send it anywhere: reference_images only took HTTPS URLs hosted elsewhere and
// the one photo upload route is admin-only. The photos are attached AFTER the
// submission exists, so a failed upload can never cost the seller the
// submission itself.

// Runs before multer, so a stranger's or a closed submission's files are never
// written to disk in the first place.
async function referencePhotoTarget(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT status, COALESCE(array_length(reference_images, 1), 0) AS stored
         FROM submissions WHERE id = $1 AND seller_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Submission not found' });
    if (!REFERENCE_PHOTO_STATUSES.includes(rows[0].status)) {
      return res.status(409).json({ error: 'Reference photos can only be added before the inspection' });
    }
    if (Number(rows[0].stored) >= MAX_REFERENCE_IMAGES) {
      return res.status(409).json({ error: `A submission holds at most ${MAX_REFERENCE_IMAGES} reference photos` });
    }
    next();
  } catch (err) {
    log.error('reference photo lookup error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /submissions/:id/reference-photos — multipart, field `photos`.
router.post(
  '/:id/reference-photos',
  requireAuth,
  requireUuid('id'),
  referencePhotoTarget,
  uploadPhotos.array('photos', REFERENCE_PHOTOS_PER_REQUEST),
  verifyImageContent,
  compressUploads,
  // compressUploads leaves photos under 600 KB as they arrived, GPS included.
  stripUploadMetadata,
  async (req, res) => {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'Add at least one photo' });
    try {
      const urls = [];
      for (const file of files) urls.push(await resolveUploadUrl(req, file));
      // The cap is enforced in the same statement that appends, so two uploads
      // racing each other cannot both pass the check above and overshoot it.
      const { rows } = await pool.query(
        `UPDATE submissions
            SET reference_images = COALESCE(reference_images, '{}') || $3::text[]
          WHERE id = $1 AND seller_id = $2
            AND status = ANY($5::text[])
            AND COALESCE(array_length(reference_images, 1), 0) + cardinality($3::text[]) <= $4
          RETURNING *`,
        [req.params.id, req.user.id, urls, MAX_REFERENCE_IMAGES, REFERENCE_PHOTO_STATUSES]
      );
      if (!rows.length) {
        files.forEach((file) => { if (file.path) fs.unlink(file.path, () => {}); });
        return res.status(409).json({ error: `A submission holds at most ${MAX_REFERENCE_IMAGES} reference photos` });
      }
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
      log.error('reference photo upload error', { error: err.message });
      res.status(500).json({ error: 'Server error' });
    }
  }
);

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
