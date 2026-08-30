// The USD⇄RWF rate. LIVE: refreshed from GET /fx on app boot (AppContext) and
// cached in storage for offline starts. `let` on purpose — Metro's CJS interop
// reads the binding at each use, so screens that show {RWF_RATE} pick up the
// refreshed value. The initial figure matches the backend's floor; it renders
// only before the first refresh on a first-ever launch.
//
// It was `const 1300` while the real rate drifted to ~1473 — every converted
// figure in the app was ~12% wrong, silently, which is why this stopped being
// a constant.
export let RWF_RATE = 1470;

/** Called from AppContext with the /fx response. Ignores nonsense so a broken
 *  payload can never zero out every price in the app. */
export function setRwfRate(rate) {
  if (Number.isFinite(rate) && rate > 100 && rate < 10000) RWF_RATE = rate;
}

// Kigali neighborhood assignments per car ID
const NEIGHBORHOOD_MAP = {
  '1': 'Nyarutarama', '2': 'Nyarutarama', '3': 'Nyarutarama', '4': 'Nyarutarama',
  '5': 'Remera',      '6': 'Remera',      '7': 'Remera',      '8': 'Remera',      '9': 'Remera',
  '10': 'Kicukiro',   '11': 'Kicukiro',   '12': 'Kicukiro',   '13': 'Kicukiro',   '14': 'Kicukiro',
  '15': 'Kimihurura', '16': 'Kimihurura', '17': 'Kimihurura', '18': 'Kimihurura',
  '19': 'Gisozi',     '20': 'Gisozi',     '21': 'Gisozi',     '22': 'Gisozi',     '23': 'Gisozi',
  '24': 'Kacyiru',    '25': 'Kacyiru',
};

// How many days since listing went live
const LISTED_DAYS_AGO = {
  '1': 12, '2': 3, '3': 8, '4': 25, '5': 1, '6': 47, '7': 15, '8': 5,
  '9': 20, '10': 32, '11': 7, '12': 2, '13': 45, '14': 11, '15': 18,
  '16': 28, '17': 4, '18': 35, '19': 9, '20': 14, '21': 22, '22': 6,
  '23': 50, '24': 17, '25': 31,
};

// How many buyers have saved this car
const SAVED_COUNTS = {
  '1': 47, '2': 23, '3': 31, '4': 8,  '5': 56, '6': 14, '7': 82, '8': 29,
  '9': 41, '10': 7, '11': 12, '12': 19, '13': 5, '14': 33, '15': 28,
  '16': 11, '17': 63, '18': 9, '19': 18, '20': 44, '21': 15, '22': 37,
  '23': 6,  '24': 22, '25': 8,
};

// Price drops (how much was knocked off the original listing price)
const PRICE_DROPS = {
  '1': 800, '3': 500, '8': 400, '12': 1200, '17': 650, '22': 900,
};

// Drive type (LHD = locally purchased / new imports; RHD = Japanese imports)
const DRIVE_TYPES = {
  '1': 'LHD', '2': 'LHD', '3': 'LHD', '4': 'LHD', '5': 'LHD',
  '6': 'LHD', '7': 'LHD', '8': 'RHD', '9': 'RHD', '10': 'RHD',
  '11': 'LHD', '12': 'LHD', '13': 'RHD', '14': 'LHD', '15': 'RHD',
  '16': 'LHD', '17': 'LHD', '18': 'RHD', '19': 'LHD', '20': 'RHD',
  '21': 'LHD', '22': 'RHD', '23': 'LHD', '24': 'RHD', '25': 'LHD',
};

// ─── Real data first, demo table second ──────────────────────────────────────
// Every accessor below takes either a car object or a bare id. When the object
// carries a server-computed value it wins; the hardcoded tables above only ever
// serve the 25 bundled demo cars (ids '1'–'25'), which is why a real listing
// used to show "0 saves · listed 14 days ago" no matter what the database said.

const idOf = (carOrId) => (typeof carOrId === 'object' && carOrId ? carOrId.id : carOrId);
const objOf = (carOrId) => (typeof carOrId === 'object' && carOrId ? carOrId : null);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function getNeighborhood(carOrId) {
  const car = objOf(carOrId);
  if (car?.location) return car.location;
  return NEIGHBORHOOD_MAP[idOf(carOrId)] || 'Kigali';
}

export function getListedDaysAgo(carOrId) {
  const car = objOf(carOrId);
  if (isNum(car?.listedDays)) return car.listedDays;
  return LISTED_DAYS_AGO[idOf(carOrId)] ?? 14;
}

export function getSavedCount(carOrId) {
  const car = objOf(carOrId);
  if (isNum(car?.saves)) return car.saves;
  return SAVED_COUNTS[idOf(carOrId)] || 0;
}

// A real drop is the difference between the opening price and today's price.
export function getPriceDrop(carOrId) {
  const car = objOf(carOrId);
  const history = car?.priceHistory;
  if (Array.isArray(history) && history.length > 1) {
    const drop = history[0] - history[history.length - 1];
    return drop > 0 ? drop : 0;
  }
  return PRICE_DROPS[idOf(carOrId)] || 0;
}

export function getDriveType(carOrId) {
  const car = objOf(carOrId);
  if (car?.drive_side) return car.drive_side;
  return DRIVE_TYPES[idOf(carOrId)] || 'LHD';
}

// ─────────────────────────────────────────────────────────────────────────────
// Market position — server-computed from real comparables, or not stated at all.
//
// The backend withholds this number until a car has at least three comparables,
// on its own stated grounds that "fewer than 3 comparables is noise, not a
// market". It sends null.
//
// This module used to fill that gap with `price * 1.08`. That is not a market
// average — it is the asking price multiplied by a constant, so the difference
// it produced was ALWAYS −7%, on every listing, forever. Every card carried a
// green "7% below market" pill and the detail screen printed the invented
// average as fact. The website never did this (see hasRealMarketData in
// web/src/lib/business.ts), so the two clients disagreed about the same car.
//
// Returning null is the whole fix: a surface that has no number omits the
// claim. A market comparison that appears only sometimes reads as rigour; one
// that appears on everything reads as decoration, and takes the inspection
// score's credibility down with it.
// ─────────────────────────────────────────────────────────────────────────────

/** The market average in RWF, or null when nobody computed one. */
export function getMarketAvg(car) {
  if (isNum(car?.marketAvg)) return car.marketAvg;
  // Bundled demo fixtures declare their own gap. That is fiction we authored
  // and it is __DEV__-only, not a measurement passed off as one.
  if (isNum(car?.belowMarket) && car.belowMarket > 0 && isNum(car?.price)) {
    return car.price + car.belowMarket;
  }
  return null;
}

/** % from market — negative is below. Null when there is no real average. */
export function getMarketDiff(car) {
  if (isNum(car?.marketDiff)) return car.marketDiff;
  const avg = getMarketAvg(car);
  if (!isNum(avg) || avg <= 0) return null;
  const price = car?.type === 'auction' ? (car.currentBid || car.price) : car?.price;
  if (!isNum(price)) return null;
  return Math.round(((price - avg) / avg) * 100);
}

// True only when the number came from real comparables — screens use this to
// decide whether to show a market claim at all rather than assert a guess.
export function hasRealMarketData(car) {
  return isNum(car?.marketAvg) && (car?.comparables || 0) >= 3;
}

// Price points for the sparkline (oldest → newest), or null when this listing
// has no price history.
//
// The old fallback returned [1.02p, 1.015p, 1.02p, 1.005p, 1.01p, p] — a shape
// derived entirely from the current asking price and drawn under the heading
// "Price history". Every car that had never changed price showed the same
// invented decline. A listing with one price has no history, and the honest
// rendering of no history is no chart.
export function getPriceHistory(car) {
  const history = car?.priceHistory;
  if (Array.isArray(history) && history.length > 1) return history;

  // Bundled demo fixtures carry an authored drop; __DEV__-only.
  const drop = PRICE_DROPS[idOf(car)] || 0;
  const base = car?.type === 'auction' ? (car.currentBid || car.price) : car?.price;
  if (drop > 0 && isNum(base)) {
    const orig = base + drop;
    return [orig, orig, Math.round(orig - drop * 0.4), Math.round(orig - drop * 0.7), Math.round(base + drop * 0.1), base];
  }
  return null;
}

// All cars in a given neighborhood (pass full cars array)
// Canonical money formatting. Product amounts already represent whole francs;
// presentation must never silently convert or relabel them.
export function formatRWF(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000;
    const compact = millions >= 100 || Number.isInteger(millions)
      ? millions.toFixed(0)
      : millions.toFixed(1).replace(/\.0$/, '');
    return `${compact}M RWF`;
  }
  return `RWF ${Math.round(value).toLocaleString('en-RW')}`;
}

// ─── Rwanda import duty ── mirrors calcRwandaDuty in web/src/lib/business.ts ──
//
// This block and its web twin must change together, or the app and the website
// quote different landed costs for the same car.
//
// The RATES come from the server (GET /settings/duty-rates, pushed in by
// AppContext) so a correction is data entry rather than an app release — which
// matters more here than on the web, because a shipped build cannot be fixed
// by a deploy. The BASES stay in code: a wrong base is a modelling error, not
// a typo.
//
// What this replaced was wrong three times over: excise hardcoded at
// 10/20/25/35% against an actual 5/10/15%, no withholding tax, and no EAC
// depreciation allowance at all.

/** The last schedule a person reviewed. Used until the server answers, and
 *  again if it never does — including offline, which is a normal state here. */
export const FALLBACK_DUTY_RATES = {
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
};

let dutyRates = FALLBACK_DUTY_RATES;

export function setDutyRates(rates) {
  if (rates && Array.isArray(rates.excise_brackets) && rates.excise_brackets.length) {
    dutyRates = { ...FALLBACK_DUTY_RATES, ...rates };
  }
}

export function getDutyRates() {
  return dutyRates;
}

/** The final bracket is open-ended, so an engine larger than every stated
 *  limit lands there rather than nowhere. */
export function exciseBracketFor(cc, rates = dutyRates) {
  return (
    rates.excise_brackets.find((b) => b.max_cc === null || cc <= b.max_cc)
    || rates.excise_brackets[rates.excise_brackets.length - 1]
  );
}

/** EAC depreciation allowance for a vehicle of this age, in percent. */
export function depreciationFor(ageYears, rates = dutyRates) {
  let allowance = 0;
  for (const band of rates.depreciation) {
    if (ageYears >= band.min_age_years) allowance = band.allowance_pct;
  }
  return allowance;
}

/**
 * Estimated landed cost in RWF.
 *
 * @param vehicleValueRwf value in RWF. The parameter was named
 *        `vehicleValueUSD` while the arithmetic was pure percentages, so the
 *        name was wrong rather than the maths.
 */
export function calcRwandaDuty(vehicleValueRwf, cc = 1800, ageYears = 0, rates = dutyRates) {
  const pct = (n) => n / 100;
  const bracket = exciseBracketFor(cc, rates);
  const depreciationPct = depreciationFor(ageYears, rates);

  const dutiableValue = vehicleValueRwf * (1 - pct(depreciationPct));
  const cif = dutiableValue * (1 + pct(rates.freight_insurance_pct));

  const customs = cif * pct(rates.customs_pct);
  const excise = (cif + customs) * pct(bracket.rate_pct);
  const vat = (cif + customs + excise) * pct(rates.vat_pct);
  const withholding = cif * pct(rates.withholding_pct);
  const infra = cif * pct(rates.infrastructure_pct);

  const totalDuties = customs + excise + vat + withholding + infra;
  const grandTotal = vehicleValueRwf + totalDuties;
  // Guard the divide. An empty input field is zero, and this used to return NaN
  // and render "NaN%" on the results card.
  const effectiveRate = vehicleValueRwf > 0 ? Math.round((totalDuties / vehicleValueRwf) * 100) : 0;

  return {
    vehicleValue: vehicleValueRwf, dutiableValue, depreciationPct,
    cif, customs, excise, exciseRatePct: bracket.rate_pct,
    vat, withholding, infra, totalDuties, grandTotal, effectiveRate,
    reviewedOn: rates.reviewed_on || null,
  };
}
