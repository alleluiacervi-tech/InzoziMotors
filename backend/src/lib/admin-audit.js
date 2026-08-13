'use strict';

/** `db` may be the pool or a transaction client. Call inside the same
 * transaction whenever the business mutation is transactional. */
async function recordAdminAction(db, { actorId, action, targetType, targetId = null, summary, metadata = {} }) {
  if (!actorId || !action || !targetType || !summary) {
    throw new Error('Incomplete admin audit event');
  }
  await db.query(
    `INSERT INTO admin_audit_log
       (actor_id, action, target_type, target_id, summary, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [actorId, action, targetType, targetId ? String(targetId) : null, summary, JSON.stringify(metadata)]
  );
}

module.exports = { recordAdminAction };
