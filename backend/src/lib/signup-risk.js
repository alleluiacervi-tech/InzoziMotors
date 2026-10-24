// ─────────────────────────────────────────────────────────────────────────────
// Screening a sign-up for scripts (migration 0069, routes/auth.js /register).
//
// Three outcomes, chosen so a real person is never locked out:
//
//   blocked  no account is made. Only for proof of a script: the hidden form
//            field a person cannot see was filled, or the website's Turnstile
//            check failed. A person who hits this refreshes the page and tries
//            again.
//   held     the account is made but can do nothing until its email address
//            is confirmed with a six-digit code (middleware/auth.js). For
//            signals a real person can occasionally trip: an address built
//            from the name plus five or six digits, a throwaway mail domain,
//            Tor, a burst of sign-ups from one address, or a website sign-up
//            with no Turnstile token (a browser blocking Cloudflare's script). Confirming takes a
//            person thirty seconds; a script that typed someone else's address
//            never gets the code. No welcome email is sent while held.
//   allowed  everything else, exactly as before.
//
// Reasons are recorded for the team (signup_screenings) and never shown to the
// person signing up: telling a script which rule it tripped teaches it.
// ─────────────────────────────────────────────────────────────────────────────

const { isInternalIp } = require('./client-ip');

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', 'grr.la',
  '10minutemail.com', 'temp-mail.org', 'tempmail.com', 'tempmail.net', 'tempail.com',
  'yopmail.com', 'yopmail.net', 'trashmail.com', 'getnada.com', 'maildrop.cc',
  'dispostable.com', 'throwawaymail.com', 'fakeinbox.com', 'mintemail.com', 'emailondeck.com',
  'moakt.com', 'burnermail.io', 'mohmal.com', '1secmail.com', 'mail.tm', 'spamgourmet.com',
]);

/** Sign-ups from one address within this window, before the next is held. */
const VELOCITY_WINDOW = '1 hour';
const VELOCITY_LIMIT = 3;

function lettersOnly(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z]/g, '');
}

/**
 * The scripted pattern seen in Oct 2026: the local part is the account's own
 * name, letters only, then five or six digits ("margietate.70658" for "Margie
 * Tate"). Four digits are left alone; that is usually a birth year.
 * Mirrored by the backfill in migration 0069.
 */
function looksGenerated(name, email) {
  const local = String(email || '').toLowerCase().split('@')[0];
  const match = /^([a-z]+)[._]?([0-9]{5,6})$/.exec(local);
  if (!match) return false;
  const parts = String(name || '').trim().split(/\s+/).map(lettersOnly).filter(Boolean);
  if (!parts.length) return false;
  const forwards = parts.join('');
  const backwards = [...parts].reverse().join('');
  return match[1] === forwards || match[1] === backwards;
}

function disposableDomain(email) {
  const domain = String(email || '').toLowerCase().split('@')[1] || '';
  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * @param db        pool or client
 * @param input     { name, email, ip, country, client: 'web'|'app',
 *                    honeypot, turnstile: 'passed'|'failed'|'unavailable'|'missing'|'off' }
 * @returns { decision: 'allowed'|'held'|'blocked', reasons: string[] }
 */
async function screenSignup(db, input) {
  const reasons = [];
  if (input.honeypot) reasons.push('honeypot');
  if (input.turnstile === 'failed') reasons.push('bot_check_failed');
  if (reasons.length) return { decision: 'blocked', reasons };

  // The website always sends a token, but a browser that blocks Cloudflare's
  // script cannot. Held rather than refused, so that person still gets in.
  if (input.turnstile === 'missing') reasons.push('bot_check_missing');
  if (looksGenerated(input.name, input.email)) reasons.push('generated_email');
  if (disposableDomain(input.email)) reasons.push('disposable_email');
  if (input.country === 'T1') reasons.push('tor');
  // An internal address is this server's own network (the website before it
  // forwarded visitors, or a test), where every sign-up shares one address.
  if (input.ip && !isInternalIp(input.ip)) {
    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS n FROM signup_screenings
        WHERE ip = $1 AND created_at > NOW() - INTERVAL '${VELOCITY_WINDOW}'`,
      [input.ip]
    );
    if (rows[0].n >= VELOCITY_LIMIT) reasons.push('many_signups_from_address');
  }
  if (reasons.length) return { decision: 'held', reasons };

  // Cloudflare could not be asked. Not a reason to refuse anyone, but worth
  // seeing in the log if it keeps happening.
  if (input.turnstile === 'unavailable') return { decision: 'allowed', reasons: ['bot_check_unavailable'] };
  return { decision: 'allowed', reasons: [] };
}

async function recordScreening(db, { ip, country, email, client, decision, reasons, userId }) {
  await db.query(
    `INSERT INTO signup_screenings (ip, country, email, client, decision, reasons, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [ip, country, String(email).toLowerCase().slice(0, 320), client, decision, reasons, userId || null]
  );
}

module.exports = { screenSignup, recordScreening, looksGenerated, disposableDomain, VELOCITY_LIMIT };
