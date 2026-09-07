// ─────────────────────────────────────────────────────────────────────────────
// test/anomaly-detector.test.js
// Unit tests for odometer rollback detection, chronological sequence checks,
// and listing discrepancy diffing.
// ─────────────────────────────────────────────────────────────────────────────

const assert = require('assert');
const {
  analyzeVehicleDataQuality,
  compareListingAgainstVerified,
} = require('../src/lib/vin-engine/anomaly-detector');

console.log('Running Anomaly & Data Quality Engine Tests...\n');

// 1. Odometer Rollback Detection
const eventsWithRollback = [
  {
    eventType: 'inspection',
    eventDate: '2024-06-15',
    odometerKm: 85000,
    title: 'Initial Inspection',
  },
  {
    eventType: 'inspection',
    eventDate: '2025-01-10',
    odometerKm: 62000, // Rollback! 85,000 -> 62,000
    title: 'Annual Inspection',
  },
];

const analysis = analyzeVehicleDataQuality({
  specs: { make: 'Toyota', model: 'RAV4', year: 2019 },
  events: eventsWithRollback,
});

assert.strictEqual(analysis.hasAnomalies, true);
const rollbackSignal = analysis.signals.find((s) => s.signalType === 'potential_odometer_rollback');
assert.ok(rollbackSignal, 'Should detect potential_odometer_rollback');
assert.strictEqual(rollbackSignal.severity, 'warning');
assert.match(rollbackSignal.title, /Potential Mileage Inconsistency Detected/i);
assert.match(rollbackSignal.publicMessage, /decrease of 23,000 km/i);
// Defensible non-defamatory phrasing check:
assert.doesNotMatch(rollbackSignal.publicMessage, /fraud/i);
assert.doesNotMatch(rollbackSignal.publicMessage, /criminal/i);
console.log('✓ Odometer rollback correctly flagged with objective, non-defamatory wording');

// 2. Normal Consistent Odometer Progression
const eventsConsistent = [
  { eventType: 'inspection', eventDate: '2023-05-10', odometerKm: 30000, title: 'Check 1' },
  { eventType: 'inspection', eventDate: '2024-05-10', odometerKm: 50000, title: 'Check 2' },
  { eventType: 'inspection', eventDate: '2025-05-10', odometerKm: 72000, title: 'Check 3' },
];

const consistentAnalysis = analyzeVehicleDataQuality({
  specs: { make: 'Toyota', model: 'RAV4', year: 2021 },
  events: eventsConsistent,
});
assert.strictEqual(consistentAnalysis.hasAnomalies, false);
assert.strictEqual(consistentAnalysis.signals.filter((s) => s.severity === 'warning').length, 0);
assert.strictEqual(consistentAnalysis.confidenceScore >= 0.85, true);
console.log('✓ Normal mileage progression passes without warnings');

// 3. Chronological Anomaly (Event predating manufacture year)
const chronologicalAnomaly = analyzeVehicleDataQuality({
  specs: { make: 'Honda', model: 'CR-V', year: 2020 },
  events: [
    { eventType: 'service', eventDate: '2016-04-12', odometerKm: 15000, title: 'Early Service' },
  ],
});
const chronoSignal = chronologicalAnomaly.signals.find((s) => s.signalType === 'chronological_discrepancy');
assert.ok(chronoSignal, 'Should detect event predating model year');
console.log('✓ Chronological discrepancy detected when event predates vehicle model year');

// 4. Listing Discrepancy Diffing
const listingInputs = {
  make: 'BMW',
  model: 'X5',
  year: '2016',
  fuel_type: 'Diesel',
  transmission: 'Automatic',
};

const verifiedSpecs = {
  make: 'Toyota',
  model: 'RAV4',
  year: 2019,
  fuelType: 'Petrol',
  transmission: 'Automatic',
};

const diffs = compareListingAgainstVerified(listingInputs, verifiedSpecs);
assert.strictEqual(diffs.length >= 3, true);

const makeDiff = diffs.find((d) => d.field === 'make');
assert.ok(makeDiff);
assert.strictEqual(makeDiff.entered, 'BMW');
assert.strictEqual(makeDiff.verified, 'Toyota');

const yearDiff = diffs.find((d) => d.field === 'year');
assert.ok(yearDiff);
assert.strictEqual(yearDiff.entered, '2016');
assert.strictEqual(yearDiff.verified, 2019);

const fuelDiff = diffs.find((d) => d.field === 'fuel_type');
assert.ok(fuelDiff);
assert.strictEqual(fuelDiff.entered, 'Diesel');
assert.strictEqual(fuelDiff.verified, 'Petrol');

// Transmission is identical ("Automatic" vs "Automatic"), so it must NOT be in diffs
const transDiff = diffs.find((d) => d.field === 'transmission');
assert.strictEqual(transDiff, undefined);
console.log('✓ Listing discrepancy diffing catches mismatched Make, Year, and Fuel Type');

console.log('\nAll Anomaly & Data Quality tests passed successfully! ✨');
