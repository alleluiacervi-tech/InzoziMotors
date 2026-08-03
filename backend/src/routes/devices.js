const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const TOKEN_RE = /^ExponentPushToken\[.+\]$/;
const PLATFORMS = ['ios', 'android', 'web'];

// POST /devices/token — register (or refresh) this device's Expo push token
router.post('/token', requireAuth, async (req, res) => {
  const { token, platform } = req.body;
  if (!token || !TOKEN_RE.test(token)) {
    return res.status(400).json({ error: 'token must be a valid Expo push token' });
  }
  if (platform && !PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `platform must be one of: ${PLATFORMS.join(', ')}` });
  }
  try {
    // A phone can change hands or be re-used after logout — the token always
    // follows whoever logged in last, so pushes never reach the wrong account.
    const { rows } = await pool.query(
      `INSERT INTO device_tokens (user_id, token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             platform = COALESCE(EXCLUDED.platform, device_tokens.platform)
       RETURNING *`,
      [req.user.id, token, platform || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    log.error('register device token error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /devices/token — unregister on logout
router.delete('/token', requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM device_tokens WHERE token = $1 AND user_id = $2',
      [token, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Token not found for this account' });
    res.json({ success: true });
  } catch (err) {
    log.error('delete device token error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /devices/tokens — the caller's own registered devices (debugging aid)
router.get('/tokens', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, token, platform, created_at FROM device_tokens WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
