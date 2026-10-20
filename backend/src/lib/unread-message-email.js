'use strict';

// "While you were away" email, sent only for a message that is STILL unread
// after a grace period. The push (or the live socket) always comes first; the
// email is the fallback for someone who has not opened the app since. It never
// carries the message text. One email per conversation per hour at most, and
// only for messages from the last two days, so a long-dead thread is not
// dug up. A recipient who turned message emails off is skipped.
const pool = require('../db');
const { log } = require('./log');
const { sendNewMessageEmail } = require('./mailer');

const GRACE_MINUTES = parseInt(process.env.UNREAD_EMAIL_AFTER_MINUTES || '30', 10);
const SWEEP_MS = 5 * 60 * 1000;

async function sweepUnreadMessageEmails() {
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (conv.id, recipient.id)
            conv.id AS conversation_id, recipient.email, recipient.name,
            COALESCE(car.title, rcar.title) AS car_title
       FROM messages m
       JOIN conversations conv ON conv.id = m.conversation_id
       JOIN users recipient
         ON recipient.id = CASE WHEN m.sender_id = conv.buyer_id
                                THEN conv.seller_id ELSE conv.buyer_id END
       LEFT JOIN cars car ON car.id = conv.car_id
       LEFT JOIN rental_cars rcar ON rcar.id = conv.rental_car_id
      WHERE m.read = FALSE
        AND m.created_at < NOW() - make_interval(mins => $1)
        AND m.created_at > NOW() - INTERVAL '2 days'
        AND (conv.last_offline_email_at IS NULL
             OR (conv.last_offline_email_at < m.created_at
                 AND conv.last_offline_email_at < NOW() - INTERVAL '1 hour'))
        AND recipient.message_email_notifications IS NOT FALSE
        AND recipient.email IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM blocked_users b
           WHERE b.user_id = recipient.id AND b.blocked_id = m.sender_id)
      ORDER BY conv.id, recipient.id
      LIMIT 100`,
    [GRACE_MINUTES]
  );
  for (const r of rows) {
    try {
      // Stamp first: if the process dies mid-send the cost is one missed
      // email, never a repeat on every sweep.
      const { rowCount } = await pool.query(
        `UPDATE conversations SET last_offline_email_at = NOW()
          WHERE id = $1
            AND (last_offline_email_at IS NULL
                 OR last_offline_email_at < NOW() - INTERVAL '1 hour')`,
        [r.conversation_id]
      );
      if (!rowCount) continue;
      await sendNewMessageEmail(r.email, r.name, r.car_title);
    } catch (err) {
      log.error('unread message email failed', { error: err.message });
    }
  }
}

function startUnreadMessageEmails() {
  const timer = setInterval(() => {
    sweepUnreadMessageEmails().catch((err) =>
      log.error('unread message email sweep failed', { error: err.message }));
  }, SWEEP_MS);
  timer.unref();
  return timer;
}

module.exports = { sweepUnreadMessageEmails, startUnreadMessageEmails, GRACE_MINUTES };
