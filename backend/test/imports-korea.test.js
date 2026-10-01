// GET /imports/korea — the public side of the Encar mirror.
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';
process.env.ENCAR_PHOTO_PREFIX = 'https://img.test/';

const { app } = require('../server');
const pool = require('../src/db');
const fx = require('../src/lib/fx');
const store = require('../src/lib/encar/store');
const { normalizeItem } = require('../src/lib/encar/normalize');

const api = () => request(app);

const car = (id, over = {}) => normalizeItem({
  Id: String(id), Manufacturer: 'Kia', Model: 'Sorento', Badge: '2.2 Diesel', FuelType: 'diesel',
  Transmission: 'automatic', Year: 202001, Price: 2500, Mileage: 40000,
  Photos: [{ location: `https://img.test/${id}/1.jpg` }, { location: `https://img.test/${id}/2.jpg` }],
  ...over,
}, { photoPrefix: 'https://img.test/' });

async function setPublic(on) {
  await pool.query(
    `UPDATE platform_settings SET value = jsonb_set(value, '{catalog_public}', $1::jsonb) WHERE key = 'encar_flags'`,
    [JSON.stringify(on)]
  );
}

beforeEach(async () => {
  fx._resetForTests();
  await pool.query('DELETE FROM encar_listings');
  require('../src/routes/imports-korea')._facetCache.clear();
  await pool.query("DELETE FROM fx_rates WHERE base = 'USD' AND quote = 'KRW'");
  await pool.query("INSERT INTO fx_rates (base, quote, rate, source, fetched_at) VALUES ('USD','KRW', 1400, 'test', NOW())");
  await setPublic(true);
});

after(async () => {
  await setPublic(false);
  await pool.end();
});

test('while the catalogue is not public, every route says so and shows nothing', async () => {
  await store.upsertListings(pool, [car(1)]);
  await setPublic(false);
  for (const path of ['/imports/korea', '/imports/korea/facets', '/imports/korea/1']) {
    const res = await api().get(path).expect(200);
    assert.equal(res.body.available, false, path);
    assert.deepEqual(res.body.items ?? [], []);
  }
});

test('a listing shows what a buyer needs and nothing the provider keeps private', async () => {
  await store.upsertListings(pool, [car(1)]);
  const res = await api().get('/imports/korea').expect(200);
  assert.equal(res.body.available, true);
  const item = res.body.items[0];
  assert.equal(item.make, 'Kia');
  assert.equal(item.price_krw, 25_000_000);
  assert.equal(item.price_usd, 17860); // 25,000,000 / 1400, rounded to 10
  assert.equal(item.cover, 'https://img.test/1/1.jpg');
  assert.equal(item.photo_count, 2);
  assert.equal(res.body.fx.krw_per_usd, 1400);
  const text = JSON.stringify(res.body);
  assert.ok(!/plate|vin|dealer|phone/i.test(text));
  assert.match(res.headers['cache-control'], /max-age=300/);
});

test('filters narrow the list', async () => {
  await store.upsertListings(pool, [
    car(1), car(2, { Manufacturer: 'Hyundai', Model: 'Tucson', Price: 3000, Year: 202201, Mileage: 20000, FuelType: 'gasoline' }),
    car(3, { Manufacturer: 'Hyundai', Model: 'Avante', Price: 1500, Year: 201801, Mileage: 90000, FuelType: 'gasoline' }),
  ]);
  const ids = async (qs) => (await api().get(`/imports/korea?${qs}`).expect(200)).body.items.map((i) => i.id).sort();
  assert.deepEqual(await ids('make=hyundai'), ['2', '3']);
  assert.deepEqual(await ids('make=Hyundai&model=Tucson'), ['2']);
  assert.deepEqual(await ids('fuel=diesel'), ['1']);
  assert.deepEqual(await ids('min_year=2020'), ['1', '2']);
  assert.deepEqual(await ids('max_mileage=50000'), ['1', '2']);
  // 1500 man = 15,000,000 KRW = ~10,714 USD; 2500 man ~17,857 USD
  assert.deepEqual(await ids('max_price_usd=12000'), ['3']);
  assert.deepEqual(await ids('min_price_usd=20000'), ['2']);
  assert.deepEqual(await ids('q=tucs'), ['2']);
  assert.deepEqual(await ids('q=tucsonn'), ['2'], 'a typo still finds it');
  assert.deepEqual(await ids('q=zzzz'), []);
});

test('a search text is never a pattern', async () => {
  await store.upsertListings(pool, [car(1)]);
  const res = await api().get('/imports/korea?q=%25').expect(200);
  assert.deepEqual(res.body.items, []);
});

test('every sort order works and pages without repeating or skipping a car', async () => {
  const cars = Array.from({ length: 7 }, (_, i) => car(100 + i, {
    Price: 1000 + (i % 3) * 500, Mileage: 10000 * (7 - i), Year: 201801 + i * 100,
  }));
  await store.upsertListings(pool, cars);
  for (const sort of ['newest', 'price_asc', 'price_desc', 'mileage_asc', 'year_desc']) {
    const seen = [];
    let cursor = null;
    for (let guard = 0; guard < 10; guard += 1) {
      const res = await api().get(`/imports/korea?sort=${sort}&limit=3${cursor ? `&cursor=${cursor}` : ''}`).expect(200);
      seen.push(...res.body.items.map((i) => i.id));
      cursor = res.body.next_cursor;
      if (!cursor) break;
    }
    assert.equal(seen.length, 7, `${sort}: wrong count`);
    assert.equal(new Set(seen).size, 7, `${sort}: a car repeated`);
  }
});

test('price sorts really are ordered', async () => {
  await store.upsertListings(pool, [car(1, { Price: 3000 }), car(2, { Price: 1000 }), car(3, { Price: 2000 })]);
  const asc = (await api().get('/imports/korea?sort=price_asc').expect(200)).body.items.map((i) => i.price_krw);
  assert.deepEqual(asc, [10_000_000, 20_000_000, 30_000_000]);
  const desc = (await api().get('/imports/korea?sort=price_desc').expect(200)).body.items.map((i) => i.price_krw);
  assert.deepEqual(desc, [30_000_000, 20_000_000, 10_000_000]);
});

test('bad input is a 400, never a 500', async () => {
  await api().get('/imports/korea?sort=cheapest').expect(400);
  await api().get('/imports/korea?cursor=!!!').expect(400);
  await api().get('/imports/korea?limit=0').expect(400);
  await api().get('/imports/korea?limit=1000').expect(400);
  await api().get('/imports/korea?min_year=abc').expect(400);
  await api().get('/imports/korea?max_price_usd=-5').expect(400);
});

test('the page size is capped', async () => {
  await store.upsertListings(pool, Array.from({ length: 5 }, (_, i) => car(300 + i)));
  const res = await api().get('/imports/korea?limit=48').expect(200);
  assert.ok(res.body.items.length <= 48);
});

test('facets count makes, then models and fuels for one make', async () => {
  await store.upsertListings(pool, [
    car(1), car(2), car(3, { Manufacturer: 'Hyundai', Model: 'Tucson', FuelType: 'gasoline', Year: 202201 }),
  ]);
  const all = (await api().get('/imports/korea/facets').expect(200)).body;
  assert.equal(all.total, 3);
  assert.deepEqual(all.makes[0], { make: 'Kia', count: 2 });
  const kia = (await api().get('/imports/korea/facets?make=kia').expect(200)).body;
  assert.equal(kia.total, 2);
  assert.deepEqual(kia.models, [{ model: 'Sorento', count: 2 }]);
  assert.deepEqual(kia.fuels, [{ fuel: 'diesel', count: 2 }]);
});

test('one car comes with every photo, and an honest absence of an estimate', async () => {
  await store.upsertListings(pool, [car(1)]);
  const res = await api().get('/imports/korea/1').expect(200);
  assert.deepEqual(res.body.photos, ['https://img.test/1/1.jpg', 'https://img.test/1/2.jpg']);
  assert.equal(res.body.estimate, null);
  assert.match(res.body.source_note, /Korean asking price/);
});

test('a car that sold is a 404, and odd ids are too', async () => {
  await api().get('/imports/korea/999999').expect(404);
  await api().get(`/imports/korea/${encodeURIComponent('1; DROP TABLE x')}`).expect(404);
});

test('with no exchange rate anywhere, the floor answers and is flagged stale', async () => {
  await store.upsertListings(pool, [car(1)]);
  fx._resetForTests();
  await pool.query("DELETE FROM fx_rates WHERE base = 'USD' AND quote = 'KRW'");
  const real = global.fetch;
  global.fetch = async () => { throw new Error('offline'); };
  try {
    // the USD→KRW floor still answers, so price filters work — flagged stale
    const res = await api().get('/imports/korea?max_price_usd=50000').expect(200);
    assert.equal(res.body.fx.stale, true);
  } finally { global.fetch = real; }
});
