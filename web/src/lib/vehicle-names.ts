// ─────────────────────────────────────────────────────────────────────────────
// Display hygiene for vehicle names. Web-only presentation: nothing here
// changes what is stored, what the API is queried with, or the shared
// business logic in lib/business.ts.
//
// Listing titles are typed by staff at publication, and a few repeat the make
// ("2023 Land Rover Land Rover Range Rover P530 SE"); a few makes arrive with
// their company suffix ("Dongfeng Motor Corporation"). On a marketplace whose
// whole claim is accurate records, a stutter on the first screen reads as
// carelessness. The data is corrected in the admin; these keep the site clean
// in the meantime and for any future slip.
// ─────────────────────────────────────────────────────────────────────────────

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Collapses a make written twice in a row ("Land Rover Land Rover") and stray
 *  whitespace. Leaves every other word as staff wrote it. */
export function cleanTitle(title: string, make?: string | null): string {
  let out = title.replace(/\s+/g, ' ').trim()
  const m = make?.replace(/\s+/g, ' ').trim()
  if (m) {
    const twice = new RegExp(`\\b(${escape(m)})(\\s+${escape(m)})+\\b`, 'gi')
    out = out.replace(twice, '$1')
  }
  return out
}

/** Company-form words that never belong in a brand label. */
const CORPORATE = /\s+(corporation|corp\.?|company|co\.?,?\s*ltd\.?|co\.?|ltd\.?|limited|inc\.?|group|holdings)$/i
/** Stripped only after a corporate word was, so "Tata Motors" stays itself. */
const INDUSTRY = /\s+(motor|motors|automobile|automobiles|automotive|auto)$/i
/** Brands whose industry word is part of the name people use. */
const KEEP_WHOLE = new Set(['general motors'])

/** The brand as a buyer says it: "Dongfeng Motor Corporation" → "Dongfeng".
 *  For labels only; filters and URLs keep the stored value, because the API
 *  matches `make` exactly. */
export function displayMake(make: string): string {
  const raw = make.replace(/\s+/g, ' ').trim()
  let out = raw
  let strippedCorporate = false
  while (CORPORATE.test(out) && out.split(' ').length > 1) {
    out = out.replace(CORPORATE, '')
    strippedCorporate = true
  }
  if (strippedCorporate && out.split(' ').length > 1 && !KEEP_WHOLE.has(out.toLowerCase())) {
    out = out.replace(INDUSTRY, '')
  }
  return out || raw
}

/** Applies cleanTitle to anything shaped like a listing. Returns a new object. */
export function withCleanTitle<T extends { title: string; make?: string | null }>(row: T): T {
  const title = cleanTitle(row.title, row.make)
  return title === row.title ? row : { ...row, title }
}
