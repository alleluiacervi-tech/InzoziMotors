// ─────────────────────────────────────────────────────────────────────────────
// test/vin-privacy-guardrails.test.js
// Automated verification proving that raw VINs NEVER leak across public APIs,
// DTOs, public reports, or serialization boundaries.
// ─────────────────────────────────────────────────────────────────────────────

const assert = require('assert');
const {
  serializePublicVehicle,
  serializeAdminVehicle,
  PUBLIC_COVERAGE_STATEMENT,
} = require('../src/lib/vin-engine/serializers');
const { maskVin } = require('../src/lib/vin-engine/validator');

console.log('Running VIN Privacy & Security Guardrails Tests...\n');

const RAW_VIN = 'JTDBZ293401234567';

const mockVehicle = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  vin_raw: RAW_VIN,
  vin_normalized: RAW_VIN,
  vin_masked: 'JTDBZ293***4567',
  vin_type: 'iso',
  wmi: 'JTD',
  vds: 'BZ2934',
  vis: '01234567',
  check_digit: '4',
  check_digit_valid: true,
  make: 'Toyota',
  model: 'RAV4',
  year: 2019,
  verification_status: 'fully_verified',
  confidence_score: 0.95,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockEvents = [
  {
    id: 'ev-1',
    event_type: 'inspection',
    event_date: '2024-05-12',
    title: '150-Point Inspection',
    public_summary: 'Inspected at Sawa Center.',
    internal_details: { inspectorSsn: '000-11-222', rawNotes: 'Confidential mechanic notes' },
    is_public: true,
    odometer_km: 45000,
    odometer_verified: true,
  },
  {
    id: 'ev-2',
    event_type: 'confidential_dmv_audit',
    event_date: '2024-05-13',
    title: 'Internal Audit',
    public_summary: 'Internal review only',
    is_public: false, // Private event!
  },
];

const mockSignals = [
  {
    signal_type: 'check_digit_mismatch',
    severity: 'info',
    title: 'Data Advisory',
    public_message: 'Non-standard check digit',
    resolved: false,
  },
  {
    signal_type: 'internal_investigation',
    severity: 'critical',
    title: 'Resolved Anomaly',
    public_message: 'Should not show',
    resolved: true, // Resolved!
  },
];

// 1. Test Public Serializer Output
const publicDto = serializePublicVehicle(mockVehicle, mockEvents, mockSignals);

// ASSERTION 1: Full raw VIN is NOT present in any property of public DTO
const publicJsonString = JSON.stringify(publicDto);
assert.strictEqual(publicDto.vin_raw, undefined);
assert.strictEqual(publicDto.vin_normalized, undefined);
assert.strictEqual(publicDto.vin, undefined);
assert.doesNotMatch(publicJsonString, new RegExp(RAW_VIN), 'Raw VIN must NEVER appear anywhere in public JSON');
console.log('✓ Public serializer strictly removes raw and normalized VIN');

// ASSERTION 2: Masked representation is provided
assert.strictEqual(publicDto.vinDisplay, 'JTDBZ293***4567');
assert.strictEqual(publicDto.vinVerified, true);
console.log('✓ Public serializer provides safe masked representation ("JTDBZ293***4567")');

// ASSERTION 3: Non-public events are stripped
assert.strictEqual(publicDto.historyTimeline.length, 1);
assert.strictEqual(publicDto.historyTimeline[0].title, '150-Point Inspection');
console.log('✓ Public serializer strictly filters out private internal events');

// ASSERTION 4: Internal event details (PII / mechanic notes) are stripped
assert.strictEqual(publicDto.historyTimeline[0].internalDetails, undefined);
assert.doesNotMatch(publicJsonString, /Confidential mechanic notes/);
assert.doesNotMatch(publicJsonString, /inspectorSsn/);
console.log('✓ Internal event details and sensitive metadata are stripped from public timeline');

// ASSERTION 5: Resolved internal signals are not displayed
assert.strictEqual(publicDto.dataQualitySignals.length, 1);
assert.strictEqual(publicDto.dataQualitySignals[0].signalType, 'check_digit_mismatch');
console.log('✓ Resolved internal signals are not leaked to public view');

// ASSERTION 6: Honest coverage statement is present
assert.strictEqual(publicDto.coverageStatement, PUBLIC_COVERAGE_STATEMENT);
assert.match(publicDto.coverageStatement, /No relevant records were found in currently available data sources/i);
console.log('✓ Honest, transparent coverage disclaimer is embedded in public payload');

// ASSERTION 7: Admin Serializer DOES retain full internal details
const adminDto = serializeAdminVehicle(mockVehicle, mockEvents, mockSignals);
assert.strictEqual(adminDto.vinRaw, RAW_VIN);
assert.strictEqual(adminDto.historyEvents.length, 2);
assert.ok(adminDto.historyEvents[0].internal_details);
console.log('✓ Admin serializer retains complete internal VIN intelligence and provenance');

console.log('\nAll VIN Privacy Guardrail tests passed with 100% compliance! 🛡️✨');
