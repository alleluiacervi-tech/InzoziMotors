const jwt = require('jsonwebtoken');
const pool = require('../db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
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
  none:     'Verify your identity before submitting a car.',
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
      if (!rows.length) return res.status(401).json({ error: 'User not found' });
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
      console.error('requireVerified error:', err.message);
      res.status(500).json({ error: 'Server error' });
    }
  });
}

module.exports = { requireAuth, requireAdmin, requireVerified };
