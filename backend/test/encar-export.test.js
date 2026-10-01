// The CSV export reader, the export-driven baseline and weekly repair, and the
// make-alias hook. No network, no database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, readExport, mapHeader, parsePhotos } = require('../src/lib/encar/csv');
const { createSync } = require('../src/lib/encar/sync');
const { EncarError } = require('../src/lib/encar/client');
const { DEFAULT_RULES } = require('../src/lib/encar/normalize');

async function* chunks(text, size = 7) {
  const buf = Buffer.from(text, 'utf8');
  for (let i = 0; i < buf.length; i += size) yield buf.subarray(i, i + size); // splits mid-character on purpose
}
const collect = async (it) => { const out = []; for await (const x of it) out.push(x); return out; };

test('CSV: quotes, doubled quotes, newlines in cells, CRLF, BOM and no trailing newline', async () => {
  const text = '﻿a,b,c\r\n1,"x, y","say ""hi"""\r\n2,"line1\nline2",3';
  const rows = await collect(parseCsv(chunks(text)));
  assert.deepEqual(rows, [['a', 'b', 'c'], ['1', 'x, y', 'say "hi"'], ['2', 'line1\nline2', '3']]);
});

test('CSV: multi-byte characters survive being split across chunks', async () => {
  const rows = await collect(parseCsv(chunks('id,name\n1,기아 쏘렌토\n', 5)));
  assert.equal(rows[1][1], '기아 쏘렌토');
});

test('header matching ignores case, spaces and underscores, and refuses a file without the essentials', () => {
  const map = mapHeader(['ID', 'Manufacturer_English', 'model english', 'Year', 'PRICE', 'Photos']);
  assert.equal(map.Id, 0);
  assert.equal(map.ManufacturerEnglish, 1);
  assert.equal(map.ModelEnglish, 2);
  assert.throws(() => mapHeader(['id', 'year', 'price']), (e) => e instanceof EncarError && /Model|Manufacturer/.test(e.message));
});

test('photo cells: JSON array, or addresses split on | ; , or spaces', () => {
  assert.deepEqual(parsePhotos('["a/1.jpg","a/2.jpg"]'), ['a/1.jpg', 'a/2.jpg']);
  assert.deepEqual(parsePhotos('https://h/1.jpg|https://h/2.jpg'), ['https://h/1.jpg', 'https://h/2.jpg']);
  assert.deepEqual(parsePhotos(''), []);
});

const csv = (rows) => ['Id,Manufacturer,Model,Year,Price,Photos', ...rows].join('\n');
const line = (id, extra = {}) => `${id},${extra.make ?? 'Kia'},Sorento,202001,${extra.price ?? 2500},${extra.photos ?? `https://img.test/${id}/1.jpg`}`;

function fakeStore(initial = {}, held = []) {
  const state = { baseline_started_at: null, baseline_completed_at: null, baseline_page: 1, last_repair_at: null, ...initial };
  const listings = new Map(held.map((id) => [id, { id }]));
  return {
    state, listings,
    async getState() { return { ...state }; },
    async patchState(_d, p) { Object.assign(state, p); },
    async countListings() { return listings.size; },
    async upsertListings(_d, rows) { let inserted = 0; for (const r of rows) { if (!listings.has(r.id)) inserted += 1; listings.set(r.id, r); } return { inserted, updated: 0 }; },
    async deleteListings(_d, ids) { let n = 0; for (const id of new Set(ids)) if (listings.delete(id)) n += 1; return n; },
    async listIds() { return [...listings.keys()]; },
  };
}
const build = (store, text, extra = {}) => createSync({
  db: {}, store, withTx: (fn) => fn({}), now: () => new Date('2026-10-01T00:00:00Z'),
  client: { exportCsv: async () => ({ body: chunks(text, 64) }) }, ...extra,
});

test('export baseline loads every row, applies the rules, and completes', async () => {
  const store = fakeStore();
  const sync = build(store, csv([line(1), line(2), line(3, { photos: '' }), line(4, { price: 1 })]));
  const r = await sync.runExport({ rules: DEFAULT_RULES });
  assert.equal(r.done, true);
  assert.deepEqual([...store.listings.keys()].sort(), ['1', '2']); // no photos, and a 1 man-won price, are dropped
  assert.ok(store.state.baseline_completed_at);
  assert.equal(r.counts.skipped, 2);
});

test('an export that cannot be read changes nothing', async () => {
  const store = fakeStore();
  const sync = build(store, 'id,year\n1,2020\n');
  await assert.rejects(() => sync.runExport({ rules: DEFAULT_RULES }), (e) => e.code === 'bad_response');
  assert.equal(store.listings.size, 0);
  assert.equal(store.state.baseline_completed_at, null);
});

test('weekly repair removes cars the export no longer lists, and keeps the rest', async () => {
  const store = fakeStore({ baseline_started_at: new Date(), baseline_completed_at: new Date() }, ['1', '2', '3', '9']);
  const sync = build(store, csv([line(1), line(2), line(3)]));
  const r = await sync.runExport({ rules: DEFAULT_RULES, repair: true });
  assert.equal(r.repaired, 1);
  assert.deepEqual([...store.listings.keys()].sort(), ['1', '2', '3']);
  assert.ok(store.state.last_repair_at);
});

test('repair refuses to delete anything when the export is suspiciously small', async () => {
  const held = Array.from({ length: 10 }, (_, i) => String(i + 1));
  const store = fakeStore({ baseline_completed_at: new Date() }, held);
  const sync = build(store, csv([line(1), line(2)])); // 2 of 10: a truncated download
  await assert.rejects(() => sync.runExport({ rules: DEFAULT_RULES, repair: true }), (e) => e.code === 'bad_response');
  assert.equal(store.listings.size, 10, 'nothing was removed');
});

test('repair does nothing before a baseline exists', async () => {
  const sync = build(fakeStore(), csv([line(1)]));
  const r = await sync.runExport({ rules: DEFAULT_RULES, repair: true });
  assert.equal(r.skipped, 'no_baseline');
});

test('brand spellings are mapped through the canonical-make hook, and unknown ones are left alone', async () => {
  const store = fakeStore();
  const canonicalMake = (m) => ({ benz: 'Mercedes-Benz' }[String(m).toLowerCase()] || null);
  const sync = build(store, csv([line(1, { make: 'Benz' }), line(2, { make: 'Foton' })]), { canonicalMake });
  await sync.runExport({ rules: DEFAULT_RULES });
  assert.equal(store.listings.get('1').make, 'Mercedes-Benz');
  assert.equal(store.listings.get('2').make, 'Foton');
});
