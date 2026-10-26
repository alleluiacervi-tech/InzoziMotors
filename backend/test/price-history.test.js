const test = require('node:test');
const assert = require('node:assert');
const { publicPriceHistory } = require('../src/lib/price-history');

const live = '2026-10-15T01:06:28Z';

test('a typo fixed in the first hour is folded into the opening price', () => {
  const rows = [
    { price: 70000, at: '2026-10-15T01:02:31Z' },
    { price: 25000000, at: '2026-10-15T01:08:40Z' },
  ];
  assert.deepStrictEqual(publicPriceHistory(rows, live), [rows[1]]);
});

test('changes after the first hour are kept, after the settled opening price', () => {
  const rows = [
    { price: 30000000, at: '2026-10-15T01:02:31Z' },
    { price: 29000000, at: '2026-10-15T01:30:00Z' },
    { price: 27000000, at: '2026-10-20T09:00:00Z' },
  ];
  assert.deepStrictEqual(publicPriceHistory(rows, live), [rows[1], rows[2]]);
});

test('a car with no row before it settled starts from its first later row', () => {
  const rows = [{ price: 1, at: '2026-10-16T00:00:00Z' }];
  assert.deepStrictEqual(publicPriceHistory(rows, live), rows);
});

test('without a go-live time or rows, nothing is changed or invented', () => {
  const rows = [{ price: 1, at: '2026-10-16T00:00:00Z' }, { price: 2, at: '2026-10-17T00:00:00Z' }];
  assert.deepStrictEqual(publicPriceHistory(rows, null), rows);
  assert.deepStrictEqual(publicPriceHistory([], live), []);
  assert.deepStrictEqual(publicPriceHistory(null, live), []);
});
