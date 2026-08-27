// ─────────────────────────────────────────────────────────────────────────────
// Vehicle identity.
//
// The normalised key itself is computed by the DATABASE (generated columns,
// migration 0027) so that no write path can forget it. This module exists for
// everything around that: matching a value the client typed, and telling an
// operator how much confidence the identifier deserves.
//
// The central local fact: Rwanda's fleet is largely Japanese imports, which
// carry a chassis number (NZE121-1234567) rather than an ISO 17-character VIN.
// So nothing here rejects a value for being the wrong length. It reports the
// shape and lets a human weigh it.
// ─────────────────────────────────────────────────────────────────────────────

/** The same transformation the generated columns apply. Keep them identical:
 *  if this drifts, a lookup stops matching rows that are really there. */
function vinKey(raw) {
  const key = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return key || null;
}

// ISO 3779: seventeen characters, and I, O and Q are excluded throughout
// because they are too easily confused with 1 and 0.
const ISO_VIN = /^[A-HJ-NPR-Z0-9]{17}$/;

/**
 * What kind of identifier is this?
 *
 *   iso      — a well-formed 17-character VIN. Highest confidence.
 *   chassis  — plausible, but not ISO. Normal for a Japanese import.
 *   short    — too short to identify a vehicle on its own.
 *   none     — nothing recorded.
 *
 * Never a pass/fail. A chassis number is not a defect; it is what the car has.
 */
function describeVin(raw) {
  const key = vinKey(raw);
  if (!key) return { key: null, kind: 'none', confident: false, note: 'No VIN or chassis number recorded' };
  if (ISO_VIN.test(key)) {
    return { key, kind: 'iso', confident: true, note: 'Standard 17-character VIN' };
  }
  if (key.length >= 8) {
    return {
      key, kind: 'chassis', confident: true,
      note: 'Chassis number rather than a 17-character VIN — normal for a Japanese import',
    };
  }
  return {
    key, kind: 'short', confident: false,
    note: `Only ${key.length} characters — too short to identify a vehicle reliably`,
  };
}

/** Should this identifier be used to join a vehicle history?
 *  Short and absent values must not, or unrelated cars merge into one history —
 *  which would be worse than having no history at all. */
function usableForHistory(raw) {
  return describeVin(raw).confident;
}

module.exports = { vinKey, describeVin, usableForHistory, ISO_VIN };
