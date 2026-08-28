const crypto = require('crypto');
const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const { withTransaction } = require('../lib/tx');
const { notifyUser } = require('../lib/notify');
const { recordAdminAction } = require('../lib/admin-audit');
const {
  MARKETPLACE_TERMS_VERSION,
  DIRECT_DEAL_NOTICE,
  contactAvailability,
  ensureMarketplaceAcknowledgement,
} = require('../lib/marketplace');
const {
  CHECKLIST_VERSION,
  PUBLISH_THRESHOLD,
  evaluateChecklist,
} = require('../lib/inspection-policy');

const router = express.Router();
const MAX_RENTAL_PHOTOS = 40;

function rentalGalleryError(images, required = false) {
  if (!Array.isArray(images)) return 'images must be an array';
  if (required && images.length < 1) return 'At least one vehicle image is required for an active rental listing';
  if (images.length > MAX_RENTAL_PHOTOS) return `A rental listing may contain at most ${MAX_RENTAL_PHOTOS} images`;
  if (images.some((url) => typeof url !== 'string' || !/^https:\/\//i.test(url.trim()))) {
    return 'Every rental image must be a valid HTTPS URL';
  }
  return null;
}

async function verifiedRentalProvider(db, providerId) {
  const provider = await db.query(
    `SELECT 1 FROM users WHERE id=$1 AND role='seller' AND id_verified='approved'
     AND business_verified=TRUE AND account_status='active' AND deleted_at IS NULL`,
    [providerId]
  );
  return provider.rowCount > 0;
}

async function inspectionEvidenceForProvider(db, inspectionId, providerId) {
  if (!inspectionId) return null;
  const { rows } = await db.query(
    `SELECT i.id, i.score, i.checklist_results, i.checklist_version, i.passed,
            i.critical_failures, s.seller_id, s.make, s.model, s.year
       FROM inspections i JOIN submissions s ON s.id = i.submission_id
      WHERE i.id = $1 AND i.status = 'complete'`,
    [inspectionId]
  );
  if (!rows.length || rows[0].seller_id !== providerId || rows[0].checklist_version !== CHECKLIST_VERSION || !rows[0].passed) return null;
  const evaluated = evaluateChecklist(rows[0].checklist_results);
  if (!evaluated.valid || !evaluated.passed || evaluated.score !== Number(rows[0].score)) return null;
  return { ...rows[0], evaluated };
}

function inspectionMatchesVehicle(evidence, vehicle) {
  const sameText = (left, right) => String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
  return evidence && sameText(evidence.make, vehicle.make) && sameText(evidence.model, vehicle.model)
    && Number(evidence.year) === Number(vehicle.year);
}

const VALID_RENTAL_INSPECTION = `
  JOIN inspections evidence ON evidence.id = rc.inspection_id
  JOIN submissions evidence_submission ON evidence_submission.id = evidence.submission_id
    AND evidence_submission.seller_id = rc.provider_id
    AND lower(evidence_submission.make) = lower(rc.make)
    AND lower(evidence_submission.model) = lower(rc.model)
    AND evidence_submission.year = rc.year
    AND evidence.status = 'complete'
    AND evidence.checklist_version = '${CHECKLIST_VERSION}'
    AND evidence.passed = TRUE
    AND evidence.score >= ${PUBLISH_THRESHOLD}
    AND jsonb_array_length(COALESCE(evidence.critical_failures, '[]'::jsonb)) = 0`;

// A car is publicly listed only while a paid, un-voided subscription covers
// today. This is EXPIRY BY PREDICATE: nothing sweeps rows, nothing has to run
// on time, and a renewal restores visibility the moment it is recorded. See
// migration 0025 and 0009_rental_payments.sql:41 — this backend has no
// scheduler on purpose.
//
// Appended to ALL THREE public reads (catalogue, detail, inquire). Missing one
// leaks a car the catalogue hides, which is the worst of both: invisible to
// browse, reachable by link.
const ACTIVE_RENTAL_SUBSCRIPTION = `
  JOIN rental_subscriptions sub ON sub.rental_car_id = rc.id
    AND sub.voided_at IS NULL
    AND sub.starts_on <= CURRENT_DATE
    AND sub.ends_on   >= CURRENT_DATE`;

const PROVIDER_COLUMNS = `
  u.name AS provider_name,
  u.business_name AS provider_business_name,
  u.role AS provider_role,
  u.seller_type AS provider_seller_type,
  u.id_verified AS provider_id_verified,
  u.business_verified AS provider_business_verified,
  u.phone AS provider_phone,
  u.whatsapp_phone AS provider_whatsapp,
  u.phone_visible AS provider_phone_visible,
  u.whatsapp_visible AS provider_whatsapp_visible,
  u.account_status AS provider_account_status,
  u.deleted_at AS provider_deleted_at`;

function publicRental(row, includeContact = false) {
  const available = contactAvailability({
    id_verified: row.provider_id_verified,
    role: row.provider_role,
    seller_type: row.provider_seller_type,
    business_verified: row.provider_business_verified,
    account_status: row.provider_account_status,
    deleted_at: row.provider_deleted_at,
    phone: row.provider_phone,
    whatsapp_phone: row.provider_whatsapp,
    phone_visible: row.provider_phone_visible,
    whatsapp_visible: row.provider_whatsapp_visible,
  });
  const result = {
    ...row,
    provider_contact_available: available,
    direct_deal_notice: DIRECT_DEAL_NOTICE,
    marketplace_terms_version: MARKETPLACE_TERMS_VERSION,
  };
  if (!includeContact) {
    result.provider_phone = null;
    result.provider_whatsapp = null;
  }
  delete result.provider_phone_visible;
  delete result.provider_whatsapp_visible;
  delete result.provider_account_status;
  delete result.provider_deleted_at;
  return result;
}

// Public rental catalogue. Rates are provider-supplied estimates; Sawa neither
// blocks dates nor confirms a booking.
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rc.*, ${PROVIDER_COLUMNS}
       FROM rental_cars rc JOIN users u ON u.id = rc.provider_id
       ${VALID_RENTAL_INSPECTION}
       ${ACTIVE_RENTAL_SUBSCRIPTION}
       WHERE rc.status = 'active' AND u.role = 'seller'
         AND u.id_verified = 'approved' AND u.business_verified = TRUE
         AND u.account_status = 'active' AND u.deleted_at IS NULL
       ORDER BY rc.daily_rate ASC`
    );
    res.json(rows.map((row) => publicRental(row)));
  } catch (err) {
    log.error('rentals list error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/fleet', requireAdmin, async (_req, res) => {
  try {
    // Deliberately unfiltered. An operator must see the lapsed cars — they are
    // the ones needing a conversation — so the subscription is reported here,
    // never used to hide anything.
    const { rows } = await pool.query(
      `SELECT rc.*, ${PROVIDER_COLUMNS},
              sub.ends_on AS subscription_ends_on,
              sub.amount_rwf AS subscription_amount_rwf,
              CASE
                WHEN sub.id IS NULL THEN 'none'
                WHEN sub.ends_on < CURRENT_DATE THEN 'lapsed'
                WHEN sub.ends_on <= CURRENT_DATE + 7 THEN 'lapsing'
                ELSE 'active'
              END AS subscription_status
       FROM rental_cars rc
       LEFT JOIN users u ON u.id = rc.provider_id
       LEFT JOIN LATERAL (
         SELECT * FROM rental_subscriptions s
          WHERE s.rental_car_id = rc.id AND s.voided_at IS NULL
          ORDER BY s.ends_on DESC LIMIT 1
       ) sub ON TRUE
       ORDER BY rc.created_at DESC`
    );
    res.json(rows.map((row) => ({
      ...publicRental(row, true),
      subscription_status: row.subscription_status,
      subscription_ends_on: row.subscription_ends_on,
      subscription_amount_rwf: row.subscription_amount_rwf,
      // Paid for, and still not on the public feed.
      //
      // Recording a subscription deliberately does not flip status: a car in
      // 'maintenance' may be in the workshop, and silently publishing one an
      // operator parked would be worse than leaving it. But the common case is
      // the opposite — the car was created without a subscription (so it began
      // as 'maintenance' by design), the payment was then recorded, and nothing
      // anywhere said the last step was still outstanding. The operator has
      // taken money for a listing nobody can see.
      //
      // Derived here rather than in each client so there is one definition of
      // "one click away from being live".
      publishable: row.subscription_status === 'active' && row.status !== 'active',
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/inquiries/my', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ri.*, rc.title AS car_title, rc.images AS car_images,
              rc.location AS car_location, u.name AS provider_name,
              u.business_name AS provider_business_name
       FROM rental_inquiries ri
       JOIN rental_cars rc ON rc.id = ri.rental_car_id
       LEFT JOIN users u ON u.id = ri.provider_id
       WHERE ri.renter_id = $1
       ORDER BY ri.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider accounts can see only their own leads; admins can see every lead.
router.get('/inquiries', requireAuth, async (req, res) => {
  const status = String(req.query.status || '');
  if (status && !['new', 'contacted', 'closed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid inquiry status' });
  }
  try {
    const params = [];
    const where = [];
    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      where.push(`ri.provider_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`ri.status = $${params.length}`);
    }
    const { rows } = await pool.query(
      `SELECT ri.*, rc.title AS car_title,
              renter.name AS renter_name, renter.phone AS renter_phone,
              renter.whatsapp_phone AS renter_whatsapp,
              provider.name AS provider_name,
              provider.business_name AS provider_business_name
       FROM rental_inquiries ri
       JOIN rental_cars rc ON rc.id = ri.rental_car_id
       JOIN users renter ON renter.id = ri.renter_id
       LEFT JOIN users provider ON provider.id = ri.provider_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY ri.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    log.error('rental inquiries error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/inquiries/:id/status', requireAuth, requireUuid('id'), async (req, res) => {
  const status = String(req.body.status || '');
  if (!['contacted', 'closed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'status must be contacted, closed, or cancelled' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const current = await client.query('SELECT * FROM rental_inquiries WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!current.rowCount) { const e = new Error('Inquiry not found'); e.status = 404; throw e; }
      const inquiry = current.rows[0];
      const isAdmin = req.user.role === 'admin';
      const isProvider = inquiry.provider_id === req.user.id;
      const isRenter = inquiry.renter_id === req.user.id;
      if (!isAdmin && !isProvider && !isRenter) { const e = new Error('Forbidden'); e.status = 403; throw e; }
      if (isRenter && !isAdmin && !isProvider && status !== 'cancelled') {
        const e = new Error('Renters may only cancel their own inquiry'); e.status = 403; throw e;
      }
      if (['closed', 'cancelled'].includes(inquiry.status)) {
        const e = new Error('This inquiry is already closed'); e.status = 409; throw e;
      }
      const { rows } = await client.query(
        `UPDATE rental_inquiries SET status=$1, updated_at=NOW(),
           closed_at=CASE WHEN $1 IN ('closed','cancelled') THEN NOW() ELSE NULL END
         WHERE id=$2 RETURNING *`,
        [status, req.params.id]
      );
      if (isAdmin) {
        await recordAdminAction(client, {
          actorId: req.user.id, action: 'rental_inquiry.status_changed',
          targetType: 'rental_inquiry', targetId: inquiry.id,
          summary: `${inquiry.inquiry_ref} moved to ${status}`,
          metadata: { previous_status: inquiry.status, status },
        });
      }
      return rows[0];
    });
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('rental inquiry status error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Old clients must not silently create the transaction-style booking that was
// removed. A 410 produces a clear upgrade path without accepting a deal.
router.post('/:id/book', requireAuth, requireUuid('id'), (_req, res) => {
  res.status(410).json({
    error: 'Rental checkout has been replaced by direct provider inquiries. Update the app and use Request availability.',
    code: 'RENTAL_BOOKING_RETIRED',
  });
});

router.post('/:id/inquire', requireAuth, requireUuid('id'), async (req, res) => {
  const startDate = req.body.start_date ? String(req.body.start_date) : null;
  const days = req.body.days == null || req.body.days === '' ? null : Number(req.body.days);
  const preferredChannel = String(req.body.preferred_channel || 'in_app');
  const message = String(req.body.message || '').trim().slice(0, 1500) || null;
  const pickupLocation = String(req.body.pickup_location || '').trim().slice(0, 200) || null;
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return res.status(400).json({ error: 'start_date is required in YYYY-MM-DD format' });
  const parsedStart = new Date(`${startDate}T00:00:00.000Z`);
  const today = new Date().toISOString().slice(0, 10);
  if (Number.isNaN(parsedStart.getTime()) || parsedStart.toISOString().slice(0, 10) !== startDate || startDate < today) {
    return res.status(400).json({ error: 'start_date must be a valid date that is today or later' });
  }
  if (!Number.isInteger(days) || days < 1 || days > 365) return res.status(400).json({ error: 'days is required and must be between 1 and 365' });
  if (!['in_app', 'phone', 'whatsapp'].includes(preferredChannel)) return res.status(400).json({ error: 'Invalid preferred channel' });
  try {
    const inquiry = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT rc.*, ${PROVIDER_COLUMNS},
                buyer.marketplace_terms_accepted_at,
                buyer.marketplace_terms_version
         FROM rental_cars rc
         JOIN users u ON u.id = rc.provider_id
         ${VALID_RENTAL_INSPECTION}
         ${ACTIVE_RENTAL_SUBSCRIPTION}
         JOIN users buyer ON buyer.id = $2
         WHERE rc.id = $1 AND rc.status = 'active'
           AND u.role = 'seller' AND u.id_verified = 'approved'
           AND u.business_verified = TRUE AND u.account_status = 'active'
           AND u.deleted_at IS NULL
         FOR UPDATE OF rc`,
        [req.params.id, req.user.id]
      );
      if (!rows.length) { const e = new Error('Active rental car not found'); e.status = 404; throw e; }
      const car = rows[0];
      if (car.provider_id === req.user.id) { const e = new Error('You cannot inquire about your own rental car'); e.status = 400; throw e; }
      await ensureMarketplaceAcknowledgement(client, {
        id: req.user.id,
        marketplace_terms_accepted_at: car.marketplace_terms_accepted_at,
        marketplace_terms_version: car.marketplace_terms_version,
      }, req.body.acknowledge === true);

      const available = contactAvailability({
        id_verified: car.provider_id_verified,
        role: car.provider_role,
        seller_type: car.provider_seller_type,
        business_verified: car.provider_business_verified,
        account_status: car.provider_account_status,
        deleted_at: car.provider_deleted_at,
        phone: car.provider_phone,
        whatsapp_phone: car.provider_whatsapp,
        phone_visible: car.provider_phone_visible,
        whatsapp_visible: car.provider_whatsapp_visible,
      });
      if (preferredChannel !== 'in_app' && !available[preferredChannel]) {
        const e = new Error(`The provider has not made ${preferredChannel === 'whatsapp' ? 'WhatsApp' : 'phone'} contact available. Send an in-app inquiry instead.`);
        e.status = 409; e.code = 'CONTACT_NOT_AVAILABLE'; e.available = available; throw e;
      }

      const ref = 'RI-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const inserted = await client.query(
        `INSERT INTO rental_inquiries
           (inquiry_ref, rental_car_id, renter_id, provider_id, start_date, days,
            pickup_location, message, preferred_channel)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [ref, car.id, req.user.id, car.provider_id, startDate, days, pickupLocation, message, preferredChannel]
      );
      if (car.provider_id) {
        await notifyUser(client, {
          user_id: car.provider_id,
          type: 'listing_update',
          title: 'New rental inquiry',
          body: `${car.title} has a new availability request (${ref}). Contact the renter directly to confirm terms.`,
          meta: JSON.stringify({ inquiryId: inserted.rows[0].id, rentalCarId: car.id }),
        });
      }
      return {
        ...inserted.rows[0],
        provider_name: car.provider_name,
        provider_business_name: car.provider_business_name,
        provider_contact_available: available,
        contact: preferredChannel === 'phone' ? car.provider_phone
          : preferredChannel === 'whatsapp' ? car.provider_whatsapp : null,
      };
    });
    res.status(201).json({
      ...inquiry,
      notice: DIRECT_DEAL_NOTICE,
      message: 'Inquiry sent. The rental provider—not Sawa—will confirm availability, price and terms.',
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({
      error: err.message, code: err.code, available: err.available, notice: err.notice,
    });
    log.error('rental inquiry create error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /rentals/:id — public detail after fixed route names above.
router.get('/:id', requireUuid('id'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rc.*, ${PROVIDER_COLUMNS}
       FROM rental_cars rc JOIN users u ON u.id = rc.provider_id
       ${VALID_RENTAL_INSPECTION}
       ${ACTIVE_RENTAL_SUBSCRIPTION}
       WHERE rc.id = $1 AND rc.status = 'active' AND u.role = 'seller'
         AND u.id_verified = 'approved' AND u.business_verified = TRUE
         AND u.account_status = 'active' AND u.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Rental car not found' });
    res.json(publicRental(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Rental listing subscriptions.
//
// Recorded, not collected — the money changes hands at the office. What these
// routes control is only whether a car appears in the public catalogue, and
// they do that by writing a row the three public predicates read. No job runs,
// nothing expires on a timer, and a renewal takes effect on the next request.
// ─────────────────────────────────────────────────────────────────────────────

const SUB_METHODS = new Set(['cash', 'mobile_money', 'bank_transfer']);

/** A calendar day as 'YYYY-MM-DD', from either a request body or a database row.
 *
 *  The Date branch is not decoration. A `date` column arrives from node-pg as a
 *  Date at LOCAL midnight, and String()-ing one yields "Thu Aug 28 2026 …" — so
 *  the slice below produced "Thu Aug 2", failed the pattern, and returned null.
 *  Silently: no throw, no log, just a null that every comparison then treats as
 *  "no date". This helper was only ever fed request strings, so that went
 *  unnoticed until a DB value reached it.
 *
 *  toISOString() would not fix it either — it converts to UTC first, so a Date
 *  at local midnight east of Greenwich becomes the previous day. Read the local
 *  parts, which are the ones Postgres put there. */
const isoDay = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};
const todayIso = () => isoDay(new Date());

/** Reads and validates a subscription period from a request body. */
function readSubscription(body) {
  const amount = parseInt(body.amount_rwf, 10);
  if (!Number.isInteger(amount) || amount < 0) return { error: 'Enter the amount collected, in Rwandan francs' };
  const startsOn = isoDay(body.starts_on);
  const endsOn = isoDay(body.ends_on);
  if (!startsOn || !endsOn) return { error: 'Give the period as starts_on and ends_on dates' };
  if (endsOn < startsOn) return { error: 'The period cannot end before it starts' };
  const method = body.method ? String(body.method) : null;
  if (method && !SUB_METHODS.has(method)) {
    return { error: `Method must be one of: ${[...SUB_METHODS].join(', ')}` };
  }
  return {
    amount, startsOn, endsOn, method,
    reference: String(body.reference || '').trim().slice(0, 120) || null,
    note: String(body.note || '').trim().slice(0, 500) || null,
  };
}

/** Records one subscription period, refusing an overlap with a live one. */
async function insertSubscription(client, { rentalCarId, period, actorId }) {
  const clash = await client.query(
    `SELECT id, starts_on, ends_on FROM rental_subscriptions
      WHERE rental_car_id = $1 AND voided_at IS NULL
        AND starts_on <= $3::date AND ends_on >= $2::date
      LIMIT 1`,
    [rentalCarId, period.startsOn, period.endsOn]
  );
  if (clash.rows.length) {
    const e = new Error('That period overlaps a subscription this car already has. Void it first, or choose a later start.');
    e.status = 409; e.code = 'SUBSCRIPTION_OVERLAP'; throw e;
  }
  const { rows } = await client.query(
    `INSERT INTO rental_subscriptions
       (rental_car_id, amount_rwf, method, reference, starts_on, ends_on, note, recorded_by)
     VALUES ($1,$2,$3,$4,$5::date,$6::date,$7,$8) RETURNING *`,
    [rentalCarId, period.amount, period.method, period.reference,
     period.startsOn, period.endsOn, period.note, actorId]
  );
  await recordAdminAction(client, {
    actorId, action: 'rental_subscription.recorded',
    targetType: 'rental_car', targetId: rentalCarId,
    summary: `Listing paid to ${period.endsOn} (RWF ${period.amount.toLocaleString('en-RW')})`,
    metadata: { amount_rwf: period.amount, starts_on: period.startsOn, ends_on: period.endsOn, method: period.method },
  });
  return rows[0];
}

// GET /rentals/:id/subscriptions — the full history, newest first.
router.get('/:id/subscriptions', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM rental_subscriptions WHERE rental_car_id = $1
        ORDER BY starts_on DESC, created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    log.error('rental subscriptions read error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rentals/:id/subscriptions — record a period.
router.post('/:id/subscriptions', requireAdmin, requireUuid('id'), async (req, res) => {
  const period = readSubscription(req.body);
  if (period.error) return res.status(400).json({ error: period.error });
  try {
    const created = await withTransaction(async (client) => {
      const car = await client.query('SELECT id, status FROM rental_cars WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!car.rowCount) { const e = new Error('Rental car not found'); e.status = 404; throw e; }
      const created = await insertSubscription(client, {
        rentalCarId: req.params.id, period, actorId: req.user.id,
      });
      return { created, status: car.rows[0].status };
    });
    // Said at the moment the money is recorded, which is the moment the operator
    // believes the job is finished. Learning it later, by noticing the car is
    // missing from the website, is how a paid listing sits invisible for a month.
    const startsOn = isoDay(created.created.starts_on);
    const endsOn = isoDay(created.created.ends_on);
    const coversToday = Boolean(startsOn && endsOn && startsOn <= todayIso() && endsOn >= todayIso());
    res.status(201).json({
      ...created.created,
      vehicle_status: created.status,
      published: created.status === 'active',
      warnings: created.status !== 'active' && coversToday
        ? ['This subscription is paid, but the vehicle is still set to '
           + `${created.status} so it is NOT on the public rental feed. `
           + 'Set it to Active to publish it.']
        : [],
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code || undefined });
    log.error('rental subscription create error', { error: err.message });
    res.status(500).json({ error: 'Could not record the subscription' });
  }
});

// POST /rentals/subscriptions/:subId/void — undo a mistake.
//
// Void rather than delete, and a reason is required, for the same reason as the
// inspection fee: a record that can be quietly removed is not a record. Voiding
// takes the car out of the catalogue immediately if nothing else covers today.
router.post('/subscriptions/:subId/void', requireAdmin, requireUuid('subId'), async (req, res) => {
  const reason = String((req.body && req.body.reason) || '').trim();
  if (reason.length < 4) {
    return res.status(400).json({ error: 'Say why it is being voided — it stays on the record' });
  }
  try {
    const voided = await withTransaction(async (client) => {
      const current = await client.query(
        'SELECT * FROM rental_subscriptions WHERE id=$1 FOR UPDATE', [req.params.subId]
      );
      if (!current.rowCount) { const e = new Error('Subscription not found'); e.status = 404; throw e; }
      if (current.rows[0].voided_at) { const e = new Error('That subscription is already voided'); e.status = 409; throw e; }
      const { rows } = await client.query(
        `UPDATE rental_subscriptions
            SET voided_at = NOW(), voided_by = $1, void_reason = $2
          WHERE id = $3 RETURNING *`,
        [req.user.id, reason.slice(0, 500), req.params.subId]
      );
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'rental_subscription.voided',
        targetType: 'rental_car', targetId: current.rows[0].rental_car_id,
        summary: `Voided a listing subscription: ${reason.slice(0, 120)}`,
        metadata: { subscription_id: req.params.subId, reason: reason.slice(0, 500) },
      });
      return rows[0];
    });
    res.json(voided);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('rental subscription void error', { error: err.message });
    res.status(500).json({ error: 'Could not void the subscription' });
  }
});

// ── Admin rental-company inventory CRUD ─────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const { provider_id, title, make, model, year, category, seats, fuel,
          transmission, mileage, daily_rate, weekly_rate, deposit, min_days,
          inspection_id, location, images } = req.body;
  if (!provider_id || !title || !make || !model || !year || !daily_rate || !inspection_id) return res.status(400).json({ error: 'provider_id, title, make, model, year, daily_rate and inspection_id are required' });
  if (!Number.isFinite(Number(daily_rate)) || Number(daily_rate) <= 0) return res.status(400).json({ error: 'daily_rate must be a positive number' });
  const galleryError = rentalGalleryError(images, true);
  if (galleryError) return res.status(400).json({ error: galleryError });
  try {
    const created = await withTransaction(async (client) => {
      if (!await verifiedRentalProvider(client, provider_id)) {
        const error = new Error('Provider must be an active, identity- and business-verified seller');
        error.status = 400;
        throw error;
      }
      const evidence = await inspectionEvidenceForProvider(client, inspection_id, provider_id);
      if (!evidence) {
        const error = new Error('Choose a complete, passing 150-point inspection belonging to this provider');
        error.status = 409;
        throw error;
      }
      if (!inspectionMatchesVehicle(evidence, { make, model, year })) {
        const error = new Error('The selected inspection belongs to a different make, model, or model year');
        error.status = 409;
        throw error;
      }
      // A car with no paid subscription would be created 'active' and then be
      // invisible to every public read — an operator would reasonably conclude
      // the listing was broken. So it is created in maintenance instead, which
      // is what it actually is: present, not published.
      const period = req.body.subscription ? readSubscription(req.body.subscription) : null;
      if (period && period.error) { const e = new Error(period.error); e.status = 400; throw e; }
      const initialStatus = period ? 'active' : 'maintenance';

      const { rows } = await client.query(
        `INSERT INTO rental_cars
           (provider_id,title,make,model,year,category,seats,fuel,transmission,mileage,
            daily_rate,weekly_rate,deposit,min_days,inspection_id,inspected,inspection_score,location,images,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE,$16,$17,$18,$19)
         RETURNING *`,
        [provider_id, String(title).trim(), make, model, year, category, seats || 5, fuel,
         transmission, mileage, daily_rate, weekly_rate || Number(daily_rate) * 6,
         deposit || 0, min_days || 1, inspection_id, Number(evidence.score), location,
         images.map((url) => url.trim()), initialStatus]
      );
      if (period) {
        await insertSubscription(client, { rentalCarId: rows[0].id, period, actorId: req.user.id });
      }
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'rental_car.created', targetType: 'rental_car', targetId: rows[0].id,
        summary: `${rows[0].title} added for a verified rental provider`, metadata: {
          provider_id, daily_rate: rows[0].daily_rate, inspection_id, inspection_score: Number(evidence.score),
        },
      });
      return rows[0];
    });
    res.status(201).json(created);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === '23505') return res.status(409).json({ error: 'That inspection is already linked to another rental vehicle that is still in the fleet. Retire that vehicle first and the inspection becomes available again.', code: 'INSPECTION_IN_USE' });
    log.error('rental create error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const EDITABLE = ['provider_id', 'title', 'make', 'model', 'year', 'category',
    'seats', 'fuel', 'transmission', 'mileage', 'daily_rate', 'weekly_rate',
    'deposit', 'min_days', 'inspection_id', 'location', 'images', 'status'];
  const fields = EDITABLE.filter((field) => req.body[field] !== undefined);
  if (!fields.length) return res.status(400).json({ error: 'No editable fields provided' });
  if (req.body.status && !['active', 'maintenance', 'retired'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
  if (req.body.title !== undefined && !String(req.body.title).trim()) return res.status(400).json({ error: 'title cannot be empty' });
  for (const field of ['daily_rate', 'weekly_rate', 'deposit', 'min_days']) {
    if (req.body[field] !== undefined && (!Number.isFinite(Number(req.body[field])) || Number(req.body[field]) < (field === 'min_days' || field === 'daily_rate' ? 1 : 0))) {
      return res.status(400).json({ error: `${field} has an invalid value` });
    }
  }
  if (req.body.images !== undefined) {
    const galleryError = rentalGalleryError(req.body.images, false);
    if (galleryError) return res.status(400).json({ error: galleryError });
  }
  try {
    const updated = await withTransaction(async (client) => {
      const current = await client.query('SELECT * FROM rental_cars WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!current.rowCount) { const error = new Error('Rental car not found'); error.status = 404; throw error; }
      const before = current.rows[0];
      const providerId = req.body.provider_id !== undefined ? req.body.provider_id : before.provider_id;
      const status = req.body.status !== undefined ? req.body.status : before.status;
      const images = req.body.images !== undefined ? req.body.images : (before.images || []);
      const inspectionId = req.body.inspection_id !== undefined ? req.body.inspection_id : before.inspection_id;

      // Only on an explicit transition to 'active' — deliberately NOT inherited
      // like the assertions around it. Inheriting would 409 on editing a lapsed
      // car's location or rate, which is exactly when an operator needs to.
      if (req.body.status === 'active' && before.status !== 'active') {
        const live = await client.query(
          `SELECT 1 FROM rental_subscriptions
            WHERE rental_car_id = $1 AND voided_at IS NULL
              AND starts_on <= CURRENT_DATE AND ends_on >= CURRENT_DATE`,
          [req.params.id]
        );
        if (!live.rowCount) {
          const error = new Error('Record a listing subscription before putting this car back in the catalogue');
          error.status = 409; error.code = 'SUBSCRIPTION_REQUIRED'; throw error;
        }
      }
      const evidence = await inspectionEvidenceForProvider(client, inspectionId, providerId);
      if (inspectionId && !evidence) {
        const error = new Error('The selected inspection must be complete, passing, and belong to this provider');
        error.status = 409;
        throw error;
      }
      const vehicle = {
        make: req.body.make !== undefined ? req.body.make : before.make,
        model: req.body.model !== undefined ? req.body.model : before.model,
        year: req.body.year !== undefined ? req.body.year : before.year,
      };
      if (evidence && !inspectionMatchesVehicle(evidence, vehicle)) {
        const error = new Error('The rental vehicle details do not match the selected inspection');
        error.status = 409;
        throw error;
      }
      if (status === 'active') {
        if (!await verifiedRentalProvider(client, providerId)) {
          const error = new Error('An active rental listing requires an active, identity- and business-verified provider');
          error.status = 409;
          throw error;
        }
        const galleryError = rentalGalleryError(images, true);
        if (galleryError) { const error = new Error(galleryError); error.status = 409; throw error; }
        if (!evidence) {
          const error = new Error('An active rental listing requires a valid 150-point inspection');
          error.status = 409;
          throw error;
        }
      }
      const normalized = { ...req.body };
      if (normalized.title !== undefined) normalized.title = String(normalized.title).trim();
      if (normalized.images !== undefined) normalized.images = normalized.images.map((url) => url.trim());
      const params = fields.map((field) => normalized[field]);
      const assignments = fields.map((field, index) => `${field}=$${index + 1}`);
      params.push(Boolean(evidence), evidence ? Number(evidence.score) : null);
      assignments.push(`inspected=$${params.length - 1}`, `inspection_score=$${params.length}`);
      if (req.body.status === 'retired') assignments.push('retired_at=NOW()');
      if (req.body.status && req.body.status !== 'retired') assignments.push('retired_at=NULL', 'retirement_reason=NULL');
      params.push(req.params.id);
      const { rows } = await client.query(
        `UPDATE rental_cars SET ${assignments.join(', ')} WHERE id=$${params.length} RETURNING *`, params
      );
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'rental_car.updated', targetType: 'rental_car', targetId: rows[0].id,
        summary: `${rows[0].title} rental listing updated`, metadata: { changed_fields: fields },
      });
      return rows[0];
    });
    res.json(updated);
  } catch (err) {
    // The code matters here: a client needs to tell SUBSCRIPTION_REQUIRED apart
    // from the other 409s this route raises.
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code || undefined });
    if (err.code === '23505') return res.status(409).json({ error: 'That inspection is already linked to another rental vehicle that is still in the fleet. Retire that vehicle first and the inspection becomes available again.', code: 'INSPECTION_IN_USE' });
    log.error('rental update error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const reason = String(req.body?.reason || '').trim().slice(0, 1000);
  if (!reason) return res.status(400).json({ error: 'A retirement reason is required' });
  try {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE rental_cars SET status='retired', retired_at=NOW(), retirement_reason=$1
         WHERE id=$2 RETURNING *`, [reason, req.params.id]
      );
      if (!rows.length) { const e = new Error('Rental car not found'); e.status = 404; throw e; }
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'rental_car.retired', targetType: 'rental_car', targetId: req.params.id,
        summary: `${rows[0].title} retired`, metadata: { reason },
      });
      return rows[0];
    });
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
