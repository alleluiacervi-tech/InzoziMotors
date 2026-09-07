// ─────────────────────────────────────────────────────────────────────────────
// vin-engine/audit-logger.js
// Enterprise audit logging for VIN lookups, listing changes & administrative actions.
// ─────────────────────────────────────────────────────────────────────────────

let pool = null;
try {
  pool = require('../../db');
} catch (_) {
  // Offline or unit test environment without local pg driver
}
const { maskVin } = require('./validator');

/**
 * Logs an administrative or internal VIN operation.
 * NEVER stores the raw unmasked VIN in plaintext audit logs.
 */
async function logVinAction({
  userId,
  action,
  targetVehicleId = null,
  rawVin = null,
  ipAddress = null,
  userAgent = null,
  details = {},
}) {
  const maskedVin = rawVin ? maskVin(rawVin) : null;

  try {
    await pool.query(
      `INSERT INTO vin_audit_logs (
         user_id, action, target_vehicle_id, vin_searched_masked, ip_address, user_agent, details
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId || null,
        action,
        targetVehicleId,
        maskedVin,
        ipAddress,
        userAgent ? String(userAgent).slice(0, 500) : null,
        JSON.stringify(details || {}),
      ]
    );
  } catch (err) {
    // Log to console if audit insert fails, but never crash the core business transaction
    console.error('Failed to write to vin_audit_logs:', err.message);
  }
}

module.exports = {
  logVinAction,
};
