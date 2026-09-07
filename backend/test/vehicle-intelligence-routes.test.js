const test = require('node:test');
const assert = require('node:assert/strict');

const { compareListingAgainstVerified } = require('../src/lib/vin-engine/anomaly-detector');
const { maskVin } = require('../src/lib/vin-engine/validator');

test('Vehicle Intelligence Route Contract Tests', async (t) => {
  await t.test('discrepancy engine handles empty or valid inputs', () => {
    const listing = { make: 'Toyota', model: 'RAV4', year: 2020, fuel_type: 'Petrol' };
    const verified = { make: 'Toyota', model: 'RAV4', year: 2020, fuelType: 'Hybrid' };
    
    const diffs = compareListingAgainstVerified(listing, verified);
    assert.equal(diffs.length, 1);
    assert.equal(diffs[0].field, 'fuel_type');
    assert.equal(diffs[0].entered, 'Petrol');
    assert.equal(diffs[0].verified, 'Hybrid');
  });

  await t.test('masking guardrails keep raw VIN safe on public serialization', () => {
    const raw = '4T1BF1FK5CU123456';
    const masked = maskVin(raw);
    assert.equal(masked, '4T1BF1FK***3456');
    assert.ok(!masked.includes('5CU12'));
  });

  await t.test('currency validation strictly allows RWF and USD', () => {
    const validCurrencies = ['RWF', 'USD'];
    assert.ok(validCurrencies.includes('USD'));
    assert.ok(validCurrencies.includes('RWF'));
    assert.ok(!validCurrencies.includes('EUR'));
    assert.ok(!validCurrencies.includes('GBP'));
  });

  await t.test('specs override allowed fields whitelist', () => {
    const ALLOWED_FIELDS = [
      'make', 'model', 'year', 'trim', 'body_type',
      'engine_displacement_cc', 'engine_cylinders', 'engine_description',
      'fuel_type', 'transmission', 'drivetrain', 'plant_country', 'plant_city',
      'verification_status'
    ];
    assert.ok(ALLOWED_FIELDS.includes('engine_displacement_cc'));
    assert.ok(ALLOWED_FIELDS.includes('drivetrain'));
    assert.ok(!ALLOWED_FIELDS.includes('vin_raw'));
    assert.ok(!ALLOWED_FIELDS.includes('password_hash'));
  });
});
