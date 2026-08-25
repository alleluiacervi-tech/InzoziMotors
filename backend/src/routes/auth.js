const express = require('express');
const { log } = require('../lib/log');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendResetCode, sendWelcome, sendPasswordChanged, sendAccountDeleted } = require('../lib/mailer');
const { withTransaction } = require('../lib/tx');

const router = express.Router();

// How long a token stays valid. An ordinary account keeps the long lifetime —
// signing a buyer out every day would be hostile for no security gain.
//
// An admin token is different in kind: it carries full pipeline control and
// can read national ID documents. The admin dashboard already narrows its
// COOKIE to 12 hours for exactly that reason, but the token inside that cookie
// was minted for 30 days — so the limit only ever applied to the browser that
// stored it. Anything that lifted the token out (a shared operations laptop, a
// copied header, a stale terminal) held a valid admin credential for a month.
// The token now expires with the session it belongs to, and signing in again
// is cheap.
const DEFAULT_TOKEN_TTL = process.env.JWT_EXPIRES_IN || '30d';
const ADMIN_TOKEN_TTL = process.env.ADMIN_JWT_EXPIRES_IN || '12h';

/** Unknown or absent role is treated as ordinary — never widen by accident. */
function tokenTtl(user) {
  return user?.role === 'admin' ? ADMIN_TOKEN_TTL : DEFAULT_TOKEN_TTL;
}

function makeToken(user) {
  // name is in the payload so socket messages can carry sender_name.
  // tv (token version) is what makes a session endable — middleware/auth.js
  // compares it against users.token_version on every authenticated request, so
  // bumping that column revokes every token issued before the bump.
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      tv: user.token_version || 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: tokenTtl(user) }
  );
}

// Ends every existing session for a user and returns the new version, so the
// caller can immediately mint a replacement token for whoever is still on the
// line (the person who just changed their own password should stay signed in).
async function revokeSessions(client, userId) {
  const { rows } = await client.query(
    'UPDATE users SET token_version = token_version + 1 WHERE id = $1 RETURNING token_version',
    [userId]
  );
  return rows[0]?.token_version ?? 0;
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'buyer' } = req.body;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (password && password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if (!['buyer', 'seller'].includes(role)) {
    return res.status(400).json({ error: 'role must be buyer or seller' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, id_verified, trust_score, token_version, created_at`,
      [name, email.toLowerCase(), hash, role]
    );
    const user = rows[0];
    // Fire-and-forget: a slow mail server must never slow a signup down, and
    // the welcome mail doubles as the soft check that the address is real.
    sendWelcome(user.email, user.name);
    res.status(201).json({ user, token: makeToken(user) });
  } catch (err) {
    log.error('register error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  try {
    const { rows } = await pool.query(
      // Deleted and suspended accounts must not be signable-into. The shared
      // response keeps both states indistinguishable from "no such account".
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL AND account_status = \'active\'',
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const { password_hash, ...safe } = user;
    res.json({ user: safe, token: makeToken(user) });
  } catch (err) {
    log.error('login error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/accept-invite — one-use, time-limited password setup for any
// admin-created account. This replaces the common but unsafe pattern of
// emailing a temporary password.
//
// The predicate deliberately keeps `admin_created=TRUE`: only an account the
// team created can be claimed this way, so a self-registered user's row can
// never be taken over with a guessed token. It no longer requires
// seller_type='showroom', which is what previously limited this to showrooms.
async function acceptInvite(req, res) {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (token.length < 32 || password.length < 8) {
    return res.status(400).json({ error: 'A valid invitation and password of 8+ characters are required' });
  }
  const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
  try {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM users WHERE invite_token_hash=$1 AND invite_expires_at>NOW()
          AND admin_created=TRUE FOR UPDATE`, [tokenHash]
      );
      if (!rows.length) return null;
      const passwordHash = await bcrypt.hash(password, 12);
      const updated = await client.query(
        `UPDATE users SET password_hash=$1,must_change_password=FALSE,invite_token_hash=NULL,
          invite_expires_at=NULL,token_version=token_version+1 WHERE id=$2
         RETURNING id,name,email,phone,role,id_verified,seller_type,business_name,token_version,created_at`,
        [passwordHash, rows[0].id]
      );
      return updated.rows[0];
    });
    if (!result) return res.status(410).json({ error: 'This invitation is invalid, expired, or already used' });
    res.json({ user: result, token: makeToken(result) });
  } catch (err) {
    log.error('accept invite error', { error: err.message });
    res.status(500).json({ error: 'Could not activate the account' });
  }
}

router.post('/accept-invite', acceptInvite);
// The original path, kept alive because invite links already sitting in
// inboxes point at it and a 404 there loses the account.
router.post('/accept-showroom-invite', acceptInvite);

// ─── Password reset ───────────────────────────────────────────────────────────
// No email/SMS provider is wired yet, so the 6-digit code is logged server-side.
// Setting RESET_CODE_ECHO=true also returns it in the response — an explicit
// opt-in rather than anything inferred from NODE_ENV, because a host that echoes
// the code hands every account, admin included, to any unauthenticated caller.
// Phase 8 swaps the delivery for Africa's Talking / email — the endpoints and
// the code flow stay identical and this knob goes away.

const RESET_CODE_TTL = '30 minutes';
const RESET_MAX_ATTEMPTS = 5;
const RESET_INVALID = 'This reset code is invalid or has expired.';

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  const addr = String(email).toLowerCase();
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [addr]);
    // Always 200 — a different answer for unknown addresses would tell an
    // attacker which emails have accounts here.
    if (!userRes.rows.length) return res.json({ success: true });
    const userId = userRes.rows[0].id;

    // One code per minute per account, so the endpoint can't be used to spam
    const recent = await pool.query(
      `SELECT 1 FROM password_resets
       WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
         AND created_at > NOW() - INTERVAL '60 seconds'`,
      [userId]
    );
    if (recent.rows.length) return res.json({ success: true });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    await withTransaction(async (client) => {
      // Issuing a new code retires every older one
      await client.query(
        'UPDATE password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [userId]
      );
      await client.query(
        `INSERT INTO password_resets (user_id, code_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '${RESET_CODE_TTL}')`,
        [userId, codeHash]
      );
    });

    // Real delivery when SMTP is configured; the server log remains the
    // fallback so development needs no provider. The response never reveals
    // whether the send happened — that would leak account existence.
    const delivered = await sendResetCode(addr, code);
    // Until SMTP is configured this log IS the delivery channel, so the code
    // has to be readable here. It is the one place a secret is logged on
    // purpose, and it stops being needed the moment SMTP_HOST is set.
    if (!delivered) log.warn('password reset code not emailed — no SMTP configured', { email: addr, code });

    // Both conditions, so neither a forgotten NODE_ENV nor a stray opt-in on a
    // deployed box is enough on its own to leak the code to the caller.
    if (process.env.RESET_CODE_ECHO === 'true' && process.env.NODE_ENV !== 'production') {
      return res.json({ success: true, dev_code: code });
    }
    res.json({ success: true });
  } catch (err) {
    log.error('forgot-password error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, code, new_password } = req.body;
  if (!email || !code || !new_password) {
    return res.status(400).json({ error: 'email, code, and new_password are required' });
  }
  if (String(new_password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const userRes = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [String(email).toLowerCase()]
      );
      if (!userRes.rows.length) return { status: 400, body: { error: RESET_INVALID } };
      const userId = userRes.rows[0].id;

      const resetRes = await client.query(
        `SELECT * FROM password_resets
         WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1
         FOR UPDATE`,
        [userId]
      );
      if (!resetRes.rows.length) return { status: 400, body: { error: RESET_INVALID } };
      const reset = resetRes.rows[0];

      const ok = await bcrypt.compare(String(code), reset.code_hash);
      if (!ok) {
        // A 6-digit secret is guessable — burn the code after 5 wrong tries
        const bumped = await client.query(
          'UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts',
          [reset.id]
        );
        if (bumped.rows[0].attempts >= RESET_MAX_ATTEMPTS) {
          await client.query('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [reset.id]);
        }
        return { status: 400, body: { error: RESET_INVALID } };
      }

      const hash = await bcrypt.hash(String(new_password), 12);
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
      // Retire this code and any other outstanding one — the account is settled
      await client.query(
        'UPDATE password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [userId]
      );
      // The whole point of a reset is that someone lost control of the account.
      // Leaving the previous holder's 30-day token working would defeat it.
      await revokeSessions(client, userId);
      return { status: 200, body: { success: true } };
    });
    if (result.status === 200) {
      // If the reset was NOT the owner, this notice is how they find out.
      pool.query('SELECT name FROM users WHERE email = $1', [String(email).toLowerCase()])
        .then(({ rows: r }) => sendPasswordChanged(String(email).toLowerCase(), r[0]?.name))
        .catch(() => {});
    }
    res.status(result.status).json(result.body);
  } catch (err) {
    log.error('reset-password error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, whatsapp_phone, phone_visible,
              whatsapp_visible, contact_consent_at, role, id_verified, account_status,
              seller_type, business_name, business_verified, trust_score,
              response_rate, completed_sales, avatar_url,
              marketplace_terms_accepted_at, marketplace_terms_version, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /auth/me — update own profile
router.patch('/me', requireAuth, async (req, res) => {
  const EDITABLE = ['name', 'phone', 'whatsapp_phone', 'phone_visible', 'whatsapp_visible', 'avatar_url'];
  const fields = EDITABLE.filter((field) => req.body[field] !== undefined);
  if (!fields.length) return res.status(400).json({ error: 'No editable profile fields provided' });
  if (req.body.name !== undefined && !String(req.body.name).trim()) {
    return res.status(400).json({ error: 'name cannot be empty' });
  }
  for (const field of ['phone', 'whatsapp_phone']) {
    const value = req.body[field];
    if (value !== undefined && value !== null && value !== '' && !/^\+?[0-9 ()-]{9,24}$/.test(String(value))) {
      return res.status(400).json({ error: `${field} is not a valid phone number` });
    }
  }
  for (const field of ['phone_visible', 'whatsapp_visible']) {
    if (req.body[field] !== undefined && typeof req.body[field] !== 'boolean') {
      return res.status(400).json({ error: `${field} must be true or false` });
    }
  }
  const values = Object.fromEntries(fields.map((field) => {
    if (['phone_visible', 'whatsapp_visible'].includes(field)) return [field, req.body[field]];
    const value = req.body[field];
    return [field, value == null || value === '' ? null : String(value).trim()];
  }));
  try {
    const result = await withTransaction(async (client) => {
      const current = await client.query(
        `SELECT id, role, id_verified, account_status, deleted_at, seller_type,
                business_verified, phone, whatsapp_phone, phone_visible, whatsapp_visible
         FROM users WHERE id = $1 FOR UPDATE`,
        [req.user.id]
      );
      if (!current.rowCount) return { status: 404, body: { error: 'User not found' } };
      const before = current.rows[0];
      const finalPhone = values.phone !== undefined ? values.phone : before.phone;
      const finalWhatsapp = values.whatsapp_phone !== undefined ? values.whatsapp_phone : before.whatsapp_phone;
      const finalPhoneVisible = values.phone_visible !== undefined ? values.phone_visible : before.phone_visible;
      const finalWhatsappVisible = values.whatsapp_visible !== undefined ? values.whatsapp_visible : before.whatsapp_visible;
      if (finalPhoneVisible || finalWhatsappVisible) {
        const eligible = before.role === 'seller' && before.id_verified === 'approved' &&
          before.account_status === 'active' && !before.deleted_at &&
          (before.seller_type !== 'showroom' || before.business_verified === true);
        if (!eligible) {
          return { status: 403, body: { error: 'Only an active, verified seller may publish contact details' } };
        }
        if (finalPhoneVisible && !finalPhone) {
          return { status: 400, body: { error: 'Add a phone number before making it visible' } };
        }
        if (finalWhatsappVisible && !finalWhatsapp) {
          return { status: 400, body: { error: 'Add a WhatsApp number before making it visible' } };
        }
      }

      const params = fields.map((field) => values[field]);
      const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
      if (values.phone_visible === true || values.whatsapp_visible === true) {
        assignments.push('contact_consent_at = NOW()');
      }
      params.push(req.user.id);
      const { rows } = await client.query(
        `UPDATE users
         SET ${assignments.join(', ')}
         WHERE id = $${params.length}
         RETURNING id, name, email, phone, whatsapp_phone, phone_visible,
                   whatsapp_visible, contact_consent_at, role, id_verified, account_status,
                   seller_type, business_name, business_verified, trust_score, avatar_url`,
        params
      );
      return { status: 200, body: rows[0] };
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    log.error('profile update error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'current_password and a new_password of 6+ characters are required' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        'SELECT id, name, email, role, password_hash FROM users WHERE id = $1',
        [req.user.id]
      );
      if (!rows.length || !rows[0].password_hash) {
        return { status: 400, body: { error: 'Password login is not enabled for this account' } };
      }
      const user = rows[0];
      const ok = await bcrypt.compare(current_password, user.password_hash);
      if (!ok) return { status: 401, body: { error: 'Current password is incorrect' } };

      const hash = await bcrypt.hash(new_password, 12);
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);

      // Changing a password is how someone reacts to a device being lost or a
      // password being shared. It has to end the OTHER sessions — so bump the
      // version, then hand this caller a token at the new version so the device
      // they are holding is not signed out by their own security action.
      const token_version = await revokeSessions(client, user.id);
      return {
        status: 200,
        body: { success: true, token: makeToken({ ...user, token_version }) },
        notify: { email: user.email, name: user.name },
      };
    });
    if (result.notify) sendPasswordChanged(result.notify.email, result.notify.name);
    res.status(result.status).json(result.body);
  } catch (err) {
    log.error('change-password error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Account deletion ─────────────────────────────────────────────────────────
// Required by Apple (Guideline 5.1.1(v)) and Google Play for any app that lets
// people create an account: deletion must be initiable from inside the app, not
// only by emailing support.
//
// Soft delete, not DELETE FROM users. Historical records and moderation events
// retain foreign keys, while all identifying data is overwritten.
//
// What is actively removed rather than anonymised: identity documents (the most
// sensitive thing held, and nothing depends on them once the account is gone),
// push tokens (a deleted account must stop reaching the handset), saved cars,
// saved searches and device registrations.
router.delete('/me', requireAuth, async (req, res) => {
  const { password } = req.body || {};
  try {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        'SELECT id, password_hash, id_front_url, id_back_url, selfie_url FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
        [req.user.id]
      );
      if (!rows.length) return { status: 404, body: { error: 'Account not found' } };
      const user = rows[0];

      // Re-authenticate. Deletion is irreversible, and a token left open on a
      // borrowed handset must not be enough to destroy someone's account.
      if (user.password_hash) {
        if (!password) {
          return { status: 400, body: { error: 'Enter your password to confirm deletion' } };
        }
        const ok = await bcrypt.compare(String(password), user.password_hash);
        if (!ok) return { status: 401, body: { error: 'That password is not correct' } };
      }

      // Any listing still on the marketplace comes down with the account.
      await client.query(
        `UPDATE cars SET status = 'archived', archived_at = NOW(),
                         archive_reason = 'Seller account deleted'
         WHERE seller_id = $1 AND status IN ('live', 'paused', 'approved', 'under_review', 'scheduled', 'inspecting')`,
        [user.id]
      );

      await client.query('DELETE FROM saved_cars      WHERE user_id = $1', [user.id]);
      await client.query('DELETE FROM saved_searches  WHERE user_id = $1', [user.id]);
      await client.query('DELETE FROM device_tokens   WHERE user_id = $1', [user.id]);
      await client.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
      await client.query('DELETE FROM notifications   WHERE user_id = $1', [user.id]);

      // The email is released back for reuse but must stay UNIQUE, so it is
      // replaced with a value derived from the id rather than simply nulled.
      await client.query(
        `UPDATE users SET
           name = 'Deleted user',
           email = 'deleted+' || id || '@deleted.sawacars.com',
           phone = NULL, whatsapp_phone = NULL,
           phone_visible = FALSE, whatsapp_visible = FALSE,
           contact_consent_at = NULL,
           password_hash = NULL,
           avatar_url = NULL,
           id_front_url = NULL, id_back_url = NULL, selfie_url = NULL,
           id_verified = 'none', id_submitted_at = NULL,
           deleted_at = NOW(),
           token_version = token_version + 1
         WHERE id = $1`,
        [user.id]
      );

      return {
        status: 200,
        body: { success: true },
        files: [user.id_front_url, user.id_back_url, user.selfie_url],
        // The row's email is already overwritten — this copy, captured before,
        // is the only way the confirmation can still reach them.
        notify: { email: user.email, name: user.name },
      };
    });

    // Identity documents are erased from disk after the row is committed. Doing
    // it inside the transaction would leave files deleted but the account intact
    // if the commit failed. Failures here are logged, never fatal — the account
    // is already gone from the user's point of view.
    if (result.status === 200) {
      removeIdDocuments(result.files);
      // The written record of what was deleted and what the law keeps.
      if (result.notify) sendAccountDeleted(result.notify.email, result.notify.name);
    }

    res.status(result.status).json(result.body);
  } catch (err) {
    log.error('delete account error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// URLs are of the form <base>/id-verification/doc/<filename>; only the basename
// is used, so nothing outside the id-docs directory can be reached from here.
function removeIdDocuments(urls) {
  const dir = path.join(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'), 'id-docs');
  for (const url of (urls || []).filter(Boolean)) {
    const filename = path.basename(String(url).split('?')[0]);
    if (!filename || filename === '.' || filename === '..') continue;
    fs.unlink(path.join(dir, filename), (err) => {
      if (err && err.code !== 'ENOENT') {
        log.warn('id document cleanup failed', { filename, error: err.message });
      }
    });
  }
}

module.exports = router;
