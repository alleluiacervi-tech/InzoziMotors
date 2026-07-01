const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { uploadIdDocs } = require('../middleware/upload');

const router = express.Router();

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
    const docUrls = {
      id_front: `${baseUrl}/uploads/id-docs/${files.id_front[0].filename}`,
      id_back:  `${baseUrl}/uploads/id-docs/${files.id_back[0].filename}`,
      selfie:   `${baseUrl}/uploads/id-docs/${files.selfie[0].filename}`,
    };

    await pool.query(
      `UPDATE users SET id_verified = 'pending' WHERE id = $1`,
      [req.user.id]
    );

    // Store doc URLs in a verification record (use notifications meta for now)
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, meta)
       VALUES ($1, 'listing_update', 'ID verification submitted',
               'Your documents are under review. We will notify you within 24 hours.', $2)`,
      [req.user.id, JSON.stringify({ type: 'id_verification', docs: docUrls, userId: req.user.id })]
    );

    res.json({ status: 'pending', message: 'Documents submitted for review' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /id-verification/queue — admin: pending verifications
router.get('/queue', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.id_verified, u.created_at,
              n.meta AS docs, n.created_at AS submitted_at
       FROM users u
       LEFT JOIN notifications n ON n.meta->>'userId' = u.id::text
         AND n.meta->>'type' = 'id_verification'
       WHERE u.id_verified = 'pending'
       ORDER BY u.created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /id-verification/:userId — admin approves or rejects
router.patch('/:userId', requireAdmin, async (req, res) => {
  const { decision } = req.body; // 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be approved or rejected' });
  }
  try {
    await pool.query(
      `UPDATE users SET id_verified = $1 WHERE id = $2`,
      [decision, req.params.userId]
    );

    const msg = decision === 'approved'
      ? 'Your ID has been verified. You can now submit cars for inspection.'
      : 'Your ID verification was not accepted. Please resubmit clearer photos.';

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES ($1, 'listing_update', $2, $3)`,
      [req.params.userId, `ID ${decision}`, msg]
    );

    if (decision === 'approved') {
      await pool.query(
        `UPDATE users SET trust_score = trust_score + 30 WHERE id = $1`,
        [req.params.userId]
      );
    }

    res.json({ success: true, decision });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
