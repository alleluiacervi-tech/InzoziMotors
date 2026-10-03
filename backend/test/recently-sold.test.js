// ─────────────────────────────────────────────────────────────────────────────
// GET /cars/recently-sold — the website's "Recently sold" row.
//
// It may show only cars the detail page would show: sold within 90 days, by a
// seller who is still eligible, with valid inspection evidence. Anything else
// would be a link to a 404, or a car that was never really on the marketplace.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { ALL_ITEMS, CHECKLIST_VERSION } = require('../src/lib/inspection-policy');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const ALL_PASS = Object.fromEntries(ALL_ITEMS.map((i) => [i.id, 'pass']));

async function seller() {
  const r = await api().post('/auth/register')
    .send({ name: 'Sold Motors', email: unique('sold'), password: 'password123', role: 'seller' }).expect(201);
  await pool.query(`UPDATE users SET id_verified='approved', account_status='active' WHERE id=$1`, [r.body.user.id]);
  return r.body.user.id;
}

/** A car that went through inspection and publication, then sold `daysAgo`. */
async function soldCar(sellerId, { daysAgo = 3, status = 'sold', inspected = true } = {}) {
  const V = { make: 'Toyota', model: 'RAV4', year: 2020 };
  const { rows: [car] } = await pool.query(
    `INSERT INTO cars (seller_id, title, make, model, year, mileage, price, status, images, inspected,
                      inspection_score, listed_at, sold_at, vin)
     VALUES ($1,$2,$3,$4,$5,40000,25000000,$6,ARRAY['https://example.com/s.jpg'],TRUE,142,
             NOW() - INTERVAL '120 days',
             CASE WHEN $6 = 'sold' THEN NOW() - make_interval(days => $7) END,
             'JTMBFREV10D000001')
     RETURNING id`,
    [sellerId, `Sold RAV4 ${Math.random().toString(36).slice(2, 7)}`, V.make, V.model, V.year, status, daysAgo]
  );
  if (!inspected) return car.id;
  const { rows: [sub] } = await pool.query(
    `INSERT INTO submissions (car_id, seller_id, status, make, model, year, mileage, asking_price)
     VALUES ($1,$2,'live',$3,$4,$5,40000,25000000) RETURNING id`,
    [car.id, sellerId, V.make, V.model, V.year]
  );
  await pool.query(
    `INSERT INTO inspections (submission_id, car_id, center, status, checklist_results,
       checklist_version, score, passed, critical_failures, completed_at, scheduled_date)
     VALUES ($1,$2,'Kigali','complete',$3::jsonb,$4,142,TRUE,'[]'::jsonb,NOW(),CURRENT_DATE)`,
    [sub.id, car.id, JSON.stringify(ALL_PASS), CHECKLIST_VERSION]
  );
  return car.id;
}

const feed = async () => (await api().get('/cars/recently-sold?limit=12').expect(200)).body;

test('a car sold this month is in the row, with only what a card needs', async () => {
  const id = await soldCar(await seller());
  const row = (await feed()).find((c) => c.id === id);
  assert.ok(row, 'the sold car is listed');
  assert.equal(row.inspection_score, 142);
  assert.equal(row.price, 25000000);
  assert.ok(row.sold_at);
  for (const key of ['vin', 'seller_id', 'seller_phone', 'description', 'views', 'saves']) {
    assert.equal(key in row, false, `${key} is not in the payload`);
  }
});

test('only the last 90 days, only sold, only with inspection evidence', async () => {
  const s = await seller();
  const old = await soldCar(s, { daysAgo: 120 });
  const live = await soldCar(s, { status: 'live' });
  const uninspected = await soldCar(s, { inspected: false });
  const ids = (await feed()).map((c) => c.id);
  assert.equal(ids.includes(old), false, 'sold 120 days ago');
  assert.equal(ids.includes(live), false, 'still live');
  assert.equal(ids.includes(uninspected), false, 'no valid inspection');
});

test('a suspended seller takes their sold cars out of the row too', async () => {
  const s = await seller();
  const id = await soldCar(s);
  assert.ok((await feed()).some((c) => c.id === id));
  await pool.query(`UPDATE users SET account_status='suspended' WHERE id=$1`, [s]);
  assert.equal((await feed()).some((c) => c.id === id), false);
});

test('limit is clamped, newest sale first', async () => {
  const s = await seller();
  await soldCar(s, { daysAgo: 2 });
  await soldCar(s, { daysAgo: 1 });
  const rows = (await api().get('/cars/recently-sold?limit=500').expect(200)).body;
  assert.ok(rows.length <= 12);
  const times = rows.map((r) => new Date(r.sold_at).getTime());
  assert.deepEqual(times, [...times].sort((a, b) => b - a));
  assert.equal((await api().get('/cars/recently-sold?limit=1').expect(200)).body.length, 1);
});

test.after(() => pool.end());
