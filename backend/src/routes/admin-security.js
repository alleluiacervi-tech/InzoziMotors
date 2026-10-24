const express = require('express');
const pool = require('../db');
const { log } = require('../lib/log');
const { requireAdmin } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const { recordAdminAction } = require('../lib/admin-audit');
const { withTransaction } = require('../lib/tx');
const { eraseAccountRow, removeIdDocuments } = require('../lib/account-closure');

// ─────────────────────────────────────────────────────────────────────────────
// Account protection for the team (migration 0069). Mounted at /admin.
//
//   GET   /admin/users/:id/network        where an account is used from
//   PATCH /admin/users/:id/hold           hold or release a suspected bot
//   GET   /admin/signup-screenings        every sign-up's decision and why
//   GET   /admin/suspected-bots           held accounts that did nothing
//   POST  /admin/suspected-bots/erase     erase all of those at once
//   POST  /admin/users/purge-erased       remove rows left by earlier erases
//
// IP addresses are personal data: read here only, never exported, and every
// look at one account's history is written to the activity log.
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}

function fail(res, err, what) {
  if (err.status) return res.status(err.status).json({ error: err.message, code: err.code || undefined });
  log.error(`admin security ${what} failed`, { error: err.message });
  return res.status(500).json({ error: 'Server error' });
}

// Held, never an admin, and nothing a real person would leave behind: no
// message, submission, car, rental, rental inquiry or import order. Mirrors
// the backfill in migration 0069.
const ERASABLE_BOT_SQL = `
  u.access_hold IS NOT NULL AND u.deleted_at IS NULL AND u.role <> 'admin'
  AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.sender_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.seller_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM cars c WHERE c.seller_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM rental_cars r WHERE r.provider_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM rental_inquiries q WHERE q.renter_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM import_orders o WHERE o.buyer_id = u.id)`;

const BULK_LIMIT = 200;

// GET /admin/users/:id/network
router.get('/users/:id/network', requireAdmin, requireUuid('id'), async (req, res) => {
  const userId = req.params.id;
  try {
    const { rows: [user] } = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [addresses, related, screenings] = await Promise.all([
      pool.query(
        `SELECT host(a.ip) AS ip, a.country, a.first_seen_at, a.last_seen_at, a.seen_count,
                a.first_source, a.last_source, a.user_agent,
                (SELECT COUNT(*)::int FROM user_ip_addresses o
                  WHERE o.ip = a.ip AND o.user_id <> a.user_id) AS other_accounts
           FROM user_ip_addresses a
          WHERE a.user_id = $1
          ORDER BY a.last_seen_at DESC
          LIMIT 100`,
        [userId]
      ),
      // Other accounts that used any of the same addresses: how one person
      // running several accounts, or one script making them, shows itself.
      pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.account_status, u.access_hold, u.created_at,
                COUNT(DISTINCT o.ip)::int AS shared_addresses, MAX(o.last_seen_at) AS last_seen_at
           FROM user_ip_addresses mine
           JOIN user_ip_addresses o ON o.ip = mine.ip AND o.user_id <> mine.user_id
           JOIN users u ON u.id = o.user_id AND u.deleted_at IS NULL
          WHERE mine.user_id = $1
          GROUP BY u.id
          ORDER BY MAX(o.last_seen_at) DESC
          LIMIT 20`,
        [userId]
      ),
      pool.query(
        `SELECT created_at, host(ip) AS ip, country, client, decision, reasons
           FROM signup_screenings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [userId]
      ),
    ]);
    await recordAdminAction(pool, {
      actorId: req.user.id, action: 'user.network_viewed', targetType: 'user', targetId: userId,
      summary: 'Viewed the addresses an account was used from',
    });
    res.json({
      current: addresses.rows[0] || null,
      addresses: addresses.rows,
      related_accounts: related.rows,
      screenings: screenings.rows,
    });
  } catch (err) {
    fail(res, err, 'network');
  }
});

// PATCH /admin/users/:id/hold { action: 'hold' | 'release', reason? }
// Holding is reversible and changes nothing the account owns; the person can
// still lift it themselves by confirming their email.
router.patch('/users/:id/hold', requireAdmin, requireUuid('id'), async (req, res) => {
  const action = String((req.body && req.body.action) || '');
  const reason = String((req.body && req.body.reason) || '').trim().slice(0, 200);
  if (!['hold', 'release'].includes(action)) return res.status(400).json({ error: 'action must be hold or release' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot hold your own account' });
  try {
    const row = await withTransaction(async (client) => {
      const { rows: [target] } = await client.query(
        'SELECT id, email, role, access_hold FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE', [req.params.id]
      );
      if (!target) throw new HttpError(404, 'Active user not found');
      if (target.role === 'admin') throw new HttpError(403, 'Administrator accounts cannot be held');
      const { rows: [updated] } = action === 'hold'
        ? await client.query(
          `UPDATE users SET access_hold = 'suspected_bot',
                  access_hold_reasons = $2, access_hold_at = NOW()
            WHERE id = $1
            RETURNING id, access_hold, access_hold_reasons, access_hold_at, email_verified_at`,
          [target.id, ['team', ...(reason ? [reason] : [])]]
        )
        : await client.query(
          `UPDATE users SET access_hold = NULL, access_hold_reasons = '{}', access_hold_at = NULL
            WHERE id = $1
            RETURNING id, access_hold, access_hold_reasons, access_hold_at, email_verified_at`,
          [target.id]
        );
      await recordAdminAction(client, {
        actorId: req.user.id,
        action: action === 'hold' ? 'user.held_suspected_bot' : 'user.hold_released',
        targetType: 'user',
        targetId: target.id,
        summary: action === 'hold'
          ? `Held ${target.email} as a suspected bot`
          : `Released the hold on ${target.email}`,
        metadata: reason ? { reason } : {},
      });
      return updated;
    });
    res.json(row);
  } catch (err) {
    fail(res, err, 'hold');
  }
});

// GET /admin/signup-screenings?decision=&limit=&offset=
router.get('/signup-screenings', requireAdmin, async (req, res) => {
  const decision = ['allowed', 'held', 'blocked'].includes(req.query.decision) ? req.query.decision : null;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  try {
    const [list, summary] = await Promise.all([
      pool.query(
        `SELECT s.id, s.created_at, host(s.ip) AS ip, s.country, s.email, s.client, s.decision, s.reasons,
                s.user_id, u.access_hold, (u.deleted_at IS NOT NULL) AS erased
           FROM signup_screenings s
           LEFT JOIN users u ON u.id = s.user_id
          WHERE ($1::text IS NULL OR s.decision = $1)
          ORDER BY s.created_at DESC
          LIMIT $2 OFFSET $3`,
        [decision, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE decision = 'allowed')::int AS allowed,
                COUNT(*) FILTER (WHERE decision = 'held')::int    AS held,
                COUNT(*) FILTER (WHERE decision = 'blocked')::int AS blocked
           FROM signup_screenings WHERE created_at > NOW() - INTERVAL '7 days'`
      ),
    ]);
    res.json({ last_7_days: summary.rows[0], screenings: list.rows });
  } catch (err) {
    fail(res, err, 'screenings');
  }
});

// GET /admin/suspected-bots — held accounts that did nothing, ready to erase.
router.get('/suspected-bots', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.created_at, u.access_hold_reasons, u.access_hold_at,
              (SELECT host(a.ip) FROM user_ip_addresses a WHERE a.user_id = u.id
                ORDER BY a.last_seen_at DESC LIMIT 1) AS last_ip
         FROM users u
        WHERE ${ERASABLE_BOT_SQL}
        ORDER BY u.created_at DESC
        LIMIT ${BULK_LIMIT}`
    );
    res.json({ count: rows.length, limit: BULK_LIMIT, accounts: rows });
  } catch (err) {
    fail(res, err, 'suspected bots');
  }
});

// POST /admin/suspected-bots/erase { confirm_count }
// The count shown on screen must be sent back: if a held account did something
// (or a new one was held) since the list was read, the numbers disagree and
// nothing is erased.
router.post('/suspected-bots/erase', requireAdmin, async (req, res) => {
  const confirmCount = Number(req.body && req.body.confirm_count);
  if (!Number.isInteger(confirmCount) || confirmCount < 1) {
    return res.status(400).json({ error: 'confirm_count is required' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT u.id FROM users u WHERE ${ERASABLE_BOT_SQL}
          ORDER BY u.created_at DESC LIMIT ${BULK_LIMIT} FOR UPDATE OF u`
      );
      if (rows.length !== confirmCount) {
        throw new HttpError(409, `The list changed: ${rows.length} accounts match now. Refresh and try again.`, 'BOT_LIST_CHANGED');
      }
      const files = [];
      let completely = 0;
      let anonymised = 0;
      for (const { id } of rows) {
        const done = await eraseAccountRow(client, id);
        if (!done) continue;
        files.push(...done.files);
        if (done.removed === 'completely') completely += 1; else anonymised += 1;
      }
      // No names or emails: this log is permanent, and writing them into it
      // would undo the erasure it records.
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'account.erased_suspected_bots', targetType: 'user',
        summary: `Erased ${rows.length} accounts held as suspected bots`,
        metadata: { erased: rows.length, removed_completely: completely, anonymised },
      });
      return { erased: rows.length, removed_completely: completely, anonymised, files };
    });
    removeIdDocuments(result.files);
    const { files, ...body } = result;
    res.json(body);
  } catch (err) {
    fail(res, err, 'bulk erase');
  }
});

// POST /admin/users/purge-erased
// Erases before this change only anonymised the row ("Deleted user"). For a
// test account or a suspected bot, try again to remove it completely; any row
// someone else's history still needs stays, hidden from the Users list.
router.post('/users/purge-erased', requireAdmin, async (req, res) => {
  try {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT id FROM users
          WHERE deleted_at IS NOT NULL AND role <> 'admin' AND (is_test OR access_hold IS NOT NULL)
          ORDER BY deleted_at LIMIT ${BULK_LIMIT} FOR UPDATE`
      );
      let removed = 0;
      for (const { id } of rows) {
        const done = await eraseAccountRow(client, id);
        if (done && done.removed === 'completely') removed += 1;
      }
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'account.erased_rows_removed', targetType: 'user',
        summary: `Removed ${removed} of ${rows.length} rows left by earlier erases`,
        metadata: { checked: rows.length, removed, kept: rows.length - removed },
      });
      return { checked: rows.length, removed, kept: rows.length - removed };
    });
    res.json(result);
  } catch (err) {
    fail(res, err, 'purge erased');
  }
});

module.exports = router;
