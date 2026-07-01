const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /reviews — buyer leaves review after handover
router.post('/', requireAuth, async (req, res) => {
  const { handover_id, rating, comment } = req.body;
  if (!handover_id || !rating) {
    return res.status(400).json({ error: 'handover_id and rating are required' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be 1–5' });
  }
  try {
    const hRes = await pool.query(
      "SELECT * FROM handovers WHERE id = $1 AND buyer_id = $2 AND status = 'complete'",
      [handover_id, req.user.id]
    );
    if (!hRes.rows.length) {
      return res.status(404).json({ error: 'Completed handover not found' });
    }
    const h = hRes.rows[0];

    const { rows } = await pool.query(
      `INSERT INTO reviews (handover_id, reviewer_id, seller_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [handover_id, req.user.id, h.seller_id, rating, comment]
    );

    // Update seller trust score based on avg rating
    await pool.query(
      `UPDATE users SET trust_score = LEAST(100,
         GREATEST(0, trust_score + ($1 - 3) * 2))
       WHERE id = $2`,
      [rating, h.seller_id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /reviews/seller/:userId
router.get('/seller/:userId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name AS reviewer_name, c.title AS car_title
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       JOIN handovers h ON h.id = r.handover_id
       JOIN cars c ON c.id = h.car_id
       WHERE r.seller_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.userId]
    );
    const avg = rows.length
      ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1)
      : null;
    res.json({ reviews: rows, average_rating: avg, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /reviews/trust-score/:userId
router.get('/trust-score/:userId', async (req, res) => {
  try {
    const userRes = await pool.query(
      `SELECT id, name, trust_score, id_verified, completed_sales, response_rate
       FROM users WHERE id = $1`,
      [req.params.userId]
    );
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    const u = userRes.rows[0];

    const reviewRes = await pool.query(
      `SELECT AVG(rating)::numeric(3,1) AS avg_rating, COUNT(*) AS total
       FROM reviews WHERE seller_id = $1`,
      [u.id]
    );
    const { avg_rating, total } = reviewRes.rows[0];

    const idPts      = u.id_verified === 'approved' ? 30 : 0;
    const salesPts   = Math.min(30, u.completed_sales);
    const responsePts = Math.round((u.response_rate / 100) * 20);
    const reviewPts  = avg_rating ? Math.round(parseFloat(avg_rating) * 4) : 0;
    const total_score = idPts + salesPts + responsePts + reviewPts;

    res.json({
      total_score,
      breakdown: {
        id_verified:    { points: idPts, max: 30 },
        completed_sales: { points: salesPts, max: 30, count: u.completed_sales },
        response_rate:  { points: responsePts, max: 20, rate: u.response_rate },
        reviews:        { points: reviewPts, max: 20, avg: avg_rating, count: total },
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
