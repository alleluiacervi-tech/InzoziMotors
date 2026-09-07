// ─────────────────────────────────────────────────────────────────────────────
// test/data-providers.test.js
// Unit tests for the modular data provider architecture & pipeline orchestrator.
// ─────────────────────────────────────────────────────────────────────────────

const assert = require('assert');
const { orchestrator } = require('../src/lib/data-providers/pipeline-orchestrator');
const LocalDecoderProvider = require('../src/lib/data-providers/local-decoder-provider');
const { validateVehicleIdentifier } = require('../src/lib/vin-engine/validator');

console.log('Running Data Provider Pipeline Unit Tests...\n');

async function runTests() {
  // 1. Direct Local Provider Test - ISO VIN
  const localProvider = new LocalDecoderProvider();
  const isoContext = validateVehicleIdentifier('1HGCR2F87HA021432');
  const localIsoResult = await localProvider.fetchByVin(isoContext);

  assert.strictEqual(localIsoResult.specs.make, 'Honda');
  assert.strictEqual(localIsoResult.specs.plantCountry, 'United States');
  assert.strictEqual(localIsoResult.specs.year, 2017);
  assert.strictEqual(localIsoResult.events.length, 1);
  assert.strictEqual(localIsoResult.events[0].eventType, 'manufacturing');
  console.log('✓ LocalDecoderProvider parses ISO VIN into Make, Year, Country, and Manufacturing event');

  // 2. Direct Local Provider Test - JDM Chassis
  const jdmContext = validateVehicleIdentifier('NZE141-5028491');
  const localJdmResult = await localProvider.fetchByVin(jdmContext);

  assert.strictEqual(localJdmResult.specs.make, 'Toyota');
  assert.strictEqual(localJdmResult.specs.model, 'Corolla Axio / Fielder');
  assert.strictEqual(localJdmResult.specs.engineCc, 1500);
  assert.strictEqual(localJdmResult.specs.fuelType, 'Petrol');
  assert.strictEqual(localJdmResult.specs.plantCountry, 'Japan');
  assert.strictEqual(localJdmResult.events.length, 1);
  console.log('✓ LocalDecoderProvider parses JDM chassis into specifications and origin');

  // 3. Complete Orchestrator Pipeline Test (Ephemeral mode, no DB write)
  const pipelineResult = await orchestrator.processVin('NZE141-5028491', { persist: false });

  assert.strictEqual(pipelineResult.success, true);
  assert.strictEqual(pipelineResult.specs.make, 'Toyota');
  assert.strictEqual(pipelineResult.specs.model, 'Corolla Axio / Fielder');
  assert.strictEqual(pipelineResult.vehicleIdentity.vinMasked, 'NZE141***491');
  assert.ok(pipelineResult.activeProviders.length >= 3);
  assert.strictEqual(pipelineResult.confidenceScore >= 0.85, true);
  console.log('✓ Orchestrator coordinates providers, aggregates specs, and produces intelligence payload');

  // 4. Invalid Identifier Handling
  const invalidResult = await orchestrator.processVin('INVALID_123', { persist: false });
  assert.strictEqual(invalidResult.success, false);
  assert.ok(invalidResult.error);
  console.log('✓ Orchestrator rejects invalid vehicle identifiers with descriptive reason');

  console.log('\nAll Data Provider Pipeline tests passed successfully! ✨');
}

runTests().catch((err) => {
  console.error('Data Provider test failed:', err);
  process.exit(1);
});
