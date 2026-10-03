// ─────────────────────────────────────────────────────────────────────────────
// The Action Center's listing queue and the admin listings view use the same
// inspection-evidence rule as the public catalogue (lib/inspection-evidence.js).
//
// They used to demand a passing score as well. Since the transparency model a
// low score or a critical defect is disclosed on the listing, not a reason to
// hold it back, so that rule flagged every honestly disclosed live car as a risk
// forever, while the car's own page said nothing was outstanding.
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

async function register(role) {
  const email = unique('acl');
  const r = await api().post('/auth/register')
    .send({ name: 'Queue Test', email, password: 'password123', role }).expect(201);
  return { id: r.body.user.id, email };
}

async function adminAuth() {
  const u = await register('buyer');
  await pool.query(`UPDATE users SET role='admin' WHERE id=$1`, [u.id]);
  const r = await api().post('/auth/login').send({ email: u.email, password: 'password123' }).expect(200);
  return { Authorization: `Bearer ${r.body.token}` };
}

async function seller() {
  const u = await register('seller');
  await pool.query(`UPDATE users SET id_verified='approved', account_status='active' WHERE id=$1`, [u.id]);
  return u.id;
}

/** A live car. With `score`, it carries a complete inspection on the current
 *  checklist; `critical` marks the first critical item failed and recorded. */
async function liveCar(sellerId, { score, critical = false } = {}) {
  const V = { make: 'Dongfeng', model: 'E70', year: 2022 };
  const { rows: [car] } = await pool.query(
    `INSERT INTO cars (seller_id, title, make, model, year, mileage, price, status, images, inspected, inspection_score, listed_at)
     VALUES ($1,$2,$3,$4,$5,7000,23000000,'live',ARRAY['https://example.com/a.jpg'],$6,$7,NOW()) RETURNING id`,
    [sellerId, `Queue E70 ${Math.random().toString(36).slice(2, 7)}`, V.make, V.model, V.year, score != null, score ?? null]);
  if (score == null) return car.id;
  const { rows: [sub] } = await pool.query(
    `INSERT INTO submissions (car_id, seller_id, status, make, model, year, mileage, asking_price)
     VALUES ($1,$2,'live',$3,$4,$5,7000,23000000) RETURNING id`,
    [car.id, sellerId, V.make, V.model, V.year]);
  const results = Object.fromEntries(ALL_ITEMS.map((item, i) => [item.id, i < 150 - score ? 'fail' : 'pass']));
  const criticalItem = ALL_ITEMS.find((item) => item.critical);
  await pool.query(
    `INSERT INTO inspections (submission_id, car_id, center, status, checklist_results, checklist_version, score, passed,
       critical_failures, completed_at, scheduled_date)
     VALUES ($1,$2,'Kigali','complete',$3::jsonb,$4,$5,$6,$7::jsonb,NOW(),CURRENT_DATE)`,
    [sub.id, car.id, JSON.stringify(results), CHECKLIST_VERSION, score, score >= 105 && !critical,
     JSON.stringify(critical ? [criticalItem.id] : [])]);
  return car.id;
}

const listingQueue = async (auth) =>
  (await api().get('/admin/action-center').set(auth).expect(200)).body.items
    .filter((item) => String(item.id).startsWith('listing-risk:'))
    .map((item) => String(item.id).slice('listing-risk:'.length));

test('a live car with a disclosed low score is not a listing risk', async () => {
  const auth = await adminAuth();
  const disclosed = await liveCar(await seller(), { score: 101, critical: true });
  await pool.query(`UPDATE cars SET created_at = NOW() - INTERVAL '20 years' WHERE id=$1`, [disclosed]);
  assert.equal((await listingQueue(auth)).includes(disclosed), false);
});

test('a live car with no inspection evidence still is', async () => {
  const auth = await adminAuth();
  const bare = await liveCar(await seller());
  // The queue is oldest first and capped, and the suite shares one database.
  await pool.query(`UPDATE cars SET created_at = NOW() - INTERVAL '20 years' WHERE id=$1`, [bare]);
  assert.ok((await listingQueue(auth)).includes(bare));
});

test('the admin listings view agrees: a disclosed low score has its inspection', async () => {
  const auth = await adminAuth();
  const disclosed = await liveCar(await seller(), { score: 101, critical: true });
  const rows = (await api().get('/admin/listings?status=live&limit=200').set(auth).expect(200)).body;
  const row = rows.find((r) => r.id === disclosed);
  assert.ok(row, 'the car is listed');
  assert.equal(row.has_completed_inspection, true);
});

test.after(() => pool.end());
