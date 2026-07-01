const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { uploadPhotos } = require('../middleware/upload');

const router = express.Router();

// GET /inspections — admin: all scheduled inspections
router.get('/', requireAdmin, async (req, res) => {
  const { status, center, date } = req.query;
  const conditions = [];
  const params = [];

  if (status) { params.push(status); conditions.push(`i.status = $${params.length}`); }
  if (center) { params.push(center); conditions.push(`i.center = $${params.length}`); }
  if (date)   { params.push(date);   conditions.push(`i.scheduled_at::date = $${params.length}::date`); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  try {
    const { rows } = await pool.query(
      `SELECT i.*,
              s.asking_price,
              u.name AS seller_name, u.email AS seller_email,
              c.title AS car_title, c.make, c.model, c.year
       FROM inspections i
       JOIN submissions s ON s.id = i.submission_id
       JOIN users u ON u.id = s.seller_id
       LEFT JOIN cars c ON c.id = i.car_id
       ${where}
       ORDER BY i.scheduled_at ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /inspections/:id
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*,
              u.name AS seller_name, u.email AS seller_email,
              c.title AS car_title, c.make, c.model, c.year, c.mileage, c.vin
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

// POST /inspections/:id/complete — admin submits 150-pt results
// Body: { results: { Engine: { 'Oil level': 'pass', ... }, ... }, notes, score }
router.post('/:id/complete', requireAdmin, async (req, res) => {
  const { results, notes, score } = req.body;
  if (!results || score === undefined) {
    return res.status(400).json({ error: 'results and score are required' });
  }
  try {
    const inspRes = await pool.query('SELECT * FROM inspections WHERE id = $1', [req.params.id]);
    if (!inspRes.rows.length) return res.status(404).json({ error: 'Inspection not found' });
    const insp = inspRes.rows[0];

    await pool.query(
      `UPDATE inspections
       SET results = $1, notes = $2, score = $3,
           status = 'complete', completed_at = NOW(), inspector_id = $4
       WHERE id = $5`,
      [JSON.stringify(results), notes, score, req.user.id, insp.id]
    );

    // Update the car's inspection data
    if (insp.car_id) {
      await pool.query(
        `UPDATE cars SET inspected = TRUE, inspection_score = $1,
                         status = 'live', listed_at = NOW()
         WHERE id = $2`,
        [score, insp.car_id]
      );
    }

    // Update submission status to live
    await pool.query(
      `UPDATE submissions SET status = 'live' WHERE id = $1`,
      [insp.submission_id]
    );

    // Notify seller
    const subRes = await pool.query(
      'SELECT seller_id FROM submissions WHERE id = $1',
      [insp.submission_id]
    );
    if (subRes.rows.length) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, meta)
         VALUES ($1, 'listing_update', 'Inspection complete — car is live!',
                 $2, $3)`,
        [
          subRes.rows[0].seller_id,
          `Your car passed the 150-point inspection with a score of ${score}/150. It is now live on the marketplace.`,
          JSON.stringify({ inspectionId: insp.id }),
        ]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /inspections/report/:carId — buyer-facing inspection report
router.get('/report/:carId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.results, i.score, i.notes, i.completed_at,
              u.name AS inspector_name,
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
      `UPDATE cars SET images = array_cat(images, $1::text[]) WHERE id = $2`,
      [urls, req.params.carId]
    );
    res.json({ uploaded: urls.length, urls });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
