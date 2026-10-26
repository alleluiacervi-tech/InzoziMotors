// ─────────────────────────────────────────────────────────────────────────────
// A showroom's opening hours, read in Kigali time.
//
// Rwanda keeps Central Africa Time (UTC+2) all year, with no daylight saving,
// so a fixed offset is exact whatever time zone the phone is set to.
// Mirrors web/src/lib/showroom-hours.ts; change both together.
// ─────────────────────────────────────────────────────────────────────────────

export const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_KEYS = {
  mon: 'browse.dayMon', tue: 'browse.dayTue', wed: 'browse.dayWed', thu: 'browse.dayThu',
  fri: 'browse.dayFri', sat: 'browse.daySat', sun: 'browse.daySun',
};

const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1000;

/** Today's weekday key and the minutes since midnight, in Kigali. */
export function kigaliClock(now = new Date()) {
  const local = new Date(now.getTime() + KIGALI_OFFSET_MS);
  const day = WEEK[(local.getUTCDay() + 6) % 7]; // getUTCDay: 0 = Sunday
  return { day, minutes: local.getUTCHours() * 60 + local.getUTCMinutes() };
}

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

/**
 * { open: true, closesAt } when open right now, otherwise
 * { open: false, opensAt, opensDay, laterToday } (opensAt null when it never opens).
 */
export function openState(hours, now = new Date()) {
  if (!hours) return { open: false, opensAt: null, opensDay: null, laterToday: false };
  const { day, minutes } = kigaliClock(now);
  const today = hours[day];
  if (today && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    return { open: true, closesAt: today.close };
  }
  if (today && minutes < toMinutes(today.open)) {
    return { open: false, opensAt: today.open, opensDay: day, laterToday: true };
  }
  const index = WEEK.indexOf(day);
  for (let step = 1; step <= 7; step += 1) {
    const next = WEEK[(index + step) % 7];
    if (hours[next]) return { open: false, opensAt: hours[next].open, opensDay: next, laterToday: false };
  }
  return { open: false, opensAt: null, opensDay: null, laterToday: false };
}

// "Closes soon" for the last hour, so nobody sets off for a showroom that is
// about to shut.
export const CLOSING_SOON_MIN = 60;

/**
 * The one line a buyer needs: can I go now, and if not, when. Always names the
 * day ("today", "tomorrow", "Monday"). Returns null when there are no hours.
 *
 * { tone: 'open' | 'soon' | 'closed', key, time, day? } — `key` is under
 * browse.status in the translations.
 */
export function openStatus(hours, now = new Date()) {
  if (!hours) return null;
  const { day, minutes } = kigaliClock(now);
  const today = hours[day];
  if (today && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    return toMinutes(today.close) - minutes <= CLOSING_SOON_MIN
      ? { tone: 'soon', key: 'closesSoon', time: today.close }
      : { tone: 'open', key: 'openUntil', time: today.close };
  }
  if (today && minutes < toMinutes(today.open)) {
    return { tone: 'closed', key: 'opensToday', time: today.open };
  }
  const index = WEEK.indexOf(day);
  for (let step = 1; step <= 7; step += 1) {
    const next = WEEK[(index + step) % 7];
    const slot = hours[next];
    if (!slot) continue;
    if (step === 1) return { tone: 'closed', key: today ? 'opensTomorrow' : 'closedTodayOpensTomorrow', time: slot.open };
    return { tone: 'closed', key: today ? 'opensDay' : 'closedTodayOpensDay', time: slot.open, day: next };
  }
  return null;
}

/** openStatus() as words, through the app's t(). */
export function openStatusText(status, t) {
  if (!status) return null;
  return t(`browse.status.${status.key}`, {
    time: status.time,
    day: status.day ? t(DAY_KEYS[status.day]) : '',
  });
}
