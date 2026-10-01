// ─────────────────────────────────────────────────────────────────────────────
// What a Korean car costs in Kigali: an ESTIMATE, labelled as one (plan A9).
//
//   Korean price  +  exporter's fees  +  inland transport  +  sea freight
//   +  insurance                       = landed before duty (the CIF value)
//   then Rwanda's import duties on that, by the same schedule the duty
//   calculator uses (lib/duty-rates.js).
//
// Two things keep it honest:
//
//   1. The exporter's costs are DATA an admin enters from the exporter's real
//      cost sheet (platform_settings.encar_cost_inputs, with `reviewed_on`). Until
//      `configured` is true this returns null and nothing in any client shows a
//      figure. A landed price built on guessed shipping costs is worse than none.
//   2. The provider's list does not give engine size, and excise depends on it.
//      So duty is a RANGE: the cheapest and the dearest excise bracket. Pretending
//      to know would be the kind of confident wrongness the duty schedule's own
//      header warns about.
//
// Pure arithmetic over numbers handed in: no I/O, so the tests pin every figure.
// Money here is USD for the shipping side and RWF for the duty side, converted
// once at the edge; the database keeps RWF whole francs (invariant 7) and the
// Korean price in the provider's own unit.
// ─────────────────────────────────────────────────────────────────────────────

const SETTING_KEY = 'encar_cost_inputs';
const CATEGORIES = ['sedan', 'suv', 'van'];

const pct = (n) => n / 100;

/** Problems with an admin-edited cost sheet; empty means valid. */
function validateCostInputs(value) {
  const problems = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['Cost inputs must be an object'];
  if (typeof value.configured !== 'boolean') problems.push('configured must be true or false');
  const usd = (field, v) => {
    if (!Number.isInteger(v) || v < 0 || v > 100_000) problems.push(`${field} must be a whole number of US dollars, 0 to 100,000`);
  };
  usd('export_fee_usd', value.export_fee_usd);
  usd('inland_transport_usd', value.inland_transport_usd);
  const freight = value.freight_usd;
  if (!freight || typeof freight !== 'object' || Array.isArray(freight)) {
    problems.push('freight_usd must be an object with a default');
  } else {
    usd('freight_usd.default', freight.default);
    for (const c of CATEGORIES) {
      if (freight[c] !== null && freight[c] !== undefined) usd(`freight_usd.${c}`, freight[c]);
    }
  }
  if (typeof value.insurance_pct !== 'number' || !(value.insurance_pct >= 0 && value.insurance_pct <= 10)) {
    problems.push('insurance_pct must be a number from 0 to 10');
  }
  if (value.reviewed_on != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(value.reviewed_on))) {
    problems.push('reviewed_on must be a date in YYYY-MM-DD form');
  }
  // Turning the estimate on without saying where the numbers came from is how a
  // placeholder becomes a promise.
  if (value.configured === true) {
    if (!value.reviewed_on) problems.push('reviewed_on is required once configured is true');
    if (!(value.freight_usd && value.freight_usd.default > 0)) problems.push('freight_usd.default must be above zero once configured is true');
  }
  return problems;
}

/** The bracket a displacement falls in, with the open-ended last one catching the rest. */
function exciseRange(rates) {
  const rs = (rates.excise_brackets || []).map((b) => b.rate_pct);
  return rs.length ? { min: Math.min(...rs), max: Math.max(...rs) } : { min: 0, max: 0 };
}

function depreciationFor(ageYears, rates) {
  let allowance = 0;
  for (const band of rates.depreciation || []) {
    if (ageYears >= band.min_age_years) allowance = band.allowance_pct;
  }
  return allowance;
}

/** The excise rate for a known engine size: the last bracket is open-ended. */
function exciseFor(cc, rates) {
  const brackets = rates.excise_brackets || [];
  const b = brackets.find((x) => x.max_cc === null || cc <= x.max_cc) || brackets[brackets.length - 1];
  return b ? b.rate_pct : 0;
}

/** Rwanda duties on a CIF value, at one excise rate. Mirrors web/src/lib/business.ts calcRwandaDuty. */
function duties(cifRwf, excisePct, rates) {
  const customs = cifRwf * pct(rates.customs_pct);
  const excise = (cifRwf + customs) * pct(excisePct);
  const vat = (cifRwf + customs + excise) * pct(rates.vat_pct);
  const withholding = cifRwf * pct(rates.withholding_pct);
  const infra = cifRwf * pct(rates.infrastructure_pct);
  return customs + excise + vat + withholding + infra;
}

/**
 * @param {object} input
 * @param {number} input.priceKrw        the Korean asking price, whole won
 * @param {number} input.year            model year
 * @param {string|null} input.category   'sedan' | 'suv' | 'van' | null
 * @param {number|null} [input.cc]       engine size, when the listing detail gave one: narrows the range to a point
 * @param {number} input.krwPerUsd       live rate
 * @param {number} input.rwfPerUsd       live rate
 * @param {object} input.costs           platform_settings.encar_cost_inputs
 * @param {object} input.rates           platform_settings.import_duty_rates
 * @param {Date}   [input.now]
 * @returns {object|null} null whenever any ingredient is missing; never a guess
 */
function estimateLandedCost({ priceKrw, year, category, cc = null, krwPerUsd, rwfPerUsd, costs, rates, now = new Date() }) {
  if (!costs || costs.configured !== true || validateCostInputs(costs).length) return null;
  if (!rates || !Number.isFinite(priceKrw) || priceKrw <= 0) return null;
  if (!Number.isFinite(krwPerUsd) || krwPerUsd <= 0 || !Number.isFinite(rwfPerUsd) || rwfPerUsd <= 0) return null;

  const carUsd = priceKrw / krwPerUsd;
  const freightUsd = (category && costs.freight_usd[category] != null) ? costs.freight_usd[category] : costs.freight_usd.default;
  const insuranceUsd = carUsd * pct(costs.insurance_pct);
  const toPortUsd = carUsd + costs.export_fee_usd + costs.inland_transport_usd + freightUsd + insuranceUsd;

  const age = Math.max(0, now.getFullYear() - year);
  const dep = depreciationFor(age, rates);
  // Duty is assessed on the vehicle's depreciated value plus what it cost to get
  // here, same ordering as the duty calculator.
  const dutiableUsd = carUsd * (1 - pct(dep)) + costs.export_fee_usd + costs.inland_transport_usd + freightUsd + insuranceUsd;
  const cifRwf = dutiableUsd * rwfPerUsd;
  const { min, max } = Number.isFinite(cc) && cc > 0
    ? (() => { const r = exciseFor(cc, rates); return { min: r, max: r }; })()
    : exciseRange(rates);
  const dutyLowRwf = duties(cifRwf, min, rates);
  const dutyHighRwf = duties(cifRwf, max, rates);

  const toPortRwf = toPortUsd * rwfPerUsd;
  // Whole thousands of francs: an estimate must not look more exact than it is.
  const round = (n) => Math.round(n / 1000) * 1000;
  return {
    currency: 'RWF',
    to_port_rwf: round(toPortRwf),
    duty_rwf: { low: round(dutyLowRwf), high: round(dutyHighRwf) },
    total_rwf: { low: round(toPortRwf + dutyLowRwf), high: round(toPortRwf + dutyHighRwf) },
    breakdown_usd: {
      car: Math.round(carUsd),
      export_fee: costs.export_fee_usd,
      inland_transport: costs.inland_transport_usd,
      freight: freightUsd,
      insurance: Math.round(insuranceUsd),
    },
    depreciation_pct: dep,
    excise_pct: { min, max },
    engine_cc: Number.isFinite(cc) && cc > 0 ? cc : null,
    costs_reviewed_on: costs.reviewed_on,
    duty_reviewed_on: rates.reviewed_on ?? null,
    // The words every client must show with the figure.
    note: 'Estimate only. The final figures are in your quote.',
  };
}

module.exports = { SETTING_KEY, validateCostInputs, estimateLandedCost, exciseRange, exciseFor, depreciationFor, duties };
