// ─────────────────────────────────────────────────────────────────────────────
// Everything Sawa has ever recorded about one vehicle.
//
// This is the compounding asset. Two properties have to hold or it is worthless:
//
//   • the same car matches itself however its VIN was typed, and
//   • two DIFFERENT cars never merge, because putting another vehicle's faults
//     on this one's record is worse than having no history at all.
//
// The mileage series is the payoff. A reading that goes down is odometer
// tampering, and it is invisible to anyone who only ever sees the car once.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { REQUIRED_ITEM_IDS } = require('../src/lib/inspection-policy');
const { vinKey, describeVin, usableForHistory } = require('../src/lib/vin');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const checklist = () => Object.fromEntries(REQUIRED_ITEM_IDS.map((id) => [id, 'pass']));

let fixtureDay = 1200;
const nextDay = () => new Date(Date.now() + fixtureDay++ * 86400_000).toISOString().slice(0, 10);
const VIN = () => `JTDBZ29${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 9000 + 1000)}`;

async function register(overrides = {}) {
  const body = { name: 'History User', email: unique('history'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}
async function makeAdmin(user) {
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}
/** A completed walk-in on a given VIN, at a given odometer reading. */
async function inspect(admin, { vin, mileage, complete = true }) {
  const auth = { Authorization: `Bearer ${admin}` };
  const day = nextDay();
  await pool.query(
    "DELETE FROM inspections i WHERE lower(i.center)='nyarutarama center' AND i.scheduled_on=$1::date"
      + " AND NOT EXISTS (SELECT 1 FROM rental_cars rc WHERE rc.inspection_id = i.id)", [day]
  );
  const booked = await api().post('/inspections/standalone').set(auth).send({
    make: 'Toyota', model: 'Vitz', year: 2012, vin, mileage,
    center: 'Nyarutarama Center', scheduled_date: day, scheduled_time: '09:00 AM',
    customer: { name: 'Owner', email: unique('owner') },
  }).expect(201);
  if (complete) {
    await api().post(`/inspections/${booked.body.id}/start`).set(auth).expect(200);
    await api().post(`/inspections/${booked.body.id}/complete`).set(auth)
      .send({ checklist_results: checklist() }).expect(200);
  }
  return booked.body;
}

test.after(async () => { await pool.end(); });

// ─── The identifier ──────────────────────────────────────────────────────────

test('a chassis number is a vehicle identity, not a malformed VIN', () => {
  // Rwanda's fleet is largely Japanese imports. A rule demanding 17 characters
  // would refuse a large share of the actual national fleet, which would make
  // this feature unusable in the only market it is for.
  assert.equal(describeVin('NZE121-1234567').kind, 'chassis');
  assert.equal(usableForHistory('NZE121-1234567'), true);
  assert.equal(describeVin('4T1BF1FK5CU512345').kind, 'iso');

  // However it was typed, it is one car.
  assert.equal(vinKey('jtd bz29 3401 234567'), 'JTDBZ293401234567');
  assert.equal(vinKey('JTD-BZ29-3401-234567'), 'JTDBZ293401234567');
  assert.equal(vinKey('  '), null);
  assert.equal(vinKey(null), null);

  // Too short to identify a vehicle, so it must never join a history.
  assert.equal(usableForHistory('ABC12'), false);
  assert.equal(usableForHistory(''), false);
});

test('the database normalises the key, so no write path can forget to', async () => {
  const admin = await makeAdmin(await register());
  const messy = 'jtd bz29-3401 999888';
  const booked = await inspect(admin, { vin: messy, mileage: 120000, complete: false });
  const { rows } = await pool.query(
    'SELECT vehicle_vin, vehicle_vin_key FROM inspections WHERE id=$1', [booked.id]
  );
  assert.equal(rows[0].vehicle_vin, messy, 'what was typed is preserved');
  assert.equal(rows[0].vehicle_vin_key, 'JTDBZ293401999888', 'and normalised alongside it');
});

// ─── The history ─────────────────────────────────────────────────────────────

test('three inspections of one car become one history, however the VIN was typed', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const vin = VIN();

  await inspect(admin, { vin, mileage: 90000 });
  await inspect(admin, { vin: vin.toLowerCase(), mileage: 104000 });
  await inspect(admin, { vin: `${vin.slice(0, 8)}-${vin.slice(8)}`, mileage: 118000 });

  const history = await api().get(`/admin/vehicles/history?vin=${vin}`).set(auth).expect(200);
  assert.equal(history.body.summary.inspections, 3, 'all three must join on the normalised key');
  assert.equal(history.body.vin.kind, 'iso');
  assert.equal(history.body.summary.odometer_inconsistent, false);
  assert.deepEqual(history.body.inspections.map((e) => e.mileage), [90000, 104000, 118000]);
  assert.ok(history.body.summary.first_seen);
  assert.ok(history.body.summary.latest_score);

  // Every entry carries who inspected it and how long it took — the same
  // integrity signals, now visible across a vehicle's whole life.
  assert.ok(history.body.inspections.every((e) => typeof e.elapsed_minutes === 'number' || e.elapsed_minutes === null));
});

test('an odometer that goes backwards is reported as a fact for a human to chase', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const vin = VIN();

  await inspect(admin, { vin, mileage: 180000 });
  await inspect(admin, { vin, mileage: 96000 });

  const history = await api().get(`/admin/vehicles/history?vin=${vin}`).set(auth).expect(200);
  assert.equal(history.body.summary.odometer_inconsistent, true);
  // This is the thing no one-off inspection can ever see, and the reason a
  // history is worth more than the inspections that make it up.
});

test('two different cars never merge into one history', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const one = VIN();
  const other = VIN();

  await inspect(admin, { vin: one, mileage: 70000 });
  await inspect(admin, { vin: other, mileage: 70000 });

  const first = await api().get(`/admin/vehicles/history?vin=${one}`).set(auth).expect(200);
  assert.equal(first.body.summary.inspections, 1, 'one car, one record');
});

test('an unusable identifier is refused rather than joined on', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };

  // Joining on a short or empty value would put unrelated vehicles' faults onto
  // this car's record — worse than returning nothing.
  const short = await api().get('/admin/vehicles/history?vin=ABC12').set(auth).expect(400);
  assert.equal(short.body.code, 'VIN_NOT_USABLE');
  assert.match(short.body.error, /too short/i);
  await api().get('/admin/vehicles/history').set(auth).expect(400);
  await api().get('/admin/vehicles/history?vin=').set(auth).expect(400);

  // A VIN nobody has ever inspected is an empty history, not an error.
  const unknown = await api().get(`/admin/vehicles/history?vin=${VIN()}`).set(auth).expect(200);
  assert.equal(unknown.body.summary.inspections, 0);
  assert.deepEqual(unknown.body.listings, []);
});

test('the history is admin-only', async () => {
  const outsider = await register();
  await api().get(`/admin/vehicles/history?vin=${VIN()}`)
    .set('Authorization', `Bearer ${outsider.token}`).expect(403);
  await api().get(`/admin/vehicles/history?vin=${VIN()}`).expect(401);
});
