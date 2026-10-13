// A rental car's calendar: the days its provider says it is out.
//
// Only the provider writes it, and it is only ever what the provider says:
// renters see "taken" days and when it is back, attributed to the provider,
// with how recently the calendar was updated. A day not marked is NOT promised
// free (most rentals are agreed off Sawa), so nothing here ever says
// "available", hides a car, or refuses an inquiry. See migration 0061.
//
// Dates travel as 'YYYY-MM-DD' strings in Kigali days, never as JS Dates, so a
// renter abroad never sees a day shift.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PUBLIC_WINDOW_DAYS = 180;   // how far ahead renters see taken days
const MAX_AHEAD_DAYS = 365;       // how far ahead a provider may mark
const MAX_SPAN_DAYS = 365;
const FRESH_DAYS = 7;
const STALE_DAYS = 21;

function isIsoDay(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

/** Sorted, with overlapping and touching periods joined: 1–3 and 4–6 are 1–6. */
function mergeRanges(ranges) {
  const sorted = ranges
    .filter((r) => isIsoDay(r.from) && isIsoDay(r.to) && r.to >= r.from)
    .map((r) => ({ from: r.from, to: r.to }))
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  const merged = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.from <= addDays(last.to, 1)) {
      if (range.to > last.to) last.to = range.to;
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

/** The parts of [start, end] (inclusive) the provider marked taken. */
function overlap(ranges, start, end) {
  return mergeRanges(ranges)
    .filter((r) => r.from <= end && r.to >= start)
    .map((r) => ({ from: r.from > start ? r.from : start, to: r.to < end ? r.to : end }));
}

function freshness(updatedAt, now = new Date()) {
  if (!updatedAt) return 'never';
  const age = (now.getTime() - new Date(updatedAt).getTime()) / 86_400_000;
  if (age <= FRESH_DAYS) return 'fresh';
  if (age <= STALE_DAYS) return 'aging';
  return 'stale';
}

/**
 * What renters are told about one car.
 *   out_now    the provider marked today as taken
 *   back_on    the first day after the period covering today (only if out_now)
 *   busy       merged taken periods from today to today + 180 days (detail only)
 *   freshness  never | fresh (≤7 days) | aging (≤21) | stale
 */
function availabilitySummary({ ranges = [], today, updatedAt, now = new Date(), withPeriods = false }) {
  const horizon = addDays(today, PUBLIC_WINDOW_DAYS);
  const merged = mergeRanges(ranges).filter((r) => r.to >= today && r.from <= horizon);
  const current = merged.find((r) => r.from <= today && r.to >= today) || null;
  const summary = {
    out_now: Boolean(current),
    back_on: current ? addDays(current.to, 1) : null,
    freshness: freshness(updatedAt, now),
    updated_at: updatedAt ? new Date(updatedAt).toISOString() : null,
  };
  if (withPeriods) {
    summary.busy = merged.map((r) => ({ from: r.from < today ? today : r.from, to: r.to > horizon ? horizon : r.to }));
  }
  return summary;
}

/** Validates a period a provider is marking. Returns an error string or null. */
function validatePeriod(startsOn, endsOn, today) {
  if (!isIsoDay(startsOn) || !isIsoDay(endsOn)) return 'Give the dates as YYYY-MM-DD';
  if (endsOn < startsOn) return 'The last day cannot be before the first';
  if (endsOn < today) return 'Those dates are already past';
  if (startsOn > addDays(today, MAX_AHEAD_DAYS)) return `Mark dates up to ${MAX_AHEAD_DAYS} days ahead`;
  if (daysBetween(startsOn, endsOn) > MAX_SPAN_DAYS) return `One period can be at most ${MAX_SPAN_DAYS} days`;
  return null;
}

module.exports = {
  PUBLIC_WINDOW_DAYS,
  MAX_AHEAD_DAYS,
  isIsoDay,
  addDays,
  mergeRanges,
  overlap,
  freshness,
  availabilitySummary,
  validatePeriod,
};
