const jwt = require('jsonwebtoken');
const pool = require('./db');

module.exports = function attachSocket(io) {
  // Authenticate every socket connection via JWT in handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Join a conversation room — only participants may join (no eavesdropping)
    socket.on('join_conversation', async (conversationId) => {
      try {
        const { rows } = await pool.query(
          'SELECT 1 FROM conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)',
          [conversationId, socket.user.id]
        );
        if (rows.length || socket.user.role === 'admin') {
          socket.join(`conv:${conversationId}`);
        } else {
          socket.emit('error', { message: 'Not a participant of this conversation' });
        }
      } catch {
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Send a message
    socket.on('send_message', async ({ conversationId, text }) => {
      if (!conversationId || !text?.trim()) return;
      try {
        // Verify sender belongs to this conversation
        const convRes = await pool.query(
          'SELECT * FROM conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)',
          [conversationId, socket.user.id]
        );
        if (!convRes.rows.length) return;
        const conv = convRes.rows[0];

        const { rows } = await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, text)
           VALUES ($1, $2, $3) RETURNING *`,
          [conversationId, socket.user.id, text.trim()]
        );
        const msg = rows[0];

        await pool.query(
          `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
          [text.trim(), conversationId]
        );

        // Broadcast to everyone in the room (including sender for consistency)
        io.to(`conv:${conversationId}`).emit('new_message', {
          ...msg,
          sender_name: socket.user.name || socket.user.email,
        });

        // Push notification to the other party if they're not in the room
        const otherId = socket.user.id === conv.buyer_id ? conv.seller_id : conv.buyer_id;
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, body, meta)
           VALUES ($1, 'new_message', 'New message', $2, $3)`,
          [otherId, text.trim().slice(0, 80), JSON.stringify({ conversationId })]
        );
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator — lightweight, no DB write
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('user_typing', {
        conversationId,
        userId: socket.user.id,
        name: socket.user.name,
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId: socket.user.id,
      });
    });
  });
};
