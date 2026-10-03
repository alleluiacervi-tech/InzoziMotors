// Advisory publication warnings that need no database: odometer readings a
// buyer will question, and titles that repeat the make. Both are warnings on
// the readiness verdict, never reasons to refuse publication.
const test = require('node:test');
const assert = require('node:assert/strict');
const { contentWarnings } = require('../src/lib/publication-readiness');

const clean = {
  description: 'A well-kept car with full service history, two owners from new and a fresh set of tyres.',
  vin: 'JTMBFREV40J123456',
};
const thisYear = new Date().getFullYear();

test('a car several years old with almost no mileage is flagged for a second look', () => {
  const warnings = contentWarnings({ ...clean, title: '2022 Toyota Land Cruiser', make: 'Toyota', year: thisYear - 4, mileage: 100 }, []);
  assert.ok(warnings.some((w) => /100 km/.test(w) && /odometer/.test(w)), JSON.stringify(warnings));
});

test('a current or last-year car with delivery mileage is not flagged', () => {
  for (const year of [thisYear, thisYear - 1]) {
    const warnings = contentWarnings({ ...clean, title: `${year} Volkswagen Bora`, make: 'Volkswagen', year, mileage: 100 }, []);
    assert.deepEqual(warnings, [], `year ${year}: ${JSON.stringify(warnings)}`);
  }
});

test('ordinary mileage, or no mileage recorded, warns about nothing', () => {
  assert.deepEqual(contentWarnings({ ...clean, title: '2019 Toyota RAV4', make: 'Toyota', year: 2019, mileage: 84000 }, []), []);
  assert.deepEqual(contentWarnings({ ...clean, title: '2019 Toyota RAV4', make: 'Toyota', year: 2019 }, []), []);
});

test('a title that says the make twice is flagged, case-insensitively', () => {
  const warnings = contentWarnings({ ...clean, title: '2023 Land Rover land rover Range Rover P530 SE', make: 'Land Rover', year: 2023, mileage: 61000 }, []);
  assert.ok(warnings.some((w) => /Land Rover twice/.test(w)), JSON.stringify(warnings));
});

test('a model name that merely contains the make is not a repeat', () => {
  const warnings = contentWarnings({ ...clean, title: '2023 Land Rover Range Rover Sport', make: 'Land Rover', year: 2023, mileage: 30000 }, []);
  assert.deepEqual(warnings, []);
});
