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
const {
  RENTAL_CHECK_VERSION,
  RENTAL_CHECK_VALID_MONTHS,
  ITEMS: RENTAL_CHECK_ITEMS,
  evaluateRentalCheck,
  disclosures: rentalCheckDisclosures,
  publicDefinition: rentalCheckDefinition,
} = require('../lib/rental-check-policy');
const { kigaliToday } = require('../lib/insights-range');
const fs = require('fs');
const { uploadPhotos, verifyImageContent, resolveUploadUrl } = require('../middleware/upload');
const { compressUploads } = require('../middleware/image-compress');
const { stripUploadMetadata } = require('../middleware/strip-metadata');
const calendar = require('../lib/rental-calendar');
const { screenUserText } = require('../lib/moderation');

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

/** Whether the car's latest Rental Check lets it be listed today.
 *  { hasCheck: false } when it has none, so the caller falls back to the
 *  legacy inspection exactly as RENTAL_EVIDENCE_OK does. */
async function rentalCheckAllowsListing(db, carId) {
  const { rows } = await db.query(
    `SELECT chk.id IS NOT NULL AS has_check,
            COALESCE(chk.passed
              AND chk.checked_at > NOW() - INTERVAL '${RENTAL_CHECK_VALID_MONTHS} months'
              AND chk.insurance_expires_on >= ${KIGALI_TODAY_SQL}
              AND chk.technical_control_expires_on >= ${KIGALI_TODAY_SQL}, FALSE) AS ok
       FROM rental_cars rc ${RENTAL_EVIDENCE}
      WHERE rc.id = $1`,
    [carId]
  );
  return { hasCheck: Boolean(rows[0]?.has_check), ok: Boolean(rows[0]?.ok) };
}

function inspectionMatchesVehicle(evidence, vehicle) {
  const sameText = (left, right) => String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
  return evidence && sameText(evidence.make, vehicle.make) && sameText(evidence.model, vehicle.model)
    && Number(evidence.year) === Number(vehicle.year);
}

// What lets a rental car be listed: its Sawa Rental Check
// (lib/rental-check-policy.js), or — for cars listed before Rental Checks
// existed — the 150-point inspection they were approved on.
//
// The LATEST non-voided check decides: a failed re-check takes the car down
// even though an older check passed. It must have passed, be under 12 months
// old, and both recorded document dates must be today or later in Kigali —
// expiry by predicate, so the listing hides itself the day the insurance or
// technical control runs out, with nothing scheduled to make it happen.
//
// A car with no check at all keeps its legacy inspection evidence, matched to
// the provider and vehicle exactly as before. Recording its first check ends
// that: from then on only checks count.
//
// RENTAL_EVIDENCE is a join (it exposes chk.* for the payload);
// RENTAL_EVIDENCE_OK goes in the WHERE clause. Both go in ALL THREE public
// reads (catalogue, detail, inquire), for the reason given below.
const KIGALI_TODAY_SQL = "(NOW() AT TIME ZONE 'Africa/Kigali')::date";

const RENTAL_EVIDENCE = `
  LEFT JOIN LATERAL (
    SELECT rck.* FROM rental_checks rck
     WHERE rck.rental_car_id = rc.id AND rck.voided_at IS NULL
     ORDER BY rck.checked_at DESC LIMIT 1
  ) chk ON TRUE`;

const LEGACY_INSPECTION_EXISTS = `EXISTS (
    SELECT 1 FROM inspections evidence
      JOIN submissions evidence_submission ON evidence_submission.id = evidence.submission_id
     WHERE evidence.id = rc.inspection_id
       AND evidence_submission.seller_id = rc.provider_id
       AND lower(evidence_submission.make) = lower(rc.make)
       AND lower(evidence_submission.model) = lower(rc.model)
       AND evidence_submission.year = rc.year
       AND evidence.status = 'complete'
       AND evidence.checklist_version = '${CHECKLIST_VERSION}')`;

const RENTAL_EVIDENCE_OK = `(
    (chk.id IS NOT NULL AND chk.passed
       AND chk.checked_at > NOW() - INTERVAL '${RENTAL_CHECK_VALID_MONTHS} months'
       AND chk.insurance_expires_on >= ${KIGALI_TODAY_SQL}
       AND chk.technical_control_expires_on >= ${KIGALI_TODAY_SQL})
    OR (chk.id IS NULL AND ${LEGACY_INSPECTION_EXISTS})
  )`;

// The check columns a payload needs, aliased so they cannot collide with rc.*.
const CHECK_COLUMNS = `
  chk.id AS check_id,
  chk.checklist_version AS check_version,
  chk.results AS check_results,
  chk.passed AS check_passed,
  chk.passed_count AS check_passed_count,
  chk.insurance_expires_on AS check_insurance_expires_on,
  chk.technical_control_expires_on AS check_technical_control_expires_on,
  chk.checked_at AS check_checked_at`;

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

const CHECK_EXPIRY_WARNING_DAYS = 30;

/** Loads the taken periods for these cars and adds `availability` to each,
 *  in one query. `unavailable_until` is derived from it for old app builds:
 *  the day the car is back, while it is out. */
async function attachAvailability(db, cars, { withPeriods = false, forOwner = false } = {}) {
  if (!cars.length) return cars;
  const today = kigaliToday();
  const horizon = calendar.addDays(today, calendar.PUBLIC_WINDOW_DAYS);
  const { rows } = await db.query(
    `SELECT id, rental_car_id, to_char(starts_on, 'YYYY-MM-DD') AS from_day, to_char(ends_on, 'YYYY-MM-DD') AS to_day
       FROM rental_busy_periods
      WHERE rental_car_id = ANY($1::uuid[]) AND ends_on >= $2::date
        AND ($4::boolean OR starts_on <= $3::date)
      ORDER BY starts_on`,
    [cars.map((c) => c.id), today, horizon, forOwner]
  );
  const byCar = new Map();
  for (const row of rows) {
    if (!byCar.has(row.rental_car_id)) byCar.set(row.rental_car_id, []);
    byCar.get(row.rental_car_id).push({ id: row.id, from: row.from_day, to: row.to_day });
  }
  return cars.map((car) => {
    const own = byCar.get(car.id) || [];
    const availability = calendar.availabilitySummary({
      ranges: own, today, updatedAt: car.calendar_updated_at, withPeriods,
    });
    const out = { ...car, availability, unavailable_until: availability.back_on };
    // The owner edits periods one by one, so they get them with their ids.
    if (forOwner) out.calendar_periods = own.map((r) => ({ id: r.id, starts_on: r.from, ends_on: r.to }));
    return out;
  });
}

function addDaysIso(iso, days) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonthsIso(iso, months) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function kigaliDayOf(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : kigaliToday(date);
}

/**
 * Where a car stands on its Rental Check, for its provider and for staff.
 * One definition, so the fleet screens on web, app and admin agree.
 *
 *   requested  the provider asked for a check and none has been recorded since
 *   none       no check and no legacy inspection: cannot be listed
 *   legacy     listed on a 150-point inspection from before Rental Checks
 *   failed     the latest check failed a document or safety point
 *   expired    passed, but over 12 months old or a document date has passed
 *   expiring   passed, but a document runs out (or the check turns 12 months)
 *              within 30 days
 *   passed     good to list
 */
function rentalCheckStatus(row, today = kigaliToday()) {
  const checkedOn = kigaliDayOf(row.check_checked_at);
  const requestedOn = row.check_requested_at ? new Date(row.check_requested_at) : null;
  const checkedAt = row.check_checked_at ? new Date(row.check_checked_at) : null;
  if (requestedOn && (!checkedAt || requestedOn > checkedAt)) return 'requested';
  if (!row.check_id) return row.inspection_id && row.inspected ? 'legacy' : 'none';
  if (!row.check_passed) return 'failed';
  const insurance = isoDay(row.check_insurance_expires_on);
  const technical = isoDay(row.check_technical_control_expires_on);
  const validUntil = addMonthsIso(checkedOn, RENTAL_CHECK_VALID_MONTHS);
  const firstDeadline = [insurance, technical, validUntil].filter(Boolean).sort()[0];
  if (!firstDeadline || firstDeadline < today) return 'expired';
  if (firstDeadline <= addDaysIso(today, CHECK_EXPIRY_WARNING_DAYS)) return 'expiring';
  return 'passed';
}

/** The car's evidence, ignoring a pending request for a new check: a provider
 *  asking for a re-check does not stop a car whose check still holds from
 *  being listed. */
function rentalEvidenceStatus(row, today = kigaliToday()) {
  return rentalCheckStatus({ ...row, check_requested_at: null }, today);
}

/** Every reason a car is not on the public catalogue right now, in the order
 *  an operator fixes them. Empty means it is public. Mirrors the public reads
 *  (GET /rentals): status, provider, subscription, evidence; plus photos,
 *  which activation requires. */
function rentalPublicBlockers(row, today = kigaliToday()) {
  const blockers = [];
  const providerProblems = [];
  if (row.provider_role !== 'seller') providerProblems.push('not a seller account');
  if (row.provider_id_verified !== 'approved') providerProblems.push('identity not verified');
  if (row.provider_business_verified !== true) providerProblems.push('not business-verified');
  if (row.provider_account_status !== 'active' || row.provider_deleted_at) providerProblems.push('account suspended or closed');
  if (providerProblems.length) {
    blockers.push({ code: 'provider', message: `Provider: ${providerProblems.join(', ')}. Fix it in Users.` });
  }
  if (!Array.isArray(row.images) || !row.images.length) {
    blockers.push({ code: 'photos', message: 'No photos yet. Edit inventory → Add photos.' });
  }
  const evidence = rentalEvidenceStatus(row, today);
  if (!['passed', 'expiring', 'legacy'].includes(evidence)) {
    blockers.push({
      code: 'check',
      message: {
        none: 'No Rental Check yet. Record Rental Check.',
        failed: 'The latest Rental Check failed. Record a new one once fixed.',
        expired: 'The Rental Check or a document has expired. Record a new check.',
      }[evidence] || 'Record a passing Rental Check.',
    });
  }
  const covered = row.subscription_starts_on && row.subscription_ends_on
    && isoDay(row.subscription_starts_on) <= today && isoDay(row.subscription_ends_on) >= today;
  if (!covered) {
    blockers.push({
      code: 'subscription',
      message: row.subscription_starts_on && isoDay(row.subscription_starts_on) > today
        ? `The listing subscription starts on ${isoDay(row.subscription_starts_on)}.`
        : 'No listing subscription covers today. Pay 30 days.',
    });
  }
  if (row.status !== 'active') {
    blockers.push({ code: 'status', message: `The car is ${String(row.status).replace('_', ' ')}. Set it to Active.` });
  }
  return blockers;
}

/** The check as a renter sees it. Owners and staff also get the failed points,
 *  which a renter never needs: a car that failed one is not listed. */
function rentalCheckSummary(row, { forOwner = false } = {}) {
  if (row.check_id) {
    const summary = {
      kind: 'rental_check',
      version: row.check_version,
      passed: Boolean(row.check_passed),
      passed_count: row.check_passed_count,
      total: RENTAL_CHECK_ITEMS.length,
      checked_on: kigaliDayOf(row.check_checked_at),
      insurance_valid_until: isoDay(row.check_insurance_expires_on),
      technical_control_valid_until: isoDay(row.check_technical_control_expires_on),
      disclosures: rentalCheckDisclosures(row.check_results),
    };
    if (forOwner) {
      summary.failed = RENTAL_CHECK_ITEMS
        .filter((entry) => row.check_results?.[entry.id]?.verdict === 'fail')
        .map((entry) => ({ id: entry.id, label: entry.label, note: row.check_results[entry.id].note || null }));
    }
    return summary;
  }
  if (row.inspection_id && row.inspected) {
    return { kind: 'inspection', inspection_score: row.inspection_score };
  }
  return null;
}

const CHECK_RAW_FIELDS = ['check_id', 'check_version', 'check_results', 'check_passed', 'check_passed_count',
  'check_insurance_expires_on', 'check_technical_control_expires_on', 'check_checked_at'];

function publicRental(row, includeContact = false, { forOwner = false } = {}) {
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
  result.rental_check = rentalCheckSummary(row, { forOwner });
  if (forOwner) {
    result.check_status = rentalCheckStatus(row);
  } else {
    // Internal workflow state, not for the catalogue.
    delete result.check_requested_at;
  }
  for (const field of CHECK_RAW_FIELDS) delete result[field];
  return result;
}

// Public rental catalogue. Rates are provider-supplied estimates; Sawa neither
// blocks dates nor confirms a booking.
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rc.*, ${PROVIDER_COLUMNS}, ${CHECK_COLUMNS}
       FROM rental_cars rc JOIN users u ON u.id = rc.provider_id
       ${RENTAL_EVIDENCE}
       ${ACTIVE_RENTAL_SUBSCRIPTION}
       WHERE rc.status = 'active' AND u.role = 'seller'
         AND u.id_verified = 'approved' AND u.business_verified = TRUE
         AND u.account_status = 'active' AND u.deleted_at IS NULL
         AND ${RENTAL_EVIDENCE_OK}
       ORDER BY rc.daily_rate ASC`
    );
    res.json(await attachAvailability(pool, rows.map((row) => publicRental(row))));
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
      `SELECT rc.*, ${PROVIDER_COLUMNS}, ${CHECK_COLUMNS},
              sub.ends_on AS subscription_ends_on,
              sub.starts_on AS subscription_starts_on,
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
       ${RENTAL_EVIDENCE}
       ORDER BY rc.created_at DESC`
    );
    const today = kigaliToday();
    res.json(rows.map((row) => {
      const blockers = rentalPublicBlockers(row, today);
      return {
      ...publicRental(row, true, { forOwner: true }),
      subscription_status: row.subscription_status,
      subscription_ends_on: row.subscription_ends_on,
      subscription_starts_on: row.subscription_starts_on,
      subscription_amount_rwf: row.subscription_amount_rwf,
      evidence_status: rentalEvidenceStatus(row, today),
      provider_eligible: !blockers.some((b) => b.code === 'provider'),
      // Why the car is not public, one line per reason. Empty = public now.
      public_blockers: blockers,
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
      // Evidence, photos and the provider count too: only the status is left.
      publishable: blockers.length === 1 && blockers[0].code === 'status',
      };
    }));
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
              renter.name AS renter_name,
              -- Only with the renter's consent (migration 0061).
              CASE WHEN ri.renter_shares_contact THEN renter.phone END AS renter_phone,
              CASE WHEN ri.renter_shares_contact THEN renter.whatsapp_phone END AS renter_whatsapp,
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
      // The provider acting on it counts as their first response.
      const { rows } = await client.query(
        `UPDATE rental_inquiries SET status=$1, updated_at=NOW(),
           closed_at=CASE WHEN $1 IN ('closed','cancelled') THEN NOW() ELSE NULL END,
           first_response_at=CASE WHEN $3 THEN COALESCE(first_response_at, NOW()) ELSE first_response_at END
         WHERE id=$2 RETURNING *`,
        [status, req.params.id, isProvider]
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
  // The renter's "today" is Kigali's, the same day the calendar shows.
  const today = kigaliToday();
  if (Number.isNaN(parsedStart.getTime()) || parsedStart.toISOString().slice(0, 10) !== startDate || startDate < today) {
    return res.status(400).json({ error: 'start_date must be a valid date that is today or later' });
  }
  if (!Number.isInteger(days) || days < 1 || days > 365) return res.status(400).json({ error: 'days is required and must be between 1 and 365' });
  if (!['in_app', 'phone', 'whatsapp'].includes(preferredChannel)) return res.status(400).json({ error: 'Invalid preferred channel' });
  // The message now opens a chat thread, so it passes the same screening as
  // any chat message (lib/moderation.js).
  if (message) {
    const screened = screenUserText(message, 1500);
    if (!screened.ok) return res.status(400).json({ error: screened.error, code: screened.code });
  }
  try {
    const inquiry = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT rc.*, ${PROVIDER_COLUMNS},
                buyer.marketplace_terms_accepted_at,
                buyer.marketplace_terms_version
         FROM rental_cars rc
         JOIN users u ON u.id = rc.provider_id
         ${RENTAL_EVIDENCE}
         ${ACTIVE_RENTAL_SUBSCRIPTION}
         JOIN users buyer ON buyer.id = $2
         WHERE rc.id = $1 AND rc.status = 'active'
           AND u.role = 'seller' AND u.id_verified = 'approved'
           AND u.business_verified = TRUE AND u.account_status = 'active'
           AND u.deleted_at IS NULL
           AND ${RENTAL_EVIDENCE_OK}
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

      const shared = {
        provider_name: car.provider_name,
        provider_business_name: car.provider_business_name,
        provider_contact_available: available,
        contact: preferredChannel === 'phone' ? car.provider_phone
          : preferredChannel === 'whatsapp' ? car.provider_whatsapp : null,
      };

      // The same request sent twice (a double tap, a retry after a dropped
      // connection) is answered with the inquiry it already made, and the
      // provider is notified once. Race-free because the car row is locked
      // FOR UPDATE above, so a second request waits for this one to commit.
      const existing = await client.query(
        `SELECT * FROM rental_inquiries
          WHERE rental_car_id = $1 AND renter_id = $2 AND start_date = $3 AND days = $4
            AND status = 'new' AND created_at > NOW() - INTERVAL '24 hours'
          ORDER BY created_at DESC LIMIT 1`,
        [car.id, req.user.id, startDate, days]
      );
      if (existing.rows.length) return { ...existing.rows[0], ...shared, car, duplicate: true };

      // The renter's number goes to the provider only with the renter's say-so:
      // asking to be called or messaged on WhatsApp is consent; choosing
      // in-app is not, unless they also tick "share my number".
      const sharesContact = preferredChannel !== 'in_app' || req.body.share_contact === true;
      const lastDay = calendar.addDays(startDate, days - 1);
      const busy = await client.query(
        `SELECT to_char(starts_on, 'YYYY-MM-DD') AS from_day, to_char(ends_on, 'YYYY-MM-DD') AS to_day
           FROM rental_busy_periods
          WHERE rental_car_id = $1 AND starts_on <= $3::date AND ends_on >= $2::date`,
        [car.id, startDate, lastDay]
      );
      const busyOverlap = calendar.overlap(busy.rows.map((r) => ({ from: r.from_day, to: r.to_day })), startDate, lastDay);

      const ref = 'RI-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const inserted = await client.query(
        `INSERT INTO rental_inquiries
           (inquiry_ref, rental_car_id, renter_id, provider_id, start_date, days,
            pickup_location, message, preferred_channel, renter_shares_contact)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [ref, car.id, req.user.id, car.provider_id, startDate, days, pickupLocation, message, preferredChannel, sharesContact]
      );

      // The request opens (or continues) the renter-provider conversation, so
      // both sides can talk inside Sawa and the provider's reply is visible
      // and timed. Same find-or-create as messages.js: one thread per pair,
      // its pinned card now pointing at this rental car.
      let thread = null;
      const blocked = await client.query(
        `SELECT 1 FROM blocked_users
          WHERE (user_id = $1 AND blocked_id = $2) OR (user_id = $2 AND blocked_id = $1) LIMIT 1`,
        [req.user.id, car.provider_id]
      );
      if (car.provider_id && !blocked.rowCount) {
        const conv = await client.query(
          `INSERT INTO conversations (car_id, rental_car_id, buyer_id, seller_id)
           VALUES (NULL, $1, $2, $3)
           ON CONFLICT (buyer_id, seller_id)
           DO UPDATE SET car_id = NULL, rental_car_id = EXCLUDED.rental_car_id
           RETURNING *`,
          [car.id, req.user.id, car.provider_id]
        );
        const text = [
          `Availability request ${ref}: ${car.title}, ${days} day${days === 1 ? '' : 's'} from ${startDate}`
            + (pickupLocation ? `, pickup ${pickupLocation}` : '') + '.',
          message,
        ].filter(Boolean).join('\n\n');
        const msg = await client.query(
          'INSERT INTO messages (conversation_id, sender_id, text) VALUES ($1, $2, $3) RETURNING *',
          [conv.rows[0].id, req.user.id, text]
        );
        await client.query(
          'UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2',
          [text.slice(0, 500), conv.rows[0].id]
        );
        await client.query('UPDATE rental_inquiries SET conversation_id = $1 WHERE id = $2', [conv.rows[0].id, inserted.rows[0].id]);
        thread = { conversation: conv.rows[0], message: msg.rows[0] };
      }

      if (car.provider_id) {
        const overlapNote = busyOverlap.length
          ? ` They asked for dates you marked taken (${busyOverlap.map((r) => (r.from === r.to ? r.from : `${r.from} to ${r.to}`)).join(', ')}).`
          : '';
        await notifyUser(client, {
          user_id: car.provider_id,
          type: 'listing_update',
          title: 'New rental inquiry',
          body: `${car.title} has a new availability request (${ref}).${overlapNote} Reply in Messages or contact the renter directly to agree terms.`,
          meta: JSON.stringify({
            inquiryId: inserted.rows[0].id, rentalCarId: car.id,
            ...(thread ? { conversationId: thread.conversation.id } : {}),
          }),
        });
      }
      return { ...inserted.rows[0], conversation_id: thread?.conversation.id || null, ...shared, car, thread, busy_overlap: busyOverlap };
    });

    // Live delivery after commit, as messages.js does for a first message.
    const io = req.app.get('io');
    if (io && inquiry.thread) {
      const { conversation, message: msg } = inquiry.thread;
      io.to(`user:${conversation.buyer_id}`).to(`user:${conversation.seller_id}`)
        .emit('new_message', { ...msg, sender_name: req.user.name || req.user.email });
    }
    const { car: inquiredCar, thread: _thread, ...payload } = inquiry;
    // A WhatsApp message the renter can send as is: their own words go from
    // their own WhatsApp to the provider's, with the reference both can quote.
    const whatsappText = payload.contact && preferredChannel === 'whatsapp'
      ? `Hello${inquiredCar.provider_business_name || inquiredCar.provider_name ? ` ${inquiredCar.provider_business_name || inquiredCar.provider_name}` : ''}, `
        + `I found your ${inquiredCar.title} on Sawa Cars (request ${payload.inquiry_ref}). `
        + `Is it free for ${payload.days} day${payload.days === 1 ? '' : 's'} from ${isoDay(payload.start_date)}?`
      : null;
    res.status(inquiry.duplicate ? 200 : 201).json({
      ...payload,
      whatsapp_text: whatsappText,
      busy_overlap: payload.busy_overlap || [],
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

// ─────────────────────────────────────────────────────────────────────────────
// Provider self-serve — a verified rental provider managing their OWN fleet,
// without waiting on an admin for every rate change or new vehicle.
//
// Publication itself stays admin-only: POST /propose can only ever produce a
// 'pending_review' row (see migration 0037), exactly as invisible to the three
// public predicates as 'maintenance' already is, and only PATCH /:id
// (requireAdmin, below) can move it further. Nothing here can put a car in
// front of a renter without an admin having acted on it.
// ─────────────────────────────────────────────────────────────────────────────

// GET /rentals/mine — the caller's own fleet, in the same enriched shape as
// the admin fleet view (subscription status included, unfiltered by status —
// an owner needs to see a lapsed or pending car, not just the live ones).
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rc.*, ${PROVIDER_COLUMNS}, ${CHECK_COLUMNS},
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
       ${RENTAL_EVIDENCE}
       WHERE rc.provider_id = $1
       ORDER BY rc.created_at DESC`,
      [req.user.id]
    );
    res.json(await attachAvailability(pool, rows.map((row) => ({
      ...publicRental(row, true, { forOwner: true }),
      subscription_status: row.subscription_status,
      subscription_ends_on: row.subscription_ends_on,
      subscription_amount_rwf: row.subscription_amount_rwf,
    })), { withPeriods: true, forOwner: true }));
  } catch (err) {
    log.error('rentals mine error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /rentals/mine/eligible-inspections — the caller's own inspections that
// could back a NEW rental car: complete, passing, and not already claimed by a
// live (non-retired) rental_cars row. Mirrors the legacy-inspection half of RENTAL_EVIDENCE_OK's
// conditions for the picker; inspectionEvidenceForProvider is the authority
// that actually decides it, re-checked in POST /propose.
router.get('/mine/eligible-inspections', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.score, i.completed_at, s.make, s.model, s.year, s.purpose
         FROM inspections i
         JOIN submissions s ON s.id = i.submission_id
        WHERE s.seller_id = $1
          AND i.status = 'complete'
          AND i.checklist_version = $2
          AND i.passed = TRUE
          AND i.score >= $3
          AND jsonb_array_length(COALESCE(i.critical_failures, '[]'::jsonb)) = 0
          AND NOT EXISTS (
            SELECT 1 FROM rental_cars rc
             WHERE rc.inspection_id = i.id AND rc.retired_at IS NULL
          )
        ORDER BY i.completed_at DESC
        LIMIT 50`,
      [req.user.id, CHECKLIST_VERSION, PUBLISH_THRESHOLD]
    );
    res.json(rows);
  } catch (err) {
    log.error('rentals eligible-inspections error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rentals/propose — a verified rental provider adds a car to their own
// fleet. provider_id is always the caller (never trusted from the body), and
// the row can only start 'pending_review'.
//
// The evidence is a Sawa Rental Check, which this request asks for: staff go
// to the provider and record it (POST /:id/checks). A provider who already has
// a passing 150-point inspection of the same car may still attach it, and that
// stands in until the first Rental Check is recorded.
router.post('/propose', requireAuth, async (req, res) => {
  const { title, make, model, year, category, seats, fuel,
          transmission, mileage, daily_rate, weekly_rate, deposit, min_days,
          inspection_id, location, images } = req.body;
  if (!title || !make || !model || !year || !daily_rate) {
    return res.status(400).json({ error: 'title, make, model, year and daily_rate are required' });
  }
  if (!Number.isFinite(Number(daily_rate)) || Number(daily_rate) <= 0) return res.status(400).json({ error: 'daily_rate must be a positive number' });
  // Photos may come later, uploaded from the fleet (POST /:id/mine/photos):
  // a provider adding a car from a phone has no image links to paste. The car
  // cannot be activated without one (PATCH /:id checks the gallery).
  const gallery = images === undefined || images === null ? [] : images;
  const galleryError = rentalGalleryError(gallery, false);
  if (galleryError) return res.status(400).json({ error: galleryError });
  try {
    const created = await withTransaction(async (client) => {
      if (!await verifiedRentalProvider(client, req.user.id)) {
        const error = new Error('Only an active, identity- and business-verified seller can propose a rental vehicle');
        error.status = 403;
        throw error;
      }
      const evidence = inspection_id ? await inspectionEvidenceForProvider(client, inspection_id, req.user.id) : null;
      if (inspection_id && !evidence) {
        const error = new Error('Choose one of your own complete, passing 150-point inspections, or leave it out and request a Rental Check');
        error.status = 409;
        throw error;
      }
      if (evidence && !inspectionMatchesVehicle(evidence, { make, model, year })) {
        const error = new Error('The selected inspection belongs to a different make, model, or model year');
        error.status = 409;
        throw error;
      }
      const { rows } = await client.query(
        `INSERT INTO rental_cars
           (provider_id,title,make,model,year,category,seats,fuel,transmission,mileage,
            daily_rate,weekly_rate,deposit,min_days,inspection_id,inspected,inspection_score,location,images,status,
            check_requested_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'pending_review',$20)
         RETURNING *`,
        [req.user.id, String(title).trim(), make, model, year, category, seats || 5, fuel,
         transmission, mileage, daily_rate, weekly_rate || Number(daily_rate) * 6,
         deposit || 0, min_days || 1, evidence ? inspection_id : null, Boolean(evidence),
         evidence ? Number(evidence.score) : null, location,
         gallery.map((url) => url.trim()), evidence ? null : new Date()]
      );
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'rental_car.proposed', targetType: 'rental_car', targetId: rows[0].id,
        summary: `${rows[0].title} proposed for rental review`, metadata: {
          daily_rate: rows[0].daily_rate,
          inspection_id: evidence ? inspection_id : null,
          inspection_score: evidence ? Number(evidence.score) : null,
          rental_check_requested: !evidence,
        },
      });
      return rows[0];
    });
    res.status(201).json({
      ...created,
      message: created.check_requested_at
        ? 'Added. Sawa will contact you to arrange the 10-point Rental Check; the car is listed once it passes and the listing fee is recorded.'
        : 'Sent for review. An admin checks the inspection and your verification before this appears in the catalogue.',
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === '23505') return res.status(409).json({ error: 'That inspection is already linked to another rental vehicle that is still in the fleet. Retire that vehicle first and the inspection becomes available again.', code: 'INSPECTION_IN_USE' });
    log.error('rental propose error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /rentals/:id/mine — the owning provider edits their own car's
// commercial terms and availability. Deliberately excludes status,
// provider_id, inspection_id and vehicle identity (make/model/year): those stay
// admin-only, the same way a seller cannot re-point their own listing at a
// different inspection (see P15, vehicle-identity lock on the sale side).
const PROVIDER_EDITABLE = ['title', 'category', 'seats', 'fuel', 'transmission',
  'mileage', 'daily_rate', 'weekly_rate', 'deposit', 'min_days', 'location',
  'images', 'unavailable_until'];

router.patch('/:id/mine', requireAuth, requireUuid('id'), async (req, res) => {
  const fields = PROVIDER_EDITABLE.filter((field) => req.body[field] !== undefined);
  if (!fields.length) return res.status(400).json({ error: 'No editable fields provided' });
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
  let unavailableUntil;
  if (req.body.unavailable_until !== undefined) {
    const raw = req.body.unavailable_until;
    if (raw === null || raw === '') {
      unavailableUntil = null;
    } else if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(new Date(`${raw}T00:00:00.000Z`).getTime())) {
      unavailableUntil = raw;
    } else {
      return res.status(400).json({ error: 'unavailable_until must be a YYYY-MM-DD date, or empty to clear it' });
    }
  }
  try {
    const updated = await withTransaction(async (client) => {
      const current = await client.query('SELECT * FROM rental_cars WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!current.rowCount) { const error = new Error('Rental car not found'); error.status = 404; throw error; }
      if (current.rows[0].provider_id !== req.user.id) { const error = new Error('Forbidden'); error.status = 403; throw error; }
      // A live car keeps at least one photo: removing the last one would leave
      // a listing on the public feed with nothing to show.
      if (req.body.images !== undefined && current.rows[0].status === 'active' && !req.body.images.length) {
        const error = new Error('A live car needs at least one photo. Add a new one before removing the last.');
        error.status = 409; throw error;
      }
      const normalized = { ...req.body };
      if (normalized.title !== undefined) normalized.title = String(normalized.title).trim();
      if (normalized.images !== undefined) normalized.images = normalized.images.map((url) => url.trim());
      const params = fields.map((field) => (field === 'unavailable_until' ? unavailableUntil : normalized[field]));
      const assignments = fields.map((field, index) => `${field}=$${index + 1}`);
      params.push(req.params.id);
      const { rows } = await client.query(
        `UPDATE rental_cars SET ${assignments.join(', ')} WHERE id=$${params.length} RETURNING *`, params
      );

      // Older app and web builds still send the single "unavailable until"
      // date. It becomes calendar periods: a date means out from today until
      // the day before it; empty means back now. Applied only when it says
      // something different from the calendar, so re-saving the rates form
      // with the value it was given changes nothing and does not refresh the
      // calendar's "updated" stamp.
      if (fields.includes('unavailable_until')) {
        const today = kigaliToday();
        const periods = await readPeriods(client, req.params.id, today);
        const { back_on: backOn } = calendar.availabilitySummary({
          ranges: periods.map((p) => ({ from: p.starts_on, to: p.ends_on })), today,
        });
        if ((unavailableUntil || null) !== (backOn || null)) {
          const yesterday = calendar.addDays(today, -1);
          for (const period of periods.filter((p) => p.starts_on <= today && p.ends_on >= today)) {
            if (period.starts_on < today) {
              await client.query('UPDATE rental_busy_periods SET ends_on = $1::date WHERE id = $2', [yesterday, period.id]);
            } else {
              await client.query('DELETE FROM rental_busy_periods WHERE id = $1', [period.id]);
            }
          }
          if (unavailableUntil && calendar.addDays(unavailableUntil, -1) >= today
              && !calendar.validatePeriod(today, calendar.addDays(unavailableUntil, -1), today)) {
            await markTaken(client, rows[0], today, calendar.addDays(unavailableUntil, -1), req.user.id);
          }
          await touchCalendar(client, req.params.id);
        }
      }
      return rows[0];
    });
    res.json(publicRental(updated, true));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('rental mine update error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rentals/:id/mine/photos — multipart, field `photos`. The provider adds
// listing photos to their own car from a phone. Same pipeline as submission
// reference photos: bytes checked, compressed, metadata (GPS) stripped.
const RENTAL_PHOTOS_PER_REQUEST = 6;

async function rentalPhotoTarget(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT provider_id, status, COALESCE(array_length(images, 1), 0) AS stored FROM rental_cars WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Rental car not found' });
    if (rows[0].provider_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (rows[0].status === 'retired') return res.status(409).json({ error: 'This car is retired' });
    if (Number(rows[0].stored) >= MAX_RENTAL_PHOTOS) {
      return res.status(409).json({ error: `A rental listing may contain at most ${MAX_RENTAL_PHOTOS} images` });
    }
    next();
  } catch (err) {
    log.error('rental photo lookup error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
}

router.post(
  '/:id/mine/photos',
  requireAuth,
  requireUuid('id'),
  rentalPhotoTarget,
  uploadPhotos.array('photos', RENTAL_PHOTOS_PER_REQUEST),
  verifyImageContent,
  compressUploads,
  stripUploadMetadata,
  async (req, res) => {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'Add at least one photo' });
    try {
      const urls = [];
      for (const file of files) urls.push(await resolveUploadUrl(req, file));
      // The cap is enforced in the statement that appends, so two uploads at
      // once cannot both pass the check above and overshoot it.
      const { rows } = await pool.query(
        `UPDATE rental_cars SET images = COALESCE(images, '{}') || $3::text[]
          WHERE id = $1 AND provider_id = $2
            AND COALESCE(array_length(images, 1), 0) + cardinality($3::text[]) <= $4
          RETURNING *`,
        [req.params.id, req.user.id, urls, MAX_RENTAL_PHOTOS]
      );
      if (!rows.length) {
        files.forEach((file) => { if (file.path) fs.unlink(file.path, () => {}); });
        return res.status(409).json({ error: `A rental listing may contain at most ${MAX_RENTAL_PHOTOS} images` });
      }
      res.status(201).json(publicRental(rows[0], true));
    } catch (err) {
      log.error('rental photo upload error', { error: err.message });
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /rentals/:id/photos — multipart, field `photos`. The team adds listing
// photos to any provider's car from the fleet form, through the same pipeline
// as the provider's own upload: bytes checked, compressed, GPS stripped.
async function adminRentalPhotoTarget(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT status, COALESCE(array_length(images, 1), 0) AS stored FROM rental_cars WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Rental car not found' });
    if (rows[0].status === 'retired') return res.status(409).json({ error: 'This car is retired' });
    if (Number(rows[0].stored) >= MAX_RENTAL_PHOTOS) {
      return res.status(409).json({ error: `A rental listing may contain at most ${MAX_RENTAL_PHOTOS} images` });
    }
    next();
  } catch (err) {
    log.error('admin rental photo lookup error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
}

router.post(
  '/:id/photos',
  requireAdmin,
  requireUuid('id'),
  adminRentalPhotoTarget,
  uploadPhotos.array('photos', RENTAL_PHOTOS_PER_REQUEST),
  verifyImageContent,
  compressUploads,
  stripUploadMetadata,
  async (req, res) => {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'Add at least one photo' });
    try {
      const urls = [];
      for (const file of files) urls.push(await resolveUploadUrl(req, file));
      const { rows } = await pool.query(
        `UPDATE rental_cars SET images = COALESCE(images, '{}') || $2::text[]
          WHERE id = $1 AND status <> 'retired'
            AND COALESCE(array_length(images, 1), 0) + cardinality($2::text[]) <= $3
          RETURNING *`,
        [req.params.id, urls, MAX_RENTAL_PHOTOS]
      );
      if (!rows.length) {
        files.forEach((file) => { if (file.path) fs.unlink(file.path, () => {}); });
        return res.status(409).json({ error: `A rental listing may contain at most ${MAX_RENTAL_PHOTOS} images` });
      }
      await recordAdminAction(pool, {
        actorId: req.user.id, action: 'rental_car.photos_added', targetType: 'rental_car', targetId: req.params.id,
        summary: `${urls.length} photo${urls.length === 1 ? '' : 's'} added to ${rows[0].title}`,
        metadata: { count: urls.length },
      });
      res.status(201).json(rows[0]);
    } catch (err) {
      log.error('admin rental photo upload error', { error: err.message });
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// The provider's calendar: which days a car is out (lib/rental-calendar.js,
// migration 0061). Owner-only writes; staff and renters only ever read the
// merged result. An inquiry never writes here — "Rented out for these dates"
// on an inquiry is the provider writing, pre-filled from it.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_OPEN_PERIODS = 60;
const PRUNE_AFTER_DAYS = 90;

async function ownCarForUpdate(client, carId, userId) {
  const { rows } = await client.query('SELECT * FROM rental_cars WHERE id = $1 FOR UPDATE', [carId]);
  if (!rows.length) { const e = new Error('Rental car not found'); e.status = 404; throw e; }
  if (rows[0].provider_id !== userId) { const e = new Error('Forbidden'); e.status = 403; throw e; }
  if (rows[0].status === 'retired') { const e = new Error('This car is retired'); e.status = 409; throw e; }
  return rows[0];
}

async function readPeriods(db, carId, today) {
  const { rows } = await db.query(
    `SELECT id, to_char(starts_on, 'YYYY-MM-DD') AS starts_on, to_char(ends_on, 'YYYY-MM-DD') AS ends_on
       FROM rental_busy_periods
      WHERE rental_car_id = $1 AND ends_on >= $2::date
      ORDER BY starts_on`,
    [carId, today]
  );
  return rows;
}

/** Marks [startsOn, endsOn] taken, joined with any period it overlaps or
 *  touches, so the provider's list never shows the same day twice. Caller
 *  holds the car row lock, which serialises every calendar write. */
async function markTaken(client, car, startsOn, endsOn, userId) {
  const touching = await client.query(
    `SELECT id, to_char(starts_on, 'YYYY-MM-DD') AS s, to_char(ends_on, 'YYYY-MM-DD') AS e
       FROM rental_busy_periods
      WHERE rental_car_id = $1 AND starts_on <= ($3::date + 1) AND ends_on >= ($2::date - 1)`,
    [car.id, startsOn, endsOn]
  );
  let from = startsOn;
  let to = endsOn;
  for (const row of touching.rows) {
    if (row.s < from) from = row.s;
    if (row.e > to) to = row.e;
  }
  if (touching.rows.length) {
    await client.query('DELETE FROM rental_busy_periods WHERE id = ANY($1::uuid[])', [touching.rows.map((r) => r.id)]);
  }
  const count = await client.query(
    'SELECT COUNT(*)::int AS n FROM rental_busy_periods WHERE rental_car_id = $1 AND ends_on >= $2::date',
    [car.id, kigaliToday()]
  );
  if (count.rows[0].n >= MAX_OPEN_PERIODS) {
    const e = new Error(`A car can have at most ${MAX_OPEN_PERIODS} upcoming taken periods`); e.status = 409; e.code = 'BUSY_LIMIT'; throw e;
  }
  const { rows } = await client.query(
    `INSERT INTO rental_busy_periods (rental_car_id, starts_on, ends_on, created_by)
     VALUES ($1, $2::date, $3::date, $4)
     RETURNING id, to_char(starts_on, 'YYYY-MM-DD') AS starts_on, to_char(ends_on, 'YYYY-MM-DD') AS ends_on`,
    [car.id, from, to, userId]
  );
  return rows[0];
}

async function touchCalendar(client, carId) {
  await client.query(
    `DELETE FROM rental_busy_periods
      WHERE rental_car_id = $1 AND ends_on < ($2::date - ${PRUNE_AFTER_DAYS})`,
    [carId, kigaliToday()]
  );
  await client.query('UPDATE rental_cars SET calendar_updated_at = NOW() WHERE id = $1', [carId]);
}

async function calendarPayload(db, carId) {
  const today = kigaliToday();
  const car = await db.query('SELECT calendar_updated_at FROM rental_cars WHERE id = $1', [carId]);
  const periods = await readPeriods(db, carId, today);
  const updatedAt = car.rows[0]?.calendar_updated_at || null;
  return {
    today,
    periods,
    calendar_updated_at: updatedAt,
    availability: calendar.availabilitySummary({
      ranges: periods.map((p) => ({ from: p.starts_on, to: p.ends_on })), today, updatedAt, withPeriods: true,
    }),
  };
}

function calendarError(res, err, label) {
  if (err.status) return res.status(err.status).json({ error: err.message, code: err.code || undefined });
  log.error(label, { error: err.message });
  return res.status(500).json({ error: 'Server error' });
}

// GET /rentals/:id/mine/busy — the owner's calendar.
router.get('/:id/mine/busy', requireAuth, requireUuid('id'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT provider_id FROM rental_cars WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Rental car not found' });
    if (rows[0].provider_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    res.json(await calendarPayload(pool, req.params.id));
  } catch (err) {
    calendarError(res, err, 'rental calendar read error');
  }
});

// POST /rentals/:id/mine/busy {starts_on, ends_on} — mark days taken.
router.post('/:id/mine/busy', requireAuth, requireUuid('id'), async (req, res) => {
  const startsOn = String(req.body?.starts_on || '');
  const endsOn = String(req.body?.ends_on || startsOn);
  const invalid = calendar.validatePeriod(startsOn, endsOn, kigaliToday());
  if (invalid) return res.status(400).json({ error: invalid });
  try {
    const period = await withTransaction(async (client) => {
      const car = await ownCarForUpdate(client, req.params.id, req.user.id);
      const created = await markTaken(client, car, startsOn, endsOn, req.user.id);
      await touchCalendar(client, car.id);
      return created;
    });
    res.status(201).json({ period, ...(await calendarPayload(pool, req.params.id)) });
  } catch (err) {
    calendarError(res, err, 'rental calendar write error');
  }
});

// PATCH /rentals/:id/mine/busy/:busyId {starts_on?, ends_on?} — change dates,
// e.g. "back early" sends ends_on = yesterday. A period that no longer has a
// day left is removed.
router.patch('/:id/mine/busy/:busyId', requireAuth, requireUuid('id'), requireUuid('busyId'), async (req, res) => {
  try {
    await withTransaction(async (client) => {
      const car = await ownCarForUpdate(client, req.params.id, req.user.id);
      const { rows } = await client.query(
        `SELECT id, to_char(starts_on, 'YYYY-MM-DD') AS s, to_char(ends_on, 'YYYY-MM-DD') AS e
           FROM rental_busy_periods WHERE id = $1 AND rental_car_id = $2`,
        [req.params.busyId, car.id]
      );
      if (!rows.length) { const e = new Error('Period not found'); e.status = 404; throw e; }
      const startsOn = req.body?.starts_on !== undefined ? String(req.body.starts_on) : rows[0].s;
      const endsOn = req.body?.ends_on !== undefined ? String(req.body.ends_on) : rows[0].e;
      if (!calendar.isIsoDay(startsOn) || !calendar.isIsoDay(endsOn)) {
        const e = new Error('Give the dates as YYYY-MM-DD'); e.status = 400; throw e;
      }
      const today = kigaliToday();
      const nothingLeft = endsOn < startsOn || endsOn < today;
      if (!nothingLeft) {
        const invalid = calendar.validatePeriod(startsOn, endsOn, today);
        if (invalid) { const e = new Error(invalid); e.status = 400; throw e; }
      }
      await client.query('DELETE FROM rental_busy_periods WHERE id = $1', [rows[0].id]);
      if (!nothingLeft) await markTaken(client, car, startsOn, endsOn, req.user.id);
      await touchCalendar(client, car.id);
    });
    res.json(await calendarPayload(pool, req.params.id));
  } catch (err) {
    calendarError(res, err, 'rental calendar update error');
  }
});

// DELETE /rentals/:id/mine/busy/:busyId — free those days again.
router.delete('/:id/mine/busy/:busyId', requireAuth, requireUuid('id'), requireUuid('busyId'), async (req, res) => {
  try {
    await withTransaction(async (client) => {
      const car = await ownCarForUpdate(client, req.params.id, req.user.id);
      const { rowCount } = await client.query(
        'DELETE FROM rental_busy_periods WHERE id = $1 AND rental_car_id = $2', [req.params.busyId, car.id]
      );
      if (!rowCount) { const e = new Error('Period not found'); e.status = 404; throw e; }
      await touchCalendar(client, car.id);
    });
    res.json(await calendarPayload(pool, req.params.id));
  } catch (err) {
    calendarError(res, err, 'rental calendar delete error');
  }
});

// POST /rentals/:id/mine/calendar/confirm — "My calendar is up to date". Only
// refreshes the stamp renters see; nothing else changes.
router.post('/:id/mine/calendar/confirm', requireAuth, requireUuid('id'), async (req, res) => {
  try {
    await withTransaction(async (client) => {
      const car = await ownCarForUpdate(client, req.params.id, req.user.id);
      await touchCalendar(client, car.id);
    });
    res.json(await calendarPayload(pool, req.params.id));
  } catch (err) {
    calendarError(res, err, 'rental calendar confirm error');
  }
});

// POST /rentals/inquiries/:id/rented-out {starts_on?, ends_on?} — the provider
// agreed this request with the renter (off Sawa) and marks the days taken.
// Pre-filled from the inquiry; closes it. The period stores no link to the
// inquiry or the renter: Sawa records that the car is out, not a deal.
router.post('/inquiries/:id/rented-out', requireAuth, requireUuid('id'), async (req, res) => {
  try {
    const result = await withTransaction(async (client) => {
      const found = await client.query('SELECT * FROM rental_inquiries WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (!found.rows.length) { const e = new Error('Inquiry not found'); e.status = 404; throw e; }
      const inquiry = found.rows[0];
      if (inquiry.provider_id !== req.user.id) { const e = new Error('Forbidden'); e.status = 403; throw e; }
      if (inquiry.status === 'cancelled') {
        const e = new Error('The renter cancelled this request. Use Mark taken on the car instead.'); e.status = 409; throw e;
      }
      const startDefault = isoDay(inquiry.start_date);
      const startsOn = req.body?.starts_on ? String(req.body.starts_on) : startDefault;
      const endsOn = req.body?.ends_on ? String(req.body.ends_on)
        : (startDefault ? calendar.addDays(startDefault, Math.max(1, inquiry.days || 1) - 1) : null);
      const invalid = calendar.validatePeriod(startsOn, endsOn, kigaliToday());
      if (invalid) { const e = new Error(invalid); e.status = 400; throw e; }
      const car = await ownCarForUpdate(client, inquiry.rental_car_id, req.user.id);
      const period = await markTaken(client, car, startsOn, endsOn, req.user.id);
      await touchCalendar(client, car.id);
      await client.query(
        `UPDATE rental_inquiries SET status = 'closed', closed_at = NOW(), updated_at = NOW(),
                first_response_at = COALESCE(first_response_at, NOW())
          WHERE id = $1`,
        [inquiry.id]
      );
      return { period, carId: car.id };
    });
    res.status(201).json({ period: result.period, ...(await calendarPayload(pool, result.carId)) });
  } catch (err) {
    calendarError(res, err, 'rental rented-out error');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// The Sawa Rental Check (lib/rental-check-policy.js, migration 0060).
//
// Staff record it at the provider's yard; the provider asks for one from their
// fleet. Recording a check never changes the car's status: the public reads
// decide visibility from the latest check by predicate, so a failed re-check
// takes a live car down at once and a passed one brings it back, with no
// status for anyone to forget to flip.
// ─────────────────────────────────────────────────────────────────────────────

// GET /rentals/check-definition — the ten points, for the staff form and for
// clients that explain the check to renters. Public: it is the standard.
router.get('/check-definition', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(rentalCheckDefinition());
});

async function ownedOrAdmin(db, carId, user) {
  const { rows } = await db.query('SELECT id, provider_id, title, status, check_requested_at FROM rental_cars WHERE id = $1', [carId]);
  if (!rows.length) { const e = new Error('Rental car not found'); e.status = 404; throw e; }
  if (user.role !== 'admin' && rows[0].provider_id !== user.id) { const e = new Error('Forbidden'); e.status = 403; throw e; }
  return rows[0];
}

// GET /rentals/:id/checks — the car's check history, newest first, for its
// provider and for staff.
router.get('/:id/checks', requireAuth, requireUuid('id'), async (req, res) => {
  try {
    await ownedOrAdmin(pool, req.params.id, req.user);
    const { rows } = await pool.query(
      `SELECT rck.id, rck.checklist_version, rck.results, rck.passed, rck.passed_count,
              rck.insurance_expires_on, rck.technical_control_expires_on, rck.odometer_km,
              rck.notes, rck.checked_at, rck.voided_at, rck.void_reason,
              u.name AS checked_by_name
         FROM rental_checks rck
         LEFT JOIN users u ON u.id = rck.checked_by
        WHERE rck.rental_car_id = $1
        ORDER BY rck.checked_at DESC`,
      [req.params.id]
    );
    res.json(rows.map((row) => ({
      ...row,
      insurance_expires_on: isoDay(row.insurance_expires_on),
      technical_control_expires_on: isoDay(row.technical_control_expires_on),
      // Staff notes are internal working notes, not for the provider.
      notes: req.user.role === 'admin' ? row.notes : undefined,
    })));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('rental checks read error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rentals/:id/checks — staff record a check.
router.post('/:id/checks', requireAdmin, requireUuid('id'), async (req, res) => {
  const evaluated = evaluateRentalCheck(req.body || {}, kigaliToday());
  if (evaluated.errors.length) {
    return res.status(400).json({ error: evaluated.errors[0], errors: evaluated.errors });
  }
  const notes = String(req.body?.notes || '').trim().slice(0, 1000) || null;
  try {
    const result = await withTransaction(async (client) => {
      const car = await client.query('SELECT * FROM rental_cars WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (!car.rowCount) { const e = new Error('Rental car not found'); e.status = 404; throw e; }
      const before = car.rows[0];
      if (before.status === 'retired') { const e = new Error('This car is retired'); e.status = 409; throw e; }
      const { rows } = await client.query(
        `INSERT INTO rental_checks
           (rental_car_id, checklist_version, results, passed, passed_count,
            insurance_expires_on, technical_control_expires_on, odometer_km, notes, checked_by)
         VALUES ($1,$2,$3,$4,$5,$6::date,$7::date,$8,$9,$10) RETURNING *`,
        [before.id, evaluated.version, JSON.stringify(evaluated.results), evaluated.passed,
         evaluated.passed_count, evaluated.insurance_expires_on, evaluated.technical_control_expires_on,
         evaluated.odometer_km, notes, req.user.id]
      );
      // The odometer reading is the one Sawa saw; the request is answered.
      // `inspected` stays the legacy 150-point flag: a voided check must fall
      // back to it, so a check never overwrites it.
      await client.query(
        'UPDATE rental_cars SET check_requested_at = NULL, mileage = $1 WHERE id = $2',
        [evaluated.odometer_km, before.id]
      );
      await recordAdminAction(client, {
        actorId: req.user.id, action: evaluated.passed ? 'rental_check.passed' : 'rental_check.failed',
        targetType: 'rental_car', targetId: before.id,
        summary: `${before.title}: Rental Check ${evaluated.passed ? 'passed' : 'failed'} (${evaluated.passed_count}/${RENTAL_CHECK_ITEMS.length})`,
        metadata: {
          check_id: rows[0].id,
          failed: evaluated.failed_blocking.map((f) => f.id),
          insurance_expires_on: evaluated.insurance_expires_on,
          technical_control_expires_on: evaluated.technical_control_expires_on,
        },
      });
      const live = await client.query(
        `SELECT 1 FROM rental_subscriptions
          WHERE rental_car_id = $1 AND voided_at IS NULL
            AND starts_on <= CURRENT_DATE AND ends_on >= CURRENT_DATE`,
        [before.id]
      );
      if (before.provider_id) {
        await notifyUser(client, evaluated.passed ? {
          user_id: before.provider_id,
          type: 'listing_update',
          title: 'Rental Check passed',
          body: `${before.title} passed Sawa's Rental Check (${evaluated.passed_count}/${RENTAL_CHECK_ITEMS.length}).`
            + (before.status === 'active' && live.rowCount ? ' It is listed for renters.' : ' Sawa will confirm when it is listed.'),
          meta: JSON.stringify({ rentalCarId: before.id }),
        } : {
          user_id: before.provider_id,
          type: 'listing_update',
          title: 'Rental Check: needs fixing',
          body: `${before.title} did not pass: ${evaluated.failed_blocking.map((f) => f.label).join('; ')}. Fix it and ask for a re-check from your fleet.`,
          meta: JSON.stringify({ rentalCarId: before.id }),
        });
      }
      return { check: rows[0], status: before.status, subscribed: live.rowCount > 0 };
    });
    const warnings = [];
    if (evaluated.passed && result.status !== 'active') warnings.push(`Passed, but the car is ${result.status}: set it to Active to list it.`);
    if (evaluated.passed && !result.subscribed) warnings.push('Passed, but no listing subscription covers today: record one to list it.');
    res.status(201).json({
      ...result.check,
      insurance_expires_on: evaluated.insurance_expires_on,
      technical_control_expires_on: evaluated.technical_control_expires_on,
      failed_blocking: evaluated.failed_blocking,
      listed: evaluated.passed && result.status === 'active' && result.subscribed,
      warnings,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('rental check create error', { error: err.message });
    res.status(500).json({ error: 'Could not record the check' });
  }
});

// POST /rentals/checks/:checkId/void — undo a check recorded by mistake.
// Void, never delete, with a reason, like subscriptions. The previous check
// (or the legacy inspection, if none is left) decides again at once.
router.post('/checks/:checkId/void', requireAdmin, requireUuid('checkId'), async (req, res) => {
  const reason = String(req.body?.reason || '').trim();
  if (reason.length < 4) return res.status(400).json({ error: 'Say why it is being voided — it stays on the record' });
  try {
    const voided = await withTransaction(async (client) => {
      const current = await client.query('SELECT * FROM rental_checks WHERE id = $1 FOR UPDATE', [req.params.checkId]);
      if (!current.rowCount) { const e = new Error('Check not found'); e.status = 404; throw e; }
      if (current.rows[0].voided_at) { const e = new Error('That check is already voided'); e.status = 409; throw e; }
      const { rows } = await client.query(
        `UPDATE rental_checks SET voided_at = NOW(), voided_by = $1, void_reason = $2
          WHERE id = $3 RETURNING *`,
        [req.user.id, reason.slice(0, 500), req.params.checkId]
      );
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'rental_check.voided',
        targetType: 'rental_car', targetId: current.rows[0].rental_car_id,
        summary: `Voided a Rental Check: ${reason.slice(0, 120)}`,
        metadata: { check_id: req.params.checkId },
      });
      return rows[0];
    });
    res.json(voided);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('rental check void error', { error: err.message });
    res.status(500).json({ error: 'Could not void the check' });
  }
});

// POST /rentals/:id/mine/request-check — the provider asks Sawa to come and
// check a car (first time, after fixing a failure, or before a document runs
// out). Idempotent while a request is open.
router.post('/:id/mine/request-check', requireAuth, requireUuid('id'), async (req, res) => {
  try {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query('SELECT * FROM rental_cars WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (!rows.length) { const e = new Error('Rental car not found'); e.status = 404; throw e; }
      const car = rows[0];
      if (car.provider_id !== req.user.id) { const e = new Error('Forbidden'); e.status = 403; throw e; }
      if (car.status === 'retired') { const e = new Error('This car is retired'); e.status = 409; throw e; }
      if (car.check_requested_at) return { check_requested_at: car.check_requested_at, already: true };
      const updated = await client.query(
        'UPDATE rental_cars SET check_requested_at = NOW() WHERE id = $1 RETURNING check_requested_at',
        [car.id]
      );
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'rental_check.requested', targetType: 'rental_car', targetId: car.id,
        summary: `${car.title}: provider requested a Rental Check`, metadata: {},
      });
      return { check_requested_at: updated.rows[0].check_requested_at, already: false };
    });
    res.status(result.already ? 200 : 201).json({
      check_requested_at: result.check_requested_at,
      message: 'Requested. Sawa will contact you to arrange the visit.',
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('rental check request error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /rentals/:id — public detail after fixed route names above.
router.get('/:id', requireUuid('id'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rc.*, ${PROVIDER_COLUMNS}, ${CHECK_COLUMNS}
       FROM rental_cars rc JOIN users u ON u.id = rc.provider_id
       ${RENTAL_EVIDENCE}
       ${ACTIVE_RENTAL_SUBSCRIPTION}
       WHERE rc.id = $1 AND rc.status = 'active' AND u.role = 'seller'
         AND u.id_verified = 'approved' AND u.business_verified = TRUE
         AND u.account_status = 'active' AND u.deleted_at IS NULL
         AND ${RENTAL_EVIDENCE_OK}`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Rental car not found' });
    const [car] = await attachAvailability(pool, [publicRental(rows[0])], { withPeriods: true });
    res.json(car);
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
      // "Pay 30 days" on a car whose subscription still runs: the new period
      // starts the day after the current one ends instead of overlapping it.
      // Without this, renewing a lapsing listing always failed with an overlap
      // and the fleet page had no way to pick a later start.
      if (req.body.extend === true) {
        const current = await client.query(
          `SELECT ends_on FROM rental_subscriptions
            WHERE rental_car_id = $1 AND voided_at IS NULL AND ends_on >= $2::date
            ORDER BY ends_on DESC LIMIT 1`,
          [req.params.id, period.startsOn]
        );
        if (current.rows.length) {
          const length = Math.round((Date.parse(period.endsOn) - Date.parse(period.startsOn)) / 86400000);
          const nextStart = addDaysIso(isoDay(current.rows[0].ends_on), 1);
          period.startsOn = nextStart;
          period.endsOn = addDaysIso(nextStart, length);
        }
      }
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
           + 'It goes live once it has a passing Rental Check and a photo and is set to Active.']
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
  if (!provider_id || !title || !make || !model || !year || !daily_rate) return res.status(400).json({ error: 'provider_id, title, make, model, year and daily_rate are required' });
  if (!Number.isFinite(Number(daily_rate)) || Number(daily_rate) <= 0) return res.status(400).json({ error: 'daily_rate must be a positive number' });
  // Photos may come after saving: the fleet form uploads them to the new car
  // (POST /:id/photos), so an operator never has to find image links to paste.
  // A car without one is not created active (below) and cannot be activated.
  const gallery = images === undefined || images === null ? [] : images;
  const galleryError = rentalGalleryError(gallery, false);
  if (galleryError) return res.status(400).json({ error: galleryError });
  try {
    const created = await withTransaction(async (client) => {
      if (!await verifiedRentalProvider(client, provider_id)) {
        const error = new Error('Provider must be an active, identity- and business-verified seller');
        error.status = 400;
        throw error;
      }
      // The inspection is optional now: a car added without one gets its
      // Rental Check recorded next (POST /:id/checks), and cannot be listed
      // until then.
      const evidence = inspection_id ? await inspectionEvidenceForProvider(client, inspection_id, provider_id) : null;
      if (inspection_id && !evidence) {
        const error = new Error('Choose a complete, passing 150-point inspection belonging to this provider');
        error.status = 409;
        throw error;
      }
      if (evidence && !inspectionMatchesVehicle(evidence, { make, model, year })) {
        const error = new Error('The selected inspection belongs to a different make, model, or model year');
        error.status = 409;
        throw error;
      }
      // A car with no paid subscription would be created 'active' and then be
      // invisible to every public read — an operator would reasonably conclude
      // the listing was broken. So it is created in maintenance instead, which
      // is what it actually is: present, not published. The same goes for a car
      // with no evidence yet.
      const period = req.body.subscription ? readSubscription(req.body.subscription) : null;
      if (period && period.error) { const e = new Error(period.error); e.status = 400; throw e; }
      const initialStatus = period && evidence && gallery.length ? 'active' : 'maintenance';

      const { rows } = await client.query(
        `INSERT INTO rental_cars
           (provider_id,title,make,model,year,category,seats,fuel,transmission,mileage,
            daily_rate,weekly_rate,deposit,min_days,inspection_id,inspected,inspection_score,location,images,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         RETURNING *`,
        [provider_id, String(title).trim(), make, model, year, category, seats || 5, fuel,
         transmission, mileage, daily_rate, weekly_rate || Number(daily_rate) * 6,
         deposit || 0, min_days || 1, evidence ? inspection_id : null, Boolean(evidence),
         evidence ? Number(evidence.score) : null, location,
         gallery.map((url) => url.trim()), initialStatus]
      );
      if (period) {
        await insertSubscription(client, { rentalCarId: rows[0].id, period, actorId: req.user.id });
      }
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'rental_car.created', targetType: 'rental_car', targetId: rows[0].id,
        summary: `${rows[0].title} added for a verified rental provider`, metadata: {
          provider_id, daily_rate: rows[0].daily_rate,
          inspection_id: evidence ? inspection_id : null,
          inspection_score: evidence ? Number(evidence.score) : null,
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
  if (req.body.status && !['active', 'maintenance', 'retired', 'pending_review'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
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
      const providerChanged = providerId !== before.provider_id;
      // '' and null both mean "no inspection": choosing None in the form clears it.
      const requestedInspection = req.body.inspection_id !== undefined ? (req.body.inspection_id || null) : undefined;
      const inspectionChanged = requestedInspection !== undefined
        && requestedInspection !== (before.inspection_id || null);
      let inspectionId = requestedInspection !== undefined ? requestedInspection : (before.inspection_id || null);
      // Only what this edit changes is re-validated, and the full listing gates
      // run only when the car is being put live. Re-checking everything stored
      // on every save made an ordinary edit (a rate, a location, retiring the
      // car) fail on an old inspection or a document that ran out since.
      const becomingActive = status === 'active' && before.status !== 'active';

      // A Rental Check sighted this provider's documents for this car. A new
      // provider has not been checked, so their earlier checks stop counting.
      if (providerChanged) {
        await client.query(
          `UPDATE rental_checks
              SET voided_at = NOW(), voided_by = $2, void_reason = 'Car moved to another provider'
            WHERE rental_car_id = $1 AND voided_at IS NULL`,
          [before.id, req.user.id]
        );
      }

      // Only on an explicit transition to 'active' — deliberately NOT inherited
      // like the assertions around it. Inheriting would 409 on editing a lapsed
      // car's location or rate, which is exactly when an operator needs to.
      if (becomingActive) {
        const live = await client.query(
          `SELECT 1 FROM rental_subscriptions
            WHERE rental_car_id = $1 AND voided_at IS NULL
              AND starts_on <= CURRENT_DATE AND ends_on >= CURRENT_DATE`,
          [req.params.id]
        );
        if (!live.rowCount) {
          const error = new Error('Record a listing subscription (Pay 30 days) before putting this car live');
          error.status = 409; error.code = 'SUBSCRIPTION_REQUIRED'; throw error;
        }
      }
      let evidence = null;
      if (inspectionChanged && inspectionId) {
        evidence = await inspectionEvidenceForProvider(client, inspectionId, providerId);
        if (!evidence) {
          const error = new Error('The selected inspection must be complete, passing, and belong to this provider');
          error.status = 409;
          throw error;
        }
      } else if (providerChanged && inspectionId) {
        // The old provider's inspection does not travel with the car: it is
        // dropped rather than blocking the move. The new provider's car is
        // listed on its own Rental Check.
        evidence = await inspectionEvidenceForProvider(client, inspectionId, providerId);
        if (!evidence) inspectionId = null;
      } else if (becomingActive && inspectionId) {
        evidence = await inspectionEvidenceForProvider(client, inspectionId, providerId);
      }
      const vehicle = {
        make: req.body.make !== undefined ? req.body.make : before.make,
        model: req.body.model !== undefined ? req.body.model : before.model,
        year: req.body.year !== undefined ? req.body.year : before.year,
      };
      if (evidence && inspectionChanged && !inspectionMatchesVehicle(evidence, vehicle)) {
        const error = new Error('The rental vehicle details do not match the selected inspection');
        error.status = 409;
        throw error;
      }
      if (status === 'active' && (becomingActive || providerChanged)) {
        if (!await verifiedRentalProvider(client, providerId)) {
          const error = new Error('An active rental listing requires an active, identity- and business-verified provider');
          error.status = 409;
          throw error;
        }
      }
      // A live car never loses its last photo; a car being put live needs one.
      if (status === 'active' && (becomingActive || req.body.images !== undefined)) {
        const galleryError = rentalGalleryError(images, true);
        if (galleryError) { const error = new Error(galleryError); error.status = 409; throw error; }
      }
      // Moving a live car to another provider voided its checks above, so it
      // must not stay live on evidence that no longer counts.
      if (becomingActive || (status === 'active' && providerChanged)) {
        const check = await rentalCheckAllowsListing(client, req.params.id);
        if (check.hasCheck ? !check.ok : !evidence) {
          const error = new Error(check.hasCheck
            ? 'This car\'s latest Rental Check does not allow listing: it failed, is over 12 months old, or a document has expired. Record a new check first.'
            : 'Record a passing Rental Check before putting this car live');
          error.status = 409;
          error.code = 'RENTAL_CHECK_REQUIRED';
          throw error;
        }
      }
      // inspected/inspection_score follow the inspection only when it changes:
      // an unchanged legacy inspection keeps the flags it was listed with.
      const inspectionTouched = inspectionChanged || (providerChanged && (before.inspection_id || null) !== inspectionId);
      const normalized = { ...req.body };
      if (normalized.title !== undefined) normalized.title = String(normalized.title).trim();
      if (normalized.images !== undefined) normalized.images = normalized.images.map((url) => url.trim());
      if (normalized.inspection_id !== undefined || inspectionTouched) normalized.inspection_id = inspectionId;
      const written = inspectionTouched && !fields.includes('inspection_id') ? [...fields, 'inspection_id'] : fields;
      const params = written.map((field) => normalized[field]);
      const assignments = written.map((field, index) => `${field}=$${index + 1}`);
      if (inspectionTouched) {
        params.push(Boolean(evidence && inspectionId), evidence && inspectionId ? Number(evidence.score) : null);
        assignments.push(`inspected=$${params.length - 1}`, `inspection_score=$${params.length}`);
      }
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
