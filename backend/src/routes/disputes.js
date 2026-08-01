const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { notifyUser } = require('../lib/notify');

const router = express.Router();

// POST /disputes — buyer raises a dispute within the 7-day return window
router.post('/', requireAuth, async (req, res) => {
  const { handover_id, reason } = req.body;
  if (!handover_id || !reason?.trim()) {
    return res.status(400).json({ error: 'handover_id and reason are required' });
  }
  try {
    const hRes = await pool.query(
      `SELECT * FROM handovers
       WHERE id = $1 AND buyer_id = $2 AND status = 'complete'`,
      [handover_id, req.user.id]
    );
    if (!hRes.rows.length) {
      return res.status(404).json({ error: 'Completed handover not found for this account' });
    }
    const h = hRes.rows[0];
    const withinWindow = h.confirmed_at &&
      (Date.now() - new Date(h.confirmed_at).getTime()) <= 7 * 24 * 60 * 60 * 1000;
    if (!withinWindow) {
      return res.status(400).json({ error: 'The 7-day return window for this handover has passed' });
    }
    const existing = await pool.query(
      "SELECT 1 FROM disputes WHERE handover_id = $1 AND status = 'open'", [handover_id]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'A dispute is already open for this handover' });
    }

    const { rows } = await pool.query(
      `INSERT INTO disputes (handover_id, raised_by, reason)
       VALUES ($1, $2, $3) RETURNING *`,
      [handover_id, req.user.id, reason.trim()]
    );
    await notifyUser(pool, {
      user_id: req.user.id,
      type: 'handover',
      title: 'Dispute received',
      body: 'We received your dispute. The Sawa team will review it and contact both parties within 24 hours.',
      meta: JSON.stringify({ disputeId: rows[0].id }),
    });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('dispute error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /disputes/mine — my raised disputes
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, h.booking_id, c.title AS car_title
       FROM disputes d
       JOIN handovers h ON h.id = d.handover_id
       JOIN cars c ON c.id = h.car_id
       WHERE d.raised_by = $1
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /disputes — admin: all disputes (filter ?status=open)
router.get('/', requireAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    const params = [];
    let where = '';
    if (status) { params.push(status); where = 'WHERE d.status = $1'; }
    const { rows } = await pool.query(
      `SELECT d.*, h.booking_id, c.title AS car_title,
              buyer.name AS buyer_name, seller.name AS seller_name
       FROM disputes d
       JOIN handovers h ON h.id = d.handover_id
       JOIN cars c ON c.id = h.car_id
       JOIN users buyer ON buyer.id = h.buyer_id
       JOIN users seller ON seller.id = h.seller_id
       ${where}
       ORDER BY d.created_at ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /disputes/:id — admin resolves or rejects
router.patch('/:id', requireAdmin, async (req, res) => {
  const { status, resolution } = req.body;
  if (!['resolved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be resolved or rejected' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE disputes
       SET status = $1, resolution = $2, resolved_at = NOW()
       WHERE id = $3 AND status = 'open'
       RETURNING *`,
      [status, resolution || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Open dispute not found' });
    await notifyUser(pool, {
      user_id: rows[0].raised_by,
      type: 'handover',
      title: `Dispute ${status}`,
      body: resolution || `Your dispute has been ${status} by the Sawa team.`,
      meta: JSON.stringify({ disputeId: rows[0].id }),
    });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
