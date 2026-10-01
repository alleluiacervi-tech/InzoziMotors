// The SQL behind the Encar mirror, against real Postgres (migration 0052).
// The behaviour that matters here is the part a fake cannot show: that an
// update which changes nothing we keep writes nothing, that a price change
// clears the stale estimate, and that the table never holds a duplicate id.
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'encar_store_test_secret';

const pool = require('../src/db');
const store = require('../src/lib/encar/store');
const { normalizeItem } = require('../src/lib/encar/normalize');

const row = (id, over = {}) => normalizeItem({
  Id: String(id), Manufacturer: 'Hyundai', Model: 'Tucson', Badge: '1.6 T', FuelType: 'gasoline',
  Transmission: 'automatic', Year: 202203, Price: 2900, Mileage: 21000,
  Photos: [{ location: `https://img.test/${id}/1.jpg` }, { location: `https://img.test/${id}/2.jpg` }],
  ...over,
});

beforeEach(async () => {
  await pool.query('DELETE FROM encar_listings');
  await pool.query('DELETE FROM encar_detail_cache');
  await pool.query('DELETE FROM encar_sync_runs');
  await pool.query('DELETE FROM encar_usage');
  await pool.query(`UPDATE encar_sync_state SET baseline_started_at = NULL, baseline_completed_at = NULL,
                      baseline_page = 1, change_cursor = NULL, last_error = NULL WHERE id = 1`);
});

after(async () => { await pool.end(); });

test('the mirror tables and the settings exist, and start switched off', async () => {
  for (const t of ['encar_listings', 'encar_detail_cache', 'encar_sync_state', 'encar_sync_runs', 'encar_usage']) {
    const { rows } = await pool.query('SELECT to_regclass($1) AS t', [t]);
    assert.ok(rows[0].t, `${t} is missing`);
  }
  const flags = await store.loadFlags(pool);
  assert.equal(flags.sync_enabled, false);
  assert.equal(flags.catalog_public, false);
  const rules = await store.loadRules(pool);
  assert.equal(rules.exclude_duplicates, true);
  assert.equal(rules.row_ceiling, 250000);
  assert.ok((await store.getState(pool)).id === 1);
});

test('new cars are inserted with their photos intact', async () => {
  const r = await store.upsertListings(pool, [row(1), row(2)]);
  assert.deepEqual(r, { inserted: 2, updated: 0 });
  const { rows } = await pool.query('SELECT * FROM encar_listings WHERE id = $1', ['1']);
  assert.equal(rows[0].make, 'Hyundai');
  assert.equal(rows[0].year, 2022);
  assert.equal(rows[0].month, 3);
  assert.equal(rows[0].price_man, 2900);
  assert.equal(rows[0].photo_count, 2);
  assert.deepEqual(rows[0].photos, ['https://img.test/1/1.jpg', 'https://img.test/1/2.jpg']);
  assert.equal(rows[0].est_landed_rwf, null);
});

test('an update that changes nothing we keep writes nothing', async () => {
  await store.upsertListings(pool, [row(1)]);
  const before = (await pool.query('SELECT changed_at, synced_at, xmin::text AS x FROM encar_listings WHERE id = $1', ['1'])).rows[0];
  const r = await store.upsertListings(pool, [row(1)]);
  assert.deepEqual(r, { inserted: 0, updated: 0 });
  const after = (await pool.query('SELECT changed_at, synced_at, xmin::text AS x FROM encar_listings WHERE id = $1', ['1'])).rows[0];
  assert.equal(after.x, before.x, 'the row was rewritten for nothing');
  assert.equal(String(after.changed_at), String(before.changed_at));
});

test('a real change is written, and a price change clears the stale estimate', async () => {
  await store.upsertListings(pool, [row(1)]);
  await pool.query("UPDATE encar_listings SET est_landed_rwf = 30000000, est_computed_at = NOW() WHERE id = '1'");

  // mileage changes: estimate survives
  assert.deepEqual(await store.upsertListings(pool, [row(1, { Mileage: 22000 })]), { inserted: 0, updated: 1 });
  let r = (await pool.query("SELECT mileage_km, est_landed_rwf FROM encar_listings WHERE id = '1'")).rows[0];
  assert.equal(r.mileage_km, 22000);
  assert.equal(Number(r.est_landed_rwf), 30000000);

  // price changes: estimate cleared, so a stale figure can never be shown
  assert.deepEqual(await store.upsertListings(pool, [row(1, { Price: 2700, Mileage: 22000 })]), { inserted: 0, updated: 1 });
  r = (await pool.query("SELECT price_man, est_landed_rwf, est_computed_at FROM encar_listings WHERE id = '1'")).rows[0];
  assert.equal(r.price_man, 2700);
  assert.equal(r.est_landed_rwf, null);
  assert.equal(r.est_computed_at, null);
});

test('first_seen_at is never overwritten by an update', async () => {
  await store.upsertListings(pool, [row(1)]);
  await pool.query("UPDATE encar_listings SET first_seen_at = '2026-01-01T00:00:00Z' WHERE id = '1'");
  await store.upsertListings(pool, [row(1, { Price: 1000 })]);
  const { rows } = await pool.query("SELECT first_seen_at FROM encar_listings WHERE id = '1'");
  assert.equal(new Date(rows[0].first_seen_at).toISOString(), '2026-01-01T00:00:00.000Z');
});

test('the same id twice in one batch does not fail the batch', async () => {
  const r = await store.upsertListings(pool, [row(1), row(1, { Price: 3100 }), row(2)]);
  assert.equal(r.inserted, 2);
  assert.equal((await pool.query("SELECT price_man FROM encar_listings WHERE id = '1'")).rows[0].price_man, 3100);
});

test('an empty batch is a no-op', async () => {
  assert.deepEqual(await store.upsertListings(pool, []), { inserted: 0, updated: 0 });
});

test('sold cars are deleted, and deleting what is not there is fine', async () => {
  await store.upsertListings(pool, [row(1), row(2), row(3)]);
  assert.equal(await store.deleteListings(pool, ['1', '3', '3', 'nope']), 2);
  assert.equal(await store.countListings(pool), 1);
  assert.equal(await store.deleteListings(pool, []), 0);
});

test('state is patched through an allow-list', async () => {
  await store.patchState(pool, { change_cursor: 42, baseline_page: 7, nonsense: 'x; DROP TABLE encar_listings' });
  const s = await store.getState(pool);
  assert.equal(Number(s.change_cursor), 42);
  assert.equal(s.baseline_page, 7);
  assert.equal(await store.countListings(pool), 0);
  await store.patchState(pool, {}); // no-op
});

test('runs are recorded and old ones purged', async () => {
  const id = await store.startRun(pool, 'changes');
  await store.finishRun(pool, id, { ok: true, added: 3, removed: 1 });
  const { rows } = await pool.query('SELECT * FROM encar_sync_runs WHERE id = $1', [id]);
  assert.equal(rows[0].ok, true);
  assert.equal(rows[0].added, 3);
  await pool.query("UPDATE encar_sync_runs SET started_at = NOW() - INTERVAL '31 days' WHERE id = $1", [id]);
  const swept = await store.housekeeping(pool);
  assert.equal(swept.runs, 1);
});

test('expired cache rows are purged and live ones kept', async () => {
  await pool.query(`INSERT INTO encar_detail_cache (id, kind, payload, expires_at) VALUES
    ('1','detail','{}', NOW() - INTERVAL '1 minute'), ('2','detail','{}', NOW() + INTERVAL '1 hour')`);
  const swept = await store.housekeeping(pool);
  assert.equal(swept.cache, 1);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM encar_detail_cache')).rows[0].n, 1);
});

test('provider usage accumulates per day', async () => {
  await store.recordUsage(pool, { requests: 1, bytes: 1000 });
  await store.recordUsage(pool, { requests: 2, bytes: 500 });
  assert.deepEqual(await store.monthUsage(pool), { requests: 3, bytes: 1500 });
});

test('the table refuses a car with no price', async () => {
  await assert.rejects(() => pool.query(
    "INSERT INTO encar_listings (id, make, model, year, price_man) VALUES ('z','a','b',2020,0)"
  ), (e) => e.code === '23514');
});

test('search finds a car by part of its name, and by a typo (trigram index)', async () => {
  await store.upsertListings(pool, [row(1, { Manufacturer: 'Kia', Model: 'Sorento', Badge: '2.2 Diesel' })]);
  const text = "lower(make || ' ' || model || ' ' || COALESCE(badge, ''))";
  assert.equal((await pool.query(`SELECT id FROM encar_listings WHERE ${text} LIKE '%soren%'`)).rows.length, 1);
  assert.equal((await pool.query(`SELECT id FROM encar_listings WHERE 'sorentoo' <% ${text}`)).rows.length, 1);
  assert.equal((await pool.query(`SELECT id FROM encar_listings WHERE 'tucsonn' <% ${text}`)).rows.length, 0);
});
