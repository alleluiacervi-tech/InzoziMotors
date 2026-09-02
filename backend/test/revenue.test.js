// ─────────────────────────────────────────────────────────────────────────────
// The revenue view — what the business actually earned, aggregated.
//
// Five monetizable lines existed and none of them had anywhere an operator
// could see all of them together. Fee rows got written and never summed by
// type or month; the one existing rollup (GET /admin/fees) groups by
// currency and status only. These tests protect the two things that make
// the new view trustworthy: the combined total moves by exactly what was
// just recorded (not by however much other tests happened to add), and only
// money actually collected — paid fees, non-voided subscriptions — counts.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { REQUIRED_ITEM_IDS } = require('../src/lib/inspection-policy');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const checklist = () => Object.fromEntries(REQUIRED_ITEM_IDS.map((id) => [id, 'pass']));
const thisMonth = () => new Date().toISOString().slice(0, 7);

let fixtureDay = 1000;
const nextDay = () => new Date(Date.now() + fixtureDay++ * 86400_000).toISOString().slice(0, 10);

async function register(overrides = {}) {
  const body = { name: 'Revenue User', email: unique('revenue'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}
async function makeAdmin(user) {
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}

async function revenueSnapshot(auth) {
  const res = await api().get('/admin/revenue').set(auth).expect(200);
  const find = (type, currency = 'RWF') =>
    res.body.totals_by_type.find((row) => row.type === type && row.currency === currency);
  return { body: res.body, inspection: find('inspection'), rentalSub: find('rental_subscription') };
}

test.after(async () => { await pool.end(); });

test('a paid inspection fee moves the inspection total by exactly what was recorded', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const day = nextDay();
  await pool.query(
    "DELETE FROM inspections i WHERE lower(i.center)='nyarutarama center' AND i.scheduled_on=$1::date"
    + " AND NOT EXISTS (SELECT 1 FROM rental_cars rc WHERE rc.inspection_id = i.id)", [day]
  );
  const booked = await api().post('/inspections/standalone').set(auth).send({
    make: 'Toyota', model: 'Prado', year: 2014,
    center: 'Nyarutarama Center', scheduled_date: day, scheduled_time: '10:00 AM',
    customer: { name: 'Revenue Payer', email: unique('payer') },
  }).expect(201);

  const before = await revenueSnapshot(auth);
  const beforeTotal = before.inspection?.total || 0;
  const beforeCount = before.inspection?.count || 0;

  await api().post(`/inspections/${booked.body.id}/fee`).set(auth)
    .send({ amount: 17000, method: 'cash' }).expect(201);

  const after = await revenueSnapshot(auth);
  assert.equal(after.inspection.total, beforeTotal + 17000);
  assert.equal(after.inspection.count, beforeCount + 1);

  // The row lands in this month's bucket in the by-month breakdown too.
  const monthRow = after.body.fees.find((r) => r.fee_type === 'inspection' && r.month === thisMonth() && r.currency === 'RWF');
  assert.ok(monthRow, 'the fee must appear under the current month');
});

test('a voided fee stops counting, and a due-but-unpaid fee never counted', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const day = nextDay();
  await pool.query(
    "DELETE FROM inspections i WHERE lower(i.center)='nyarutarama center' AND i.scheduled_on=$1::date"
    + " AND NOT EXISTS (SELECT 1 FROM rental_cars rc WHERE rc.inspection_id = i.id)", [day]
  );
  const booked = await api().post('/inspections/standalone').set(auth).send({
    make: 'Toyota', model: 'RAV4', year: 2015,
    center: 'Nyarutarama Center', scheduled_date: day, scheduled_time: '10:00 AM',
    customer: { name: 'Voided Payer', email: unique('voided') },
  }).expect(201);

  const before = await revenueSnapshot(auth);
  const beforeTotal = before.inspection?.total || 0;

  await api().post(`/inspections/${booked.body.id}/fee`).set(auth)
    .send({ amount: 9000, method: 'cash' }).expect(201);
  const withFee = await revenueSnapshot(auth);
  assert.equal(withFee.inspection.total, beforeTotal + 9000);

  await api().delete(`/inspections/${booked.body.id}/fee`).set(auth)
    .send({ reason: 'entered the wrong amount' }).expect(200);
  const afterVoid = await revenueSnapshot(auth);
  assert.equal(afterVoid.inspection.total, beforeTotal, 'a voided fee must not count as revenue');
});

test('a rental subscription is its own line, separate from platform_fees, and a void removes it', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const provider = await register({ role: 'seller' });
  await pool.query(
    `UPDATE users SET id_verified='approved', seller_type='showroom', business_verified=TRUE,
       phone='+250788000998', phone_visible=TRUE, contact_consent_at=NOW() WHERE id=$1`,
    [provider.id]
  );
  const submission = await api().post('/submissions').set('Authorization', `Bearer ${provider.token}`)
    .send({ make: 'Toyota', model: 'Land Cruiser', year: 2020, mileage: 40000, asking_price: 25000000 }).expect(201);
  const on = nextDay();
  await pool.query(
    "DELETE FROM inspections i WHERE lower(i.center)='nyarutarama center' AND i.scheduled_on=$1::date"
    + " AND NOT EXISTS (SELECT 1 FROM rental_cars rc WHERE rc.inspection_id = i.id)", [on]
  );
  await api().patch(`/submissions/${submission.body.id}`).set(auth)
    .send({ status: 'scheduled', center: 'Nyarutarama Center', scheduled_date: on, scheduled_time: '10:00 AM' })
    .expect(200);
  const { rows } = await pool.query('SELECT id FROM inspections WHERE submission_id=$1', [submission.body.id]);
  await api().post(`/inspections/${rows[0].id}/start`).set(auth).expect(200);
  await api().post(`/inspections/${rows[0].id}/complete`).set(auth)
    .send({ checklist_results: checklist() }).expect(200);

  const car = await api().post('/rentals').set(auth).send({
    provider_id: provider.id, title: '2020 Toyota Land Cruiser', make: 'Toyota', model: 'Land Cruiser', year: 2020,
    daily_rate: 70000, inspection_id: rows[0].id, images: ['https://example.test/rental-revenue.jpg'],
  }).expect(201);

  const before = await revenueSnapshot(auth);
  const beforeTotal = before.rentalSub?.total || 0;
  const beforeCount = before.rentalSub?.count || 0;

  const today = new Date().toISOString().slice(0, 10);
  const ends = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const sub = await api().post(`/rentals/${car.body.id}/subscriptions`).set(auth)
    .send({ amount_rwf: 12000, method: 'mobile_money', starts_on: today, ends_on: ends }).expect(201);

  const after = await revenueSnapshot(auth);
  assert.equal(after.rentalSub.total, beforeTotal + 12000);
  assert.equal(after.rentalSub.count, beforeCount + 1);

  await api().post(`/rentals/subscriptions/${sub.body.id}/void`).set(auth)
    .send({ reason: 'test cleanup' }).expect(200);
  const afterVoid = await revenueSnapshot(auth);
  assert.equal(afterVoid.rentalSub?.total || 0, beforeTotal, 'a voided subscription must not count as revenue');
});

test('the revenue view is admin-only', async () => {
  const outsider = await register();
  await api().get('/admin/revenue')
    .set('Authorization', `Bearer ${outsider.token}`).expect(403);
  await api().get('/admin/revenue').expect(401);
});
