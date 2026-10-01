// The sync orchestration — baseline, change feed, failure handling — against an
// in-memory store and a scripted provider. No network, no database; the SQL is
// covered by encar-store.test.js.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSync, CeilingError, PAGE_SIZE } = require('../src/lib/encar/sync');
const { EncarError } = require('../src/lib/encar/client');
const { DEFAULT_RULES } = require('../src/lib/encar/normalize');

function fakeStore(initialState = {}) {
  const state = {
    baseline_started_at: null, baseline_completed_at: null, baseline_page: 1, change_cursor: null,
    last_success_at: null, last_error: null, ...initialState,
  };
  const listings = new Map();
  const store = {
    state, listings,
    async getState() { return { ...state }; },
    async patchState(_db, patch) { Object.assign(state, patch); },
    async countListings() { return listings.size; },
    async upsertListings(_db, rows) {
      let inserted = 0; let updated = 0;
      for (const r of rows) {
        const was = listings.get(r.id);
        if (!was) inserted += 1;
        else if (JSON.stringify(was) !== JSON.stringify(r)) updated += 1;
        listings.set(r.id, r);
      }
      return { inserted, updated };
    },
    async deleteListings(_db, ids) {
      let n = 0;
      for (const id of new Set(ids)) if (listings.delete(id)) n += 1;
      return n;
    },
  };
  return store;
}

const car = (id, over = {}) => ({
  Id: String(id), Manufacturer: 'Kia', Model: 'Sorento', Badge: 'Diesel 2.2', FuelType: 'diesel',
  Transmission: 'automatic', Year: 202001, Price: 2500, Mileage: 40000,
  Photos: [{ location: `https://img.test/${id}/1.jpg` }], ...over,
});

function build({ store = fakeStore(), provider }) {
  const calls = { catalog: [], changes: [] };
  const client = {
    catalog: async (q) => { calls.catalog.push(q); return provider.catalog(q, calls.catalog.length); },
    changes: async (q) => { calls.changes.push(q); return provider.changes(q, calls.changes.length); },
  };
  // A page is one transaction: if it throws, rows AND cursor go back as they were.
  const withTx = async (fn) => {
    const before = new Map(store.listings);
    const state = { ...store.state };
    try { return await fn({}); } catch (err) {
      store.listings.clear();
      for (const [k, v] of before) store.listings.set(k, v);
      for (const k of Object.keys(store.state)) delete store.state[k];
      Object.assign(store.state, state);
      throw err;
    }
  };
  const sync = createSync({ db: {}, client, store, withTx, now: () => new Date('2026-10-01T00:00:00Z') });
  return { sync, store, calls };
}

const range = (from, n) => Array.from({ length: n }, (_, i) => car(from + i));

test('baseline pages through the catalogue and completes on an empty page', async () => {
  const { sync, store, calls } = build({
    provider: { catalog: (q, n) => ({ SearchResults: n === 1 ? range(1, PAGE_SIZE) : n === 2 ? range(5000, 10) : [] }) },
  });
  const r = await sync.runBaseline({ rules: DEFAULT_RULES });
  assert.equal(r.done, true);
  assert.equal(store.listings.size, PAGE_SIZE + 10);
  assert.equal(r.counts.added, PAGE_SIZE + 10);
  assert.ok(store.state.baseline_completed_at);
  assert.ok(store.state.baseline_started_at, 'the start time is taken before the first page');
  assert.deepEqual(calls.catalog.map((c) => c.page), [1, 2, 3]);
  assert.equal(calls.catalog[0].lang, 'en');
  assert.equal(calls.catalog[0].exclude_duplicates, true);
  assert.equal(calls.catalog[0].has_photos, true);
});

test('baseline saves its place and resumes where it stopped', async () => {
  const store = fakeStore();
  let failOnSecond = true;
  const provider = {
    catalog: (q) => {
      if (q.page === 2 && failOnSecond) throw new EncarError('unavailable', 'down');
      return { SearchResults: q.page === 1 ? range(1, PAGE_SIZE) : q.page === 2 ? range(5000, 3) : [] };
    },
  };
  const { sync } = build({ store, provider });
  await assert.rejects(() => sync.runBaseline({ rules: DEFAULT_RULES }), (e) => e.code === 'unavailable');
  assert.equal(store.state.baseline_page, 2, 'page 1 is saved');
  assert.equal(store.listings.size, PAGE_SIZE);
  assert.equal(store.state.baseline_completed_at, null);

  failOnSecond = false;
  const { calls, sync: again } = build({ store, provider });
  const r = await again.runBaseline({ rules: DEFAULT_RULES });
  assert.equal(r.done, true);
  assert.deepEqual(calls.catalog.map((c) => c.page), [2, 3], 'does not start over');
  assert.equal(store.listings.size, PAGE_SIZE + 3);
});

test('baseline stops after maxPages and says it is not done', async () => {
  const { sync, store } = build({ provider: { catalog: (q) => ({ SearchResults: range(q.page * 10000, PAGE_SIZE) }) } });
  const r = await sync.runBaseline({ rules: DEFAULT_RULES, maxPages: 2 });
  assert.equal(r.done, false);
  assert.equal(r.pages, 2);
  assert.equal(store.state.baseline_page, 3);
  assert.equal(store.state.baseline_completed_at, null);
});

test('baseline does nothing once complete', async () => {
  const { sync, calls } = build({
    store: fakeStore({ baseline_completed_at: new Date() }),
    provider: { catalog: () => { throw new Error('should not be called'); } },
  });
  assert.equal((await sync.runBaseline({ rules: DEFAULT_RULES })).done, true);
  assert.equal(calls.catalog.length, 0);
});

test('cars that fail the rules are not stored', async () => {
  const items = [car(1), car(2, { IsDuplicate: true }), car(3, { FuelType: 'lpg' }), car(4, { Photos: [] }), car(5, { Price: 1 })];
  const { sync, store } = build({ provider: { catalog: (q) => ({ SearchResults: q.page === 1 ? items : [] }) } });
  const r = await sync.runBaseline({ rules: DEFAULT_RULES });
  assert.deepEqual([...store.listings.keys()], ['1']);
  assert.equal(r.counts.skipped, 4);
});

test('a car that stops qualifying is removed from the table', async () => {
  const store = fakeStore({ baseline_completed_at: new Date(), baseline_started_at: new Date(), change_cursor: 10 });
  store.listings.set('7', { id: '7' });
  const provider = { changes: () => ({ added: [], updated: [car(7, { IsDuplicate: true, DuplicateOf: 1 })], reappeared: [], removed: [], nextCursor: 11 }) };
  const { sync } = build({ store, provider });
  const r = await sync.runChanges({ rules: DEFAULT_RULES });
  assert.equal(store.listings.has('7'), false);
  assert.equal(r.counts.removed, 1);
});

test('the ceiling stops the table growing', async () => {
  const { sync, store } = build({ provider: { catalog: () => ({ SearchResults: range(1, 10) }) } });
  await sync.runBaseline({ rules: { ...DEFAULT_RULES, row_ceiling: 100000 }, maxPages: 1 });
  const full = fakeStore();
  for (let i = 0; i < 5; i += 1) full.listings.set(`x${i}`, {});
  const { sync: capped } = build({ store: full, provider: { catalog: () => ({ SearchResults: range(1, 10) }) } });
  await assert.rejects(() => capped.runBaseline({ rules: { ...DEFAULT_RULES, row_ceiling: 5 } }), (e) => e instanceof CeilingError);
  assert.equal(full.listings.size, 5, 'nothing was added');
  assert.equal(store.listings.size, 10);
});

test('a short page does not end the baseline: a provider that caps the page size is still read to the end', async () => {
  // Every page is "short" (200 of the 1000 asked for); only the empty page is the end.
  const { sync, store, calls } = build({
    provider: { catalog: (q) => ({ SearchResults: q.page <= 3 ? range(q.page * 1000, 200) : [] }) },
  });
  const r = await sync.runBaseline({ rules: DEFAULT_RULES });
  assert.equal(r.done, true);
  assert.equal(store.listings.size, 600);
  assert.deepEqual(calls.catalog.map((c) => c.page), [1, 2, 3, 4]);
});

test('a full table still takes updates and removals: only NEW cars are refused', async () => {
  const store = ready({ change_cursor: 1 });
  for (let i = 1; i <= 5; i += 1) store.listings.set(String(i), { ...car(i), id: String(i) });
  const provider = {
    changes: () => ({ added: [], updated: [car(1, { Price: 2400 })], reappeared: [], removed: ['2', '3'], nextCursor: 2 }),
  };
  const { sync } = build({ store, provider });
  const r = await sync.runChanges({ rules: { ...DEFAULT_RULES, row_ceiling: 5 } });
  assert.equal(r.counts.updated, 1);
  assert.equal(r.counts.removed, 2);
  assert.equal(store.state.change_cursor, 2, 'the cursor advances: sold cars stop being shown');
});

test('removals in a page make room for the new cars in the same page', async () => {
  const store = ready({ change_cursor: 1 });
  for (let i = 1; i <= 5; i += 1) store.listings.set(String(i), { ...car(i), id: String(i) });
  const provider = {
    changes: () => ({ added: [car(10), car(11)], updated: [], reappeared: [], removed: ['1', '2'], nextCursor: 2 }),
  };
  const { sync } = build({ store, provider });
  await sync.runChanges({ rules: { ...DEFAULT_RULES, row_ceiling: 5 } });
  assert.equal(store.listings.size, 5);
  assert.ok(store.listings.has('10') && !store.listings.has('1'));
});

test('new cars past the ceiling roll the whole page back, cursor included', async () => {
  const store = ready({ change_cursor: 1 });
  for (let i = 1; i <= 5; i += 1) store.listings.set(String(i), { ...car(i), id: String(i) });
  // One removal frees one place, but two new cars need two.
  const provider = {
    changes: () => ({ added: [car(10), car(11)], updated: [], reappeared: [], removed: ['1'], nextCursor: 2 }),
  };
  const { sync } = build({ store, provider });
  await assert.rejects(() => sync.runChanges({ rules: { ...DEFAULT_RULES, row_ceiling: 5 } }), (e) => e instanceof CeilingError);
  assert.equal(store.listings.size, 5);
  assert.ok(store.listings.has('1'), 'the removal was rolled back with the page');
  assert.equal(store.state.change_cursor, 1);
});

test('a catalogue response with no SearchResults is a bad response, and nothing moves', async () => {
  const { sync, store } = build({ provider: { catalog: () => ({ error: 'oops' }) } });
  await assert.rejects(() => sync.runBaseline({ rules: DEFAULT_RULES }), (e) => e.code === 'bad_response');
  assert.equal(store.state.baseline_page, 1);
});

// ── change feed ──────────────────────────────────────────────────────────────

const ready = (over = {}) => fakeStore({
  baseline_started_at: new Date('2026-09-30T10:00:00Z'), baseline_completed_at: new Date('2026-09-30T12:00:00Z'), ...over,
});

test('the first change call asks for everything since the baseline began', async () => {
  const { sync, calls } = build({
    store: ready(),
    provider: { changes: () => ({ added: [car(1)], updated: [], reappeared: [], removed: [], nextCursor: 55 }) },
  });
  await sync.runChanges({ rules: DEFAULT_RULES });
  assert.equal(calls.changes[0].since, '2026-09-30T10:00:00.000Z');
  assert.equal(calls.changes[0].cursor, undefined);
  assert.equal(calls.changes[0].lang, 'en');
});

test('later calls resume from the saved cursor', async () => {
  const store = ready({ change_cursor: 55 });
  const { sync, calls } = build({ store, provider: { changes: () => ({ added: [], updated: [], reappeared: [], removed: [], nextCursor: 60 }) } });
  await sync.runChanges({ rules: DEFAULT_RULES });
  assert.equal(calls.changes[0].cursor, 55);
  assert.equal(calls.changes[0].since, undefined);
  assert.equal(store.state.change_cursor, 60);
});

test('added, updated, reappeared and removed are all applied', async () => {
  const store = ready({ change_cursor: 1 });
  store.listings.set('2', { ...car(2), id: '2' });
  store.listings.set('9', { id: '9' });
  const provider = {
    changes: () => ({
      added: [car(1)], updated: [car(2, { Price: 2400 })], reappeared: [car(3)],
      removed: ['9', { Id: '404' }], nextCursor: 2,
    }),
  };
  const { sync } = build({ store, provider });
  const r = await sync.runChanges({ rules: DEFAULT_RULES });
  assert.deepEqual([...store.listings.keys()].sort(), ['1', '2', '3']);
  assert.equal(store.listings.get('2').price_man, 2400);
  assert.equal(r.counts.added, 2);
  assert.equal(r.counts.updated, 1);
  assert.equal(r.counts.removed, 1);
});

test('a truncated response is followed until the feed is drained', async () => {
  const store = ready({ change_cursor: 0 });
  const provider = {
    changes: (q, n) => ({
      added: [car(n)], updated: [], reappeared: [], removed: [],
      nextCursor: n * 10, hasMore: n < 3,
    }),
  };
  const { sync, calls } = build({ store, provider });
  const r = await sync.runChanges({ rules: DEFAULT_RULES });
  assert.equal(calls.changes.length, 3);
  assert.deepEqual(calls.changes.map((c) => c.cursor), [0, 10, 20]);
  assert.equal(store.state.change_cursor, 30);
  assert.equal(r.counts.added, 3);
});

test('`truncated` is honoured as well as `hasMore`', async () => {
  const provider = { changes: (q, n) => ({ added: [], updated: [], reappeared: [], removed: [], nextCursor: n, truncated: n < 2 }) };
  const { sync, calls } = build({ store: ready({ change_cursor: 0 }), provider });
  await sync.runChanges({ rules: DEFAULT_RULES });
  assert.equal(calls.changes.length, 2);
});

test('a feed that never ends is bounded by maxPages', async () => {
  const provider = { changes: (q, n) => ({ added: [], updated: [], reappeared: [], removed: [], nextCursor: n, hasMore: true }) };
  const { sync, calls } = build({ store: ready({ change_cursor: 0 }), provider });
  await sync.runChanges({ rules: DEFAULT_RULES, maxPages: 3 });
  assert.equal(calls.changes.length, 3);
});

test('the cursor does not move when applying a page fails', async () => {
  const store = ready({ change_cursor: 5 });
  store.upsertListings = async () => { throw new Error('disk full'); };
  const { sync } = build({ store, provider: { changes: () => ({ added: [car(1)], updated: [], reappeared: [], removed: [], nextCursor: 6 }) } });
  await assert.rejects(() => sync.runChanges({ rules: DEFAULT_RULES }), /disk full/);
  assert.equal(store.state.change_cursor, 5);
});

test('a response without a cursor is refused', async () => {
  const { sync, store } = build({ store: ready({ change_cursor: 5 }), provider: { changes: () => ({ added: [car(1)] }) } });
  await assert.rejects(() => sync.runChanges({ rules: DEFAULT_RULES }), (e) => e.code === 'bad_response');
  assert.equal(store.listings.size, 0);
});

test('an expired cursor sends the sync back to a fresh baseline', async () => {
  const store = ready({ change_cursor: 5, baseline_page: 9 });
  const { sync } = build({ store, provider: { changes: () => { throw new EncarError('cursor_expired', 'old', { status: 410 }); } } });
  await assert.rejects(() => sync.runChanges({ rules: DEFAULT_RULES }), (e) => e.code === 'cursor_expired');
  assert.equal(store.state.baseline_completed_at, null);
  assert.equal(store.state.baseline_started_at, null);
  assert.equal(store.state.baseline_page, 1);
  assert.equal(store.state.change_cursor, null);
});

test('the change feed waits for a baseline', async () => {
  const { sync, calls } = build({ store: fakeStore(), provider: { changes: () => { throw new Error('no'); } } });
  const r = await sync.runChanges({ rules: DEFAULT_RULES });
  assert.equal(r.skipped, 'no_baseline');
  assert.equal(calls.changes.length, 0);
});

test('events that carry only an id are counted, not invented', async () => {
  const { sync, store } = build({
    store: ready({ change_cursor: 1 }),
    provider: { changes: () => ({ added: [], updated: [{ Id: '77', changedFields: ['price'] }], reappeared: [], removed: [], nextCursor: 2 }) },
  });
  const r = await sync.runChanges({ rules: DEFAULT_RULES });
  assert.equal(r.counts.unparsed, 1);
  assert.equal(store.listings.size, 0);
});
