// ─────────────────────────────────────────────────────────────────────────────
// Who may read which column of `cars`.
//
// The public routes used to `SELECT c.*`. That is a deny-list of nothing: every
// column the table would ever grow was published the day it was added, and
// three had been for a while — the admin's own review_notes (which the server
// writes "Seller identity approval was revoked" into), approved_by, and the
// registration plate this platform spends effort masking out of photographs.
//
// The routes now name their columns. This test is what stops that list from
// rotting, and it fails in both directions on purpose:
//
//   · a name in a list that is not a column   → the route 500s in production,
//     and it did exactly that once (safari_ready lives on rental_cars).
//   · a column in neither list                → somebody added a column and
//     never decided whether strangers may read it. Classify it, then come back.
//
// The second half is the one worth having. It converts "remember to think about
// this" into a failing test.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const pool = require('../src/db');
const {
  PUBLIC_CAR_COLUMNS,
  PUBLIC_CAR_DETAIL_COLUMNS,
  INTERNAL_CAR_COLUMNS,
} = require('../src/routes/cars');

async function carColumns() {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'cars'`
  );
  return new Set(rows.map((r) => r.column_name));
}

test('every classified column really exists on cars', async () => {
  const actual = await carColumns();
  assert.ok(actual.size > 20, 'the cars table was found');

  for (const column of new Set([...PUBLIC_CAR_DETAIL_COLUMNS, ...INTERNAL_CAR_COLUMNS])) {
    assert.ok(actual.has(column),
      `"${column}" is named by a route but is not a column of cars — the query would 500`);
  }
});

test('every column of cars is classified as public or internal', async () => {
  const actual = await carColumns();
  const classified = new Set([...PUBLIC_CAR_DETAIL_COLUMNS, ...INTERNAL_CAR_COLUMNS]);

  const unclassified = [...actual].filter((c) => !classified.has(c));
  assert.deepEqual(unclassified, [],
    `these columns of "cars" belong to neither list, so nobody has decided whether a ` +
    `stranger may read them. Add each to PUBLIC_CAR_COLUMNS (or the detail list) or to ` +
    `INTERNAL_CAR_COLUMNS in src/routes/cars.js: ${unclassified.join(', ')}`);
});

test('the two lists do not overlap, and the browse list is the narrower one', async () => {
  const both = PUBLIC_CAR_DETAIL_COLUMNS.filter((c) => INTERNAL_CAR_COLUMNS.includes(c));
  assert.deepEqual(both, [], 'a column cannot be public and internal at once');

  for (const column of PUBLIC_CAR_COLUMNS) {
    assert.ok(PUBLIC_CAR_DETAIL_COLUMNS.includes(column),
      `${column} is in the browse list but missing from the detail list`);
  }
  assert.ok(PUBLIC_CAR_DETAIL_COLUMNS.length > PUBLIC_CAR_COLUMNS.length,
    'the feed ships less than the detail page — that is the point of having two lists');
});

test('the columns that leaked are internal, by name', async () => {
  // Named individually rather than by list membership: if somebody moves one of
  // these into the public list, this test should be what argues with them.
  for (const column of ['review_notes', 'approved_by', 'registration_plate']) {
    assert.ok(INTERNAL_CAR_COLUMNS.includes(column),
      `${column} was published to strangers once already; it stays internal`);
    assert.equal(PUBLIC_CAR_DETAIL_COLUMNS.includes(column), false,
      `${column} must not be in a public list`);
  }
});

test.after(() => pool.end());
