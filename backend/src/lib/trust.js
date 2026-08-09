const pool = require('../db');

// Canonical 100-point trust score (blueprint):
//   ID verified 30 · completed sales 30 (1pt each) · response rate 20 · reviews 20 (avg × 4)
// users.trust_score / users.response_rate are caches — this is the only writer.
// Call after anything that moves a component: ID decision, completed sale, new review, replies.
async function recomputeTrustScore(userId, client = pool) {
  const userRes = await client.query(
    'SELECT id_verified, completed_sales FROM users WHERE id = $1',
    [userId]
  );
  if (!userRes.rows.length) return null;
  const u = userRes.rows[0];

  // Response rate: % of conversations (as seller) whose first buyer message
  // got a seller reply within 24h. No conversations yet → benefit of the doubt.
  const respRes = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE replied_within_24h) AS replied,
       COUNT(*) AS total
     FROM (
       SELECT c.id,
         EXISTS (
           SELECT 1 FROM messages m2
           WHERE m2.conversation_id = c.id AND m2.sender_id = c.seller_id
             AND m2.created_at <= first_buyer.at + INTERVAL '24 hours'
         ) AS replied_within_24h
       FROM conversations c
       JOIN LATERAL (
         SELECT MIN(m.created_at) AS at FROM messages m
         WHERE m.conversation_id = c.id AND m.sender_id = c.buyer_id
       ) first_buyer ON first_buyer.at IS NOT NULL
       WHERE c.seller_id = $1
     ) t`,
    [userId]
  );
  const { replied, total } = respRes.rows[0];
  const responseRate = Number(total) > 0 ? Math.round((Number(replied) / Number(total)) * 100) : 100;

  const reviewRes = await client.query(
    'SELECT AVG(rating)::numeric(3,1) AS avg_rating FROM reviews WHERE seller_id = $1 AND removed_at IS NULL',
    [userId]
  );
  const avgRating = reviewRes.rows[0].avg_rating ? parseFloat(reviewRes.rows[0].avg_rating) : null;

  const idPts = u.id_verified === 'approved' ? 30 : 0;
  const salesPts = Math.min(30, u.completed_sales);
  const responsePts = Math.round((responseRate / 100) * 20);
  const reviewPts = avgRating ? Math.round(avgRating * 4) : 0;
  const score = Math.min(100, idPts + salesPts + responsePts + reviewPts);

  await client.query(
    'UPDATE users SET trust_score = $1, response_rate = $2 WHERE id = $3',
    [score, responseRate, userId]
  );
  return score;
}

module.exports = { recomputeTrustScore };
