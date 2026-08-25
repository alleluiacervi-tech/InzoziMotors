const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const fs = require('fs');
const path = require('path');
const { withTransaction } = require('../lib/tx');
const { SLOT_POSITION } = require('../lib/photo-slots');
const { uploadPhotos, verifyImageContent, resolveUploadUrl } = require('../middleware/upload');
const { recordAdminAction } = require('../lib/admin-audit');
const { notifyUser } = require('../lib/notify');
const { activeCenter, centerCapacityError, readSlot } = require('../lib/inspection-scheduling');
const { createInvitedAccount } = require('../lib/accounts');
const { sendAccountInvite } = require('../lib/mailer');
const { issueInspectionReport } = require('../lib/documents/inspection-report');
const { documentForSubject, downloadableDocument, DocumentError } = require('../lib/documents/service');
const {
  CHECKLIST_VERSION,
  PUBLISH_THRESHOLD,
  evaluateChecklist,
  grade,
  publicDefinition,
} = require('../lib/inspection-policy');

const router = express.Router();
const MAX_GALLERY_PHOTOS = 40;

function validGalleryKey(key) {
  return typeof key === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(key);
}

function documentFailure(res, error) {
  if (error instanceof DocumentError) {
    return res.status(error.status).json({ error: error.message, code: error.code || undefined });
  }
  log.error('inspection document error', { error: error.message, stack: error.stack });
  return res.status(500).json({ error: 'Could not prepare the inspection report' });
}

// GET /inspections — admin: all inspections
router.get('/', requireAdmin, async (req, res) => {
  const { status, center, date } = req.query;
  const conditions = [];
  const params = [];

  if (status) { params.push(status); conditions.push(`i.status = $${params.length}`); }
  if (center) { params.push(center); conditions.push(`lower(i.center) = lower($${params.length})`); }
  if (date)   { params.push(date);   conditions.push(`i.scheduled_on = $${params.length}::date`); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  try {
    const { rows } = await pool.query(
      `SELECT i.*, s.seller_id,
              u.name  AS seller_name, u.email AS seller_email,
              cust.name AS customer_name, cust.email AS customer_email,
              c.title AS car_title, c.status AS car_status, c.make, c.model, c.year,
              s.make AS submission_make, s.model AS submission_model, s.year AS submission_year,
              COALESCE(u.name, cust.name)   AS party_name,
              COALESCE(u.email, cust.email) AS party_email,
              COALESCE(c.make,  s.make,  i.vehicle_make)  AS display_make,
              COALESCE(c.model, s.model, i.vehicle_model) AS display_model,
              COALESCE(c.year,  s.year,  i.vehicle_year)  AS display_year
       FROM inspections i
       LEFT JOIN submissions s ON s.id = i.submission_id
       LEFT JOIN users u ON u.id = s.seller_id
       LEFT JOIN users cust ON cust.id = i.customer_user_id
       LEFT JOIN cars c ON c.id = i.car_id
       ${where}
       ORDER BY i.scheduled_at ASC NULLS LAST, i.scheduled_date ASC NULLS LAST`,
      params
    );
    res.json(rows);
  } catch (err) {
    log.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// The server owns the checklist definition. Both admin clients render this
// payload, so a release cannot accidentally score one set of checks while an
// inspector is looking at another.
router.get('/checklist', requireAdmin, (_req, res) => {
  res.json(publicDefinition());
});

// GET /inspections/report/:carId — buyer-facing inspection report
// Must come before /:id to avoid "report" being treated as an id
router.get('/report/rental/:rentalCarId', requireUuid('rentalCarId'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.checklist_results, i.score, i.notes, i.completed_at,
              inspector.name AS inspector_name,
              rc.title, rc.make, rc.model, rc.year, rc.mileage, NULL::text AS vin
         FROM rental_cars rc
         JOIN inspections i ON i.id = rc.inspection_id
         JOIN submissions s ON s.id = i.submission_id AND s.seller_id = rc.provider_id
           AND lower(s.make) = lower(rc.make) AND lower(s.model) = lower(rc.model) AND s.year = rc.year
         JOIN users provider ON provider.id = rc.provider_id
         LEFT JOIN users inspector ON inspector.id = i.inspector_id
        WHERE rc.id = $1 AND rc.status = 'active'
          AND i.status = 'complete' AND i.passed = TRUE AND i.checklist_version = $2
          AND provider.role = 'seller' AND provider.id_verified = 'approved'
          AND provider.business_verified = TRUE AND provider.account_status = 'active'
          AND provider.deleted_at IS NULL`,
      [req.params.rentalCarId, CHECKLIST_VERSION]
    );
    if (!rows.length) return res.status(404).json({ error: 'No rental inspection report found' });
    const evaluated = evaluateChecklist(rows[0].checklist_results);
    if (!evaluated.valid || !evaluated.passed || evaluated.score !== Number(rows[0].score)) {
      return res.status(404).json({ error: 'No valid rental inspection report found' });
    }
    res.json({
      ...rows[0], checklist_version: CHECKLIST_VERSION, max_score: 150,
      passing_score: PUBLISH_THRESHOLD, passed: true,
      category_scores: evaluated.category_scores,
      critical_failures: evaluated.critical_failures,
    });
  } catch (err) {
    log.error('rental inspection report error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/report/:carId', requireUuid('carId'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.checklist_results, i.score, i.notes, i.completed_at,
              u.name  AS inspector_name,
              c.title, c.make, c.model, c.year, c.mileage, c.vin
       FROM inspections i
       JOIN cars c ON c.id = i.car_id
       JOIN submissions s ON s.id = i.submission_id
       LEFT JOIN users u ON u.id = i.inspector_id
       JOIN users seller ON seller.id = c.seller_id
       WHERE i.car_id = $1 AND i.status = 'complete' AND i.passed = TRUE
         AND i.checklist_version = $2 AND c.status = 'live'
         AND s.seller_id = c.seller_id
         AND lower(s.make) = lower(c.make) AND lower(s.model) = lower(c.model) AND s.year = c.year
         AND seller.role = 'seller' AND seller.id_verified = 'approved'
         AND seller.account_status = 'active' AND seller.deleted_at IS NULL
         AND (COALESCE(seller.seller_type, 'individual') <> 'showroom' OR seller.business_verified = TRUE)
       ORDER BY i.completed_at DESC LIMIT 1`,
      [req.params.carId, CHECKLIST_VERSION]
    );
    if (!rows.length) return res.status(404).json({ error: 'No inspection report found' });
    const evaluated = evaluateChecklist(rows[0].checklist_results);
    if (!evaluated.valid || !evaluated.passed || evaluated.score !== Number(rows[0].score)) {
      return res.status(404).json({ error: 'No valid inspection report found' });
    }
    res.json({
      ...rows[0],
      checklist_version: CHECKLIST_VERSION,
      max_score: 150,
      passing_score: PUBLISH_THRESHOLD,
      passed: true,
      category_scores: evaluated.category_scores,
      critical_failures: evaluated.critical_failures,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

function removeUploadedFiles(files) {
  for (const file of files || []) fs.unlink(file.path, () => {});
}

function removeStoredPhoto(url) {
  if (!url) return;
  const filename = path.basename(String(url).split('?')[0]);
  const carId = path.basename(path.dirname(String(url).split('?')[0]));
  const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
  fs.unlink(path.join(uploadDir, 'cars', carId, filename), () => {});
}

async function photoState(db, carId) {
  const { rows } = await db.query(
    `SELECT id, angle_key, url, position, is_cover, created_at, updated_at
     FROM car_photos WHERE car_id = $1 ORDER BY is_cover DESC, position, created_at`, [carId]
  );
  // A real listing needs a truthful gallery, not a prescribed 36-angle shoot.
  // Named angles are still accepted where the inspection team uses them, but
  // admins can publish any professionally chosen set of valid images.
  return { photos: rows, missing_required: [], complete: rows.length > 0 };
}

// GET /inspections/cars/:carId/photos — structured gallery + completeness.
router.get('/cars/:carId/photos', requireAdmin, requireUuid('carId'), async (req, res) => {
  try {
    const exists = await pool.query('SELECT 1 FROM cars WHERE id = $1', [req.params.carId]);
    if (!exists.rowCount) return res.status(404).json({ error: 'Car not found' });
    res.json(await photoState(pool, req.params.carId));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /inspections/cars/:carId/photos — upload a flexible listing gallery.
// Must come before /:id
router.post('/cars/:carId/photos', requireAdmin, requireUuid('carId'), uploadPhotos.array('photos', MAX_GALLERY_PHOTOS), verifyImageContent, async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }
    const suppliedKeys = Array.isArray(req.body.angle_keys) ? req.body.angle_keys : [req.body.angle_keys].filter(Boolean);
    if (suppliedKeys.length && (suppliedKeys.length !== req.files.length || suppliedKeys.some((key) => !validGalleryKey(key)))) {
      removeUploadedFiles(req.files);
      return res.status(400).json({
        error: 'If gallery keys are supplied, every photo needs one safe, unique key.',
      });
    }
    if (new Set(suppliedKeys).size !== suppliedKeys.length) {
      removeUploadedFiles(req.files);
      return res.status(400).json({ error: 'Each gallery key may appear only once per upload.' });
    }

    const existing = await pool.query(
      `SELECT angle_key, COALESCE(MAX(position) OVER (), -1) + 1 AS next
       FROM car_photos WHERE car_id = $1`,
      [req.params.carId]
    );
    const existingKeys = new Set(existing.rows.map((photo) => photo.angle_key).filter(Boolean));
    const incomingNewCount = suppliedKeys.length
      ? suppliedKeys.filter((key) => !existingKeys.has(key)).length
      : req.files.length;
    if (existing.rows.length + incomingNewCount > MAX_GALLERY_PHOTOS) {
      removeUploadedFiles(req.files);
      return res.status(409).json({ error: `A listing gallery may contain at most ${MAX_GALLERY_PHOTOS} photos.` });
    }
    const nextPosition = existing.rows.length ? Number(existing.rows[0].next) : 0;
    const incoming = await Promise.all(req.files.map(async (file, index) => ({
      angle_key: suppliedKeys[index] || `gallery_${Date.now()}_${index}`,
      position: suppliedKeys[index] && SLOT_POSITION.has(suppliedKeys[index])
        ? SLOT_POSITION.get(suppliedKeys[index])
        : nextPosition + index,
      url: await resolveUploadUrl(req, file),
    })));
    const replaced = [];
    const state = await withTransaction(async (client) => {
      const car = await client.query('SELECT id FROM cars WHERE id = $1 FOR UPDATE', [req.params.carId]);
      if (!car.rowCount) { const err = new Error('Car not found'); err.status = 404; throw err; }
      for (const photo of incoming) {
        const prior = await client.query(
          'SELECT url FROM car_photos WHERE car_id = $1 AND angle_key = $2',
          [req.params.carId, photo.angle_key]
        );
        if (prior.rows[0]?.url) replaced.push(prior.rows[0].url);
        await client.query(
          `INSERT INTO car_photos (car_id, angle_key, url, position, is_cover)
           VALUES ($1, $2, $3, $4, FALSE)
           ON CONFLICT (car_id, angle_key) WHERE angle_key IS NOT NULL
           DO UPDATE SET url = EXCLUDED.url, position = EXCLUDED.position,
                         updated_at = NOW()`,
          [req.params.carId, photo.angle_key, photo.url, photo.position]
        );
      }
      await client.query(
        `UPDATE car_photos SET is_cover = TRUE, updated_at = NOW()
         WHERE id = (SELECT id FROM car_photos WHERE car_id = $1 ORDER BY position LIMIT 1)
           AND NOT EXISTS (SELECT 1 FROM car_photos WHERE car_id = $1 AND is_cover)`,
        [req.params.carId]
      );
      const gallery = await photoState(client, req.params.carId);
      await client.query('UPDATE cars SET images = $1::text[] WHERE id = $2', [gallery.photos.map((p) => p.url), req.params.carId]);
      return gallery;
    });
    replaced.forEach(removeStoredPhoto);
    res.json({ uploaded: incoming.length, replaced: replaced.length, ...state });
  } catch (err) {
    removeUploadedFiles(req.files);
    res.status(err.status || 500).json({
      error: err.status ? err.message : 'Server error',
      ...(err.code ? { code: err.code } : {}),
    });
  }
});

router.patch('/cars/:carId/photos/:photoId/cover', requireAdmin, requireUuid('carId'), requireUuid('photoId'), async (req, res) => {
  try {
    const state = await withTransaction(async (client) => {
      const found = await client.query('SELECT 1 FROM car_photos WHERE id = $1 AND car_id = $2', [req.params.photoId, req.params.carId]);
      if (!found.rowCount) { const err = new Error('Photo not found'); err.status = 404; throw err; }
      await client.query('UPDATE car_photos SET is_cover = FALSE WHERE car_id = $1', [req.params.carId]);
      await client.query('UPDATE car_photos SET is_cover = TRUE, updated_at = NOW() WHERE id = $1', [req.params.photoId]);
      const gallery = await photoState(client, req.params.carId);
      const ordered = [...gallery.photos].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position);
      await client.query('UPDATE cars SET images = $1::text[] WHERE id = $2', [ordered.map((p) => p.url), req.params.carId]);
      return { ...gallery, photos: ordered };
    });
    res.json(state);
  } catch (err) { res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' }); }
});

router.delete('/cars/:carId/photos/:photoId', requireAdmin, requireUuid('carId'), requireUuid('photoId'), async (req, res) => {
  try {
    let removedUrl;
    const state = await withTransaction(async (client) => {
      const car = await client.query('SELECT status FROM cars WHERE id = $1 FOR UPDATE', [req.params.carId]);
      if (!car.rowCount) { const err = new Error('Car not found'); err.status = 404; throw err; }
      const photoCount = await client.query('SELECT COUNT(*)::int AS count FROM car_photos WHERE car_id = $1', [req.params.carId]);
      const setting = await client.query("SELECT value FROM platform_settings WHERE key = 'listing_min_photos'");
      const minPhotos = Math.max(Number(setting.rows[0]?.value) || 1, 1);
      if (['approved', 'live'].includes(car.rows[0].status) && photoCount.rows[0].count - 1 < minPhotos) {
        const err = new Error(`Keep at least ${minPhotos} photo${minPhotos === 1 ? '' : 's'} on an approved or live listing.`);
        err.status = 409;
        throw err;
      }
      const removed = await client.query(
        'DELETE FROM car_photos WHERE id = $1 AND car_id = $2 RETURNING url',
        [req.params.photoId, req.params.carId]
      );
      if (!removed.rowCount) { const err = new Error('Photo not found'); err.status = 404; throw err; }
      removedUrl = removed.rows[0].url;
      await client.query(
        `UPDATE car_photos SET is_cover = TRUE, updated_at = NOW()
         WHERE id = (SELECT id FROM car_photos WHERE car_id = $1 ORDER BY position LIMIT 1)
           AND NOT EXISTS (SELECT 1 FROM car_photos WHERE car_id = $1 AND is_cover)`,
        [req.params.carId]
      );
      const gallery = await photoState(client, req.params.carId);
      await client.query('UPDATE cars SET images = $1::text[] WHERE id = $2', [gallery.photos.map((p) => p.url), req.params.carId]);
      return gallery;
    });
    removeStoredPhoto(removedUrl);
    res.json(state);
  } catch (err) { res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' }); }
});

// POST /inspections/:id/report — issue the immutable, branded PDF once. A
// repeated call returns the same document and never rewrites historical facts.
router.post('/:id/report', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const document = await issueInspectionReport(req.params.id, req.user.id);
    await recordAdminAction(pool, {
      actorId: req.user.id, action: 'document.inspection_report.issued',
      targetType: 'inspection', targetId: req.params.id,
      summary: `Issued ${document.document_number}`,
      metadata: { document_id: document.id, document_number: document.document_number, sha256: document.file_sha256 },
    });
    res.status(document.issued_at ? 200 : 201).json(document);
  } catch (error) { documentFailure(res, error); }
});

// GET /inspections/:id/report/file — private streaming route. The uploads
// directory itself is denied by server.js, so the auth check cannot be bypassed.
router.get('/:id/report/file', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const document = await downloadableDocument(
      await documentForSubject('inspection_report', 'inspection', req.params.id)
    );
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${document.filename}"`);
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Document-Number', document.document_number);
    res.setHeader('X-Document-SHA256', document.file_sha256);
    if (document.file_size) res.setHeader('Content-Length', String(document.file_size));
    await recordAdminAction(pool, {
      actorId: req.user.id, action: 'document.inspection_report.downloaded',
      targetType: 'inspection', targetId: req.params.id,
      summary: `Downloaded ${document.document_number}`,
      metadata: { document_id: document.id, document_number: document.document_number },
    });
    const stream = fs.createReadStream(document.absolutePath);
    stream.on('error', (error) => {
      log.error('inspection report stream error', { id: req.params.id, error: error.message });
      if (!res.headersSent) res.status(500).json({ error: 'Could not read the inspection report' });
      else res.destroy();
    });
    stream.pipe(res);
  } catch (error) { documentFailure(res, error); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Walk-in inspections
//
// A customer arrives with a vehicle Sawa does not list and pays for an
// independent 150-point check. The row carries its own vehicle identity and a
// customer account, and — enforced by inspections_kind_shape_check in the
// database, not by application code — can never hold a submission_id or a
// car_id. Every publication, contact and rental gate requires both, so a
// walk-in inspection is structurally incapable of publishing anything.
// ─────────────────────────────────────────────────────────────────────────────

const cleanText = (value, max) => String(value || '').trim().slice(0, max) || null;

/** Resolve the customer: an existing account by id, or a newly invited buyer. */
async function resolveWalkInCustomer(client, req) {
  if (req.body.customer_user_id) {
    const { rows } = await client.query(
      'SELECT id, name, email FROM users WHERE id = $1 AND deleted_at IS NULL',
      [req.body.customer_user_id]
    );
    if (!rows.length) { const e = new Error('Customer account not found'); e.status = 404; throw e; }
    return { customer: rows[0], invite: null };
  }
  const name = cleanText(req.body.customer && req.body.customer.name, 120);
  const email = String((req.body.customer && req.body.customer.email) || '').trim().toLowerCase();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    const e = new Error('Give the customer an existing account, or a name and a valid email to create one');
    e.status = 400; throw e;
  }
  const created = await createInvitedAccount(client, {
    accountType: 'buyer', name, email,
    phone: cleanText(req.body.customer && req.body.customer.phone, 40),
    businessName: null, invitedBy: req.user.id,
  });
  if (created.conflict) {
    const e = new Error('An account already uses that email — search for it and select it instead');
    e.status = 409; throw e;
  }
  return { customer: created.user, invite: created.token };
}

// POST /inspections/standalone — book a walk-in check.
router.post('/standalone', requireAdmin, async (req, res) => {
  const make = cleanText(req.body.make, 60);
  const model = cleanText(req.body.model, 60);
  const year = parseInt(req.body.year, 10);
  if (!make || !model || !Number.isInteger(year) || year < 1900 || year > 2100) {
    return res.status(400).json({ error: 'The vehicle needs a make, a model and a valid year' });
  }
  const slot = readSlot(req.body);
  if (slot.error) return res.status(400).json({ error: slot.error });

  try {
    const booked = await withTransaction(async (client) => {
      const center = await activeCenter(client, req.body.center);
      if (!center) {
        const e = new Error('Choose an active inspection center from the available list.');
        e.status = 400; throw e;
      }
      const resolved = await resolveWalkInCustomer(client, req);

      // The same lock the submission path takes: without it, two requests can
      // each see the last free bay of the day.
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext(lower($1) || ':' || $2::text))",
        [center.id, slot.isoDate]
      );
      const capErr = await centerCapacityError(client, center, slot.isoDate, null);
      if (capErr) { const e = new Error(capErr); e.status = 409; throw e; }

      // A plain INSERT: uq_inspections_submission never conflicts on NULL, so
      // the submission path's upsert would silently create duplicates here.
      const mileage = parseInt(req.body.mileage, 10);
      const { rows } = await client.query(
        `INSERT INTO inspections
           (kind, customer_user_id, center, scheduled_on, scheduled_date, scheduled_time,
            scheduled_at, status, vehicle_make, vehicle_model, vehicle_year,
            vehicle_vin, vehicle_plate, vehicle_mileage)
         VALUES ('standalone',$1,$2,$3::date,$4,$5,$6,'scheduled',$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [resolved.customer.id, center.name, slot.isoDate, slot.display,
         req.body.scheduled_time || null, slot.at, make, model, year,
         cleanText(req.body.vin, 40), cleanText(req.body.registration_plate, 20),
         Number.isInteger(mileage) ? mileage : null]
      );
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'inspection.standalone_booked',
        targetType: 'inspection', targetId: rows[0].id,
        summary: `Walk-in inspection booked for ${year} ${make} ${model} at ${center.name}`,
        metadata: { center: center.name, scheduled_on: slot.isoDate, customer_id: resolved.customer.id },
      });
      return { inspection: rows[0], customer: resolved.customer, invite: resolved.invite };
    });

    // Mail after the commit — a mail outage must never lose the booking.
    let invitationSent = false;
    if (booked.invite) {
      invitationSent = await sendAccountInvite(booked.customer.email, booked.customer.name, {
        accountType: 'buyer', businessName: null, token: booked.invite,
      });
    }
    res.status(201).json({ ...booked.inspection, customer: booked.customer, invitation_sent: invitationSent });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('standalone inspection booking failed', { error: err.message });
    res.status(500).json({ error: 'Could not book the inspection' });
  }
});

// PATCH /inspections/:id/schedule — move a walk-in booking.
// PATCH /submissions/:id is the only reschedule path today and it does not
// apply here, so without this a mistyped date would be unfixable.
router.patch('/:id/schedule', requireAdmin, requireUuid('id'), async (req, res) => {
  const slot = readSlot(req.body);
  if (slot.error) return res.status(400).json({ error: slot.error });
  try {
    const updated = await withTransaction(async (client) => {
      const cur = await client.query('SELECT * FROM inspections WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (!cur.rows.length) { const e = new Error('Inspection not found'); e.status = 404; throw e; }
      const row = cur.rows[0];
      if (row.kind !== 'standalone') {
        const e = new Error('Reschedule a listing inspection through its submission'); e.status = 409; throw e;
      }
      if (row.status !== 'scheduled') {
        const e = new Error(`A ${row.status} inspection cannot be rescheduled.`); e.status = 409; throw e;
      }
      const center = await activeCenter(client, req.body.center || row.center);
      if (!center) { const e = new Error('Choose an active inspection center.'); e.status = 400; throw e; }
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext(lower($1) || ':' || $2::text))",
        [center.id, slot.isoDate]
      );
      // The row being moved still counts itself, so a no-op re-save of the same
      // center and day must not be refused by its own booking.
      const sameSlot = row.center === center.name
        && String(row.scheduled_on || '').slice(0, 10) === slot.isoDate;
      const capErr = await centerCapacityError(client, center, slot.isoDate, null);
      if (capErr && !sameSlot) { const e = new Error(capErr); e.status = 409; throw e; }

      const { rows } = await client.query(
        `UPDATE inspections SET center=$1, scheduled_on=$2::date, scheduled_date=$3,
                scheduled_time=$4, scheduled_at=$5 WHERE id=$6 RETURNING *`,
        [center.name, slot.isoDate, slot.display,
         req.body.scheduled_time || row.scheduled_time, slot.at, req.params.id]
      );
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'inspection.rescheduled',
        targetType: 'inspection', targetId: req.params.id,
        summary: `Walk-in inspection moved to ${center.name} on ${slot.display}`,
        metadata: { center: center.name, scheduled_on: slot.isoDate },
      });
      return rows[0];
    });
    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('reschedule inspection failed', { error: err.message });
    res.status(500).json({ error: 'Could not reschedule the inspection' });
  }
});

// DELETE /inspections/:id — cancel a walk-in that has not started.
// A hard delete rather than a cancelled status: there is no evidence yet, the
// bay frees itself through the existing status predicate, and the audit log
// keeps the record of what was booked and by whom.
router.delete('/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    await withTransaction(async (client) => {
      const cur = await client.query('SELECT * FROM inspections WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (!cur.rows.length) { const e = new Error('Inspection not found'); e.status = 404; throw e; }
      const row = cur.rows[0];
      if (row.kind !== 'standalone') {
        const e = new Error('Only a walk-in inspection can be cancelled here'); e.status = 409; throw e;
      }
      if (row.status !== 'scheduled') {
        const e = new Error(`A ${row.status} inspection cannot be cancelled.`); e.status = 409; throw e;
      }
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'inspection.cancelled',
        targetType: 'inspection', targetId: row.id,
        summary: `Walk-in inspection cancelled (${[row.vehicle_year, row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ')})`,
        metadata: { center: row.center, scheduled_on: row.scheduled_on, reason: cleanText(req.body && req.body.reason, 500) },
      });
      await client.query('DELETE FROM inspections WHERE id = $1', [row.id]);
    });
    res.json({ cancelled: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('cancel inspection failed', { error: err.message });
    res.status(500).json({ error: 'Could not cancel the inspection' });
  }
});

// GET /inspections/:id
router.get('/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*,
              u.name  AS seller_name, u.email AS seller_email,
              cust.name AS customer_name, cust.email AS customer_email,
              cust.phone AS customer_phone,
              s.make AS sub_make, s.model AS sub_model, s.year AS sub_year,
              s.mileage AS sub_mileage, s.color AS sub_color,
              s.transmission AS sub_transmission, s.fuel_type AS sub_fuel_type,
              s.body_type AS sub_body_type, s.asking_price AS sub_asking_price,
              s.seller_id AS seller_id,
              c.title AS car_title,  c.make, c.model, c.year, c.mileage, c.vin,
              COALESCE(u.name, cust.name)   AS party_name,
              COALESCE(u.email, cust.email) AS party_email,
              COALESCE(c.make,    s.make,    i.vehicle_make)    AS display_make,
              COALESCE(c.model,   s.model,   i.vehicle_model)   AS display_model,
              COALESCE(c.year,    s.year,    i.vehicle_year)    AS display_year,
              COALESCE(c.mileage, s.mileage, i.vehicle_mileage) AS display_mileage,
              COALESCE(c.vin, i.vehicle_vin)                    AS display_vin
       FROM inspections i
       LEFT JOIN submissions s ON s.id = i.submission_id
       LEFT JOIN users u ON u.id = s.seller_id
       LEFT JOIN users cust ON cust.id = i.customer_user_id
       LEFT JOIN cars c ON c.id = i.car_id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Inspection not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /inspections/:id/complete — admin submits 150-pt checklist results
// Body: { checklist_results: { itemName: 'pass'|'flag'|'fail', ... }, notes }
// POST /inspections/:id/start — mechanic begins the walkaround
router.post('/:id/start', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const started = await withTransaction(async (client) => {
      const current = await client.query('SELECT * FROM inspections WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (!current.rowCount) { const error = new Error('Inspection not found'); error.status = 404; throw error; }
      const inspection = current.rows[0];
      if (inspection.status === 'in_progress' && inspection.inspector_id === req.user.id) return inspection;
      if (inspection.status !== 'scheduled') {
        const error = new Error(`A ${inspection.status} inspection cannot be started`); error.status = 409; throw error;
      }
      const { rows } = await client.query(
        `UPDATE inspections
         SET status = 'in_progress', started_at = NOW(), inspector_id = $1
         WHERE id = $2 RETURNING *`,
        [req.user.id, req.params.id]
      );
      if (inspection.submission_id) {
        await client.query("UPDATE submissions SET status = 'inspecting' WHERE id = $1 AND status = 'scheduled'", [inspection.submission_id]);
      }
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'inspection.started', targetType: 'inspection', targetId: inspection.id,
        summary: `Started ${CHECKLIST_VERSION}`, metadata: { submission_id: inspection.submission_id, checklist_version: CHECKLIST_VERSION },
      });
      return rows[0];
    });
    res.json(started);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('start inspection error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /inspections/:id/complete — record checklist, weighted score, gated publish
router.post('/:id/complete', requireAdmin, requireUuid('id'), async (req, res) => {
  const { checklist_results, notes } = req.body;
  const evaluated = evaluateChecklist(checklist_results);
  if (!evaluated.valid) {
    return res.status(400).json({
      error: `Complete the canonical ${CHECKLIST_VERSION} checklist before submitting.`,
      code: 'INSPECTION_CHECKLIST_INCOMPLETE',
      checklist_version: CHECKLIST_VERSION,
      missing_count: evaluated.missing.length,
      missing: evaluated.missing,
      unknown: evaluated.unknown,
      invalid: evaluated.invalid,
    });
  }

  const score = evaluated.score;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inspRes = await client.query('SELECT * FROM inspections WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!inspRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Inspection not found' }); }
    const insp = inspRes.rows[0];
    if (insp.status === 'complete') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Inspection already completed' });
    }
    if (insp.status !== 'in_progress' || !insp.started_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Start the scheduled inspection before completing its checklist.',
        code: 'INSPECTION_NOT_STARTED',
      });
    }
    if (insp.inspector_id && insp.inspector_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'This inspection is assigned to another inspector. Reassignment must be recorded before completion.',
        code: 'INSPECTION_ASSIGNED_TO_ANOTHER_ADMIN',
      });
    }
    if (insp.car_id) {
      const linkedVehicle = await client.query(
        `SELECT 1 FROM cars c JOIN submissions s ON s.id = $2
         WHERE c.id = $1 AND c.seller_id = s.seller_id
           AND lower(c.make) = lower(s.make) AND lower(c.model) = lower(s.model) AND c.year = s.year`,
        [insp.car_id, insp.submission_id]
      );
      if (!linkedVehicle.rowCount) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'This inspection is linked to a different seller or vehicle identity.',
          code: 'INSPECTION_VEHICLE_MISMATCH',
        });
      }
    }

    await client.query(
      `UPDATE inspections
       SET checklist_results = $1, notes = $2, score = $3,
           status = 'complete', completed_at = NOW(), inspector_id = $4,
           checklist_version = $5, passed = $6, critical_failures = $7::jsonb
       WHERE id = $8`,
      [JSON.stringify(checklist_results), notes, score, req.user.id,
       CHECKLIST_VERSION, evaluated.passed, JSON.stringify(evaluated.critical_failures), insp.id]
    );

    const passed = evaluated.passed;

    // Inspection is evidence, not publication and not a guarantee. Passing the
    // checklist makes the listing approval-ready; an administrator must still
    // review the gallery and explicitly publish it.
    if (insp.car_id && passed) {
      await client.query(
        `UPDATE cars
         SET inspected = TRUE, inspection_score = $1
         WHERE id = $2`,
        [score, insp.car_id]
      );
    } else if (insp.car_id) {
      await client.query(
        `UPDATE cars SET inspected = TRUE, inspection_score = $1,
           status = CASE WHEN status IN ('live', 'approved') THEN 'under_review' ELSE status END,
           review_notes = CONCAT_WS(E'\n', NULLIF(review_notes, ''), $3)
         WHERE id = $2`,
        [score, insp.car_id, evaluated.critical_failures.length
          ? `Inspection failed critical checks: ${evaluated.critical_failures.map((failure) => failure.label).join('; ')}`
          : `Inspection score ${score}/150 is below the ${PUBLISH_THRESHOLD}/150 publication threshold.`]
      );
    }

    // The report is complete, but publication remains a separate decision.
    // A walk-in inspection has no submission at all, so this is conditional
    // rather than relying on `WHERE id = NULL` quietly matching nothing.
    if (insp.submission_id) {
      await client.query(
        `UPDATE submissions SET status = 'inspected' WHERE id = $1`,
        [insp.submission_id]
      );
    }

    const inspectionGrade = grade(score);

    // Who hears about it: the seller behind the submission, or — for a walk-in
    // — the customer who paid for the check. Nobody is notified twice, because
    // the CHECK constraint makes the two cases mutually exclusive.
    let recipientId = null;
    if (insp.submission_id) {
      const subRes = await client.query('SELECT seller_id FROM submissions WHERE id = $1', [insp.submission_id]);
      recipientId = subRes.rows.length ? subRes.rows[0].seller_id : null;
    } else {
      recipientId = insp.customer_user_id;
    }

    if (recipientId) {
      const vehicle = [insp.vehicle_year, insp.vehicle_make, insp.vehicle_model].filter(Boolean).join(' ');
      const body = insp.kind === 'standalone'
        ? `Your 150-point inspection${vehicle ? ` on the ${vehicle}` : ''} is complete: ${score}/150 (Grade ${inspectionGrade}). The full report is ready to collect — it records what we found, and nothing more.`
        : insp.car_id && passed
          ? `The inspection record for your car is complete with a score of ${score}/150 (Grade ${inspectionGrade}). Our team will review the listing before publication.`
          : passed
            ? `Your car scored ${score}/150 (Grade ${inspectionGrade}) on the 150-point inspection. Our team will prepare and review the listing before it becomes public.`
            : `Your inspection report is ready (score ${score}/150, Grade ${inspectionGrade}). Some items need attention — our team will contact you about next steps.`;
      await notifyUser(client, {
        user_id: recipientId,
        type: 'listing_update',
        title: insp.kind === 'standalone'
          ? 'Your inspection report is ready'
          : (passed ? 'Inspection complete' : 'Inspection report ready'),
        body,
        meta: JSON.stringify({ inspectionId: insp.id, score, grade: inspectionGrade, passed, kind: insp.kind }),
      });
    }

    await recordAdminAction(client, {
      actorId: req.user.id, action: 'inspection.completed', targetType: 'inspection', targetId: insp.id,
      summary: `Inspection completed with ${score}/150`, metadata: {
        score, passed, published: false, checklist_version: CHECKLIST_VERSION,
        critical_failures: evaluated.critical_failures.map((failure) => failure.id),
        kind: insp.kind, submission_id: insp.submission_id, car_id: insp.car_id,
        customer_user_id: insp.customer_user_id || undefined,
      },
    });

    await client.query('COMMIT');

    res.json({
      success: true,
      score,
      max_score: 150,
      passing_score: PUBLISH_THRESHOLD,
      passed,
      grade: grade(score),
      checklist_version: CHECKLIST_VERSION,
      critical_failures: evaluated.critical_failures,
      category_scores: evaluated.category_scores,
      car_id: insp.car_id,
      kind: insp.kind,
      published: false,
      ready_for_review: !!(insp.car_id && passed),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    log.error('complete inspection error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
