// The Korean landed-cost estimate: off until the exporter's costs exist, then
// plain arithmetic.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { estimateLandedCost, validateCostInputs, exciseRange } = require('../src/lib/encar/landed-cost');

const RATES = {
  customs_pct: 25, vat_pct: 18, withholding_pct: 5, infrastructure_pct: 1.5, freight_insurance_pct: 12,
  excise_brackets: [{ max_cc: 1500, rate_pct: 5 }, { max_cc: 2500, rate_pct: 10 }, { max_cc: null, rate_pct: 15 }],
  depreciation: [{ min_age_years: 0, allowance_pct: 0 }, { min_age_years: 2, allowance_pct: 20 }, { min_age_years: 10, allowance_pct: 80 }],
  reviewed_on: '2026-08-25',
};
const COSTS = {
  configured: true, export_fee_usd: 500, inland_transport_usd: 200,
  freight_usd: { default: 1500, sedan: null, suv: 1800, van: null }, insurance_pct: 1, reviewed_on: '2026-10-01',
};
const base = {
  priceKrw: 20_000_000, year: 2024, category: null, krwPerUsd: 1400, rwfPerUsd: 1450,
  costs: COSTS, rates: RATES, now: new Date('2026-10-01T00:00:00Z'),
};

test('no estimate while the exporter costs are not configured, whatever else is known', () => {
  assert.equal(estimateLandedCost({ ...base, costs: { ...COSTS, configured: false } }), null);
  assert.equal(estimateLandedCost({ ...base, costs: null }), null);
});

test('no estimate when a rate or the price is missing: never a guess', () => {
  assert.equal(estimateLandedCost({ ...base, krwPerUsd: null }), null);
  assert.equal(estimateLandedCost({ ...base, rwfPerUsd: 0 }), null);
  assert.equal(estimateLandedCost({ ...base, priceKrw: 0 }), null);
  assert.equal(estimateLandedCost({ ...base, rates: null }), null);
});

test('the shipping side adds up: car + export + inland + freight + insurance', () => {
  const e = estimateLandedCost(base);
  const car = 20_000_000 / 1400;
  const expectedUsd = car + 500 + 200 + 1500 + car * 0.01;
  assert.equal(e.breakdown_usd.car, Math.round(car));
  assert.equal(e.breakdown_usd.freight, 1500);
  assert.equal(e.to_port_rwf, Math.round((expectedUsd * 1450) / 1000) * 1000);
});

test('duty is a range across excise brackets when engine size is unknown, a point when known', () => {
  const range = estimateLandedCost(base);
  assert.ok(range.duty_rwf.high > range.duty_rwf.low);
  assert.deepEqual(range.excise_pct, { min: 5, max: 15 });
  const known = estimateLandedCost({ ...base, cc: 2000 });
  assert.equal(known.duty_rwf.low, known.duty_rwf.high);
  assert.deepEqual(known.excise_pct, { min: 10, max: 10 });
  assert.ok(known.duty_rwf.low > range.duty_rwf.low && known.duty_rwf.low < range.duty_rwf.high);
  assert.equal(known.engine_cc, 2000);
});

test('an older car is dutied on a depreciated value, so it costs less to clear', () => {
  const newer = estimateLandedCost({ ...base, year: 2025 });
  const older = estimateLandedCost({ ...base, year: 2014 }); // 12 years: 80% allowance
  assert.equal(older.depreciation_pct, 80);
  assert.ok(older.duty_rwf.high < newer.duty_rwf.high);
});

test('freight follows the body category, falling back to the default', () => {
  assert.equal(estimateLandedCost({ ...base, category: 'suv' }).breakdown_usd.freight, 1800);
  assert.equal(estimateLandedCost({ ...base, category: 'sedan' }).breakdown_usd.freight, 1500);
  assert.equal(estimateLandedCost({ ...base, category: 'bus' }).breakdown_usd.freight, 1500);
});

test('amounts are rounded to whole thousands of francs and carry the review dates and the estimate wording', () => {
  const e = estimateLandedCost(base);
  for (const n of [e.to_port_rwf, e.duty_rwf.low, e.duty_rwf.high, e.total_rwf.low, e.total_rwf.high]) assert.equal(n % 1000, 0);
  assert.equal(e.costs_reviewed_on, '2026-10-01');
  assert.equal(e.duty_reviewed_on, '2026-08-25');
  assert.match(e.note, /Estimate/);
});

test('cost sheet validation: names the field, and will not switch on without a source date and a freight cost', () => {
  assert.deepEqual(validateCostInputs(COSTS), []);
  assert.match(validateCostInputs({ ...COSTS, export_fee_usd: -1 })[0], /export_fee_usd/);
  assert.match(validateCostInputs({ ...COSTS, reviewed_on: null }).join(' '), /reviewed_on is required/);
  assert.match(validateCostInputs({ ...COSTS, freight_usd: { default: 0 } }).join(' '), /freight_usd.default/);
  assert.match(validateCostInputs({ ...COSTS, insurance_pct: 50 })[0], /insurance_pct/);
  // The shipped placeholder is valid precisely because it is off.
  assert.deepEqual(validateCostInputs({ configured: false, export_fee_usd: 0, inland_transport_usd: 0, freight_usd: { default: 0 }, insurance_pct: 0, reviewed_on: null }), []);
  assert.deepEqual(exciseRange(RATES), { min: 5, max: 15 });
});
