const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');

const router = express.Router();

// GET /saved-searches
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM saved_searches WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /saved-searches
router.post('/', requireAuth, async (req, res) => {
  const { label, filters, notify_enabled = true } = req.body;
  if (!label || !filters) {
    return res.status(400).json({ error: 'label and filters are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO saved_searches (user_id, label, filters, notify_enabled)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, label, JSON.stringify(filters), notify_enabled]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /saved-searches/:id — toggle notifications
router.patch('/:id', requireAuth, requireUuid('id'), async (req, res) => {
  const { notify_enabled } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE saved_searches SET notify_enabled = $1
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [notify_enabled, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /saved-searches/:id
router.delete('/:id', requireAuth, requireUuid('id'), async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM saved_searches WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
