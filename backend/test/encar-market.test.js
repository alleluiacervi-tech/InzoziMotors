// The Korea market guide (lib/encar/market.js): parsing against real
// free-plan responses (test/fixtures/encar, trimmed), and the cache and daily
// budget against real Postgres (migration 0058) with a fake provider.
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'encar_market_test_secret';

const pool = require('../src/db');
const { createMarket, parseOverview, parseMake, parseModel } = require('../src/lib/encar/market');
const navOverview = require('./fixtures/encar/nav-overview.json');
const navHyundai = require('./fixtures/encar/nav-hyundai.json');
const catalogTucson = require('./fixtures/encar/catalog-tucson.json');

// ── parsing ───────────────────────────────────────────────────────────────
test('overview: every make with its count, provider names made readable', () => {
  const out = parseOverview(navOverview);
  assert.ok(out.total > 100000);
  assert.equal(out.makes[0].make, 'Hyundai');
  assert.ok(out.makes[0].count > 40000);
  const kg = out.makes.find((m) => m.make === 'KG_Mobility_Ssangyong');
  assert.equal(kg.label, 'KG Mobility (SsangYong)');
  for (let i = 1; i < out.makes.length; i += 1) assert.ok(out.makes[i - 1].count >= out.makes[i].count);
});

test('make: model lines with counts for the make asked about, and only that make', () => {
  const out = parseMake(navHyundai, 'Hyundai');
  assert.equal(out.make, 'Hyundai');
  assert.ok(out.total > 40000);
  const names = out.models.map((m) => m.model);
  assert.ok(names.includes('Tucson'));
  assert.equal(out.models.find((m) => m.model === 'Santafe').label, 'Santa Fe');
  assert.deepEqual(parseMake(navHyundai, 'Tesla').models, []);
});

test('model: count, price spread and listings, without ids, cities or dealers', () => {
  const out = parseModel(catalogTucson, { make: 'Hyundai', model: 'Tucson', minYear: 2017 });
  assert.ok(out.total > 1000);
  assert.ok(out.listings.length > 0 && out.listings.length <= 20);
  const l = out.listings[0];
  assert.deepEqual(Object.keys(l).sort(), ['badge', 'fuel', 'mileage_km', 'model', 'month', 'price_man', 'year']);
  assert.ok(out.price_man.min <= out.price_man.median && out.price_man.median <= out.price_man.max);
});

test('model: placeholder prices are left out of the listings and the spread', () => {
  const out = parseModel({ Count: 3, SearchResults: [
    { Id: '1', Manufacturer: 'Kia', Model: 'K5', Year: 202201, Price: 1, Mileage: 1 },
    { Id: '2', Manufacturer: 'Kia', Model: 'K5', Year: 202201, Price: 2100, Mileage: 30000 },
    { Id: '3', Manufacturer: 'Kia', Model: 'K5', Year: 202101, Price: 1900, Mileage: 50000 },
  ] }, { make: 'Kia', model: 'K5', minYear: 2017 });
  assert.equal(out.sample, 2);
  assert.deepEqual(out.price_man, { min: 1900, median: 2000, max: 2100 });
});

// ── cache and budget, against Postgres ────────────────────────────────────
function fakeClient() {
  const calls = [];
  return {
    calls,
    configured: true,
    nav: async (q) => { calls.push(['nav', q]); return q.manufacturer ? navHyundai : navOverview; },
    catalog: async (q) => { calls.push(['catalog', q]); return catalogTucson; },
  };
}
const flagsOn = async () => ({ market_public: true });

beforeEach(async () => { await pool.query('DELETE FROM encar_market_cache'); });
after(async () => { await pool.end(); });

test('one provider request per answer; the second visitor is served from the cache', async () => {
  const client = fakeClient();
  const market = createMarket({ db: pool, client, loadFlags: flagsOn });
  const a = await market.overview();
  const b = await market.overview();
  assert.equal(client.calls.length, 1);
  assert.equal(a.stale, false);
  assert.deepEqual(a.data, b.data);
  assert.equal(await market.spentToday(), 1);
});

test('visitors asking at the same moment share one request', async () => {
  const client = fakeClient();
  const market = createMarket({ db: pool, client, loadFlags: flagsOn });
  await Promise.all([market.overview(), market.overview(), market.overview()]);
  assert.equal(client.calls.length, 1);
});

test('a model is fetched only if the provider lists it under that make', async () => {
  const client = fakeClient();
  const market = createMarket({ db: pool, client, loadFlags: flagsOn });
  assert.deepEqual(await market.makeView('NoSuchMake'), { notFound: true });
  assert.deepEqual(await market.modelView('Hyundai', 'NoSuchModel'), { notFound: true });
  const tucson = await market.modelView('hyundai', 'tucson');
  assert.equal(tucson.data.model, 'Tucson');
  const catalogCall = client.calls.find(([kind]) => kind === 'catalog')[1];
  assert.equal(catalogCall.manufacturer, 'Hyundai');
  assert.equal(catalogCall.model_group, 'Tucson');
  assert.equal(catalogCall.sort, 'newest');
  // overview + make + model; the unknown names cost nothing.
  assert.equal(client.calls.length, 3);
});

test('the daily budget is a hard stop, and past it the last answer is served stale', async () => {
  let clock = new Date('2026-10-07T08:00:00Z');
  const client = fakeClient();
  const market = createMarket({ db: pool, client, loadFlags: flagsOn, dailyMax: 1, now: () => clock });
  const first = await market.overview();
  assert.equal(first.stale, false);

  clock = new Date('2026-10-08T09:00:00Z'); // a day later: expired, new budget
  await pool.query(`UPDATE encar_market_cache SET fetched_at = $1 WHERE key = 'overview'`, ['2026-10-07T08:00:00Z']);
  await market.overview(); // spends the new day's one request
  await pool.query(`UPDATE encar_market_cache SET fetched_at = $1 WHERE key = 'overview'`, ['2026-10-06T08:00:00Z']);
  const third = await market.overview(); // budget spent: stale, no call
  assert.equal(third.stale, true);
  assert.ok(third.data.makes.length);
  assert.equal(client.calls.length, 2);
});

test('with nothing cached and no budget, the answer is pending, not an error', async () => {
  const market = createMarket({ db: pool, client: fakeClient(), loadFlags: flagsOn, dailyMax: 0 });
  assert.deepEqual(await market.overview(), { pending: true });
});

test('a provider failure falls back to the last answer, and "no more today" stops asking', async () => {
  const client = fakeClient();
  let fail = false;
  client.nav = async () => { client.calls.push(['nav']); if (fail) { const e = new Error('429'); e.code = 'rate_limited'; throw e; } return navOverview; };
  const market = createMarket({ db: pool, client, loadFlags: flagsOn });
  await market.overview();
  await pool.query(`UPDATE encar_market_cache SET fetched_at = NOW() - INTERVAL '3 days' WHERE key = 'overview'`);
  fail = true;
  const stale = await market.overview();
  assert.equal(stale.stale, true);
  await market.overview();
  assert.equal(client.calls.length, 2, 'after a 429 the provider is not asked again today');
});

test('off without a key, or when the flag is off', async () => {
  const keyless = createMarket({ db: pool, client: { configured: false }, loadFlags: flagsOn });
  assert.equal(await keyless.available(), false);
  const off = createMarket({ db: pool, client: fakeClient(), loadFlags: async () => ({ market_public: false }) });
  assert.equal(await off.available(), false);
  const on = createMarket({ db: pool, client: fakeClient(), loadFlags: async () => ({}) });
  assert.equal(await on.available(), true, 'on by default once the key is set');
});
