const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const { recomputeTrustScore } = require('../lib/trust');

const router = express.Router();

// Reviews are the platform's second user-generated surface (chat is the
// first), so they carry the same Apple-1.2 obligations: anyone can report
// one, and an admin can take one down. Removal is a soft hide (removed_at)
// so the row remains as evidence and the one-review-per-handover rule keeps
// holding; every public read and the trust-score maths exclude removed rows.

// POST /reviews — buyer leaves review after handover (one review per handover)
router.post('/', requireAuth, async (req, res) => {
  const { handover_id, rating } = req.body;
  let { comment } = req.body;
  if (!handover_id || !rating) {
    return res.status(400).json({ error: 'handover_id and rating are required' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be 1–5' });
  }
  // Free text needs a ceiling — an unbounded comment is a storage and
  // moderation problem at once.
  if (comment != null) {
    comment = String(comment).trim().slice(0, 1000) || null;
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

    const existing = await pool.query(
      'SELECT id FROM reviews WHERE handover_id = $1',
      [handover_id]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'You already reviewed this purchase' });
    }

    const { rows } = await pool.query(
      `INSERT INTO reviews (handover_id, reviewer_id, seller_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [handover_id, req.user.id, h.seller_id, rating, comment]
    );

    // lib/trust is the only writer of users.trust_score
    await recomputeTrustScore(h.seller_id);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You already reviewed this purchase' });
    }
    log.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /reviews/seller/:userId
router.get('/seller/:userId', requireUuid('userId'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name AS reviewer_name, c.title AS car_title
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       JOIN handovers h ON h.id = r.handover_id
       JOIN cars c ON c.id = h.car_id
       WHERE r.seller_id = $1 AND r.removed_at IS NULL
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
router.get('/trust-score/:userId', requireUuid('userId'), async (req, res) => {
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
       FROM reviews WHERE seller_id = $1 AND removed_at IS NULL`,
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

// POST /reviews/:id/report — anyone signed in can flag a review
router.post('/:id/report', requireAuth, requireUuid('id'), async (req, res) => {
  const reason = String(req.body?.reason || '').trim().slice(0, 500);
  if (!reason) return res.status(400).json({ error: 'A reason is required' });
  try {
    const review = await pool.query(
      'SELECT id FROM reviews WHERE id = $1 AND removed_at IS NULL',
      [req.params.id]
    );
    if (!review.rows.length) return res.status(404).json({ error: 'Review not found' });

    await pool.query(
      `INSERT INTO review_reports (review_id, reporter_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (review_id, reporter_id) DO NOTHING`,
      [req.params.id, req.user.id, reason]
    );
    // Idempotent 201 either way: "you already reported this" would tell a
    // harasser their target's reports are landing, for no user benefit.
    res.status(201).json({ success: true });
  } catch (err) {
    log.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /reviews/admin/reports — the moderation queue
router.get('/admin/reports', requireAdmin, async (req, res) => {
  const status = ['open', 'resolved', 'dismissed', 'all'].includes(req.query.status)
    ? req.query.status
    : 'open';
  try {
    const { rows } = await pool.query(
      `SELECT rr.*, r.rating, r.comment, r.removed_at, r.seller_id,
              reporter.name AS reporter_name,
              author.name   AS author_name,
              seller.name   AS seller_name
       FROM review_reports rr
       JOIN reviews r        ON r.id = rr.review_id
       JOIN users reporter   ON reporter.id = rr.reporter_id
       JOIN users author     ON author.id = r.reviewer_id
       JOIN users seller     ON seller.id = r.seller_id
       WHERE ($1 = 'all' OR rr.status = $1)
       ORDER BY rr.created_at DESC
       LIMIT 200`,
      [status]
    );
    res.json(rows);
  } catch (err) {
    log.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /reviews/admin/reports/:id — close a report without touching the review
router.patch('/admin/reports/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const status = ['resolved', 'dismissed'].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ error: "status must be 'resolved' or 'dismissed'" });
  try {
    const { rows } = await pool.query(
      'UPDATE review_reports SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Report not found' });
    res.json(rows[0]);
  } catch (err) {
    log.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /reviews/:id — admin takedown. Soft: the row stays, the public read
// and the seller's trust score stop counting it, and open reports resolve.
router.delete('/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const reason = String(req.body?.reason || '').trim().slice(0, 500) || 'removed by moderator';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE reviews SET removed_at = NOW(), removed_reason = $1
       WHERE id = $2 AND removed_at IS NULL
       RETURNING seller_id`,
      [reason, req.params.id]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Review not found (or already removed)' });
    }
    await client.query(
      `UPDATE review_reports SET status = 'resolved' WHERE review_id = $1 AND status = 'open'`,
      [req.params.id]
    );
    await client.query('COMMIT');
    // The removed review no longer counts toward the seller's 20 review points.
    await recomputeTrustScore(rows[0].seller_id);
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    log.error(err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
