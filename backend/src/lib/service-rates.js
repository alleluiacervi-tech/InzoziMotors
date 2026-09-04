// ─────────────────────────────────────────────────────────────────────────────
// The rate card — what Sawa actually charges, and where.
//
// Five monetizable lines existed in code before this: the walk-in inspection
// fee, report resale, the rental listing subscription, sponsored placement,
// and import orders. None of them had a price. Every amount was typed by
// hand, per transaction, by whichever admin happened to be recording it — no
// default, nothing a customer could see before showing up, nothing the
// website could quote. This is the fix for the three lines simple enough to
// carry one flat RWF number apiece. Sponsored placement is deliberately not
// here — hold that line until there is an audience worth selling. Import
// orders are quoted individually per vehicle and don't fit a flat rate.
//
// Same shape as duty-rates.js: RATES are data, editable from the admin
// settings page; the loader never throws, and `reviewed_on` keeps a starting
// number from being mistaken for a researched one.
// ─────────────────────────────────────────────────────────────────────────────
const pool = require('../db');
const { log } = require('./log');

const SETTING_KEY = 'service_rates';

const DEFAULT_RATES = {
  inspection_fee_rwf: 15000,
  report_resale_fee_rwf: 5000,
  rental_subscription_monthly_rwf: 10000,
  reviewed_on: '2026-09-02',
};

const AMOUNT_FIELDS = ['inspection_fee_rwf', 'report_resale_fee_rwf', 'rental_subscription_monthly_rwf'];

/** Returns an array of human-readable problems — empty means valid. */
function validateRates(value) {
  const problems = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ['Rate card must be an object'];
  }

  for (const field of AMOUNT_FIELDS) {
    const amount = value[field];
    if (!Number.isInteger(amount) || amount < 0) {
      problems.push(`${field} must be a whole number of RWF, zero or more`);
    }
  }

  if (value.reviewed_on !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(value.reviewed_on))) {
    problems.push('reviewed_on must be a date in YYYY-MM-DD form');
  }
  return problems;
}

// Short cache, same reasoning as duty-rates.js: this is read on public pages
// and from fee-recording forms, and a settings read per request is pointless
// load for a number that changes rarely. Never throws.
let cache = { at: 0, value: null };
const TTL_MS = 5 * 60 * 1000;

async function loadServiceRates({ force = false } = {}) {
  if (!force && cache.value && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const { rows } = await pool.query('SELECT value FROM platform_settings WHERE key = $1', [SETTING_KEY]);
    const stored = rows[0]?.value;
    const value = stored && validateRates(stored).length === 0
      ? { ...DEFAULT_RATES, ...stored }
      : DEFAULT_RATES;
    if (stored && validateRates(stored).length) {
      log.error('stored service rates are invalid — serving defaults', { problems: validateRates(stored) });
    }
    cache = { at: Date.now(), value };
    return value;
  } catch (err) {
    log.error('service rates load failed', { error: err.message });
    return cache.value || DEFAULT_RATES;
  }
}

/** Drop the cache so an admin sees their own edit immediately. */
function invalidateServiceRates() { cache = { at: 0, value: null }; }

module.exports = { SETTING_KEY, DEFAULT_RATES, validateRates, loadServiceRates, invalidateServiceRates };
