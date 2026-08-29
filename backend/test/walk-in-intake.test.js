// ─────────────────────────────────────────────────────────────────────────────
// Somebody drives to the office with a car.
//
// They have never used the app, have no account, and are standing at the desk.
// The admin intake required an existing seller_id, so the operator had to leave
// the form, create an account somewhere else, and come back — with a customer
// waiting. This file is that path working in one step.
//
// The thing worth testing hardest is that convenience did not become a way in:
// the account is created with NO password, so nothing can be signed into until
// the person follows the emailed link themselves, and an email that already
// belongs to somebody is refused rather than reused.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { ALL_ITEMS } = require('../src/lib/inspection-policy');

const api = () => request(app);
const uniq = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e9)}@test.local`;
const allPass = () => Object.fromEntries(ALL_ITEMS.map((i) => [i.id, 'pass']));

async function register(name, role = 'buyer') {
  const email = uniq('walkin');
  const r = await api().post('/auth/register')
    .send({ name, email, password: 'password123', role }).expect(201);
  return { id: r.body.user.id, email, password: 'password123', token: r.body.token };
}
async function admin() {
  const u = await register('Front Desk');
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [u.id]);
  const r = await api().post('/auth/login').send({ email: u.email, password: u.password }).expect(200);
  return { ...u, token: r.body.token };
}
const VEHICLE = { make: 'Suzuki', model: 'Escudo', year: 2016 };

test('a walk-in with no account can have their car taken in, in one step', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const email = uniq('drove-in');

  const res = await api().post('/submissions/admin').set(auth).send({
    seller: { name: 'Jean Bosco', email, phone: '+250788000111' },
    purpose: 'sale', ...VEHICLE, mileage: 96000, asking_price: 11000000,
    notes: 'Walked into the Kicukiro office.',
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.seller_created, true);
  assert.equal(res.body.seller.email, email);
  assert.equal(res.body.make, 'Suzuki');

  const account = (await pool.query(
    `SELECT role, seller_type, password_hash, admin_created, id_verified, account_status,
            invite_token_hash, invite_expires_at
       FROM users WHERE email = $1`, [email])).rows[0];
  assert.ok(account, 'the account exists');
  assert.equal(account.role, 'seller');
  assert.equal(account.seller_type, 'individual');
  assert.equal(account.admin_created, true);

  // The load-bearing assertions. A NULL password_hash is what actually blocks
  // login, and the verification is not granted just because a person turned up.
  assert.equal(account.password_hash, null, 'no password exists, so nothing can sign in yet');
  assert.equal(account.id_verified, 'none', 'turning up is not an identity check');
  assert.ok(account.invite_token_hash, 'they have a way in, once they use the emailed link');
  assert.ok(new Date(account.invite_expires_at) > new Date(), 'and it has not already expired');

  // Nobody can sign in as them in the meantime.
  await api().post('/auth/login').send({ email, password: 'password123' }).expect(401);
});

test('the car then follows the ordinary route, all the way to live', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const email = uniq('drove-in-2');

  const intake = await api().post('/submissions/admin').set(auth).send({
    seller: { name: 'Aline U.', email }, purpose: 'sale', ...VEHICLE,
    mileage: 96000, asking_price: 11000000,
  }).expect(201);
  const sellerId = intake.body.seller.id;

  // The identity check still has to happen — the walk-in shortcut does not skip
  // it, it just means the person did not have to install anything first.
  await api().post(`/id-verification/${sellerId}/manual`).set(auth)
    .send({ method: 'in_person', note: 'National ID inspected at the front desk.' }).expect(200);

  const centre = `WalkIn Centre ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  await api().post('/centers').set(auth)
    .send({ name: centre, address: 'Kigali', daily_capacity: 20, active: true }).expect(201);
  const day = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  await api().patch(`/submissions/${intake.body.id}`).set(auth)
    .send({ status: 'scheduled', center: centre, scheduled_date: day, scheduled_time: '09:00 AM' })
    .expect(200);

  const inspectionId = (await pool.query(
    'SELECT id FROM inspections WHERE submission_id = $1', [intake.body.id])).rows[0].id;
  await api().post(`/inspections/${inspectionId}/start`).set(auth).expect(200);
  await api().post(`/inspections/${inspectionId}/complete`).set(auth)
    .send({ checklist_results: allPass() }).expect(200);

  const car = await api().post('/cars').set(auth).send({
    seller_id: sellerId, title: '2016 Suzuki Escudo', ...VEHICLE,
    mileage: 96000, price: 11000000, location: 'Kigali',
    submission_id: intake.body.id, inspection_id: inspectionId,
    images: ['https://example.test/a.jpg'],
  });
  assert.equal(car.status, 201, JSON.stringify(car.body));

  const readiness = await api().get(`/cars/${car.body.id}/readiness`).set(auth).expect(200);
  assert.equal(readiness.body.ready, true, `not ready: ${JSON.stringify(readiness.body.missing)}`);
  await api().patch(`/cars/${car.body.id}/status`).set(auth).send({ status: 'approved' }).expect(200);
  await api().patch(`/cars/${car.body.id}/status`).set(auth).send({ status: 'live' }).expect(200);
  assert.equal((await api().get(`/cars/${car.body.id}`).expect(200)).body.make, 'Suzuki');
});

test('a walk-in can be taken in for the rental fleet, and is told what is missing', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };

  const res = await api().post('/submissions/admin').set(auth).send({
    seller: { name: 'Hirwa Rentals', email: uniq('renter') },
    purpose: 'rental', make: 'Toyota', model: 'Hiace', year: 2018,
  }).expect(201);
  assert.equal(res.body.purpose, 'rental');
  assert.equal(res.body.seller_created, true);
  // A brand-new individual is not business-verified, and holding rental stock
  // needs that. Said now, at the desk, rather than by POST /rentals three steps
  // later once the van is already in the workshop.
  assert.ok(res.body.warnings.some((w) => /business-verified/i.test(w)), JSON.stringify(res.body.warnings));
});

test('an email that already belongs to somebody is refused, not reused', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const existing = await register('Already Here', 'seller');

  const res = await api().post('/submissions/admin').set(auth).send({
    seller: { name: 'Someone Else', email: existing.email }, ...VEHICLE,
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'ACCOUNT_EXISTS');

  // And nothing was created — not a submission, and not a second account.
  const subs = await pool.query('SELECT COUNT(*)::int AS n FROM submissions WHERE seller_id = $1', [existing.id]);
  assert.equal(subs.rows[0].n, 0, 'the transaction rolled back');
  const dupes = await pool.query('SELECT COUNT(*)::int AS n FROM users WHERE email = $1', [existing.email]);
  assert.equal(dupes.rows[0].n, 1);
  // The existing person's name is untouched: an intake must not rename someone.
  const name = (await pool.query('SELECT name FROM users WHERE id=$1', [existing.id])).rows[0].name;
  assert.equal(name, 'Already Here');
});

test('the walk-in fields are validated, and the route stays admin-only', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };

  for (const [body, field] of [
    [{ ...VEHICLE }, 'seller_id'],
    [{ seller: { email: uniq('x') }, ...VEHICLE }, 'seller.name'],
    [{ seller: { name: 'No Email' }, ...VEHICLE }, 'seller.email'],
    [{ seller: { name: 'Bad Email', email: 'not-an-email' }, ...VEHICLE }, 'seller.email'],
    [{ seller: { name: 'Bad Email', email: 'a@b' }, ...VEHICLE }, 'seller.email'],
    [{ seller_id: 'abc', ...VEHICLE }, 'seller_id'],
  ]) {
    const res = await api().post('/submissions/admin').set(auth).send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.field, field, JSON.stringify(res.body));
  }

  const outsider = await register('Outsider');
  await api().post('/submissions/admin').set('Authorization', `Bearer ${outsider.token}`)
    .send({ seller: { name: 'Nope', email: uniq('nope') }, ...VEHICLE }).expect(403);
  await api().post('/submissions/admin')
    .send({ seller: { name: 'Nope', email: uniq('nope') }, ...VEHICLE }).expect(401);
});

test.after(async () => { await pool.end(); });
