const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { uploadPhotos } = require('../middleware/upload');
const { matchSavedSearches } = require('../lib/alerts');
const { notifyUser } = require('../lib/notify');

const router = express.Router();

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
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /inspections/report/:carId — buyer-facing inspection report
// Must come before /:id to avoid "report" being treated as an id
router.get('/report/:carId', async (req, res) => {
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

// POST /inspections/cars/:carId/photos — admin uploads 36-angle photos
// Must come before /:id
router.post('/cars/:carId/photos', requireAdmin, uploadPhotos.array('photos', 40), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const urls = req.files.map(
      (f) => `${baseUrl}/uploads/cars/${req.params.carId}/${f.filename}`
    );
    await pool.query(
      `UPDATE cars SET images = array_cat(COALESCE(images, '{}'), $1::text[]) WHERE id = $2`,
      [urls, req.params.carId]
    );
    res.json({ uploaded: urls.length, urls });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /inspections/:id
router.get('/:id', requireAdmin, async (req, res) => {
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
router.post('/:id/start', requireAdmin, async (req, res) => {
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
    res.json(rows[0]);
  } catch (err) {
    console.error('start inspection error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /inspections/:id/complete — record checklist, weighted score, gated publish
router.post('/:id/complete', requireAdmin, async (req, res) => {
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
    console.error('complete inspection error:', err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
