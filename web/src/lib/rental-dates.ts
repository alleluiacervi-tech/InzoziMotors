// Rental dates travel as 'YYYY-MM-DD' Kigali days (backend lib/rental-calendar.js).
// Formatted in UTC so the day never shifts for a reader in another time zone:
// new Date('2026-10-14') is UTC midnight, which is still the 13th in New York.

export function formatDay(iso: string | null | undefined, locale = 'en-GB'): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return ''
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(locale, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Today in Kigali (UTC+2, no DST), the day the server's calendar uses. */
export function kigaliToday(now = new Date()): string {
  return new Date(now.getTime() + 2 * 3600_000).toISOString().slice(0, 10)
}
