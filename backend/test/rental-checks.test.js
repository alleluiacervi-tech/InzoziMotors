// ─────────────────────────────────────────────────────────────────────────────
// The Sawa Rental Check (lib/rental-check-policy.js, migration 0060).
//
// What each test pins down:
//   - the policy: ten points, a blocking fail stops listing, an as-advertised
//     fail is disclosed, a fail needs a reason, an expired document cannot pass;
//   - a provider adds a car without the 150-point inspection, which requests
//     a check, and nothing reaches renters until a check passes, the listing fee
//     is recorded and an admin activates it;
//   - the LATEST check decides, by predicate: a failed re-check takes a live car
//     down, an expired document hides it, voiding brings back the previous one;
//   - renters see the summary and the disclosures, never the failed points or
//     staff notes; providers see their status and what to fix.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { evaluateRentalCheck, ITEMS, disclosures } = require('../src/lib/rental-check-policy');
const { kigaliToday } = require('../src/lib/insights-range');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const dayFrom = (offset) => {
  const d = new Date(`${kigaliToday()}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

const allPass = () => Object.fromEntries(ITEMS.map((entry) => [entry.id, { verdict: 'pass' }]));
const checkBody = (overrides = {}) => ({
  results: allPass(),
  insurance_expires_on: dayFrom(200),
  technical_control_expires_on: dayFrom(150),
  odometer_km: 84210,
  ...overrides,
});

async function register(overrides = {}) {
  const body = { name: 'Rental Co', email: unique('rentalcheck'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}
async function makeAdmin() {
  const user = await register();
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return { Authorization: `Bearer ${res.body.token}` };
}
async function provider() {
  const user = await register({ role: 'seller' });
  await pool.query(
    `UPDATE users SET id_verified='approved', seller_type='showroom', business_verified=TRUE WHERE id=$1`,
    [user.id]
  );
  return { ...user, auth: { Authorization: `Bearer ${user.token}` } };
}
async function proposedCar(owner) {
  const res = await api().post('/rentals/propose').set(owner.auth).send({
    title: '2019 Toyota RAV4', make: 'Toyota', model: 'RAV4', year: 2019,
    daily_rate: 55000, images: ['https://example.test/rav4.jpg'],
  }).expect(201);
  return res.body;
}
async function subscribe(admin, carId) {
  await api().post(`/rentals/${carId}/subscriptions`).set(admin)
    .send({ amount_rwf: 10000, starts_on: dayFrom(-1), ends_on: dayFrom(29), method: 'cash' }).expect(201);
}
const listed = async (carId) => (await api().get('/rentals').expect(200)).body.some((c) => c.id === carId);

let admin;
test.before(async () => { admin = await makeAdmin(); });
test.after(async () => { await pool.end(); });

// ── policy ──────────────────────────────────────────────────────────────────
test('policy: ten points, blocking vs disclosed, reasons and dates required', () => {
  assert.equal(ITEMS.length, 10);
  const today = kigaliToday();
  const ok = evaluateRentalCheck(checkBody(), today);
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.passed, true);
  assert.equal(ok.passed_count, 10);

  const brakes = evaluateRentalCheck(checkBody({ results: { ...allPass(), s2: { verdict: 'fail', note: 'Pulls left' } } }), today);
  assert.equal(brakes.passed, false);
  assert.deepEqual(brakes.failed_blocking.map((f) => f.id), ['s2']);

  const ac = evaluateRentalCheck(checkBody({ results: { ...allPass(), a1: { verdict: 'fail', note: 'AC weak' } } }), today);
  assert.equal(ac.passed, true, 'an as-advertised point does not block');
  assert.deepEqual(disclosures(ac.results), [{ id: 'a1', label: ITEMS.find((i) => i.id === 'a1').label, note: 'AC weak' }]);

  assert.ok(evaluateRentalCheck(checkBody({ results: { ...allPass(), s1: { verdict: 'fail' } } }), today).errors.length, 'a fail needs a reason');
  assert.ok(evaluateRentalCheck(checkBody({ results: { s1: { verdict: 'pass' } } }), today).errors.length, 'every point needs a verdict');
  assert.ok(evaluateRentalCheck(checkBody({ insurance_expires_on: dayFrom(-1) }), today).errors.length, 'expired insurance cannot pass');
  assert.ok(evaluateRentalCheck(checkBody({ technical_control_expires_on: '2026-02-30' }), today).errors.length);
  assert.ok(evaluateRentalCheck(checkBody({ odometer_km: -5 }), today).errors.length);
  assert.ok(evaluateRentalCheck(checkBody({ results: { ...allPass(), x9: { verdict: 'pass' } } }), today).errors.length);
});

test('the definition is public', async () => {
  const res = await api().get('/rentals/check-definition').expect(200);
  assert.equal(res.body.item_count, 10);
  assert.equal(res.body.items.filter((i) => i.blocking).length, 8);
});

// ── provider path ───────────────────────────────────────────────────────────
test('a provider adds a car without an inspection, which requests a check; nothing is public until it passes', async () => {
  const owner = await provider();
  const car = await proposedCar(owner);
  assert.equal(car.status, 'pending_review');
  assert.ok(car.check_requested_at, 'adding a car without an inspection asks for a check');
  assert.match(car.message, /Rental Check/);

  const mine = await api().get('/rentals/mine').set(owner.auth).expect(200);
  assert.equal(mine.body.find((c) => c.id === car.id).check_status, 'requested');

  await subscribe(admin, car.id);
  // Cannot be activated with no evidence.
  const refused = await api().patch(`/rentals/${car.id}`).set(admin).send({ status: 'active' }).expect(409);
  assert.equal(refused.body.code, 'RENTAL_CHECK_REQUIRED');

  const recorded = await api().post(`/rentals/${car.id}/checks`).set(admin).send(checkBody({ notes: 'Spare tyre new' })).expect(201);
  assert.equal(recorded.body.passed, true);
  assert.ok(recorded.body.warnings.some((w) => /Active/.test(w)));

  await api().patch(`/rentals/${car.id}`).set(admin).send({ status: 'active' }).expect(200);
  assert.equal(await listed(car.id), true);

  const detail = await api().get(`/rentals/${car.id}`).expect(200);
  assert.equal(detail.body.rental_check.kind, 'rental_check');
  assert.equal(detail.body.rental_check.passed_count, 10);
  assert.equal(detail.body.rental_check.insurance_valid_until, dayFrom(200));
  assert.equal(detail.body.rental_check.failed, undefined, 'renters never get the failed list');
  assert.equal(detail.body.check_results, undefined);
  assert.equal(detail.body.check_requested_at, undefined);
  assert.equal(detail.body.mileage, 84210, 'the odometer Sawa saw becomes the listed mileage');

  // The provider is told, and the request is answered.
  const note = await pool.query(
    "SELECT title FROM notifications WHERE user_id=$1 AND title='Rental Check passed'", [owner.id]
  );
  assert.equal(note.rowCount, 1);
  const after = await api().get('/rentals/mine').set(owner.auth).expect(200);
  assert.equal(after.body.find((c) => c.id === car.id).check_status, 'passed');
});

test('the latest check decides: a failed re-check hides a live car, voiding it brings the car back', async () => {
  const owner = await provider();
  const car = await proposedCar(owner);
  await subscribe(admin, car.id);
  await api().post(`/rentals/${car.id}/checks`).set(admin).send(checkBody()).expect(201);
  await api().patch(`/rentals/${car.id}`).set(admin).send({ status: 'active' }).expect(200);
  assert.equal(await listed(car.id), true);

  const failed = await api().post(`/rentals/${car.id}/checks`).set(admin)
    .send(checkBody({ results: { ...allPass(), s2: { verdict: 'fail', note: 'Handbrake does not hold' } } })).expect(201);
  assert.equal(failed.body.passed, false);
  assert.equal(await listed(car.id), false, 'a failed re-check takes it down with no status change');
  await api().get(`/rentals/${car.id}`).expect(404);
  // Nor can it be reached by inquiry.
  const renter = await register();
  await api().post(`/rentals/${car.id}/inquire`).set('Authorization', `Bearer ${renter.token}`)
    .send({ start_date: dayFrom(3), days: 2, acknowledge: true }).expect(404);

  const mine = await api().get('/rentals/mine').set(owner.auth).expect(200);
  const row = mine.body.find((c) => c.id === car.id);
  assert.equal(row.check_status, 'failed');
  assert.deepEqual(row.rental_check.failed.map((f) => f.id), ['s2'], 'the provider sees what to fix');

  await api().post(`/rentals/checks/${failed.body.id}/void`).set(admin).send({ reason: 'Recorded on the wrong car' }).expect(200);
  assert.equal(await listed(car.id), true, 'the previous passing check decides again');
});

test('a document expiring hides the car by itself; an as-advertised fail is disclosed', async () => {
  const owner = await provider();
  const car = await proposedCar(owner);
  await subscribe(admin, car.id);
  const recorded = await api().post(`/rentals/${car.id}/checks`).set(admin)
    .send(checkBody({ results: { ...allPass(), a1: { verdict: 'fail', note: 'Rear window stuck' } } })).expect(201);
  await api().patch(`/rentals/${car.id}`).set(admin).send({ status: 'active' }).expect(200);

  const detail = await api().get(`/rentals/${car.id}`).expect(200);
  assert.equal(detail.body.rental_check.passed_count, 9);
  assert.deepEqual(detail.body.rental_check.disclosures.map((d) => d.note), ['Rear window stuck']);

  // Time passes: the insurance date recorded at the check is now behind us.
  await pool.query('UPDATE rental_checks SET insurance_expires_on = $1::date WHERE id = $2', [dayFrom(-1), recorded.body.id]);
  assert.equal(await listed(car.id), false);
  const mine = await api().get('/rentals/mine').set(owner.auth).expect(200);
  assert.equal(mine.body.find((c) => c.id === car.id).check_status, 'expired');

  // A check over 12 months old counts as expired too.
  await pool.query(
    "UPDATE rental_checks SET insurance_expires_on = $1::date, checked_at = NOW() - INTERVAL '13 months' WHERE id = $2",
    [dayFrom(200), recorded.body.id]
  );
  assert.equal(await listed(car.id), false);

  // Warned 30 days ahead.
  await pool.query(
    'UPDATE rental_checks SET checked_at = NOW(), technical_control_expires_on = $1::date WHERE id = $2',
    [dayFrom(10), recorded.body.id]
  );
  assert.equal(await listed(car.id), true);
  const soon = await api().get('/rentals/mine').set(owner.auth).expect(200);
  assert.equal(soon.body.find((c) => c.id === car.id).check_status, 'expiring');
});

test('only staff record checks; only the owner requests one; history is owner-or-staff and hides staff notes', async () => {
  const owner = await provider();
  const other = await provider();
  const car = await proposedCar(owner);
  await api().post(`/rentals/${car.id}/checks`).set(owner.auth).send(checkBody()).expect(403);
  await api().post(`/rentals/${car.id}/checks`).set(admin).send(checkBody({ odometer_km: 'lots' })).expect(400);
  await api().post(`/rentals/${car.id}/checks`).set(admin).send(checkBody({ notes: 'Owner was late' })).expect(201);

  const history = await api().get(`/rentals/${car.id}/checks`).set(owner.auth).expect(200);
  assert.equal(history.body.length, 1);
  assert.equal(history.body[0].notes, undefined);
  const staffView = await api().get(`/rentals/${car.id}/checks`).set(admin).expect(200);
  assert.equal(staffView.body[0].notes, 'Owner was late');
  await api().get(`/rentals/${car.id}/checks`).set(other.auth).expect(403);

  await api().post(`/rentals/${car.id}/mine/request-check`).set(other.auth).expect(403);
  const first = await api().post(`/rentals/${car.id}/mine/request-check`).set(owner.auth).expect(201);
  const again = await api().post(`/rentals/${car.id}/mine/request-check`).set(owner.auth).expect(200);
  assert.equal(again.body.check_requested_at, first.body.check_requested_at, 'idempotent while open');
});

test('the rate card carries the check fee', async () => {
  const res = await api().get('/settings/rate-card').expect(200);
  assert.equal(res.body.rental_check_fee_rwf, 5000);
});
