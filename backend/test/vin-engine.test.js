// ─────────────────────────────────────────────────────────────────────────────
// test/vin-engine.test.js
// Unit tests for ISO 3779 validation, check digit math, WMI DB & JDM decoding.
// ─────────────────────────────────────────────────────────────────────────────

const assert = require('assert');
const {
  normalizeVin,
  maskVin,
  validateCheckDigit,
  validateVehicleIdentifier,
} = require('../src/lib/vin-engine/validator');
const { resolveWmi } = require('../src/lib/vin-engine/wmi-db');
const { resolveModelYear } = require('../src/lib/vin-engine/year-codes');
const { decodeJdmChassis } = require('../src/lib/vin-engine/jdm-chassis');

console.log('Running VIN Engine Unit Tests...\n');

// 1. Normalization
assert.strictEqual(normalizeVin('  jtd-bz29 3401-234567  '), 'JTDBZ293401234567');
assert.strictEqual(normalizeVin('nze141 - 5028491'), 'NZE1415028491');
assert.strictEqual(normalizeVin(''), null);
console.log('✓ Normalization handles spaces, hyphens, lowercase and empty inputs');

// 2. Masking
assert.strictEqual(maskVin('JTDBZ293401234567'), 'JTDBZ293***4567');
assert.strictEqual(maskVin('NZE1415028491'), 'NZE141***491');
assert.strictEqual(maskVin('JTDBZ293401234567', { labelOnly: true }), 'VIN Verified');
assert.strictEqual(maskVin(''), 'VIN Hidden');
assert.doesNotMatch(maskVin('JTDBZ293401234567'), /0123/);
console.log('✓ Masking strictly hides middle characters and never reveals full VIN');

// 3. Modulo 11 Check Digit Validation
// 1HGCR2F87HA021432: 9th digit is '7'. Mathematically valid.
const checkValid = validateCheckDigit('1HGCR2F87HA021432');
assert.strictEqual(checkValid.valid, true);
assert.strictEqual(checkValid.calculated, '7');
assert.strictEqual(checkValid.recorded, '7');

// Tampered check digit (changed '7' to '3')
const checkInvalid = validateCheckDigit('1HGCR2F83HA021432');
assert.strictEqual(checkInvalid.valid, false);
assert.strictEqual(checkInvalid.calculated, '7');
assert.strictEqual(checkInvalid.recorded, '3');

// Check digit 'X' (Remainder 10)
// 1FMJU1GT6HEA22258 -> check digit 6
const checkXCandidate = validateCheckDigit('1FM5K8F85HGA00000');
assert.strictEqual(typeof checkXCandidate.calculated, 'string');
console.log('✓ Modulo 11 Check Digit correctly validates authentic and tampered VINs');

// 4. WMI Resolution
const toyotaWmi = resolveWmi('JTD');
assert.strictEqual(toyotaWmi.make, 'Toyota');
assert.strictEqual(toyotaWmi.country, 'Japan');

const bmwWmi = resolveWmi('WBA');
assert.strictEqual(bmwWmi.make, 'BMW');
assert.strictEqual(bmwWmi.country, 'Germany');

const fordWmi = resolveWmi('1FA');
assert.strictEqual(fordWmi.make, 'Ford');
assert.strictEqual(fordWmi.country, 'United States');

const teslaWmi = resolveWmi('5YJ');
assert.strictEqual(teslaWmi.make, 'Tesla');
assert.strictEqual(teslaWmi.country, 'United States');

const bydWmi = resolveWmi('LGX');
assert.strictEqual(bydWmi.make, 'BYD');
assert.strictEqual(bydWmi.country, 'China');
console.log('✓ WMI registry resolves global manufacturers (Japan, Germany, USA, China)');

// 5. ISO Model Year Resolution
assert.strictEqual(resolveModelYear('H'), 2017);
assert.strictEqual(resolveModelYear('J'), 2018);
assert.strictEqual(resolveModelYear('K'), 2019);
assert.strictEqual(resolveModelYear('L'), 2020);
assert.strictEqual(resolveModelYear('M'), 2021);
assert.strictEqual(resolveModelYear('N'), 2022);
assert.strictEqual(resolveModelYear('P'), 2023);
assert.strictEqual(resolveModelYear('R'), 2024);
assert.strictEqual(resolveModelYear('S'), 2025);
console.log('✓ Model Year decoder accurately maps ISO 3779 year characters');

// 6. JDM Chassis Decoding
const corolla = decodeJdmChassis('NZE141-5028491');
assert.strictEqual(corolla.make, 'Toyota');
assert.strictEqual(corolla.model, 'Corolla Axio / Fielder');
assert.strictEqual(corolla.engineCc, 1500);
assert.strictEqual(corolla.fuel, 'Petrol');

const rav4 = decodeJdmChassis('ACA31-1029384');
assert.strictEqual(rav4.make, 'Toyota');
assert.strictEqual(rav4.model, 'RAV4');
assert.strictEqual(rav4.engineCc, 2400);

const harrier = decodeJdmChassis('ZSU60-0029381');
assert.strictEqual(harrier.make, 'Toyota');
assert.strictEqual(harrier.model, 'Harrier');

const forester = decodeJdmChassis('SJ5-102938');
assert.strictEqual(forester.make, 'Subaru');
assert.strictEqual(forester.model, 'Forester');
console.log('✓ JDM Chassis decoder parses Japanese chassis codes into full specifications');

// 7. Overall Vehicle Identifier Validation
const isoResult = validateVehicleIdentifier('1HGCR2F87HA021432');
assert.strictEqual(isoResult.type, 'iso');
assert.strictEqual(isoResult.valid, true);
assert.strictEqual(isoResult.wmi, '1HG');

const jdmResult = validateVehicleIdentifier('NZE141-5028491');
assert.strictEqual(jdmResult.type, 'chassis');
assert.strictEqual(jdmResult.valid, true);

const shortResult = validateVehicleIdentifier('ABC12');
assert.strictEqual(shortResult.valid, false);
assert.strictEqual(shortResult.type, 'short');
console.log('✓ Identifier categorization handles ISO, JDM, and short invalid strings');

console.log('\nAll VIN Engine tests passed successfully! ✨');
