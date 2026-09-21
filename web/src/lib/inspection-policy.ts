// ─────────────────────────────────────────────────────────────────────────────
// The 150-point checklist, as the marketing surfaces describe it.
//
// SOURCE OF TRUTH: backend/src/lib/inspection-policy.js. That module throws at
// require-time if its own counts don't reconcile, so the backend can never ship
// a drifted checklist. This file is its public-facing transcription, and it is
// checked here the same way: the module throws on import if the category points
// don't add up to SCORE_MAX.
//
// It lives in lib/ rather than inside a component because three surfaces now
// quote these numbers — the hero's evidence strip, the homepage inspection
// ledger and /how-it-works. When they each carried their own copy, "49 critical
// items" and "48 critical items" appeared on the same page.
// ─────────────────────────────────────────────────────────────────────────────

export interface InspectionCategory {
  /** i18n key suffix under `home.inspection.category.*`. */
  key: string
  /** Points the category contributes — one point per checklist item. */
  points: number
  /** Of those, how many are critical: one failure blocks publication. */
  critical: number
}

export const CATEGORIES: readonly InspectionCategory[] = [
  { key: 'engine', points: 25, critical: 4 },
  { key: 'brakes', points: 25, critical: 14 },
  { key: 'body', points: 20, critical: 7 },
  { key: 'interior', points: 20, critical: 0 },
  { key: 'electronics', points: 20, critical: 8 },
  { key: 'tyres', points: 15, critical: 8 },
  { key: 'documentation', points: 25, critical: 8 },
] as const

/** Every item is worth one point, so the maximum score is the item count. */
export const SCORE_MAX = 150

/** `score >= PASS_THRESHOLD` is one of the five conditions in
 *  validInspectionExists() (backend/src/routes/cars.js). */
export const PASS_THRESHOLD = 105

export const TOTAL_POINTS = CATEGORIES.reduce((n, c) => n + c.points, 0)
export const CRITICAL_ITEMS = CATEGORIES.reduce((n, c) => n + c.critical, 0)

// Fail loudly at build time rather than quietly publishing a wrong number.
// Next compiles this module during `next build`, so a bad transcription is a
// broken build, never a broken claim on the homepage.
if (TOTAL_POINTS !== SCORE_MAX) {
  throw new Error(
    `inspection-policy: categories total ${TOTAL_POINTS} points, expected ${SCORE_MAX}`
  )
}
