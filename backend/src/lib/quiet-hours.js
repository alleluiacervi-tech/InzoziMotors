// Kigali clock rules for pushes Sawa sends on its own initiative.
//
// Kigali is UTC+2 all year (no daylight saving), so plain arithmetic is exact.
//
//   quiet hours   21:00-07:00. A search match or price drop still writes its
//                 notification row (the in-app bell is immediate); only the
//                 push waits, and is released at 07:00. Messages, rentals and
//                 account notices are replies to something a person did and are
//                 never held.
//   digest window 18:00-21:00. The daily summary goes out in this window; a send
//                 missed at 18:00 (restart, deploy) catches up until 21:00 and
//                 after that the day is skipped, so nothing is ever sent at night.

const { kigaliToday } = require('./insights-range');

const OFFSET_MS = 2 * 3_600_000;
const QUIET_START_HOUR = 21;
const QUIET_END_HOUR = 7;
const DIGEST_START_HOUR = 18;
const DIGEST_END_HOUR = 21;

function kigaliHour(now = new Date()) {
  return new Date(now.getTime() + OFFSET_MS).getUTCHours();
}

function inQuietHours(now = new Date()) {
  const hour = kigaliHour(now);
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

// The next 07:00 Kigali strictly after `now`.
function quietHoursEnd(now = new Date()) {
  const shifted = new Date(now.getTime() + OFFSET_MS);
  let end = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), QUIET_END_HOUR) - OFFSET_MS;
  if (end <= now.getTime()) end += 86_400_000;
  return new Date(end);
}

function inDigestWindow(now = new Date()) {
  const hour = kigaliHour(now);
  return hour >= DIGEST_START_HOUR && hour < DIGEST_END_HOUR;
}

module.exports = {
  kigaliHour, inQuietHours, quietHoursEnd, inDigestWindow, kigaliToday,
  QUIET_START_HOUR, QUIET_END_HOUR, DIGEST_START_HOUR, DIGEST_END_HOUR,
};
