// ─────────────────────────────────────────────────────────────────────────────
// Sign in with Apple — the server-to-server half.
//
// Apple requires an app that offers Sign in with Apple to revoke the user's
// tokens when they delete their account (App Store Review Guideline 5.1.1(v),
// enforced since 30 June 2022). Revoking needs a refresh token, which only an
// exchange of the one-time authorization code at sign-in returns, and both
// calls authenticate with a short-lived client secret: an ES256 JWT signed with
// the private key created in the Apple Developer account.
//
// Configuration (all three, or none — the feature degrades to "not stored"):
//   APPLE_TEAM_ID       10 characters, e.g. 5Z2LA9U639
//   APPLE_KEY_ID        the key's id in Certificates, Identifiers & Profiles
//   APPLE_PRIVATE_KEY   the .p8 contents; literal "\n" sequences are accepted
//
// Neither call ever blocks a sign-in or an account closure. A failure is
// logged, the person carries on, and closure stays complete in-app as Apple
// itself requires.
// ─────────────────────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const { log } = require('./log');

const APPLE_AUDIENCE = 'https://appleid.apple.com';

function configured() {
  return Boolean(process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
}

function clientSecret(clientId) {
  const key = String(process.env.APPLE_PRIVATE_KEY).replace(/\\n/g, '\n');
  return jwt.sign({}, key, {
    algorithm: 'ES256',
    keyid: process.env.APPLE_KEY_ID,
    issuer: process.env.APPLE_TEAM_ID,
    audience: APPLE_AUDIENCE,
    subject: clientId,
    expiresIn: '5m',
  });
}

async function post(path, form) {
  const res = await fetch(`${APPLE_AUDIENCE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
    signal: AbortSignal.timeout(8000),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/** Exchange a sign-in's authorization code for a refresh token, or null. */
async function exchangeCode(clientId, code) {
  if (!configured() || !clientId || !code) return null;
  try {
    const { ok, status, body } = await post('/auth/token', {
      client_id: clientId,
      client_secret: clientSecret(clientId),
      code: String(code),
      grant_type: 'authorization_code',
    });
    if (!ok || !body.refresh_token) {
      log.warn('apple code exchange failed', { status, error: body.error });
      return null;
    }
    return body.refresh_token;
  } catch (err) {
    log.warn('apple code exchange error', { error: err.message });
    return null;
  }
}

/** Revoke a refresh token. Resolves true when Apple accepted it. */
async function revoke(clientId, refreshToken) {
  if (!configured() || !clientId || !refreshToken) return false;
  try {
    const { ok, status, body } = await post('/auth/revoke', {
      client_id: clientId,
      client_secret: clientSecret(clientId),
      token: refreshToken,
      token_type_hint: 'refresh_token',
    });
    if (!ok) log.warn('apple token revoke failed', { status, error: body.error });
    return ok;
  } catch (err) {
    log.warn('apple token revoke error', { error: err.message });
    return false;
  }
}

module.exports = { configured, exchangeCode, revoke };
