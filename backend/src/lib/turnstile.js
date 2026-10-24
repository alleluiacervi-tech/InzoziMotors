const { log } = require('./log');

// ─────────────────────────────────────────────────────────────────────────────
// Cloudflare Turnstile: the website's "are you a person" check on sign-up.
//
// Off until TURNSTILE_SECRET_KEY is set here and NEXT_PUBLIC_TURNSTILE_SITE_KEY
// on the website (both from Cloudflare → Turnstile). Most people never see a
// puzzle; Cloudflare decides from the browser. The token is checked here, on
// the server, because a check done only in the page is one a script skips.
//
// The app has no Turnstile; app sign-ups rely on the other signals in
// lib/signup-risk.js.
// ─────────────────────────────────────────────────────────────────────────────

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;
const EXPECTED_ACTION = 'signup';

function turnstileConfigured() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/** 'passed' | 'failed' | 'unavailable' (Cloudflare could not be asked). */
async function verifyTurnstile(token, ip) {
  if (!token || typeof token !== 'string' || token.length > 2048) return 'failed';
  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      log.warn('turnstile verify http error', { status: res.status });
      return 'unavailable';
    }
    const data = await res.json();
    if (!data.success) return 'failed';
    // A token minted for another form on another site is not a sign-up check.
    if (data.action && data.action !== EXPECTED_ACTION) return 'failed';
    return 'passed';
  } catch (err) {
    log.warn('turnstile verify unreachable', { error: err.message });
    return 'unavailable';
  }
}

module.exports = { turnstileConfigured, verifyTurnstile, TURNSTILE_ACTION: EXPECTED_ACTION };
