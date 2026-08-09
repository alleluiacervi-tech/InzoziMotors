const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUuid, paginate } = require('../middleware/validate');
const { notifyUser } = require('../lib/notify');

const router = express.Router();

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
  if (!car_id || !message) {
    return res.status(400).json({ error: 'car_id and message are required' });
  }
  try {
    const carRes = await pool.query('SELECT * FROM cars WHERE id = $1', [car_id]);
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
      [conv.id, req.user.id, message]
    );

    await pool.query(
      `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
      [message, conv.id]
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
  if (!text) return res.status(400).json({ error: 'text is required' });
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
      [conv.id, req.user.id, text]
    );

    await pool.query(
      `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
      [text, conv.id]
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
      body: text.slice(0, 80),
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

// GET /messages/admin/reports — open reports queue for the Sawa team.
router.get('/admin/reports', requireAdmin, paginate(), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, reporter.name AS reporter_name, conv.buyer_id, conv.seller_id,
              m.text AS message_text
       FROM message_reports r
       JOIN users reporter ON reporter.id = r.reporter_id
       JOIN conversations conv ON conv.id = r.conversation_id
       LEFT JOIN messages m ON m.id = r.message_id
       WHERE r.status = 'open'
       ORDER BY r.created_at ASC
       LIMIT $1 OFFSET $2`,
      [req.pagination.limit, req.pagination.offset]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
