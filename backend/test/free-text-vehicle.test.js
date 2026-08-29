// ─────────────────────────────────────────────────────────────────────────────
// A vehicle the option list never heard of.
//
// The submission form offered ten makes as chips with no way past them, so an
// owner of a Peugeot, an Isuzu or a Daihatsu — all ordinary on Kigali roads —
// could not submit their car at all. The clients now let anyone type a make,
// fuel type or body type.
//
// That freedom rests entirely on the API and the database having no allowlist
// for these columns. They currently do not, and this file is what keeps it that
// way: if someone later adds a CHECK constraint or a validator "for data
// quality", these tests fail and the reason is in front of them, rather than a
// seller discovering it as a form that will not submit.
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
  const email = uniq('freetext');
  const r = await api().post('/auth/register')
    .send({ name, email, password: 'password123', role }).expect(201);
  return { id: r.body.user.id, email, password: 'password123', token: r.body.token };
}
async function admin() {
  const u = await register('Free Text Operator');
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [u.id]);
  const r = await api().post('/auth/login').send({ email: u.email, password: u.password }).expect(200);
  return { ...u, token: r.body.token };
}

// Deliberately none of them on any option list the app ships, and the last two
// are shapes a naive validator would reject outright.

/** A published-ready off-list vehicle with its inspected submission. */
async function publishablePeugeot(a) {
  const auth = { Authorization: `Bearer ${a.token}` };
  const seller = await register('Correction Seller', 'seller');
  await api().post(`/id-verification/${seller.id}/manual`).set(auth)
    .send({ method: 'in_person', note: 'National ID seen at the Kicukiro office.' }).expect(200);

  const vehicle = { make: 'Peugeot', model: '3008', year: 2019 };
  const intake = await api().post('/submissions/admin').set(auth)
    .send({ seller_id: seller.id, ...vehicle, mileage: 70000, asking_price: 14000000 });
  assert.equal(intake.status, 201, JSON.stringify(intake.body));

  const centreName = `Correction Centre ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  await api().post('/centers').set(auth)
    .send({ name: centreName, address: 'Kigali', daily_capacity: 20, active: true }).expect(201);
  const day = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  await api().patch(`/submissions/${intake.body.id}`).set(auth)
    .send({ status: 'scheduled', center: centreName, scheduled_date: day, scheduled_time: '10:00 AM' })
    .expect(200);

  const inspectionId = (await pool.query(
    'SELECT id FROM inspections WHERE submission_id = $1', [intake.body.id])).rows[0].id;
  await api().post(`/inspections/${inspectionId}/start`).set(auth).expect(200);
  await api().post(`/inspections/${inspectionId}/complete`).set(auth)
    .send({ checklist_results: allPass() }).expect(200);

  const car = await api().post('/cars').set(auth).send({
    seller_id: seller.id, title: '2019 Peugeot 3008', ...vehicle,
    mileage: 70000, price: 14000000, location: 'Kigali',
    submission_id: intake.body.id, inspection_id: inspectionId,
    images: ['https://example.test/a.jpg'],
  });
  assert.equal(car.status, 201, JSON.stringify(car.body));
  return { carId: car.body.id, submissionId: intake.body.id, sellerId: seller.id, inspectionId };
}

const OFF_LIST = [
  { make: 'Peugeot', model: '3008', fuel_type: 'Plug-in hybrid', body_type: 'Wagon' },
  { make: 'Isuzu', model: 'D-Max', fuel_type: 'Diesel', body_type: 'Pickup' },
  { make: 'Daihatsu', model: 'Terios', fuel_type: 'LPG', body_type: 'Minibus' },
  { make: 'BYD', model: 'Atto 3', fuel_type: 'Electric', body_type: 'Crossover' },
  { make: 'Mercedes-Benz', model: 'C-Class', fuel_type: 'Petrol', body_type: 'Saloon' },
  { make: 'MG', model: 'ZS', fuel_type: 'Petrol', body_type: 'SUV' },
];

test('a seller can submit any make, and it survives the round trip verbatim', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const seller = await register('Off List Seller', 'seller');

  for (const vehicle of OFF_LIST) {
    const created = await api().post('/submissions')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ ...vehicle, year: 2019, mileage: 70000, asking_price: 14000000 });
    assert.equal(created.status, 201, `${vehicle.make} ${vehicle.model}: ${JSON.stringify(created.body)}`);
    // Verbatim: not title-cased, not normalised, not coerced to a nearest match.
    // 'MG' must not come back as 'Mg' and 'Mercedes-Benz' must keep its hyphen.
    assert.equal(created.body.make, vehicle.make);
    assert.equal(created.body.model, vehicle.model);
    assert.equal(created.body.fuel_type, vehicle.fuel_type);
    assert.equal(created.body.body_type, vehicle.body_type);
  }

  // And the team can see them, which is where a typo is actually caught.
  const queue = await api().get('/submissions/admin/all?status=under_review').set(auth).expect(200);
  for (const vehicle of OFF_LIST) {
    assert.ok(queue.body.some((s) => s.make === vehicle.make && s.model === vehicle.model),
      `${vehicle.make} is in the review queue`);
  }
});

test('an off-list vehicle goes all the way to a public listing', async () => {
  // The end that matters. Accepting the submission is worthless if the make
  // cannot survive the inspection-evidence match, which compares make, model
  // and year between the submission and the car.
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const seller = await register('Peugeot Owner', 'seller');
  await api().post(`/id-verification/${seller.id}/manual`).set(auth)
    .send({ method: 'in_person', note: 'National ID seen at the Kicukiro office.' }).expect(200);

  const vehicle = { make: 'Peugeot', model: '3008', year: 2019 };
  const intake = await api().post('/submissions/admin').set(auth)
    .send({ seller_id: seller.id, ...vehicle, mileage: 70000, asking_price: 14000000,
            fuel_type: 'Plug-in hybrid', body_type: 'Wagon' });
  assert.equal(intake.status, 201, JSON.stringify(intake.body));

  const centreName = `Free Centre ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  await api().post('/centers').set(auth)
    .send({ name: centreName, address: 'Kigali', daily_capacity: 20, active: true }).expect(201);
  const day = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  await api().patch(`/submissions/${intake.body.id}`).set(auth)
    .send({ status: 'scheduled', center: centreName, scheduled_date: day, scheduled_time: '10:00 AM' })
    .expect(200);

  const inspectionId = (await pool.query(
    'SELECT id FROM inspections WHERE submission_id = $1', [intake.body.id])).rows[0].id;
  await api().post(`/inspections/${inspectionId}/start`).set(auth).expect(200);
  await api().post(`/inspections/${inspectionId}/complete`).set(auth)
    .send({ checklist_results: allPass() }).expect(200);

  const car = await api().post('/cars').set(auth).send({
    seller_id: seller.id, title: '2019 Peugeot 3008', ...vehicle,
    mileage: 70000, price: 14000000, location: 'Kigali',
    fuel_type: 'Plug-in hybrid', body_type: 'Wagon',
    submission_id: intake.body.id, inspection_id: inspectionId,
    images: ['https://example.test/a.jpg'],
  });
  assert.equal(car.status, 201, JSON.stringify(car.body));

  // The evidence match is case-insensitive on make and model, so an off-list
  // value is no harder to match than 'Toyota'.
  const readiness = await api().get(`/cars/${car.body.id}/readiness`).set(auth).expect(200);
  assert.equal(readiness.body.ready, true, `not ready: ${JSON.stringify(readiness.body.missing)}`);

  await api().patch(`/cars/${car.body.id}/status`).set(auth).send({ status: 'approved' }).expect(200);
  await api().patch(`/cars/${car.body.id}/status`).set(auth).send({ status: 'live' }).expect(200);

  const publicCar = await api().get(`/cars/${car.body.id}`).expect(200);
  assert.equal(publicCar.body.make, 'Peugeot');
  assert.equal(publicCar.body.body_type, 'Wagon');
  assert.equal(publicCar.body.status, 'live');

  // And it is findable by that make, or the listing exists and cannot be found.
  const byMake = await api().get('/cars?make=Peugeot').expect(200);
  assert.ok(byMake.body.some((c) => c.id === car.body.id), 'filterable by its real make');
  // `q` is the free-text box, and it covers make — so a typed-in brand is
  // searchable, not just filterable. (The param is `q`; an unrecognised name
  // like `search` is silently ignored and returns everything.)
  const search = await api().get('/cars?q=Peugeot').expect(200);
  assert.ok(search.body.some((c) => c.id === car.body.id), 'and reachable by the search box');
  const twoTerms = await api().get('/cars?q=Peugeot%20Wagon').expect(200);
  assert.ok(twoTerms.body.some((c) => c.id === car.body.id),
    'including across make and an off-list body type together');
});

// ─── Correcting what the vehicle is ─────────────────────────────────────────
//
// publicationReadiness refuses to publish a car whose make, model or year
// differs from the submission that was inspected — which is what stops one
// car's 150-point pass being used to publish a different car. But the forms let
// an admin retype those three on the listing alone, so fixing a typo or adding
// a trim level silently broke the binding, and the only sign was a 409 at
// publication whose fix lived in a record the page never showed.
//
// The listing route now refuses the edit outright, and corrections go through
// one transaction that moves the listing and its submission together.

test('retyping the vehicle on the listing alone is refused, with somewhere to go', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const { carId } = await publishablePeugeot(a);

  for (const body of [{ make: 'Renault' }, { model: '5008' }, { year: 2020 },
                      { make: 'Renault', model: '5008', year: 2020 }]) {
    const res = await api().patch(`/cars/${carId}`).set(auth).send(body);
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.equal(res.body.code, 'USE_VEHICLE_IDENTITY_ROUTE');
    assert.deepEqual(res.body.fields.sort(), Object.keys(body).sort());
  }
  // Read from the database, not GET /cars/:id — that is the PUBLIC route and an
  // under_review car is correctly invisible there.
  const unchanged = (await pool.query('SELECT make, model, year FROM cars WHERE id=$1', [carId])).rows[0];
  assert.equal(unchanged.make, 'Peugeot', 'and nothing was written');
  assert.equal(unchanged.model, '3008');
  assert.equal(Number(unchanged.year), 2019);

  // Ordinary listing copy still saves in the same request shape as before.
  await api().patch(`/cars/${carId}`).set(auth)
    .send({ price: 13500000, location: 'Musanze' }).expect(200);
});

test('a correction moves the listing and its evidence together, and stays publishable', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const { carId, submissionId } = await publishablePeugeot(a);

  const res = await api().patch(`/cars/${carId}/vehicle-identity`).set(auth)
    .send({ make: 'Peugeot', model: '3008 GT Line', year: 2019, reason: 'Trim level was missing from the intake.' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.readiness.ready, true, 'the whole point: still publishable');
  assert.equal(res.body.submissions, 1, 'the evidence was updated too');

  const car = (await pool.query('SELECT make, model, year FROM cars WHERE id=$1', [carId])).rows[0];
  const sub = (await pool.query('SELECT make, model, year FROM submissions WHERE id=$1', [submissionId])).rows[0];
  assert.deepEqual(
    { make: car.make, model: car.model, year: Number(car.year) },
    { make: sub.make, model: sub.model, year: Number(sub.year) },
    'listing and evidence agree — which is the invariant, held by construction');
  assert.equal(car.model, '3008 GT Line');

  // And it can still be published afterwards, which is what the admin was
  // actually trying to do when they got stuck.
  await api().patch(`/cars/${carId}/status`).set(auth).send({ status: 'approved' }).expect(200);
  await api().patch(`/cars/${carId}/status`).set(auth).send({ status: 'live' }).expect(200);
  assert.equal((await api().get(`/cars/${carId}`).expect(200)).body.model, '3008 GT Line');

  const { rows } = await pool.query(
    "SELECT metadata FROM admin_audit_log WHERE target_id=$1 AND action='listing.vehicle_identity_corrected'", [carId]);
  assert.equal(rows.length, 1, 'a correction is on the record');
  assert.equal(rows[0].metadata.from.model, '3008');
  assert.equal(rows[0].metadata.to.model, '3008 GT Line');
  assert.match(rows[0].metadata.reason, /trim level/i);
});

test('a correction needs a reason, a valid year, and an administrator', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const { carId } = await publishablePeugeot(a);

  for (const [body, field] of [
    [{ make: '', model: '3008', year: 2019, reason: 'typo fix' }, 'make'],
    [{ make: 'Peugeot', model: '', year: 2019, reason: 'typo fix' }, 'model'],
    [{ make: 'Peugeot', model: '3008', year: 1800, reason: 'typo fix' }, 'year'],
    [{ make: 'Peugeot', model: '3008', year: 'soon', reason: 'typo fix' }, 'year'],
    [{ make: 'Peugeot', model: '3008', year: 2019 }, 'reason'],
    [{ make: 'Peugeot', model: '3008', year: 2019, reason: 'x' }, 'reason'],
  ]) {
    const res = await api().patch(`/cars/${carId}/vehicle-identity`).set(auth).send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.field, field);
  }

  const outsider = await register('Outsider');
  await api().patch(`/cars/${carId}/vehicle-identity`)
    .set('Authorization', `Bearer ${outsider.token}`)
    .send({ make: 'Peugeot', model: '3008', year: 2019, reason: 'not mine to change' }).expect(403);
  await api().patch(`/cars/${carId}/vehicle-identity`)
    .send({ make: 'Peugeot', model: '3008', year: 2019, reason: 'not mine to change' }).expect(401);

  assert.equal((await pool.query('SELECT model FROM cars WHERE id=$1', [carId])).rows[0].model, '3008');
});

test('nothing in the schema constrains these columns to a fixed vocabulary', async () => {
  // Asked of the database directly. A CHECK added later "for data quality" would
  // reintroduce the exact wall this work removed, so the absence is asserted
  // rather than assumed.
  const { rows } = await pool.query(
    `SELECT c.conname, pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname IN ('cars', 'submissions', 'rental_cars')
        AND c.contype = 'c'`
  );
  const offenders = rows.filter((r) =>
    /\b(make|model|fuel_type|body_type|category)\b/.test(r.def));
  assert.deepEqual(offenders.map((r) => r.conname), [],
    'a CHECK on make/model/fuel_type/body_type would stop a seller submitting an '
    + 'ordinary car the list does not happen to name. Widen the UI list instead.');
});

test.after(async () => { await pool.end(); });
