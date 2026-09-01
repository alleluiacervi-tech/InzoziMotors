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

// ─── Rwanda import duty ── mirrors calcRwandaDuty in src/data/marketData.js ──
//
// This block and its mobile twin must change together, or the website and the
// app quote different landed costs for the same car.
//
// The RATES arrive from the server (GET /settings/duty-rates) so a correction
// is data entry rather than a release. The BASES below — what each percentage
// is charged on, and in what order — stay here in code, because choosing the
// wrong base is a modelling error rather than a typo.
//
// What this replaced was wrong three times over: excise hardcoded at
// 10/20/25/35% against an actual 5/10/15%, no withholding tax, and no EAC
// depreciation allowance at all. It therefore overstated excise while ignoring
// relief, worst on the older cars most buyers here are pricing.

export type ExciseBracket = { max_cc: number | null; rate_pct: number; label: string }
export type DepreciationBand = { min_age_years: number; allowance_pct: number }

export type DutyRates = {
  freight_insurance_pct: number
  customs_pct: number
  vat_pct: number
  withholding_pct: number
  infrastructure_pct: number
  excise_brackets: ExciseBracket[]
  depreciation: DepreciationBand[]
  reviewed_on?: string
  source?: string
}

/** The last schedule reviewed by a person. Used until the server answers, and
 *  again if it never does — a calculator that renders nothing is worse than one
 *  that renders dated figures and says so. */
export const FALLBACK_DUTY_RATES: DutyRates = {
  freight_insurance_pct: 12,
  customs_pct: 25,
  vat_pct: 18,
  withholding_pct: 5,
  infrastructure_pct: 1.5,
  excise_brackets: [
    { max_cc: 1500, rate_pct: 5, label: 'Under 1500cc' },
    { max_cc: 2500, rate_pct: 10, label: '1500 – 2500cc' },
    { max_cc: null, rate_pct: 15, label: 'Over 2500cc' },
  ],
  depreciation: [
    { min_age_years: 0, allowance_pct: 0 },
    { min_age_years: 2, allowance_pct: 20 },
    { min_age_years: 4, allowance_pct: 30 },
    { min_age_years: 6, allowance_pct: 40 },
    { min_age_years: 8, allowance_pct: 50 },
    { min_age_years: 10, allowance_pct: 80 },
  ],
  reviewed_on: '2026-08-25',
}

// Same module-variable pattern as the FX rate above: the root layout pushes the
// server value in before rendering, and <DutySync/> repeats it for the client
// bundle, which is a separate module instance.
let dutyRates: DutyRates = FALLBACK_DUTY_RATES

export function setDutyRates(rates: DutyRates | null | undefined): void {
  if (rates && Array.isArray(rates.excise_brackets) && rates.excise_brackets.length) {
    dutyRates = { ...FALLBACK_DUTY_RATES, ...rates }
  }
}

export function getDutyRates(): DutyRates {
  return dutyRates
}

/** The bracket a displacement falls into. The final bracket is open-ended, so
 *  an engine larger than every stated limit lands there rather than nowhere. */
export function exciseBracketFor(cc: number, rates: DutyRates = dutyRates): ExciseBracket {
  return (
    rates.excise_brackets.find((bracket) => bracket.max_cc === null || cc <= bracket.max_cc) ??
    rates.excise_brackets[rates.excise_brackets.length - 1]
  )
}

/** The EAC allowance for a vehicle of this age, in percent of dutiable value. */
export function depreciationFor(ageYears: number, rates: DutyRates = dutyRates): number {
  const bands = rates.depreciation
  let allowance = 0
  for (const band of bands) {
    if (ageYears >= band.min_age_years) allowance = band.allowance_pct
  }
  return allowance
}

export type DutyBreakdown = {
  vehicleValue: number
  dutiableValue: number
  depreciationPct: number
  cif: number
  customs: number
  excise: number
  exciseRatePct: number
  vat: number
  withholding: number
  infra: number
  totalDuties: number
  grandTotal: number
  effectiveRate: number
  reviewedOn: string | null
}

/**
 * Estimated landed cost in RWF. Most cars here are imported, so total cost of
 * ownership is the number buyers actually compare — not the sticker price.
 *
 * @param vehicleValueRwf the vehicle's value in RWF. It was called
 *        `vehicleValueUSD` while the arithmetic was pure percentages, so the
 *        name was simply wrong rather than the maths.
 * @param cc engine displacement, which selects the excise bracket.
 * @param ageYears vehicle age, which selects the EAC depreciation allowance.
 */
export function calcRwandaDuty(
  vehicleValueRwf: number,
  cc = 1800,
  ageYears = 0,
  rates: DutyRates = dutyRates
): DutyBreakdown {
  const pct = (n: number) => n / 100
  const bracket = exciseBracketFor(cc, rates)
  const depreciationPct = depreciationFor(ageYears, rates)

  // Depreciation reduces the value duty is assessed on, before anything else.
  const dutiableValue = vehicleValueRwf * (1 - pct(depreciationPct))
  const cif = dutiableValue * (1 + pct(rates.freight_insurance_pct))

  const customs = cif * pct(rates.customs_pct)
  const excise = (cif + customs) * pct(bracket.rate_pct)
  const vat = (cif + customs + excise) * pct(rates.vat_pct)
  const withholding = cif * pct(rates.withholding_pct)
  const infra = cif * pct(rates.infrastructure_pct)

  const totalDuties = customs + excise + vat + withholding + infra
  const grandTotal = vehicleValueRwf + totalDuties
  // Guard the divide: a zero value is what an empty input field produces.
  const effectiveRate = vehicleValueRwf > 0 ? Math.round((totalDuties / vehicleValueRwf) * 100) : 0

  return {
    vehicleValue: vehicleValueRwf,
    dutiableValue,
    depreciationPct,
    cif,
    customs,
    excise,
    exciseRatePct: bracket.rate_pct,
    vat,
    withholding,
    infra,
    totalDuties,
    grandTotal,
    effectiveRate,
    reviewedOn: rates.reviewed_on ?? null,
  }
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

export const RETURN_WINDOW_DAYS = 7

export function daysLeftInReturnWindow(completedAt?: string | null): number {
  if (!completedAt) return 0
  const completed = new Date(completedAt).getTime()
  if (Number.isNaN(completed)) return 0
  const elapsed = Date.now() - completed
  const daysPassed = elapsed / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.ceil(RETURN_WINDOW_DAYS - daysPassed))
}

export const HANDOVER_STATUS_LABEL: Record<string, string> = {
  pending: 'Requested',
  confirmed: 'Handover booked',
  booked: 'Handover booked',
  scheduled: 'Handover scheduled',
  in_progress: 'In progress',
  complete: 'Completed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Dispute open',
}

