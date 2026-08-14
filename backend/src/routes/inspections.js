const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const fs = require('fs');
const path = require('path');
const { withTransaction } = require('../lib/tx');
const { REQUIRED_SLOTS, ALL_SLOTS, SLOT_POSITION } = require('../lib/photo-slots');
const { uploadPhotos, verifyImageContent } = require('../middleware/upload');
const { matchSavedSearches } = require('../lib/alerts');
const { recordAdminAction } = require('../lib/admin-audit');
const { notifyUser } = require('../lib/notify');
const { issueInspectionReport } = require('../lib/documents/inspection-report');
const { documentForSubject, downloadableDocument, DocumentError } = require('../lib/documents/service');

const router = express.Router();

function documentFailure(res, error) {
  if (error instanceof DocumentError) {
    return res.status(error.status).json({ error: error.message, code: error.code || undefined });
  }
  log.error('inspection document error', { error: error.message, stack: error.stack });
  return res.status(500).json({ error: 'Could not prepare the inspection report' });
}

// ─── 150-point scoring ────────────────────────────────────────────────────────
// Blueprint category weights (sum 150). Items not in the map fall into a
// default bucket weighted like an average category.
const CATEGORY_WEIGHTS = {
  'Engine & Drivetrain': { weight: 25, items: ['Engine oil level & condition', 'Coolant level', 'Timing belt condition', 'Air filter', 'Engine mounts', 'Transmission fluid'] },
  'Brakes & Steering':   { weight: 25, items: ['Front brake pads', 'Rear brake pads', 'Brake fluid', 'Brake lines', 'Power steering fluid', 'Wheel alignment'] },
  'Body & Exterior':     { weight: 20, items: ['Panel gaps & alignment', 'Paint condition', 'Windscreen integrity', 'Front lights', 'Rear lights', 'Rust / corrosion'] },
  'Interior & Comfort':  { weight: 20, items: ['Seat condition', 'Dashboard instruments', 'Air conditioning', 'Windows & locks', 'Odometer reading', 'Boot / trunk'] },
  'Electronics & Safety':{ weight: 20, items: ['Battery health', 'OBD scan (no fault codes)', 'Airbag system', 'Traction control', 'Seatbelts', 'Horn'] },
  'Tyres & Wheels':      { weight: 15, items: ['Front-left tread', 'Front-right tread', 'Rear-left tread', 'Rear-right tread', 'Spare tyre', 'Wheel condition'] },
  'Documentation':       { weight: 25, items: ['Registration / logbook', 'Service history', 'Import documents', 'Insurance valid', 'RRA duty paid stamp', 'VIN match'] },
};
const ITEM_TO_CATEGORY = {};
for (const [cat, def] of Object.entries(CATEGORY_WEIGHTS)) {
  for (const item of def.items) ITEM_TO_CATEGORY[item] = cat;
}
// Canonical scale is the 150-point score used everywhere (app tiers, seeds,
// display "/150"). 105/150 = 70% — below this, admin reviews before publish.
const SCORE_MAX = 150;
const PUBLISH_THRESHOLD = 105;

function computeWeightedScore(checklistResults) {
  const value = (v) => (v === 'pass' ? 1 : v === 'flag' ? 0.5 : 0);
  const perCategory = {}; // cat -> { got, count }
  const other = { got: 0, count: 0 };
  for (const [item, verdict] of Object.entries(checklistResults)) {
    const cat = ITEM_TO_CATEGORY[item];
    if (cat) {
      perCategory[cat] = perCategory[cat] || { got: 0, count: 0 };
      perCategory[cat].got += value(verdict);
      perCategory[cat].count += 1;
    } else {
      other.got += value(verdict);
      other.count += 1;
    }
  }
  let earned = 0, total = 0;
  for (const [cat, agg] of Object.entries(perCategory)) {
    const w = CATEGORY_WEIGHTS[cat].weight;
    earned += (agg.got / agg.count) * w;
    total += w;
  }
  if (other.count > 0) {
    const w = 21; // ~average category weight for unmapped items
    earned += (other.got / other.count) * w;
    total += w;
  }
  return total > 0 ? Math.round((earned / total) * SCORE_MAX) : 0;
}


// GET /inspections — admin: all inspections
router.get('/', requireAdmin, async (req, res) => {
  const { status, center, date } = req.query;
  const conditions = [];
  const params = [];

  if (status) { params.push(status); conditions.push(`i.status = $${params.length}`); }
  if (center) { params.push(center); conditions.push(`i.center = $${params.length}`); }
  if (date)   { params.push(date);   conditions.push(`i.scheduled_date = $${params.length}`); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  try {
    const { rows } = await pool.query(
      `SELECT i.*,
              u.name  AS seller_name, u.email AS seller_email,
              c.title AS car_title,  c.make, c.model, c.year
       FROM inspections i
       JOIN submissions s ON s.id = i.submission_id
       JOIN users u ON u.id = s.seller_id
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

// GET /inspections/report/:carId — buyer-facing inspection report
// Must come before /:id to avoid "report" being treated as an id
router.get('/report/:carId', requireUuid('carId'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.checklist_results, i.score, i.notes, i.completed_at,
              u.name  AS inspector_name,
              c.title, c.make, c.model, c.year, c.mileage, c.vin
       FROM inspections i
       JOIN cars c ON c.id = i.car_id
       LEFT JOIN users u ON u.id = i.inspector_id
       WHERE i.car_id = $1 AND i.status = 'complete'
       ORDER BY i.completed_at DESC LIMIT 1`,
      [req.params.carId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No inspection report found' });
    res.json(rows[0]);
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
  const present = new Set(rows.map((row) => row.angle_key));
  const missing_required = REQUIRED_SLOTS.filter((slot) => !present.has(slot));
  return { photos: rows, missing_required, complete: missing_required.length === 0 };
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

// POST /inspections/cars/:carId/photos — upload named 36-angle photos.
// Must come before /:id
router.post('/cars/:carId/photos', requireAdmin, requireUuid('carId'), uploadPhotos.array('photos', 40), verifyImageContent, async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }
    const angleKeys = Array.isArray(req.body.angle_keys) ? req.body.angle_keys : [req.body.angle_keys].filter(Boolean);
    if (angleKeys.length !== req.files.length || angleKeys.some((key) => !ALL_SLOTS.includes(key))) {
      removeUploadedFiles(req.files);
      return res.status(400).json({
        error: 'Every photo needs one valid angle_keys value.',
        valid_angle_keys: ALL_SLOTS,
      });
    }
    if (new Set(angleKeys).size !== angleKeys.length) {
      removeUploadedFiles(req.files);
      return res.status(400).json({ error: 'Each angle may appear only once per upload.' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const incoming = req.files.map((file, index) => ({
      angle_key: angleKeys[index],
      position: SLOT_POSITION.get(angleKeys[index]),
      url: `${baseUrl}/uploads/cars/${req.params.carId}/${file.filename}`,
    }));
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
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
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

// GET /inspections/:id
router.get('/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*,
              u.name  AS seller_name, u.email AS seller_email,
              s.make AS sub_make, s.model AS sub_model, s.year AS sub_year,
              s.mileage AS sub_mileage, s.color AS sub_color,
              s.transmission AS sub_transmission, s.fuel_type AS sub_fuel_type,
              s.body_type AS sub_body_type, s.asking_price AS sub_asking_price,
              s.seller_id AS seller_id,
              c.title AS car_title,  c.make, c.model, c.year, c.mileage, c.vin
       FROM inspections i
       JOIN submissions s ON s.id = i.submission_id
       JOIN users u ON u.id = s.seller_id
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
    const { rows } = await pool.query(
      `UPDATE inspections
       SET status = 'in_progress', started_at = NOW(), inspector_id = $1
       WHERE id = $2 AND status = 'scheduled'
       RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(409).json({ error: 'Inspection not found or not in scheduled state' });
    await pool.query(
      `UPDATE submissions SET status = 'inspecting' WHERE id = $1`,
      [rows[0].submission_id]
    );
    await recordAdminAction(pool, {
      actorId: req.user.id, action: 'inspection.started', targetType: 'inspection', targetId: rows[0].id,
      summary: 'Inspection checklist started', metadata: { submission_id: rows[0].submission_id },
    });
    res.json(rows[0]);
  } catch (err) {
    log.error('start inspection error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /inspections/:id/complete — record checklist, weighted score, gated publish
router.post('/:id/complete', requireAdmin, requireUuid('id'), async (req, res) => {
  const { checklist_results, notes } = req.body;
  if (!checklist_results || typeof checklist_results !== 'object' || !Object.keys(checklist_results).length) {
    return res.status(400).json({ error: 'checklist_results is required' });
  }
  const badVerdicts = Object.values(checklist_results).filter((v) => !['pass', 'flag', 'fail'].includes(v));
  if (badVerdicts.length) {
    return res.status(400).json({ error: 'checklist verdicts must be pass, flag, or fail' });
  }

  const score = computeWeightedScore(checklist_results);
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

    await client.query(
      `UPDATE inspections
       SET checklist_results = $1, notes = $2, score = $3,
           status = 'complete', completed_at = NOW(), inspector_id = $4
       WHERE id = $5`,
      [JSON.stringify(checklist_results), notes, score, req.user.id, insp.id]
    );

    const passed = score >= PUBLISH_THRESHOLD;

    // Publish only when a listing exists AND the car clears the threshold.
    let autoPublished = false;
    if (insp.car_id && passed) {
      await client.query(
        `UPDATE cars
         SET inspected = TRUE, inspection_score = $1, status = 'live', listed_at = NOW()
         WHERE id = $2`,
        [score, insp.car_id]
      );
      autoPublished = true;
    } else if (insp.car_id) {
      await client.query(
        `UPDATE cars SET inspected = TRUE, inspection_score = $1 WHERE id = $2`,
        [score, insp.car_id]
      );
    }

    // Submission: 'live' only with a published listing; otherwise 'inspected'
    // (report done — admin creates/publishes the listing, or follows up on a low score).
    await client.query(
      `UPDATE submissions SET status = $1 WHERE id = $2`,
      [insp.car_id && passed ? 'live' : 'inspected', insp.submission_id]
    );

    const subRes = await client.query('SELECT seller_id FROM submissions WHERE id = $1', [insp.submission_id]);

    // ── Certification fee ──────────────────────────────────────────────────
    // The business model lists three revenue streams; platform_fees has always
    // permitted fee_type='certification' and nothing ever inserted one, so
    // /admin/fees under-reported by the entire upfront stream. Commission and
    // featured were recorded; the fee that pays for the inspection itself was
    // not.
    //
    // This is the moment it is earned: the 150-point check is done and the
    // report exists, whether or not the car went live. Priced from the
    // environment because the amount is a business decision — unset means no
    // row, so nothing is invoiced until someone sets the real number.
    const certificationFee = Math.max(parseInt(process.env.CERTIFICATION_FEE || '0', 10) || 0, 0);
    if (certificationFee > 0 && subRes.rows.length) {
      // ON CONFLICT against the partial unique index on submission_id: one
      // certification per submission, so a re-inspection after remedial work
      // cannot bill the seller twice for the same car.
      await client.query(
        `INSERT INTO platform_fees (seller_id, submission_id, fee_type, amount, status)
         VALUES ($1, $2, 'certification', $3, 'due')
         ON CONFLICT (submission_id) WHERE fee_type = 'certification' DO NOTHING`,
        [subRes.rows[0].seller_id, insp.submission_id, certificationFee]
      );
    }

    if (subRes.rows.length) {
      const grade = score >= 128 ? 'A' : score >= 105 ? 'B' : score >= 83 ? 'C' : 'D';
      const body = insp.car_id && passed
        ? `Your car passed the 150-point inspection with a score of ${score}/150 (Grade ${grade}). It is now live on the marketplace.`
        : passed
          ? `Your car scored ${score}/150 (Grade ${grade}) on the 150-point inspection. Our team is preparing your listing — it goes live shortly.`
          : `Your inspection report is ready (score ${score}/150, Grade ${grade}). Some items need attention — our team will contact you about next steps.`;
      await notifyUser(client, {
        user_id: subRes.rows[0].seller_id,
        type: 'listing_update',
        title: passed ? 'Inspection complete' : 'Inspection report ready',
        body,
        meta: JSON.stringify({ inspectionId: insp.id, score, grade }),
      });
    }

    await recordAdminAction(client, {
      actorId: req.user.id, action: 'inspection.completed', targetType: 'inspection', targetId: insp.id,
      summary: `Inspection completed with ${score}/150`, metadata: { score, passed, published: autoPublished, submission_id: insp.submission_id, car_id: insp.car_id },
    });

    await client.query('COMMIT');

    // Saved-search alerts fire on BOTH publish paths (manual POST /cars and
    // this auto-publish). Fire-and-forget after commit.
    if (autoPublished) {
      pool.query('SELECT * FROM cars WHERE id = $1', [insp.car_id])
        .then(({ rows }) => rows[0] && matchSavedSearches(rows[0]))
        .catch(() => {});
    }

    res.json({ success: true, score, published: !!(insp.car_id && passed) });
  } catch (err) {
    await client.query('ROLLBACK');
    log.error('complete inspection error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
