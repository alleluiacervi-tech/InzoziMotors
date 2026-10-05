// ─────────────────────────────────────────────────────────────────────────────
// Sign in with Google / Sign in with Apple — identity token verification.
//
// Every client (website, iOS app, Android app) ends with the same thing: an ID
// token, a JWT signed by Google or Apple that says who the person is. This
// module is the only place such a token is trusted, and it trusts it only after
// checking all of:
//
//   signature  against the provider's published keys (JWKS), fetched over
//              HTTPS and cached, re-fetched once when an unknown key id appears
//   iss        the provider's own issuer string
//   aud        one of OUR client ids — a token minted for another app is
//              a valid token for someone else, and must be refused
//   exp / iat  not expired, not issued in the future (60 s clock skew)
//   nonce      when the client sent one, it must match (replay protection)
//
// No SDK: Node's crypto turns a JWK into a key, and jsonwebtoken (already a
// dependency) checks RS256/ES256 signatures and the registered claims.
//
// Configuration — all public identifiers, none of them secrets:
//   GOOGLE_CLIENT_IDS   comma-separated OAuth client ids: web, iOS, Android
//   APPLE_CLIENT_IDS    the iOS bundle id (the app's native sign-in; the
//                       website offers Google only)
// A provider with no client id configured is switched off: its route answers
// 503 and GET /auth/oauth/providers reports it unavailable, so no client draws
// a button that cannot work.
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const PROVIDERS = {
  google: {
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
    algorithms: ['RS256'],
    clientIdsEnv: 'GOOGLE_CLIENT_IDS',
  },
  apple: {
    jwksUrl: 'https://appleid.apple.com/auth/keys',
    issuers: ['https://appleid.apple.com'],
    algorithms: ['RS256'],
    clientIdsEnv: 'APPLE_CLIENT_IDS',
  },
};

const JWKS_TTL_MS = 60 * 60 * 1000;
const CLOCK_TOLERANCE_S = 60;

class OAuthError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function clientIds(provider) {
  const raw = process.env[PROVIDERS[provider].clientIdsEnv] || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function isEnabled(provider) {
  return Boolean(PROVIDERS[provider]) && clientIds(provider).length > 0;
}

// ── JWKS cache ───────────────────────────────────────────────────────────────
// Tests replace the fetcher so they never touch the network.
let fetchJwks = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new OAuthError('JWKS_UNAVAILABLE', `Key fetch failed (${res.status})`);
  return res.json();
};
const jwksCache = new Map(); // url -> { keys: Map(kid -> KeyObject), fetchedAt }

async function loadKeys(url, force = false) {
  const cached = jwksCache.get(url);
  if (!force && cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.keys;
  const body = await fetchJwks(url);
  const keys = new Map();
  for (const jwk of body.keys || []) {
    if (!jwk.kid) continue;
    try {
      keys.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: 'jwk' }));
    } catch {
      // A key we cannot parse is a key we cannot verify with; skip it.
    }
  }
  jwksCache.set(url, { keys, fetchedAt: Date.now() });
  return keys;
}

async function keyFor(url, kid) {
  let keys = await loadKeys(url);
  if (keys.has(kid)) return keys.get(kid);
  // Providers rotate keys; one refresh on an unknown kid, never a loop.
  keys = await loadKeys(url, true);
  if (keys.has(kid)) return keys.get(kid);
  throw new OAuthError('INVALID_TOKEN', 'The sign-in token was not signed by a known key');
}

const sha256Hex = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

/**
 * Verify an ID token and return the identity it asserts.
 * @returns {{ provider, subject, email, emailVerified, name }}
 */
async function verifyIdToken(provider, idToken, { nonce } = {}) {
  const config = PROVIDERS[provider];
  if (!config) throw new OAuthError('UNKNOWN_PROVIDER', 'Unknown sign-in provider');
  const audiences = clientIds(provider);
  if (!audiences.length) throw new OAuthError('PROVIDER_DISABLED', `${provider} sign-in is not configured`);
  if (typeof idToken !== 'string' || idToken.split('.').length !== 3) {
    throw new OAuthError('INVALID_TOKEN', 'The sign-in token is malformed');
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded?.header?.kid) throw new OAuthError('INVALID_TOKEN', 'The sign-in token is malformed');
  // OAUTH_TEST_JWKS_URL lets an end-to-end run sign its own tokens. It is
  // ignored outside NODE_ENV=test, so production always asks Google and Apple.
  const jwksUrl = (process.env.NODE_ENV === 'test' && process.env.OAUTH_TEST_JWKS_URL) || config.jwksUrl;
  const key = await keyFor(jwksUrl, decoded.header.kid);

  let claims;
  try {
    claims = jwt.verify(idToken, key, {
      algorithms: config.algorithms,
      issuer: config.issuers,
      audience: audiences,
      clockTolerance: CLOCK_TOLERANCE_S,
    });
  } catch (err) {
    throw new OAuthError('INVALID_TOKEN', `The sign-in token was refused: ${err.message}`);
  }
  if (!claims.sub) throw new OAuthError('INVALID_TOKEN', 'The sign-in token names nobody');

  // A nonce the client generated must come back inside the token. Apple's
  // native flow puts the SHA-256 of the raw nonce in the token; the web flows
  // put the raw value. Either proves this token answers this request.
  if (nonce !== undefined && nonce !== null && nonce !== '') {
    const inToken = claims.nonce;
    if (!inToken || (inToken !== String(nonce) && inToken !== sha256Hex(nonce))) {
      throw new OAuthError('INVALID_TOKEN', 'The sign-in token does not match this request');
    }
  }

  // Google sends a boolean; Apple has sent both a boolean and the string "true".
  const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
  return {
    provider,
    audience: String(Array.isArray(claims.aud) ? claims.aud[0] : claims.aud),
    subject: String(claims.sub),
    email: claims.email ? String(claims.email).toLowerCase() : null,
    emailVerified,
    name: typeof claims.name === 'string' ? claims.name : null,
  };
}

module.exports = {
  OAuthError,
  verifyIdToken,
  isEnabled,
  clientIds,
  // Test seams.
  __setJwksFetcher(fn) { fetchJwks = fn; jwksCache.clear(); },
};
