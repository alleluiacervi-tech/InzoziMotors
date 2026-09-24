// ─────────────────────────────────────────────────────────────────────────────
// The reporting window every insight, export and statement is cut to.
//
// Days are Kigali days (UTC+2, no DST): an operator reading "yesterday" means
// the Kigali calendar day, not UTC's, and a fee collected at 01:00 on the 1st
// belongs to the new month here even though UTC still calls it the 31st.
// Every query therefore bounds timestamps with
//   ts >= ($from::date)::timestamp AT TIME ZONE 'Africa/Kigali'
//   ts <  ($to::date + 1)::timestamp AT TIME ZONE 'Africa/Kigali'
// and buckets with  (ts AT TIME ZONE 'Africa/Kigali')::date.
//
// The previous period is the same number of days immediately before `from`,
// so "compared with the previous period" always compares like with like.
// ─────────────────────────────────────────────────────────────────────────────

const TZ = 'Africa/Kigali';
const MAX_DAYS = 366;
const DEFAULT_DAYS = 30;
const DAY_MS = 86_400_000;

/** Today's date in Kigali as YYYY-MM-DD. */
function kigaliToday(now = new Date()) {
  return new Date(now.getTime() + 2 * 3_600_000).toISOString().slice(0, 10);
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;

class RangeError400 extends Error {
  constructor(message) { super(message); this.status = 400; }
}

/**
 * Parse ?from=&to= (inclusive Kigali dates) or ?days=N (ending today).
 * Returns { from, to, days, previous: { from, to } }. Throws a 400-carrying
 * error for anything malformed rather than silently widening the window.
 */
function parseRange(query = {}, now = new Date()) {
  const today = kigaliToday(now);
  let { from, to } = query;
  if (from || to) {
    if (!isIsoDate(from) || !isIsoDate(to)) throw new RangeError400('from and to must be YYYY-MM-DD dates');
    if (from > to) throw new RangeError400('from must not be after to');
  } else {
    const n = query.days === undefined ? DEFAULT_DAYS : Number(query.days);
    if (!Number.isInteger(n) || n < 1) throw new RangeError400('days must be a positive whole number');
    to = today;
    from = addDays(today, -(n - 1));
  }
  const days = daysBetween(from, to);
  if (days > MAX_DAYS) throw new RangeError400(`The window is limited to ${MAX_DAYS} days`);
  const previous = { from: addDays(from, -days), to: addDays(from, -1) };
  return { from, to, days, previous };
}

/** A calendar month YYYY-MM as an inclusive Kigali range. */
function parseMonth(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) throw new RangeError400('month must be YYYY-MM');
  const [y, m] = value.split('-').map(Number);
  if (m < 1 || m > 12) throw new RangeError400('month must be YYYY-MM');
  const from = `${value}-01`;
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const days = daysBetween(from, to);
  return { from, to, days, previous: { from: addDays(from, -days), to: addDays(from, -1) } };
}

/** SQL fragment bounding `col` to [$a, $b] inclusive Kigali dates. */
const within = (col, a, b) =>
  `${col} >= ($${a}::date)::timestamp AT TIME ZONE '${TZ}' AND ${col} < ($${b}::date + 1)::timestamp AT TIME ZONE '${TZ}'`;

/** SQL expression bucketing `col` to its Kigali calendar day. */
const kigaliDay = (col) => `(${col} AT TIME ZONE '${TZ}')::date`;

module.exports = { TZ, MAX_DAYS, DEFAULT_DAYS, kigaliToday, parseRange, parseMonth, within, kigaliDay, addDays, isIsoDate, RangeError400 };
