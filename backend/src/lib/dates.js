// ─────────────────────────────────────────────────────────────────────────────
// Scheduling dates.
//
// Bookings are made in Kigali, for a physical appointment at a physical centre.
// "Which day" is therefore a calendar date in Africa/Kigali (UTC+2, no DST) —
// not an instant, and definitely not whatever the server's timezone happens to
// be. A booking at 8am Kigali must not drift to the previous day because the
// VPS runs UTC.
//
// The wire format is ISO YYYY-MM-DD in both directions. The old display strings
// ("Aug 12", with no year) are still stored alongside for rendering, but
// nothing compares or orders by them any more — see migrations/0002.
// ─────────────────────────────────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Rwanda does not observe daylight saving, so a fixed offset is correct here
 *  and avoids depending on the host's tz database. */
const KIGALI_OFFSET_MINUTES = 2 * 60;

/**
 * Validates an ISO calendar date and confirms it is a real day.
 * Returns the string on success, or null — callers turn null into a 400.
 * Rejects "2026-02-30", which Date would silently roll into March.
 */
function parseIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const asUtc = new Date(Date.UTC(y, m - 1, d));
  if (
    asUtc.getUTCFullYear() !== y ||
    asUtc.getUTCMonth() !== m - 1 ||
    asUtc.getUTCDate() !== d
  ) {
    return null;
  }
  return value;
}

/** Today in Kigali, as YYYY-MM-DD. */
function todayInKigali() {
  const now = new Date();
  const kigali = new Date(now.getTime() + KIGALI_OFFSET_MINUTES * 60_000);
  return kigali.toISOString().slice(0, 10);
}

/** True when an ISO date is today or later in Kigali. Bookings are for
 *  appointments; yesterday is not a slot anyone can attend. */
function isNotInPast(isoDate) {
  return isoDate >= todayInKigali();
}

/**
 * Combines an ISO date with a display time ("10:00 AM") into an instant, for
 * ordering. Returns null when the time cannot be read, rather than the Invalid
 * Date that `new Date("Aug 12 10:00 AM")` used to produce and store.
 */
function toTimestamp(isoDate, displayTime) {
  if (!parseIsoDate(isoDate)) return null;
  const match = String(displayTime || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = (match[3] || '').toUpperCase();
  if (minute > 59 || hour > 23) return null;
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  const [y, m, d] = isoDate.split('-').map(Number);
  // Built in UTC then shifted back by the Kigali offset, so the stored instant
  // is the moment that clock time occurs in Kigali.
  return new Date(Date.UTC(y, m - 1, d, hour, minute) - KIGALI_OFFSET_MINUTES * 60_000);
}

/** Human form for notification copy and the columns the app still renders.
 *  "2026-08-12" -> "Aug 12, 2026". Includes the year, unlike what the app was
 *  sending, so a stored booking is never ambiguous about which year it is in. */
function toDisplayDate(isoDate) {
  if (!parseIsoDate(isoDate)) return null;
  const [y, m, d] = isoDate.split('-').map(Number);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

module.exports = {
  parseIsoDate,
  todayInKigali,
  isNotInPast,
  toTimestamp,
  toDisplayDate,
};
