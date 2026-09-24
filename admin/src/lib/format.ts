// ─────────────────────────────────────────────────────────────────────────────
// Dates and times, one way, everywhere in the console.
//
// Day first (en-GB), because that is how Rwanda writes a date and how the
// public site prints one: 9/10/2026 is the ninth of October here, and a US
// ordering in an operations tool is a misread waiting to happen. Always in
// Kigali time, so a record created at 23:30 does not show as tomorrow on a
// laptop set to another zone. An unparseable or missing value prints as a dash
// rather than "Invalid Date".
// ─────────────────────────────────────────────────────────────────────────────

export const KIGALI = 'Africa/Kigali'

type DateInput = string | number | Date | null | undefined

function toDate(value: DateInput): Date | null {
  if (value == null || value === '') return null
  // A bare YYYY-MM-DD is a calendar day, not an instant: read it at noon UTC
  // so no timezone can move it to the day before.
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

const make = (opts: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: KIGALI, ...opts })
  return (value: DateInput) => {
    const d = toDate(value)
    return d ? f.format(d) : '—'
  }
}

/** 24 Sept 2026 */
export const fmtDate = make({ day: 'numeric', month: 'short', year: 'numeric' })
/** 24 Sept 2026, 14:05 */
export const fmtDateTime = make({ day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
/** 14:05 */
export const fmtTime = make({ hour: '2-digit', minute: '2-digit' })
/** 24 Sept */
export const fmtDayMonth = make({ day: 'numeric', month: 'short' })
/** Wed 24 Sept */
export const fmtWeekday = make({ weekday: 'short', day: 'numeric', month: 'short' })
/** Sept 2026 */
export const fmtMonth = make({ month: 'short', year: 'numeric' })

/** Whole numbers with thousands separators (mileage, counts). */
export const fmtInt = (n: number | null | undefined) =>
  n == null || !Number.isFinite(Number(n)) ? '—' : Math.round(Number(n)).toLocaleString('en-GB')

/** "3 h", "2 d", "5 min" — a duration in the unit a person would say. */
export function fmtDuration(hours: number): string {
  const h = Math.abs(hours)
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`
  if (h < 48) return `${Math.round(h)} h`
  return `${Math.round(h / 24)} d`
}
