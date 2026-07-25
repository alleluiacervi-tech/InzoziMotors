const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { notifyUser } = require('../lib/notify');

const router = express.Router();

// GET /referrals/mine — my code (created on first request) + stats
router.get('/mine', requireAuth, async (req, res) => {
  try {
    let { rows } = await pool.query('SELECT * FROM referrals WHERE user_id = $1', [req.user.id]);
    if (!rows.length) {
      const code = 'INZ' + req.user.id.replace(/-/g, '').slice(0, 6).toUpperCase();
      ({ rows } = await pool.query(
        `INSERT INTO referrals (user_id, code) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET code = referrals.code
         RETURNING *`,
        [req.user.id, code]
      ));
    }
    const redRes = await pool.query(
      'SELECT COUNT(*)::int AS redemptions FROM referral_redemptions WHERE code = $1',
      [rows[0].code]
    );
    res.json({ ...rows[0], redemptions: redRes.rows[0].redemptions });
  } catch (err) {
    console.error('referral error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /referrals/redeem — apply someone's code to my account (once)
router.post('/redeem', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required' });
  try {
    const refRes = await pool.query('SELECT * FROM referrals WHERE code = $1', [code.toUpperCase()]);
    if (!refRes.rows.length) return res.status(404).json({ error: 'Referral code not found' });
    if (refRes.rows[0].user_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot redeem your own code' });
    }
    const ins = await pool.query(
      `INSERT INTO referral_redemptions (code, redeemed_by)
       VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`,
      [code.toUpperCase(), req.user.id]
    );
    if (!ins.rows.length) return res.status(409).json({ error: 'You already redeemed this code' });
    await pool.query('UPDATE referrals SET uses = uses + 1 WHERE code = $1', [code.toUpperCase()]);
    await notifyUser(pool, {
      user_id: refRes.rows[0].user_id,
      type: 'listing_update',
      title: 'Your referral was used',
      body: 'Someone joined with your code — your commission discount grows.',
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
