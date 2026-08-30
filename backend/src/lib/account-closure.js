// ─────────────────────────────────────────────────────────────────────────────
// Closing an account, and — thirty days later — erasing it.
//
// Two steps that used to be one. `DELETE /auth/me` re-authenticated, overwrote
// every identifying field and archived the listings in a single transaction:
// compliant, irreversible, and silent about why anybody left.
//
// ── Closure is immediate, and nobody approves it ─────────────────────────────
// The obvious design — the person asks, an operator confirms — is an App Store
// rejection risk. Guideline 5.1.1(v) requires deletion to be initiated AND
// completed from inside the app, and a request parked in a queue until somebody
// gets to it is not that. So closing needs no permission: the session dies on
// the next request, listings come down, contact visibility goes off, login is
// refused. The admin queue sees every closure and its reason — the visibility
// the business wanted — without being able to stand in the way.
//
// ── The thirty days are for the user, not for us ─────────────────────────────
// Between closing and purging the row is intact and the person can sign in and
// reopen. That window exists because the person who pressed the button was
// sometimes angry, sometimes mistaken, and occasionally not the account holder.
//
// ── Purge by predicate, run by a person ──────────────────────────────────────
// This backend has no scheduler, on purpose — 0009 wrote that down. Purging is
// therefore an admin action, surfaced in the Action Center once accounts are
// due, plus scripts/purge-closed-accounts.js for anyone who wants it on a cron.
// A handful of rows a month does not justify a job runner.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const fs = require('fs');
const path = require('path');
const { log } = require('./log');

const RECOVERY_DAYS = 30;

// Fixed vocabulary, mirrored by the CHECK in migration 0036. The whole reason
// to ask is to be able to count the answers; free text goes in the note.
const CLOSURE_REASONS = [
  { value: 'found_a_car', label: 'I found a car' },
  { value: 'sold_my_car', label: 'I sold my car' },
  { value: 'not_useful', label: "I didn't find what I was looking for" },
  { value: 'too_many_messages', label: 'Too many messages or notifications' },
  { value: 'privacy', label: "I don't want my details on the platform" },
  { value: 'bad_experience', label: 'I had a bad experience' },
  { value: 'duplicate_account', label: 'I have another account' },
  { value: 'other', label: 'Something else' },
];

const REASON_VALUES = new Set(CLOSURE_REASONS.map((r) => r.value));
const REASON_LABELS = new Map(CLOSURE_REASONS.map((r) => [r.value, r.label]));

/** Close it. Everything here is reversible until the purge. */
async function closeAccount(client, { userId, reason, note }) {
  // Down, not archived-with-a-reason-of-deleted: the account may come back, and
  // a reopened seller should find their listings where they left them, under
  // review, rather than archived and unrecoverable.
  const listings = await client.query(
    `UPDATE cars SET status = 'under_review',
       review_notes = CONCAT_WS(E'\n', NULLIF(review_notes, ''),
                                'Seller closed their account; awaiting review if it is reopened.')
     WHERE seller_id = $1 AND status IN ('live', 'paused', 'approved')`,
    [userId]
  );
  const rentals = await client.query(
    "UPDATE rental_cars SET status = 'maintenance' WHERE provider_id = $1 AND status = 'active'",
    [userId]
  );
  // A closed account must stop reaching the handset immediately. Unlike the
  // listings, there is nothing to restore — the device re-registers on sign-in.
  await client.query('DELETE FROM device_tokens WHERE user_id = $1', [userId]);

  const { rows } = await client.query(
    `UPDATE users SET
       account_status = 'closed',
       closed_at = NOW(),
       closure_reason = $2,
       closure_note = NULLIF($3, ''),
       purge_after = NOW() + ($4 || ' days')::interval,
       -- Contact details stop being disclosable the moment the account closes,
       -- not thirty days later. This is the same cascade a revoked identity
       -- triggers, and for the same reason.
       phone_visible = FALSE,
       whatsapp_visible = FALSE,
       -- Every session, on every device, ends on its next request.
       token_version = token_version + 1
     WHERE id = $1 AND deleted_at IS NULL AND closed_at IS NULL
     RETURNING id, name, email, closed_at, purge_after, closure_reason`,
    [userId, reason, String(note || '').slice(0, 1000), String(RECOVERY_DAYS)]
  );
  if (!rows.length) return null;
  return { ...rows[0], listings_taken_down: listings.rowCount, rentals_paused: rentals.rowCount };
}

/** Undo a closure that has not yet been purged. Listings stay under review —
 *  coming back does not re-publish anything without a person looking at it. */
async function reopenAccount(client, userId) {
  const { rows } = await client.query(
    `UPDATE users SET
       account_status = 'active',
       closed_at = NULL, closure_reason = NULL, closure_note = NULL, purge_after = NULL,
       token_version = token_version + 1
     WHERE id = $1 AND deleted_at IS NULL AND closed_at IS NOT NULL AND purge_after > NOW()
     RETURNING id, name, email, role, token_version`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * Erase one account for good — the anonymisation DELETE /auth/me always did.
 *
 * Returns the identity-document URLs so the caller can delete the files after
 * the transaction commits. Deleting them inside it would leave the bytes gone
 * and the row intact if anything later in the transaction rolled back.
 */
async function purgeAccount(client, userId) {
  const { rows } = await client.query(
    `SELECT id, email, id_front_url, id_back_url, selfie_url
       FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
    [userId]
  );
  if (!rows.length) return null;
  const user = rows[0];

  // Now the listings really do go, because there is no longer anybody who could
  // come back for them.
  await client.query(
    `UPDATE cars SET status = 'archived', archived_at = NOW(),
                     archive_reason = 'Seller account deleted'
     WHERE seller_id = $1 AND status <> 'archived'`,
    [user.id]
  );
  await client.query('DELETE FROM saved_cars      WHERE user_id = $1', [user.id]);
  await client.query('DELETE FROM saved_searches  WHERE user_id = $1', [user.id]);
  await client.query('DELETE FROM device_tokens   WHERE user_id = $1', [user.id]);
  await client.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
  await client.query('DELETE FROM notifications   WHERE user_id = $1', [user.id]);

  await client.query(
    // The email is released for reuse but the column stays UNIQUE, so it is
    // replaced with a value derived from the id rather than simply nulled.
    //
    // closure_reason survives deliberately: it carries no personal data, and it
    // is the only thing that makes "why did people leave last quarter"
    // answerable at all. The CHECK from 0036 requires purge_after to survive
    // with it, so both stay.
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
       closure_note = NULL,
       deleted_at = NOW(),
       token_version = token_version + 1
     WHERE id = $1`,
    [user.id]
  );

  return { id: user.id, email: user.email, files: [user.id_front_url, user.id_back_url, user.selfie_url] };
}

const DUE_FOR_PURGE = `SELECT id, name, email, closed_at, purge_after, closure_reason
     FROM users
    WHERE closed_at IS NOT NULL AND deleted_at IS NULL AND purge_after <= NOW()
    ORDER BY purge_after
    LIMIT 200`;

const CLOSED_ACCOUNTS = `SELECT id, name, email, role, closed_at, purge_after,
          closure_reason, closure_note,
          (purge_after <= NOW()) AS due_for_purge
     FROM users
    WHERE closed_at IS NOT NULL AND deleted_at IS NULL
    ORDER BY closed_at DESC
    LIMIT 200`;

/**
 * Erase identity documents from disk.
 *
 * Called AFTER the transaction commits, never inside it: doing it inside would
 * leave the bytes gone and the row intact if a later statement rolled back, and
 * there is no undelete. Failures are logged, never fatal — the account is
 * already gone from the user's point of view.
 *
 * URLs are of the form <base>/id-verification/doc/<filename>; only the basename
 * is used, so nothing outside the id-docs directory can be reached from here.
 */
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

module.exports = {
  RECOVERY_DAYS, CLOSURE_REASONS, REASON_VALUES, REASON_LABELS,
  closeAccount, reopenAccount, purgeAccount, removeIdDocuments,
  DUE_FOR_PURGE, CLOSED_ACCOUNTS,
};
