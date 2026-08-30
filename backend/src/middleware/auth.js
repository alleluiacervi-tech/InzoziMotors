const jwt = require('jsonwebtoken');
const { log } = require('../lib/log');
const pool = require('../db');

// A verified signature is necessary but not sufficient. Tokens live 30 days,
// so between minting and expiry the account behind one can have its password
// changed, its password reset by someone holding the email, or be deleted
// outright. Each of those bumps users.token_version; a token carrying an older
// version is refused here, which is what makes "sign out everywhere" and
// account deletion actually mean something.
//
// The cost is one indexed primary-key lookup per authenticated request. That is
// the right trade for being able to end a session at all.
async function verifyLiveSession(payload) {
  const { rows } = await pool.query(
    'SELECT token_version, deleted_at, account_status FROM users WHERE id = $1',
    [payload.id]
  );
  if (!rows.length) return { ok: false, error: 'Account no longer exists' };
  if (rows[0].deleted_at) return { ok: false, error: 'This account has been deleted' };
  if (rows[0].account_status === 'suspended') return { ok: false, error: 'This account has been suspended. Contact support if you believe this is an error.' };
  // Closure is enforced here rather than at each route, so it inherits the
  // invariant that already holds for suspension and deletion: it takes effect
  // on the NEXT request from any device, not the next login.
  if (rows[0].account_status === 'closed') return { ok: false, error: 'This account is closed. Sign in to reopen it.' };
  // Tokens minted before the column existed carry no tv; treat as version 0.
  if ((payload.tv || 0) !== rows[0].token_version) {
    return { ok: false, error: 'Session ended. Please sign in again.' };
  }
  return { ok: true };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided', code: 'AUTH_REQUIRED' });
  }
  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // The code lets clients tell "your session is dead — drop the stored token"
    // apart from credential 401s (wrong password on login/change-password/delete),
    // where purging the token would sign out a perfectly valid session.
    return res.status(401).json({ error: 'Invalid or expired token', code: 'SESSION_EXPIRED' });
  }

  verifyLiveSession(payload)
    .then((result) => {
      if (!result.ok) {
        return res.status(401).json({ error: result.error, code: 'SESSION_REVOKED' });
      }
      req.user = payload;
      next();
    })
    .catch((err) => {
      log.error('session check failed', { error: err.message });
      res.status(500).json({ error: 'Server error' });
    });
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

// One message per state so the app can show the user what to actually do next
const VERIFICATION_MESSAGES = {
  none:     'Verify your identity before a listing or direct contact can become public.',
  pending:  'Your identity check is still under review.',
  rejected: 'Your identity check was not approved. Please re-submit your documents.',
};

// "Identity is mandatory for sellers" — enforced here, not just in the UI.
// The code + id_verified fields let the mobile app route straight to the
// ID-verification screen instead of showing a dead-end error.
// Read live from the users table: the JWT is long-lived (30d) and would still
// carry a stale 'none' long after an admin approved the seller.
function requireVerified(req, res, next) {
  requireAuth(req, res, async () => {
    if (req.user.role === 'admin') return next();
    try {
      const { rows } = await pool.query('SELECT id_verified FROM users WHERE id = $1', [req.user.id]);
      if (!rows.length) return res.status(401).json({ error: 'User not found', code: 'SESSION_REVOKED' });
      const state = rows[0].id_verified || 'none';
      if (state !== 'approved') {
        return res.status(403).json({
          error: VERIFICATION_MESSAGES[state] || VERIFICATION_MESSAGES.none,
          code: 'ID_VERIFICATION_REQUIRED',
          id_verified: state,
        });
      }
      next();
    } catch (err) {
      log.error('requireVerified error', { error: err.message });
      res.status(500).json({ error: 'Server error' });
    }
  });
}

module.exports = { requireAuth, requireAdmin, requireVerified, verifyLiveSession };
