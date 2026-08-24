const express = require('express');
const { log } = require('../lib/log');
const { sendIdDecision } = require('../lib/mailer');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const { uploadIdDocs, verifyImageContent } = require('../middleware/upload');
const { recomputeTrustScore } = require('../lib/trust');
const { notifyUser } = require('../lib/notify');
const { recordAdminAction } = require('../lib/admin-audit');
const { publicApiOrigin } = require('../lib/public-origin');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// ─── Scoped, short-lived links to KYC files ───────────────────────────────────
// Browser navigation cannot set an Authorization header, so an <a href> or
// <img src> has to carry its credential in the URL. This route used to accept
// the caller's full session JWT there — a 30-day, full-privilege admin token
// written into Nginx access logs, browser history, and any Referer the opened
// page emitted. The web→admin hand-off in the website deliberately uses a URL
// fragment for exactly this reason; a query string has none of those properties.
//
// A view token instead: signed with the same secret but scoped to ONE filename,
// valid for minutes, and carrying no role or identity. Leaking it costs the
// ability to read one document for a short window, not the admin account.
const VIEW_TOKEN_TTL = '15m';
const VIEW_SCOPE = 'kyc-doc';

function signViewToken(filename) {
  return jwt.sign({ scope: VIEW_SCOPE, file: filename }, process.env.JWT_SECRET, {
    expiresIn: VIEW_TOKEN_TTL,
  });
}

// Stored values are absolute URLs; only the basename identifies the file.
function viewUrl(req, storedUrl) {
  if (!storedUrl) return null;
  const filename = path.basename(String(storedUrl).split('?')[0]);
  const base = publicApiOrigin(req);
  return `${base}/id-verification/doc/${encodeURIComponent(filename)}?sig=${signViewToken(filename)}`;
}

// Erases identity documents from disk. Best-effort by contract: a file that is
// already gone, or a URL from an older scheme, must never fail the request
// around it. Only the basename is used, so nothing outside id-docs is reachable.
function removeIdDocuments(urls) {
  for (const url of (urls || []).filter(Boolean)) {
    const filename = path.basename(String(url).split('?')[0]);
    if (!filename || filename === '.' || filename === '..') continue;
    fs.unlink(path.join(UPLOAD_DIR, 'id-docs', filename), (err) => {
      if (err && err.code !== 'ENOENT') {
        log.warn('id document cleanup failed', { filename, error: err.message });
      }
    });
  }
}

// GET /id-verification/doc/:filename
// Two ways in: an admin session via the Authorization header (programmatic
// access, still fully privileged), or a view token bound to this exact file.
router.get('/doc/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // strip any traversal
  const header = req.headers.authorization;

  let authorised = false;
  if (header && header.startsWith('Bearer ')) {
    try {
      const user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      authorised = user.role === 'admin';
    } catch { /* fall through to the view token */ }
  } else if (req.query.sig) {
    try {
      const claim = jwt.verify(String(req.query.sig), process.env.JWT_SECRET);
      // Both checks matter: scope stops a session token being replayed here,
      // and the filename binding stops one document's link opening another's.
      authorised = claim.scope === VIEW_SCOPE && claim.file === filename;
    } catch { /* expired or forged */ }
  }

  if (!authorised) {
    return res.status(401).json({
      error: 'This document link has expired. Reload the verification queue.',
    });
  }

  // These are identity documents: never let a shared cache hold one, and never
  // let the URL travel onward in a Referer.
  res.set('Cache-Control', 'no-store, private');
  res.set('Referrer-Policy', 'no-referrer');

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
]), verifyImageContent, async (req, res) => {
  const files = req.files;
  if (!files?.id_front || !files?.id_back || !files?.selfie) {
    return res.status(400).json({ error: 'id_front, id_back, and selfie are required' });
  }
  try {
    const baseUrl = publicApiOrigin(req);
    // Point at the admin-gated file route, never the public static path
    const url = (f) => `${baseUrl}/id-verification/doc/${f[0].filename}`;

    // Resubmission overwrote the URLs on the row and left the previous scans on
    // disk forever, unreferenced and unreachable — a growing pile of national ID
    // photographs nothing could clean up. The privacy policy says we delete
    // them; this is the first half of making that true (account deletion is the
    // other half, in routes/auth.js).
    const prior = await pool.query(
      'SELECT id_front_url, id_back_url, selfie_url FROM users WHERE id = $1',
      [req.user.id]
    );

    // Persist onto the user row (single source of truth; resubmission overwrites)
    await pool.query(
      `UPDATE users
       SET id_verified = 'pending',
           id_front_url = $2, id_back_url = $3, selfie_url = $4,
           id_submitted_at = NOW()
       WHERE id = $1`,
      [req.user.id, url(files.id_front), url(files.id_back), url(files.selfie)]
    );

    // Only after the row points at the new files, so a failure above can never
    // leave a user with deleted documents and no replacement.
    removeIdDocuments(Object.values(prior.rows[0] || {}));

    // Informational notification only — no document URLs stored in meta
    await notifyUser(pool, {
      user_id: req.user.id,
      type: 'listing_update',
      title: 'ID verification submitted',
      body: 'Your documents are under review. We will notify you within 24 hours.',
    });

    res.json({ status: 'pending', message: 'Documents submitted for review' });
  } catch (err) {
    log.error('id-verification submit error', { error: err.message });
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
    // Document URLs leave here already signed, so the dashboard never has to
    // reach for a credential to build a link — which is how the admin session
    // token ended up in a query string in the first place.
    res.json(rows.map((u) => ({
      ...u,
      id_front_url: viewUrl(req, u.id_front_url),
      id_back_url: viewUrl(req, u.id_back_url),
      selfie_url: viewUrl(req, u.selfie_url),
    })));
  } catch (err) {
    log.error('id-verification queue error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /id-verification/:userId — admin approves or rejects (idempotent)
router.patch('/:userId', requireAdmin, requireUuid('userId'), async (req, res) => {
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

    await client.query(
      `UPDATE users SET id_verified = $1,
         token_version = token_version + CASE WHEN $1 = 'rejected' AND id_verified = 'approved' THEN 1 ELSE 0 END
       WHERE id = $2`,
      [decision, req.params.userId]
    );

    let affectedListings = 0;
    let affectedRentals = 0;
    if (decision === 'rejected' && wasApproved) {
      await client.query('UPDATE users SET phone_visible=FALSE, whatsapp_visible=FALSE WHERE id=$1', [req.params.userId]);
      affectedListings = (await client.query(
        `UPDATE cars SET status='under_review',
           review_notes=CONCAT_WS(E'\n', NULLIF(review_notes, ''), 'Seller identity approval was revoked; review is required before republication.')
         WHERE seller_id=$1 AND status IN ('live','approved','paused')`, [req.params.userId]
      )).rowCount;
      affectedRentals = (await client.query(
        "UPDATE rental_cars SET status='maintenance' WHERE provider_id=$1 AND status='active'", [req.params.userId]
      )).rowCount;
    }

    // Trust score is recomputed from components — no ad-hoc increments
    await recomputeTrustScore(req.params.userId, client);

    const msg = decision === 'approved'
      ? 'Your ID has been verified. Approved listings and contact options can now be activated after inspection.'
      : 'Your ID verification was not accepted. Please resubmit clearer photos.';
    await notifyUser(client, {
      user_id: req.params.userId,
      type: 'listing_update',
      title: `ID ${decision}`,
      body: msg,
    });

    await recordAdminAction(client, {
      actorId: req.user.id, action: `identity.${decision}`, targetType: 'user', targetId: req.params.userId,
      summary: `Identity verification ${decision}`,
      metadata: { previous_status: cur.rows[0].id_verified, decision, affected_listings: affectedListings, affected_rentals: affectedRentals },
    });

    await client.query('COMMIT');
    // After the commit, fire-and-forget: the decision email is the one sellers
    // actually wait on, but it must never be able to roll the decision back.
    pool.query('SELECT email, name FROM users WHERE id = $1', [req.params.userId])
      .then(({ rows: u }) => u[0] && sendIdDecision(u[0].email, u[0].name, decision === 'approved'))
      .catch(() => {});
    res.json({ success: true, decision });
  } catch (err) {
    await client.query('ROLLBACK');
    log.error('id-verification decision error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
