const express = require('express');
const { log } = require('../lib/log');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendResetCode, sendWelcome, sendPasswordChanged, sendAccountClosed } = require('../lib/mailer');
const {
  CLOSURE_REASONS, REASON_VALUES, RECOVERY_DAYS, closeAccount, reopenAccount,
} = require('../lib/account-closure');
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
      //
      // A CLOSED account is deliberately let through this query and refused
      // below instead — the whole point of the thirty-day window is that the
      // person can come back, and they cannot be offered that if signing in
      // looks the same as having no account. The credential check still has to
      // pass first: "this account is closed" is information about somebody
      // else's account until you have proved it is yours.
      `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL
         AND account_status IN ('active', 'closed')`,
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
    if (user.account_status === 'closed') {
      return res.status(403).json({
        error: 'This account is closed. You can reopen it with the same password until '
          + `${new Date(user.purge_after).toISOString().slice(0, 10)}, after which it is erased for good.`,
        code: 'ACCOUNT_CLOSED',
        reopen_until: user.purge_after,
      });
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

// ─── Account closure ──────────────────────────────────────────────────────────
// Required by Apple (Guideline 5.1.1(v)) and Google Play: deletion must be
// initiable AND completable from inside the app, not only by emailing support.
//
// What this used to be: one irreversible transaction that overwrote every
// identifying field, with no reason recorded and no way back. It was compliant
// and it told the business nothing.
//
// What it is now: closure is immediate and needs nobody's approval — the
// session dies on the next request, listings come down, contact goes off, login
// is refused. For thirty days the row is intact and the person can sign back in
// and reopen; after that an operator purges it and the erasure is exactly what
// this route always did. See lib/account-closure.js for why an admin cannot
// veto a closure, and why the purge is a person rather than a scheduler.

// GET /auth/closure-reasons — the fixed vocabulary, so the app renders the same
// options the CHECK constraint accepts and neither can drift.
router.get('/closure-reasons', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({ reasons: CLOSURE_REASONS, recovery_days: RECOVERY_DAYS });
});

router.delete('/me', requireAuth, async (req, res) => {
  const { password, reason, note } = req.body || {};
  if (!REASON_VALUES.has(String(reason))) {
    return res.status(400).json({
      error: 'Choose a reason for closing your account.',
      code: 'CLOSURE_REASON_REQUIRED',
      reasons: CLOSURE_REASONS,
    });
  }
  try {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        'SELECT id, name, email, password_hash FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
        [req.user.id]
      );
      if (!rows.length) return { status: 404, body: { error: 'Account not found' } };
      const user = rows[0];

      // Re-authenticate. A token left open on a borrowed handset must not be
      // enough to take somebody's account off the marketplace.
      if (user.password_hash) {
        if (!password) {
          return { status: 400, body: { error: 'Enter your password to confirm' } };
        }
        const ok = await bcrypt.compare(String(password), user.password_hash);
        if (!ok) return { status: 401, body: { error: 'That password is not correct' } };
      }

      const closed = await closeAccount(client, { userId: user.id, reason: String(reason), note });
      if (!closed) return { status: 409, body: { error: 'This account is already closed' } };

      return {
        status: 200,
        body: {
          success: true,
          closed_at: closed.closed_at,
          // What the app shows on the confirmation screen. Saying the date out
          // loud is the difference between a window somebody can use and one
          // that only exists in a database.
          reopen_until: closed.purge_after,
          recovery_days: RECOVERY_DAYS,
          listings_taken_down: closed.listings_taken_down,
        },
        notify: { email: user.email, name: user.name, until: closed.purge_after },
      };
    });

    if (result.status === 200 && result.notify) {
      sendAccountClosed(result.notify.email, result.notify.name, result.notify.until);
    }
    res.status(result.status).json(result.body);
  } catch (err) {
    log.error('close account error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/reopen — take it back, with the same credentials that closed it.
//
// Unauthenticated by necessity: closing bumped token_version, so there is no
// session left to authenticate with. The password IS the authentication, which
// is why this sits behind authLimiter alongside login.
router.post('/reopen', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT id, password_hash, purge_after FROM users
          WHERE email = $1 AND deleted_at IS NULL AND closed_at IS NOT NULL FOR UPDATE`,
        [String(email).toLowerCase()]
      );
      // One response for "no such account", "not closed" and "wrong password".
      // Anything else turns this into an oracle for which addresses closed an
      // account and when.
      const generic = { status: 401, body: { error: 'Invalid email or password' } };
      if (!rows.length || !rows[0].password_hash) return generic;
      if (!(await bcrypt.compare(String(password), rows[0].password_hash))) return generic;

      const user = await reopenAccount(client, rows[0].id);
      if (!user) {
        // Closed, correct password, but past the window. This one is worth
        // saying plainly: the alternative is somebody retyping a password they
        // know is right, against an account that no longer exists.
        return {
          status: 410,
          body: {
            error: 'The thirty days have passed and this account has been erased. You are welcome to create a new one.',
            code: 'ACCOUNT_PURGED',
          },
        };
      }
      return { status: 200, body: { user, token: makeToken(user) } };
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    log.error('reopen account error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
