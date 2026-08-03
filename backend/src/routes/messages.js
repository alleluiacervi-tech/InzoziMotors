const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireUuid, paginate } = require('../middleware/validate');
const { notifyUser } = require('../lib/notify');

const router = express.Router();

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
       JOIN cars c ON c.id = conv.car_id
       JOIN users buyer ON buyer.id = conv.buyer_id
       JOIN users seller ON seller.id = conv.seller_id
       WHERE conv.buyer_id = $1 OR conv.seller_id = $1
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

    const { rows } = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, text)
       VALUES ($1, $2, $3) RETURNING *`,
      [conv.id, req.user.id, text]
    );

    await pool.query(
      `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
      [text, conv.id]
    );

    const otherId = req.user.id === conv.buyer_id ? conv.seller_id : conv.buyer_id;
    await notifyUser(pool, {
      user_id: otherId,
      type: 'new_message',
      title: 'New message',
      body: text.slice(0, 80),
      meta: JSON.stringify({ conversationId: conv.id }),
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
