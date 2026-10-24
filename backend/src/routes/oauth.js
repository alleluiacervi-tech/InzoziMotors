// ─────────────────────────────────────────────────────────────────────────────
// Sign in / sign up with Google and Apple. Mounted at /auth/oauth.
//
// Every client hands over an ID token it got from the provider: the website
// after its server-side redirect flow, the iOS app from Apple's and Google's
// native sheets, the Android app from Google's. One route verifies it and
// returns the same session token /auth/login returns, so the rest of the
// platform cannot tell how somebody signed in.
//
// Who the token belongs to, in order:
//   1. an identity we already linked (provider + provider's user id)
//   2. an existing account with the same email, IF the provider says it
//      verified that email — then the identity is linked to it, so a person
//      who registered with a password and later taps "Continue with Google"
//      lands in their own account rather than a second one
//   3. otherwise a new account, with no password
//
// Refused, whatever the token says:
//   - admin accounts: the console is password-only with a 12-hour session, and
//     linking a staff account to an outside provider would route around both
//   - suspended or deleted accounts, with the same vague answer login gives
//   - an unverified provider email that matches an existing account (taking
//     over somebody's account by claiming their address)
// A closed account inside its thirty days is offered back, as with a password:
// the provider has just proved it is the same person.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const pool = require('../db');
const { log } = require('../lib/log');
const { requireAuth } = require('../middleware/auth');
const { withTransaction } = require('../lib/tx');
const { makeToken } = require('../lib/session-token');
const { noteIp } = require('../lib/ip-activity');
const { reopenAccount } = require('../lib/account-closure');
const { sendWelcome } = require('../lib/mailer');
const { verifyIdToken, isEnabled, OAuthError } = require('../lib/oauth');
const appleTokens = require('../lib/apple-tokens');

const router = express.Router();

const USER_FIELDS = `id, name, email, phone, role, id_verified, account_status, seller_type,
  business_name, business_verified, trust_score, avatar_url, token_version, created_at,
  purge_after, closed_at, deleted_at`;
// The same columns, qualified for a query that joins users as `u`.
const LINKED_USER_FIELDS = USER_FIELDS.split(',').map((f) => `u.${f.trim()}`).join(', ');

const PHONE_RE = /^\+[1-9]\d{7,14}$/;

/** Apple sends the name only once, on the very first authorization, and only to
 *  the client — never inside the token. Accept a string or its parts. */
function cleanName(raw) {
  if (!raw) return null;
  const text = typeof raw === 'string'
    ? raw
    : [raw.givenName ?? raw.firstName, raw.middleName, raw.familyName ?? raw.lastName].filter(Boolean).join(' ');
  const trimmed = String(text).replace(/\s+/g, ' ').trim().slice(0, 120);
  return trimmed.length >= 2 ? trimmed : null;
}

function publicUser(row) {
  // eslint-disable-next-line no-unused-vars
  const { token_version, purge_after, closed_at, deleted_at, ...user } = row;
  return user;
}

// GET /auth/oauth/providers — which buttons a client may draw.
router.get('/providers', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ google: isEnabled('google'), apple: isEnabled('apple') });
});

// POST /auth/oauth/:provider
router.post('/:provider(google|apple)', async (req, res) => {
  const { provider } = req.params;
  const { id_token: idToken, nonce, full_name: fullName, authorization_code: code, role, reopen } = req.body || {};

  if (!isEnabled(provider)) {
    return res.status(503).json({ error: `Sign in with ${provider === 'google' ? 'Google' : 'Apple'} is not available yet.`, code: 'PROVIDER_DISABLED' });
  }
  if (role !== undefined && !['buyer', 'seller'].includes(role)) {
    return res.status(400).json({ error: 'role must be buyer or seller' });
  }

  let identity;
  try {
    identity = await verifyIdToken(provider, idToken, { nonce });
  } catch (err) {
    if (err instanceof OAuthError) {
      log.warn('oauth token refused', { provider, code: err.code, reason: err.message });
      const status = err.code === 'JWKS_UNAVAILABLE' ? 503 : 401;
      return res.status(status).json({
        error: status === 503
          ? 'We could not reach the sign-in service. Please try again.'
          : 'That sign-in could not be confirmed. Please try again.',
        code: err.code,
      });
    }
    log.error('oauth verify error', { provider, error: err.message });
    return res.status(500).json({ error: 'Server error' });
  }

  try {
    const result = await withTransaction(async (client) => {
      let user = null;
      let isNew = false;

      // 1. An identity we already know.
      const linked = await client.query(
        `SELECT ${LINKED_USER_FIELDS}
           FROM user_identities ui JOIN users u ON u.id = ui.user_id
          WHERE ui.provider = $1 AND ui.subject = $2
          FOR UPDATE OF u`,
        [provider, identity.subject]
      );
      if (linked.rowCount) {
        user = linked.rows[0];
      } else {
        // 2. An account with the same, provider-verified email.
        if (identity.email) {
          const byEmail = await client.query(
            `SELECT ${USER_FIELDS} FROM users WHERE email = $1 FOR UPDATE`,
            [identity.email]
          );
          if (byEmail.rowCount) {
            if (!identity.emailVerified) {
              return {
                status: 409,
                body: {
                  error: 'An account already uses this email. Sign in with your password instead.',
                  code: 'EMAIL_IN_USE',
                },
              };
            }
            user = byEmail.rows[0];
          }
        }

        if (!user) {
          // 3. A new account. An email is the one thing we cannot do without:
          //    it is how the account is found, reset and written to.
          if (!identity.email) {
            return {
              status: 400,
              body: {
                error: 'Your account did not share an email address. Allow email access and try again, or sign up with your email.',
                code: 'EMAIL_REQUIRED',
              },
            };
          }
          const name = cleanName(fullName) || cleanName(identity.name) || identity.email.split('@')[0];
          const created = await client.query(
            `INSERT INTO users (name, email, password_hash, role, phone)
             VALUES ($1, $2, NULL, $3, NULL)
             RETURNING ${USER_FIELDS}`,
            [name, identity.email, role || 'buyer']
          );
          user = created.rows[0];
          isNew = true;
        }
      }

      // Whatever the route to the account, the same gates as a password.
      if (user.deleted_at || user.account_status === 'suspended') {
        return { status: 403, body: { error: 'This account cannot be signed into. Contact Sawa Cars if you think this is a mistake.', code: 'ACCOUNT_UNAVAILABLE' } };
      }
      if (user.role === 'admin') {
        return { status: 403, body: { error: 'Staff accounts sign in with their password.', code: 'ADMIN_PASSWORD_ONLY' } };
      }
      if (user.account_status === 'closed') {
        if (!reopen) {
          return {
            status: 403,
            body: {
              error: 'This account is closed. You can reopen it until '
                + `${new Date(user.purge_after).toISOString().slice(0, 10)}, after which it is erased for good.`,
              code: 'ACCOUNT_CLOSED',
              reopen_until: user.purge_after,
            },
          };
        }
        const reopened = await reopenAccount(client, user.id);
        if (!reopened) {
          return { status: 410, body: { error: 'The thirty days have passed and this account has been erased. You are welcome to create a new one.', code: 'ACCOUNT_PURGED' } };
        }
        const fresh = await client.query(`SELECT ${USER_FIELDS} FROM users WHERE id = $1`, [user.id]);
        user = fresh.rows[0];
      }

      await client.query(
        `INSERT INTO user_identities (user_id, provider, subject, email, email_verified, apple_client_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (provider, subject) DO UPDATE
           SET email = COALESCE(EXCLUDED.email, user_identities.email),
               email_verified = EXCLUDED.email_verified,
               apple_client_id = COALESCE(EXCLUDED.apple_client_id, user_identities.apple_client_id),
               last_used_at = NOW()`,
        [user.id, provider, identity.subject, identity.email, identity.emailVerified,
          provider === 'apple' ? identity.audience : null]
      );

      // The provider has proved this person reads that inbox: the same proof
      // the email code gives, so it lifts a suspected-script hold (0069).
      if (identity.emailVerified && identity.email && identity.email === user.email) {
        await client.query(
          `UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()),
                  access_hold = NULL, access_hold_reasons = '{}', access_hold_at = NULL
            WHERE id = $1`,
          [user.id]
        );
      }

      return {
        status: isNew ? 201 : 200,
        body: {
          user: publicUser(user),
          token: makeToken(user),
          is_new: isNew,
          // A provider gives us a name and an email, never a phone number, and
          // a person signing up with one has not chosen buyer or seller. The
          // clients ask for both right after sign-up, and only then: signing
          // in never asks, even if that step was skipped.
          needs_profile: isNew && !user.phone,
        },
        after: { isNew, user, appleClientId: identity.audience },
      };
    });

    if (result.status >= 200 && result.status < 300) {
      noteIp(result.after.user.id, req, result.after.isNew ? 'signup' : 'login');
      if (result.after.isNew) sendWelcome(result.after.user.email, result.after.user.name);
      if (provider === 'apple' && code) {
        // Stored for the revoke Apple requires at account deletion. Never in the
        // request's path: a slow Apple must not slow a sign-in.
        appleTokens.exchangeCode(result.after.appleClientId, code).then((refresh) => {
          if (!refresh) return;
          return pool.query(
            `UPDATE user_identities SET apple_refresh_token = $1, apple_client_id = $2
              WHERE provider = 'apple' AND user_id = $3`,
            [refresh, result.after.appleClientId, result.after.user.id]
          );
        }).catch((err) => log.warn('apple refresh token store failed', { error: err.message }));
      }
    }
    res.status(result.status).json(result.body);
  } catch (err) {
    if (err.code === '23505') {
      // Two first sign-ins racing on one email or identity: the second loses
      // the insert. Retrying finds the row the first one wrote.
      return res.status(409).json({ error: 'Please try signing in again.', code: 'RETRY' });
    }
    log.error('oauth sign-in error', { provider, error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/oauth/complete-profile — the two things a provider cannot tell us.
//
// Only while the profile is incomplete (no phone yet). After that, the phone
// is edited in the profile like anyone else's, and a role is not something a
// person flips: a seller's listings and verification hang off it.
router.post('/complete-profile', requireAuth, async (req, res) => {
  const phone = String(req.body?.phone || '').replace(/[\s-]/g, '');
  const role = req.body?.role;
  if (!PHONE_RE.test(phone)) {
    return res.status(400).json({ error: 'A valid phone number with country code is required (e.g. +250788123456)', code: 'INVALID_PHONE' });
  }
  if (role !== undefined && !['buyer', 'seller'].includes(role)) {
    return res.status(400).json({ error: 'role must be buyer or seller' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE users
          SET phone = $1,
              role = CASE WHEN $2::text IS NOT NULL AND role IN ('buyer', 'seller') THEN $2::text ELSE role END
        WHERE id = $3 AND phone IS NULL AND deleted_at IS NULL
        RETURNING id, name, email, phone, role, id_verified, account_status, seller_type,
                  business_name, business_verified, trust_score, avatar_url, created_at`,
      [phone, role ?? null, req.user.id]
    );
    if (!rows.length) {
      return res.status(409).json({ error: 'This profile is already complete. Change your phone number in your profile.', code: 'PROFILE_COMPLETE' });
    }
    // The role travels in the session token, so a new one goes back with it.
    const tv = await pool.query('SELECT token_version FROM users WHERE id = $1', [req.user.id]);
    res.json({ user: rows[0], token: makeToken({ ...rows[0], token_version: tv.rows[0].token_version }) });
  } catch (err) {
    log.error('complete profile error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
