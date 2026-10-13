// Rental dates travel as 'YYYY-MM-DD' Kigali days (backend lib/rental-calendar.js).
// Formatted in UTC so the day never shifts for a phone set to another time
// zone: new Date('2026-10-14') is UTC midnight, still the 13th in New York.

export function formatDay(iso, locale) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return '';
  const date = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleDateString(locale || undefined, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(iso).slice(0, 10);
  }
}

export function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Today in Kigali (UTC+2, no DST), the day the server's calendar uses. */
export function kigaliToday(now = new Date()) {
  return new Date(now.getTime() + 2 * 3600 * 1000).toISOString().slice(0, 10);
}

export const isIsoDay = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
  && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
