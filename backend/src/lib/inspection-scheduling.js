const { parseIsoDate, isNotInPast, toTimestamp, toDisplayDate } = require('./dates');

// ─────────────────────────────────────────────────────────────────────────────
// Booking a bay at an inspection center.
//
// Extracted from routes/submissions.js so the walk-in path can reuse it. Both
// callers must take the same advisory lock before checking capacity, or two
// simultaneous requests can each see the last free slot:
//
//   await client.query("SELECT pg_advisory_xact_lock(hashtext(lower($1) || ':' || $2::text))",
//                      [center.id, isoDate]);
//
// scheduleInspection() stays in submissions.js — its ON CONFLICT (submission_id)
// upsert is meaningless for a walk-in, whose submission_id is always NULL.
// ─────────────────────────────────────────────────────────────────────────────

// center id and its display name are accepted, but the canonical name is what
// gets stored on the inspection/report.
//
// Counts on scheduled_on (DATE), not the old scheduled_date text column. That
// column held "2026-08-12" from the admin dashboard and "Aug 12" from the app,
// compared as strings — so two bookings for the same day never matched each
// other and daily_capacity did not hold at all. See migrations/0002.
async function activeCenter(db, value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  const centerRes = await db.query(
    `SELECT id, name, daily_capacity
       FROM inspection_centers
      WHERE active = TRUE AND daily_capacity > 0
        AND (lower(id) = lower($1) OR lower(name) = lower($1))
      LIMIT 1`,
    [normalized]
  );
  return centerRes.rows[0] || null;
}

/**
 * Returns an error string when the center's daily capacity is exhausted.
 *
 * `excludeSubmissionId` lets a submission reschedule without counting its own
 * existing booking. The comparison is IS DISTINCT FROM, not <>: a walk-in row
 * has submission_id NULL, and `NULL <> '<uuid>'` evaluates to NULL rather than
 * true — so under the old operator every standalone booking silently dropped
 * out of the count and a center could be booked past its capacity by exactly
 * the number of walk-ins that day.
 */
async function centerCapacityError(db, center, isoDate, excludeSubmissionId = null) {
  const cntRes = await db.query(
    `SELECT COUNT(*) FROM inspections
     WHERE lower(center) = lower($1) AND scheduled_on = $2::date
       AND status IN ('scheduled', 'in_progress')
       AND ($3::uuid IS NULL OR submission_id IS DISTINCT FROM $3::uuid)`,
    [center.name, isoDate, excludeSubmissionId]
  );
  if (Number(cntRes.rows[0].count) >= center.daily_capacity) {
    return `${center.name} is fully booked on ${toDisplayDate(isoDate)} — choose another day or center`;
  }
  return null;
}

// One validation path for every scheduling route. Returns { isoDate, display,
// at } or an { error } the caller turns into a 400.
function readSlot({ scheduled_date, scheduled_time }) {
  const isoDate = parseIsoDate(scheduled_date);
  if (!isoDate) {
    return { error: 'scheduled_date must be an ISO date, for example 2026-08-12' };
  }
  if (!isNotInPast(isoDate)) {
    return { error: 'That date has already passed — choose an upcoming day' };
  }
  const at = toTimestamp(isoDate, scheduled_time);
  if (!at) {
    return { error: 'scheduled_time must look like "10:00 AM"' };
  }
  return { isoDate, display: toDisplayDate(isoDate), at };
}

module.exports = { activeCenter, centerCapacityError, readSlot };
