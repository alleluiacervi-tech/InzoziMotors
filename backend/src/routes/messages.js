const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUuid, paginate } = require('../middleware/validate');
const { notifyUser } = require('../lib/notify');
const { screenUserText } = require('../lib/moderation');
const { CHECKLIST_VERSION, PUBLISH_THRESHOLD } = require('../lib/inspection-policy');

const router = express.Router();
const { recordAdminAction } = require('../lib/admin-audit');

// A block in either direction ends the conversation: neither side can write.
async function isBlockedBetween(a, b) {
  const { rows } = await pool.query(
    `SELECT 1 FROM blocked_users
     WHERE (user_id = $1 AND blocked_id = $2) OR (user_id = $2 AND blocked_id = $1)
     LIMIT 1`,
    [a, b]
  );
  return rows.length > 0;
}

// GET /messages/conversations — user's conversation list
router.get('/conversations', requireAuth, paginate(), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT conv.*,
              c.title AS car_title, c.images AS car_images,
              buyer.name AS buyer_name,
              seller.name AS seller_name,
              (SELECT COUNT(*) FROM messages m
               WHERE m.conversation_id = conv.id AND m.read = FALSE
                 AND m.sender_id != $1) AS unread_count
       FROM conversations conv
       LEFT JOIN cars c ON c.id = conv.car_id
       JOIN users buyer ON buyer.id = conv.buyer_id
       JOIN users seller ON seller.id = conv.seller_id
       WHERE (conv.buyer_id = $1 OR conv.seller_id = $1)
         AND NOT EXISTS (
           SELECT 1 FROM blocked_users b
           WHERE b.user_id = $1
             AND b.blocked_id = CASE WHEN conv.buyer_id = $1
                                     THEN conv.seller_id ELSE conv.buyer_id END
         )
       ORDER BY conv.last_message_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [req.user.id, req.pagination.limit, req.pagination.offset]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /messages/conversations/:id — messages in a conversation
router.get('/conversations/:id', requireAuth, requireUuid('id'), async (req, res) => {
  try {
    const convRes = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)',
      [req.params.id, req.user.id]
    );
    if (!convRes.rows.length) return res.status(404).json({ error: 'Conversation not found' });

    // A block hides the thread from the list and refuses both write paths —
    // but a retained conversation id could still read the history through
    // here. Same 404 as the list's silence: the thread is gone, not "gone
    // unless you kept the link".
    const conv = convRes.rows[0];
    const otherParty = conv.buyer_id === req.user.id ? conv.seller_id : conv.buyer_id;
    if (await isBlockedBetween(req.user.id, otherParty)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { rows } = await pool.query(
      `SELECT m.*, u.name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.id]
    );

    // Mark messages from the other party as read
    await pool.query(
      `UPDATE messages SET read = TRUE
       WHERE conversation_id = $1 AND sender_id != $2 AND read = FALSE`,
      [req.params.id, req.user.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /messages/conversations — start a new conversation (buyer → seller about a car)
router.post('/conversations', requireAuth, async (req, res) => {
  const { car_id, message } = req.body;
  if (!car_id) {
    return res.status(400).json({ error: 'car_id and message are required' });
  }
  const screened = screenUserText(message, 2000);
  if (!screened.ok) return res.status(400).json({ error: screened.error, code: screened.code });
  try {
    const carRes = await pool.query(
      `SELECT c.* FROM cars c
       JOIN users seller ON seller.id = c.seller_id
       WHERE c.id = $1 AND c.status = 'live'
         AND seller.role = 'seller' AND seller.id_verified = 'approved'
         AND seller.account_status = 'active' AND seller.deleted_at IS NULL
         AND (COALESCE(seller.seller_type, 'individual') <> 'showroom' OR seller.business_verified = TRUE)
         AND EXISTS (
           SELECT 1 FROM inspections i
           JOIN submissions s ON s.id = i.submission_id
           WHERE i.car_id = c.id AND s.seller_id = c.seller_id
             AND lower(s.make) = lower(c.make) AND lower(s.model) = lower(c.model)
             AND s.year = c.year
             AND i.status = 'complete' AND i.checklist_version = $2
             AND i.passed = TRUE AND i.score >= $3
             AND jsonb_array_length(COALESCE(i.critical_failures, '[]'::jsonb)) = 0
         )`,
      [car_id, CHECKLIST_VERSION, PUBLISH_THRESHOLD]
    );
    if (!carRes.rows.length) return res.status(404).json({ error: 'Car not found' });
    const car = carRes.rows[0];

    if (car.seller_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    if (await isBlockedBetween(req.user.id, car.seller_id)) {
      return res.status(403).json({ error: 'Messaging is not available with this user.', code: 'BLOCKED' });
    }

    // Find or create conversation
    let conv;
    const existing = await pool.query(
      'SELECT * FROM conversations WHERE car_id = $1 AND buyer_id = $2 AND seller_id = $3',
      [car_id, req.user.id, car.seller_id]
    );
    if (existing.rows.length) {
      conv = existing.rows[0];
    } else {
      const { rows } = await pool.query(
        `INSERT INTO conversations (car_id, buyer_id, seller_id)
         VALUES ($1, $2, $3) RETURNING *`,
        [car_id, req.user.id, car.seller_id]
      );
      conv = rows[0];
    }

    // Insert message
    const msgRes = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, text)
       VALUES ($1, $2, $3) RETURNING *`,
      [conv.id, req.user.id, screened.text]
    );

    await pool.query(
      `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
      [screened.text, conv.id]
    );

    // Notify seller
    await notifyUser(pool, {
      user_id: car.seller_id,
      type: 'new_message',
      title: 'New message about your car',
      body: `Someone sent you a message about your ${car.title}.`,
      meta: JSON.stringify({ conversationId: conv.id, carId: car_id }),
    });

    res.status(201).json({ conversation: conv, message: msgRes.rows[0] });
  } catch (err) {
    log.error('start conversation error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /messages/conversations/:id — send a message in existing conversation
router.post('/conversations/:id', requireAuth, requireUuid('id'), async (req, res) => {
  // accept both `text` and `message` — POST /conversations uses `message`
  const text = req.body.text ?? req.body.message;
  const screened = screenUserText(text, 2000);
  if (!screened.ok) return res.status(400).json({ error: screened.error, code: screened.code });
  try {
    const convRes = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)',
      [req.params.id, req.user.id]
    );
    if (!convRes.rows.length) return res.status(404).json({ error: 'Conversation not found' });
    const conv = convRes.rows[0];
    const otherId = req.user.id === conv.buyer_id ? conv.seller_id : conv.buyer_id;

    if (await isBlockedBetween(req.user.id, otherId)) {
      return res.status(403).json({ error: 'Messaging is not available with this user.', code: 'BLOCKED' });
    }

    const { rows } = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, text)
       VALUES ($1, $2, $3) RETURNING *`,
      [conv.id, req.user.id, screened.text]
    );

    await pool.query(
      `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
      [screened.text, conv.id]
    );

    // Realtime fan-out for the single REST write. Delivery goes to the two
    // PARTICIPANTS' user rooms (every device, whatever screen is open), not
    // the conversation room — per-conversation rooms only exist for typing
    // indicators now. This is what keeps the conversation list live for a
    // recipient who doesn't have the thread open.
    const io = req.app.get('io');
    let recipientOnline = false;
    if (io) {
      io.to(`user:${conv.buyer_id}`).to(`user:${conv.seller_id}`).emit('new_message', {
        ...rows[0],
        sender_name: req.user.name || req.user.email,
      });
      try {
        const socks = await io.in(`user:${otherId}`).fetchSockets();
        recipientOnline = socks.length > 0;
      } catch { /* push simply isn't suppressed */ }
    }

    // A recipient with a live socket already saw the message land — a push on
    // top of that is a duplicate ping. The notification ROW is still written
    // either way (the Notification Center is the record of truth).
    await notifyUser(pool, {
      user_id: otherId,
      type: 'new_message',
      title: 'New message',
      body: screened.text.slice(0, 80),
      meta: JSON.stringify({ conversationId: conv.id }),
    }, { skipPush: recipientOnline });

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Chat safety (Apple UGC guideline 1.2: report content, block users) ──────

// POST /messages/users/:userId/block — stop all messaging with a user.
router.post('/users/:userId/block', requireAuth, requireUuid('userId'), async (req, res) => {
  if (req.params.userId === req.user.id) {
    return res.status(400).json({ error: "You can't block yourself" });
  }
  try {
    const userRes = await pool.query('SELECT 1 FROM users WHERE id = $1', [req.params.userId]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    await pool.query(
      `INSERT INTO blocked_users (user_id, blocked_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.userId]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    log.error('block user error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /messages/users/:userId/block — unblock.
router.delete('/users/:userId/block', requireAuth, requireUuid('userId'), async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM blocked_users WHERE user_id = $1 AND blocked_id = $2',
      [req.user.id, req.params.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /messages/conversations/:id/report — report a conversation (optionally
// a specific message) for review by the Sawa team.
router.post('/conversations/:id/report', requireAuth, requireUuid('id'), async (req, res) => {
  const reason = String(req.body?.reason || '').trim().slice(0, 500);
  if (!reason) return res.status(400).json({ error: 'reason is required' });
  const messageId = /^[0-9a-f-]{36}$/i.test(String(req.body?.message_id || '')) ? req.body.message_id : null;
  try {
    const convRes = await pool.query(
      'SELECT 1 FROM conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)',
      [req.params.id, req.user.id]
    );
    if (!convRes.rows.length) return res.status(404).json({ error: 'Conversation not found' });
    await pool.query(
      `INSERT INTO message_reports (reporter_id, conversation_id, message_id, reason)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, req.params.id, messageId, reason]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    log.error('report conversation error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Reported messages: the moderation queue ─────────────────────────────────
// This endpoint existed and worked, and had no interface of any kind — so users
// could report abuse and nobody could see it. Beyond the operational hole, App
// Store guideline 1.2 requires a way to ACT on reports about user-generated
// content, so an invisible queue is also a review risk.
//
// What was missing to make it usable, and is added below: a status filter (the
// queue only returned 'open', so a resolved report vanished with no history),
// the reported party's identity (a report naming only the reporter cannot be
// acted on), surrounding messages for context, and a way to close one.

// GET /messages/admin/reports?status=open|resolved|dismissed|all
router.get('/admin/reports', requireAdmin, paginate(), async (req, res) => {
  const status = String(req.query.status || 'open');
  if (!['open', 'resolved', 'dismissed', 'all'].includes(status)) {
    return res.status(400).json({ error: 'status must be open, resolved, dismissed or all' });
  }
  const params = [req.pagination.limit, req.pagination.offset];
  let where = '';
  if (status !== 'all') {
    params.push(status);
    where = `WHERE r.status = $${params.length}`;
  }
  try {
    const { rows } = await pool.query(
      `SELECT r.*,
              reporter.name  AS reporter_name,  reporter.email AS reporter_email,
              conv.buyer_id, conv.seller_id, conv.car_id,
              buyer.name  AS buyer_name,  seller.name  AS seller_name,
              car.title   AS car_title,
              m.text      AS message_text,
              m.sender_id AS message_sender_id,
              m.created_at AS message_sent_at,
              sender.name AS message_sender_name,
              -- Who the report is ABOUT: the message's author when a specific
              -- message was reported, otherwise the other party in the thread.
              -- A queue that only names the complainant cannot be acted on.
              COALESCE(m.sender_id,
                       CASE WHEN r.reporter_id = conv.buyer_id
                            THEN conv.seller_id ELSE conv.buyer_id END) AS accused_id,
              -- Has the reporter already blocked them? Then the urgent part is
              -- handled and this is a moderation decision, not a rescue.
              EXISTS (
                SELECT 1 FROM blocked_users b
                WHERE b.user_id = r.reporter_id
                  AND b.blocked_id = COALESCE(m.sender_id,
                        CASE WHEN r.reporter_id = conv.buyer_id
                             THEN conv.seller_id ELSE conv.buyer_id END)
              ) AS reporter_has_blocked
       FROM message_reports r
       JOIN users reporter ON reporter.id = r.reporter_id
       JOIN conversations conv ON conv.id = r.conversation_id
       LEFT JOIN messages m ON m.id = r.message_id
       LEFT JOIN users sender ON sender.id = m.sender_id
       LEFT JOIN users buyer  ON buyer.id  = conv.buyer_id
       LEFT JOIN users seller ON seller.id = conv.seller_id
       LEFT JOIN cars  car    ON car.id    = conv.car_id
       ${where}
       ORDER BY r.created_at ASC
       LIMIT $1 OFFSET $2`,
      params
    );
    res.json(rows);
  } catch (err) {
    log.error('reports list error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /messages/admin/reports/:id/thread — the conversation around a report.
//
// A report quotes one message. Deciding whether it is abuse or a
// misunderstanding almost always needs what came before it, so this returns the
// surrounding thread. Admin-only, and deliberately a separate request: the queue
// list must not carry every message of every reported conversation.
router.get('/admin/reports/:id/thread', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const rep = await pool.query(
      'SELECT conversation_id, message_id FROM message_reports WHERE id = $1',
      [req.params.id]
    );
    if (!rep.rows.length) return res.status(404).json({ error: 'Report not found' });
    const { conversation_id, message_id } = rep.rows[0];
    const { rows } = await pool.query(
      `SELECT m.id, m.sender_id, m.text, m.created_at, u.name AS sender_name,
              (m.id = $2) AS is_reported
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC
       LIMIT 200`,
      [conversation_id, message_id]
    );
    res.json({ conversation_id, reported_message_id: message_id, messages: rows });
  } catch (err) {
    log.error('report thread error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /messages/admin/reports/:id — close a report.
//
// `resolved` means action was taken, `dismissed` means it was not abuse. Both
// are terminal and both are kept: deleting a handled report destroys the only
// record that a pattern exists, and a repeat offender is exactly the thing this
// queue is for.
router.patch('/admin/reports/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const { status } = req.body || {};
  if (!['resolved', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'status must be resolved or dismissed' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE message_reports SET status = $2 WHERE id = $1 RETURNING *`,
      [req.params.id, status]
    );
    if (!rows.length) return res.status(404).json({ error: 'Report not found' });
    await recordAdminAction(pool, {
      actorId: req.user.id, action: `message_report.${status}`, targetType: 'message_report', targetId: rows[0].id,
      summary: `Chat report ${status}`, metadata: { status, conversation_id: rows[0].conversation_id },
    });
    log.info('report closed', { id: req.params.id, status, by: req.user.id });
    res.json(rows[0]);
  } catch (err) {
    log.error('report update error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
