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
    // Every device sits in its user's room from the moment it connects —
    // message delivery fans out to user rooms (routes/messages.js), so the
    // conversation list stays live even when no thread is open. Conversation
    // rooms below now exist only for typing indicators.
    socket.join(`user:${socket.user.id}`);

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

    // NOTE: message WRITES go through the REST route (POST
    // /messages/conversations[/:id]) only — never over the socket. That route
    // is the single writer: it screens the text, persists one row, fans out to
    // both participants' user rooms, and writes the notification. An earlier
    // socket 'send_message' handler here did all of that a second way (a second
    // row, a second notification, delivery to the dead conv: room), so it was
    // removed. The socket layer is delivery + typing only.

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
