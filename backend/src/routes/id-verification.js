const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { uploadIdDocs } = require('../middleware/upload');
const { recomputeTrustScore } = require('../lib/trust');
const { notifyUser } = require('../lib/notify');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// GET /id-verification/doc/:filename — admin-only access to KYC files.
// Accepts the JWT via Authorization header OR ?token= (so the admin dashboard's
// <a>/<img> can load it — browser navigation can't set headers). KYC documents
// are never served by the public static middleware.
router.get('/doc/:filename', (req, res) => {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : req.query.token;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  let user;
  try { user = jwt.verify(token, process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

  const filename = path.basename(req.params.filename); // strip any traversal
  const filePath = path.join(UPLOAD_DIR, 'id-docs', filename);
  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'File not found' });
  });
});

// POST /id-verification — seller uploads national ID + selfie
router.post('/', requireAuth, uploadIdDocs.fields([
  { name: 'id_front', maxCount: 1 },
  { name: 'id_back',  maxCount: 1 },
  { name: 'selfie',   maxCount: 1 },
]), async (req, res) => {
  const files = req.files;
  if (!files?.id_front || !files?.id_back || !files?.selfie) {
    return res.status(400).json({ error: 'id_front, id_back, and selfie are required' });
  }
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    // Point at the admin-gated file route, never the public static path
    const url = (f) => `${baseUrl}/id-verification/doc/${f[0].filename}`;

    // Persist onto the user row (single source of truth; resubmission overwrites)
    await pool.query(
      `UPDATE users
       SET id_verified = 'pending',
           id_front_url = $2, id_back_url = $3, selfie_url = $4,
           id_submitted_at = NOW()
       WHERE id = $1`,
      [req.user.id, url(files.id_front), url(files.id_back), url(files.selfie)]
    );

    // Informational notification only — no document URLs stored in meta
    await notifyUser(pool, {
      user_id: req.user.id,
      type: 'listing_update',
      title: 'ID verification submitted',
      body: 'Your documents are under review. We will notify you within 24 hours.',
    });

    res.json({ status: 'pending', message: 'Documents submitted for review' });
  } catch (err) {
    console.error('id-verification submit error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /id-verification/queue — admin: pending verifications (flat, deduped)
router.get('/queue', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, id_verified,
              id_front_url, id_back_url, selfie_url,
              id_submitted_at, created_at
       FROM users
       WHERE id_verified = 'pending'
       ORDER BY id_submitted_at ASC NULLS LAST`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /id-verification/:userId — admin approves or rejects (idempotent)
router.patch('/:userId', requireAdmin, async (req, res) => {
  const { decision } = req.body; // 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be approved or rejected' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query('SELECT id_verified FROM users WHERE id = $1 FOR UPDATE', [req.params.userId]);
    if (!cur.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'User not found' }); }
    const wasApproved = cur.rows[0].id_verified === 'approved';

    await client.query(`UPDATE users SET id_verified = $1 WHERE id = $2`, [decision, req.params.userId]);

    // Trust score is recomputed from components — no ad-hoc increments
    await recomputeTrustScore(req.params.userId, client);

    const msg = decision === 'approved'
      ? 'Your ID has been verified. You can now submit cars for inspection.'
      : 'Your ID verification was not accepted. Please resubmit clearer photos.';
    await notifyUser(client, {
      user_id: req.params.userId,
      type: 'listing_update',
      title: `ID ${decision}`,
      body: msg,
    });

    await client.query('COMMIT');
    res.json({ success: true, decision });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('id-verification decision error:', err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
