// Session tokens — one place, so every way of signing in (password, invite,
// Google, Apple) mints exactly the same credential.
const jwt = require('jsonwebtoken');

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

module.exports = { makeToken, tokenTtl };
