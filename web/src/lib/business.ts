import type { Car } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Business logic shared with the mobile app.
//
// Each block names the mobile file it mirrors. These formulas MUST stay in step:
// a seller who sees one valuation in the app and a different one on the website
// stops trusting both. When you change one, change the other in the same commit.
//
// (The repo has no npm workspace, and the mobile side is React Native JS while
// web/admin are TypeScript, so a shared package would mean restructuring Metro
// resolution across three apps. Porting with an explicit pointer is the lower-
// risk trade; extracting `packages/shared` is the natural next step once the
// monorepo adopts workspaces.)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Certification tiers ── mirrors src/data/certification.js ────────────────
export type CertTier = {
  key: 'plus' | 'certified' | 'inspected'
  label: string
  short: string
}

/**
 * Is this one of the seeded demo listings?
 *
 * The seed data ships with manufacturer press renders under /uploads/seed/, and
 * those photos contradict their own titles — a "Kia Telluride" shown as a white
 * fastback sedan, a "Defender 110" as a sleek GT. Under the site's core promise
 * ("we inspect every car and photograph it ourselves") presenting those rows as
 * certified inventory is the single worst trust signal on the site.
 *
 * Keyed off the image path because it is self-healing: a real listing's photos
 * are uploaded through the 36-angle admin flow and never live under /seed/, so
 * the moment real inventory exists this predicate stops matching, with no flag
 * to remember to flip. Any real photo in the set makes the listing real.
 */
export function isDemoListing(car: Pick<Car, 'images'>): boolean {
  const images = car?.images ?? []
  if (!images.length) return false
  return images.every((src) => typeof src === 'string' && src.includes('/uploads/seed/'))
}

/**
 * Encar-style graded trust rather than a binary badge, derived from the
 * 150-point inspection score.
 *
 * Never for a demo listing: the tier is a claim that OUR mechanics graded THIS
 * car, and no seeded row has been near an inspection bay. A certification badge
 * on a press render is exactly the kind of small lie the whole product exists
 * to kill.
 */
export function getCertTier(
  car: Pick<Car, 'inspected' | 'inspection_score' | 'images'>
): CertTier | null {
  if (!car?.inspected || isDemoListing(car)) return null
  const score = car.inspection_score || 0
  if (score >= 140) return { key: 'plus', label: 'Certified+', short: 'Certified+' }
  if (score >= 120) return { key: 'certified', label: 'Sawa Certified', short: 'Certified' }
  return { key: 'inspected', label: '150-pt Inspected', short: 'Inspected' }
}

/** A–D grade, matching the thresholds the backend uses when it notifies a
 *  seller after inspection (backend/src/routes/inspections.js). */
export function inspectionGrade(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 128) return 'A'
  if (score >= 105) return 'B'
  if (score >= 83) return 'C'
  return 'D'
}

// ─── Currency ─────────────────────────────────────────────────────────────────
// The rate is LIVE, served by our API (GET /fx: two providers, DB-cached,
// provenance-stamped) and pushed in here once per request by the root layout —
// server side via getFx(), client side via <FxSync/>. It used to be a hardcoded
// 1300 copied into three clients; by the time anyone checked, the real rate was
// ~1473 and every converted figure on the site was ~12% wrong, silently.
//
// A module variable rather than a parameter because the rate is global truth,
// not per-request data, and threading it through every formatRWF call site
// would put plumbing above readability. The initial value only ever renders if
// formatting happens before the layout has fetched — and it matches the
// backend's own floor.
let rwfRate = 1470

/** Called by the root layout (server) and FxSync (client). Ignores nonsense so
 *  a malformed API response can never zero out every price hint. */
export function setRwfRate(rate: number): void {
  if (Number.isFinite(rate) && rate > 100 && rate < 10000) rwfRate = rate
}

export function getRwfRate(): number {
  return rwfRate
}

/** Canonical product money formatter. All persisted and newly-entered product
 * amounts are RWF whole francs; never perform an exchange-rate conversion in
 * presentation code. */
export function formatMoney(amount?: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return '—'
  const whole = Math.round(amount)
  if (Math.abs(whole) >= 1_000_000) {
    const millions = whole / 1_000_000
    const precision = Math.abs(millions) >= 100 || Number.isInteger(millions) ? 0 : 1
    return `${millions.toLocaleString('en-RW', {
      minimumFractionDigits: 0,
      maximumFractionDigits: precision,
    })}M RWF`
  }
  return `RWF ${whole.toLocaleString('en-RW')}`
}

/** Full precision for legal/payment contexts and accessible labels. */
export function formatMoneyExact(amount?: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return '—'
  return `RWF ${Math.round(amount).toLocaleString('en-RW')}`
}

/** @deprecated Use formatMoney. Kept temporarily to make older call sites safe. */
export const formatUSD = formatMoney
/** @deprecated Use formatMoney. No conversion is performed. */
export const formatRWF = formatMoney

export function formatKm(km?: number | null): string {
  if (km == null || !Number.isFinite(km)) return '—'
  return `${Math.round(km).toLocaleString('en-US')} km`
}

// ─── Financing ── mirrors src/data/finance.js ────────────────────────────────
const ANNUAL_RATE = 0.16 // Kigali market rate, ~16% p.a.
const TERM_MONTHS = 60
const DOWN_PAYMENT = 0.2

/** Representative monthly payment: 20% down, 16% p.a., 60 months. */
export function monthlyEstimate(price: number): number {
  const principal = price * (1 - DOWN_PAYMENT)
  const r = ANNUAL_RATE / 12
  const pmt = (principal * r) / (1 - Math.pow(1 + r, -TERM_MONTHS))
  return Math.round(pmt)
}

export const FINANCE_TERMS = {
  annualRatePct: ANNUAL_RATE * 100,
  termMonths: TERM_MONTHS,
  downPaymentPct: DOWN_PAYMENT * 100,
}

// ─── Rwanda RRA import duty ── mirrors calcRwandaDuty in marketData.js ───────
export type CcBracket = 'small' | 'medium' | 'large' | 'xl'

export const CC_BRACKETS: { key: CcBracket; label: string; hint: string }[] = [
  { key: 'small', label: 'Under 1500cc', hint: '10% excise' },
  { key: 'medium', label: '1500 – 2000cc', hint: '20% excise' },
  { key: 'large', label: '2000 – 3000cc', hint: '25% excise' },
  { key: 'xl', label: 'Over 3000cc', hint: '35% excise' },
]

/**
 * Estimated RRA landed cost. Most cars in Rwanda are imported, so total cost of
 * ownership is the number buyers actually compare — not the sticker price.
 */
export function calcRwandaDuty(vehicleValueUSD: number, ccBracket: CcBracket = 'medium') {
  const EXCISE_RATES: Record<CcBracket, number> = {
    small: 0.1, medium: 0.2, large: 0.25, xl: 0.35,
  }

  const cif = vehicleValueUSD * 1.12 // + 12% freight and insurance
  const customs = cif * 0.25
  const excise = cif * EXCISE_RATES[ccBracket]
  const subtotal = cif + customs + excise
  const vat = subtotal * 0.18
  const infra = cif * 0.015 // infrastructure levy

  const totalDuties = customs + excise + vat + infra
  const grandTotal = vehicleValueUSD + totalDuties
  const effectiveRate = vehicleValueUSD > 0 ? Math.round((totalDuties / vehicleValueUSD) * 100) : 0

  return { cif, customs, excise, vat, infra, totalDuties, grandTotal, effectiveRate }
}

// ─── Market position ── mirrors the real-data branch of marketData.js ────────
// The server computes these from actual comparables. Where it declined to (fewer
// than 3 similar cars), the site must stay silent rather than invent a number —
// an unearned "8% below market" is exactly the kind of claim that destroys trust.

export function hasRealMarketData(car: Pick<Car, 'market_avg' | 'comparables'>): boolean {
  return typeof car.market_avg === 'number' && (car.comparables ?? 0) >= 3
}

export function marketPosition(car: Car): {
  diff: number
  label: string
  tone: 'good' | 'neutral' | 'high'
} | null {
  if (!hasRealMarketData(car) || typeof car.market_diff !== 'number') return null
  const diff = car.market_diff
  if (diff <= -3) return { diff, label: `${Math.abs(diff)}% below market`, tone: 'good' }
  if (diff >= 3) return { diff, label: `${diff}% above market`, tone: 'high' }
  return { diff, label: 'At market price', tone: 'neutral' }
}

/** A genuine drop is opening price minus today's price. */
export function priceDrop(car: Pick<Car, 'price_history'>): number {
  const history = car.price_history
  if (!Array.isArray(history) || history.length < 2) return 0
  const drop = Number(history[0].price) - Number(history[history.length - 1].price)
  return drop > 0 ? drop : 0
}

// ─── Listing presentation ────────────────────────────────────────────────────

export function listedAgo(car: Pick<Car, 'listed_days'>): string | null {
  const days = car.listed_days
  if (days == null || !Number.isFinite(days)) return null
  if (days <= 0) return 'Listed today'
  if (days === 1) return 'Listed yesterday'
  if (days < 7) return `Listed ${days} days ago`
  if (days < 14) return 'Listed last week'
  if (days < 60) return `Listed ${Math.floor(days / 7)} weeks ago`
  return `Listed ${Math.floor(days / 30)} months ago`
}

export function isNewListing(car: Pick<Car, 'listed_days'>): boolean {
  return car.listed_days != null && car.listed_days <= 7
}

/** "High demand" — the app's threshold is 10+ saves. True scarcity, not theatre. */
export function isHighDemand(car: Pick<Car, 'saves_count' | 'saves'>): boolean {
  return (car.saves_count ?? car.saves ?? 0) >= 10
}

export function driveSideLabel(side?: string | null): string {
  if (side === 'RHD') return 'Right-hand drive · Japanese import'
  if (side === 'LHD') return 'Left-hand drive · local'
  return 'Drive side not recorded'
}

// ─── Status vocabulary ── mirrors the app's STATUS_CONFIG maps ───────────────

export const CAR_STATUS_LABEL: Record<string, string> = {
  under_review: 'Under review',
  scheduled: 'Inspection booked',
  inspecting: 'Being inspected',
  approved: 'Approved',
  live: 'Available',
  paused: 'Paused',
  rejected: 'Rejected',
  sold: 'Sold',
  archived: 'Archived',
}

export const SUBMISSION_STATUS_LABEL: Record<string, string> = {
  under_review: 'Under review',
  approved: 'Approved — book inspection',
  scheduled: 'Inspection booked',
  inspecting: 'Being inspected',
  inspected: 'Inspection complete',
  live: 'Live on marketplace',
  rejected: 'Action required',
}

// ─── Dates ───────────────────────────────────────────────────────────────────

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatRelative(iso?: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}
