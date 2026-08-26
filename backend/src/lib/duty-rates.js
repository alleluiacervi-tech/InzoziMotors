// ─────────────────────────────────────────────────────────────────────────────
// Rwanda vehicle import duty — the rates, and only the rates.
//
// The calculator that shipped was publicly wrong in three ways at once: excise
// was hardcoded at 10/20/25/35% against an actual 5/10/15% schedule, the 5%
// withholding tax was missing entirely, and the EAC depreciation allowance —
// which reduces the dutiable value of a used vehicle by 20% at two years rising
// to 80% at ten — was not applied at all. Net effect: it overstated excise
// while ignoring depreciation, and the error was worst on exactly the older
// cars most Rwandan buyers are actually pricing.
//
// ── What is configurable, and what is not ────────────────────────────────────
// RATES are data, editable from the admin settings page. The BASES each rate
// applies to are code, because getting a base wrong is a modelling error rather
// than a typo, and it should require a review and a deploy — not a text field.
//
// The published bases are also the part still least certain (is excise assessed
// on CIF, or on CIF plus customs?). So every payload carries `reviewed_on`, and
// both the admin form and the public calculator show it. An unverified schedule
// is then VISIBLY unverified rather than confidently wrong, and correcting it
// is data entry rather than a release.
// ─────────────────────────────────────────────────────────────────────────────
const pool = require('../db');
const { log } = require('./log');

const SETTING_KEY = 'import_duty_rates';

const DEFAULT_RATES = {
  // Freight and insurance added to the vehicle's value to reach CIF.
  freight_insurance_pct: 12,
  customs_pct: 25,
  vat_pct: 18,
  withholding_pct: 5,
  infrastructure_pct: 1.5,
  // Ascending by max_cc, exactly one open-ended trailing bracket (max_cc null).
  excise_brackets: [
    { max_cc: 1500, rate_pct: 5,  label: 'Under 1500cc' },
    { max_cc: 2500, rate_pct: 10, label: '1500 – 2500cc' },
    { max_cc: null, rate_pct: 15, label: 'Over 2500cc' },
  ],
  // EAC depreciation allowance against the dutiable value, ascending by age.
  depreciation: [
    { min_age_years: 0,  allowance_pct: 0 },
    { min_age_years: 2,  allowance_pct: 20 },
    { min_age_years: 4,  allowance_pct: 30 },
    { min_age_years: 6,  allowance_pct: 40 },
    { min_age_years: 8,  allowance_pct: 50 },
    { min_age_years: 10, allowance_pct: 80 },
  ],
  reviewed_on: '2026-08-25',
  source: 'Rwanda Revenue Authority published schedules and the EAC Common External Tariff',
};

const PERCENT_FIELDS = [
  'freight_insurance_pct', 'customs_pct', 'vat_pct', 'withholding_pct', 'infrastructure_pct',
];

/** Returns an array of human-readable problems — empty means valid. Each names
 *  the field, because "invalid value" on a form of twenty numbers is useless. */
function validateRates(value) {
  const problems = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ['Duty rates must be an object'];
  }

  for (const field of PERCENT_FIELDS) {
    const number = value[field];
    if (typeof number !== 'number' || !Number.isFinite(number)) problems.push(`${field} must be a number`);
    else if (number < 0 || number > 100) problems.push(`${field} must be between 0 and 100`);
  }

  const brackets = value.excise_brackets;
  if (!Array.isArray(brackets) || brackets.length === 0) {
    problems.push('excise_brackets must be a non-empty list');
  } else {
    let previous = 0;
    let openEnded = 0;
    brackets.forEach((bracket, index) => {
      const at = `excise_brackets[${index}]`;
      if (typeof bracket?.rate_pct !== 'number' || bracket.rate_pct < 0 || bracket.rate_pct > 100) {
        problems.push(`${at}.rate_pct must be a percentage between 0 and 100`);
      }
      if (bracket?.max_cc === null || bracket?.max_cc === undefined) {
        openEnded += 1;
        // An open-ended bracket anywhere but last would shadow everything after it.
        if (index !== brackets.length - 1) problems.push(`${at} has no upper limit, so it must be the last bracket`);
      } else if (!Number.isInteger(bracket.max_cc) || bracket.max_cc <= previous) {
        problems.push(`${at}.max_cc must be a whole number larger than ${previous}`);
      } else {
        previous = bracket.max_cc;
      }
    });
    if (openEnded !== 1) problems.push('exactly one excise bracket must be open-ended (max_cc: null)');
  }

  const depreciation = value.depreciation;
  if (!Array.isArray(depreciation) || depreciation.length === 0) {
    problems.push('depreciation must be a non-empty list');
  } else {
    let previousAge = -1;
    depreciation.forEach((band, index) => {
      const at = `depreciation[${index}]`;
      if (!Number.isInteger(band?.min_age_years) || band.min_age_years <= previousAge) {
        problems.push(`${at}.min_age_years must be a whole number larger than ${previousAge}`);
      } else {
        previousAge = band.min_age_years;
      }
      if (typeof band?.allowance_pct !== 'number' || band.allowance_pct < 0 || band.allowance_pct >= 100) {
        problems.push(`${at}.allowance_pct must be between 0 and 99`);
      }
    });
  }

  if (value.reviewed_on !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(value.reviewed_on))) {
    problems.push('reviewed_on must be a date in YYYY-MM-DD form');
  }
  return problems;
}

// A short cache, modelled on lib/fx.js: the rates change perhaps twice a year
// but the calculator is on a public page, and a settings read per visitor is
// pointless load. Never throws — a duty calculator that 500s is worse than one
// showing last-reviewed defaults.
let cache = { at: 0, value: null };
const TTL_MS = 5 * 60 * 1000;

async function loadDutyRates({ force = false } = {}) {
  if (!force && cache.value && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const { rows } = await pool.query('SELECT value FROM platform_settings WHERE key = $1', [SETTING_KEY]);
    const stored = rows[0]?.value;
    const value = stored && validateRates(stored).length === 0
      ? { ...DEFAULT_RATES, ...stored }
      : DEFAULT_RATES;
    if (stored && validateRates(stored).length) {
      log.error('stored duty rates are invalid — serving defaults', { problems: validateRates(stored) });
    }
    cache = { at: Date.now(), value };
    return value;
  } catch (err) {
    log.error('duty rates load failed', { error: err.message });
    return cache.value || DEFAULT_RATES;
  }
}

/** Drop the cache so an admin sees their own edit immediately. */
function invalidateDutyRates() { cache = { at: 0, value: null }; }

module.exports = { SETTING_KEY, DEFAULT_RATES, validateRates, loadDutyRates, invalidateDutyRates };
