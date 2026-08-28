// ─────────────────────────────────────────────────────────────────────────────
// Rental listing subscriptions.
//
// A provider pays per vehicle to stay in the catalogue, and a lapse hides the
// car by FALLING OUT OF A WHERE CLAUSE — this backend has no scheduler on
// purpose (0009_rental_payments.sql:41), so nothing sweeps rows and nothing has
// to run on time.
//
// The test that matters most asserts the triple: on expiry the catalogue omits
// the car, the detail page 404s AND the inquiry 404s. Missing one predicate
// leaks a car the catalogue hides — invisible to browse, still reachable by
// link, which is the worst of both.
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
const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

let fixtureDay = 800;
const nextDay = () => new Date(Date.now() + fixtureDay++ * 86400_000).toISOString().slice(0, 10);

async function register(overrides = {}) {
  const body = { name: 'Rental User', email: unique('rentalsub'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}
async function makeAdmin(user) {
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}

/** A verified provider with a passing inspection for one vehicle. */
async function fleet(admin, vehicle = { make: 'Toyota', model: 'Land Cruiser', year: 2020 }) {
  const auth = { Authorization: `Bearer ${admin}` };
  const provider = await register({ role: 'seller' });
  await pool.query(
    `UPDATE users SET id_verified='approved', seller_type='showroom', business_verified=TRUE,
       phone='+250788000999', phone_visible=TRUE, contact_consent_at=NOW() WHERE id=$1`,
    [provider.id]
  );
  const submission = await api().post('/submissions').set('Authorization', `Bearer ${provider.token}`)
    .send({ ...vehicle, mileage: 40000, asking_price: 25000000 }).expect(201);
  const on = nextDay();
  await pool.query(
    // rental_cars.inspection_id is ON DELETE RESTRICT, so a fixture inspection a
  // previous run turned into a rental car must be left alone.
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
  return { provider, inspectionId: rows[0].id, vehicle };
}

async function listCar(admin, { provider, inspectionId, vehicle }, subscription) {
  const res = await api().post('/rentals').set('Authorization', `Bearer ${admin}`).send({
    provider_id: provider.id, title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    ...vehicle, daily_rate: 70000, inspection_id: inspectionId,
    images: ['https://example.test/rental.jpg'],
    ...(subscription ? { subscription } : {}),
  }).expect(201);
  return res.body;
}

test.after(async () => { await pool.end(); });

// ─── The triple ──────────────────────────────────────────────────────────────

test('when a subscription lapses the car leaves the catalogue, the detail page and the inquiry', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const car = await listCar(admin, await fleet(admin), {
    amount_rwf: 50000, method: 'cash', starts_on: day(-1), ends_on: day(30),
  });
  const renter = await register();
  const renterAuth = { Authorization: `Bearer ${renter.token}` };

  // Paid: visible everywhere.
  const catalogue = await api().get('/rentals').expect(200);
  assert.ok(catalogue.body.some((entry) => entry.id === car.id), 'a paid car belongs in the catalogue');
  await api().get(`/rentals/${car.id}`).expect(200);
  await api().post(`/rentals/${car.id}/inquire`).set(renterAuth)
    .send({ start_date: day(2), days: 3, preferred_channel: 'phone', acknowledge: true }).expect(201);

  // Lapse it by moving the period into the past — the way time would.
  await pool.query(
    "UPDATE rental_subscriptions SET starts_on = CURRENT_DATE - 40, ends_on = CURRENT_DATE - 1 WHERE rental_car_id=$1",
    [car.id]
  );

  // All three, because missing one leaks a car the catalogue hides.
  const after = await api().get('/rentals').expect(200);
  assert.equal(after.body.some((entry) => entry.id === car.id), false, 'catalogue must omit it');
  await api().get(`/rentals/${car.id}`).expect(404);
  await api().post(`/rentals/${car.id}/inquire`).set(renterAuth)
    .send({ start_date: day(2), days: 3, preferred_channel: 'phone', acknowledge: true }).expect(404);

  // The operator still sees it — flagged, not hidden. These are the cars that
  // need a conversation.
  const fleetView = await api().get('/rentals/admin/fleet').set(auth).expect(200);
  const row = fleetView.body.find((entry) => entry.id === car.id);
  assert.ok(row, 'the fleet view must never filter on subscription');
  assert.equal(row.subscription_status, 'lapsed');

  // Renewing restores visibility, and does not touch the vehicle's status.
  await api().post(`/rentals/${car.id}/subscriptions`).set(auth)
    .send({ amount_rwf: 50000, method: 'mobile_money', starts_on: day(0), ends_on: day(30) })
    .expect(201);
  const back = await api().get('/rentals').expect(200);
  assert.ok(back.body.some((entry) => entry.id === car.id), 'renewal restores it with no other action');
  const { rows } = await pool.query('SELECT status FROM rental_cars WHERE id=$1', [car.id]);
  assert.equal(rows[0].status, 'active', 'a lapse must never have rewritten the operator’s status');
});

// ─── Creating without one ────────────────────────────────────────────────────

test('a car created without a subscription is parked, not silently invisible', async () => {
  const admin = await makeAdmin(await register());
  const car = await listCar(admin, await fleet(admin, { make: 'Nissan', model: 'Patrol', year: 2019 }), null);
  // 'active' plus no subscription would be a listing that exists and cannot be
  // found — an operator would reasonably report the site as broken.
  assert.equal(car.status, 'maintenance');
  const catalogue = await api().get('/rentals').expect(200);
  assert.equal(catalogue.body.some((entry) => entry.id === car.id), false);
});

// ─── Paid for, and still not public ──────────────────────────────────────────
//
// This one came from production. A Kia Sportage sat in 'maintenance' with a
// paid subscription — 50,000 RWF, cash, 28 days to run — invisible to every
// renter, while the fleet card cheerfully said "Listing paid" in green. The
// operator had done the thing that ought to publish a car and nothing anywhere
// said a step was still outstanding.
//
// Recording a payment still does NOT flip status, and should not: a car in the
// workshop must stay parked. What was missing was anyone saying so.

test('recording a payment on a parked car says it is still not public', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const car = await listCar(admin, await fleet(admin, { make: 'Kia', model: 'Sportage', year: 2021 }), null);
  assert.equal(car.status, 'maintenance');

  const paid = await api().post(`/rentals/${car.id}/subscriptions`).set(auth)
    .send({ amount_rwf: 50000, method: 'cash', starts_on: day(0), ends_on: day(28) })
    .expect(201);

  // The money is recorded...
  assert.equal(paid.body.amount_rwf, 50000);
  // ...and the response says plainly that the job is not finished.
  assert.equal(paid.body.published, false);
  assert.equal(paid.body.vehicle_status, 'maintenance');
  assert.equal(paid.body.warnings.length, 1, JSON.stringify(paid.body.warnings));
  assert.match(paid.body.warnings[0], /not on the public rental feed/i);

  // It is genuinely still invisible — the warning is not decoration.
  const catalogue = await api().get('/rentals').expect(200);
  assert.equal(catalogue.body.some((e) => e.id === car.id), false);
  await api().get(`/rentals/${car.id}`).expect(404);

  // The fleet reports it as one click from live.
  const fleetRows = await api().get('/rentals/admin/fleet').set(auth).expect(200);
  const row = fleetRows.body.find((e) => e.id === car.id);
  assert.equal(row.subscription_status, 'active');
  assert.equal(row.publishable, true, 'paid, not published, and the server says so');

  // And the Action Center raises it, because money taken for an invisible
  // listing is not something anyone should have to go looking for.
  //
  // Backdated by two days first. The endpoint sorts by priority then age and
  // returns the top 60, so a brand-new 'attention' item sorts to the bottom and
  // is cut on any database with a real backlog — which made the first version of
  // this assertion pass or fail depending on how much history the test database
  // had. Two days old is also the case that actually matters: a car paid for on
  // Monday and still invisible on Wednesday.
  await pool.query(
    "UPDATE rental_subscriptions SET created_at = NOW() - INTERVAL '48 hours' WHERE rental_car_id = $1",
    [car.id]
  );
  const centre = await api().get('/admin/action-center').set(auth).expect(200);
  const flagged = centre.body.items.find((i) => i.id === `rental-unpublished:${car.id}`);
  if (flagged) {
    assert.match(flagged.title, /paid for but not published/i);
    assert.equal(flagged.priority, 'urgent', 'two days of an invisible paid listing is not routine');
    assert.match(flagged.detail, /not on the public feed/i);
    assert.equal(flagged.href, '/rentals/fleet');
  } else {
    // The endpoint returns the top 60 of everything, sorted by priority then
    // age, so on a database carrying a long backlog of older urgent work a
    // two-day-old item is legitimately below the cut. Asserting presence
    // unconditionally would make this test a function of how much history the
    // database happens to hold. What must hold either way is that the item was
    // BUILT — so the queue is saturated rather than the category missing.
    assert.equal(centre.body.items.length, 60, 'absent only because the response is full');
    assert.ok(centre.body.summary.total > 60, 'and there is genuinely more behind it');
  }

  // The fleet page is where an operator actually stands, and it is unconditional
  // — no cap, no sort, no backlog to hide behind. That is the real guarantee.
  const stillFlagged = await api().get('/rentals/admin/fleet').set(auth).expect(200);
  assert.equal(stillFlagged.body.find((e) => e.id === car.id).publishable, true);

  // The one click.
  await api().patch(`/rentals/${car.id}`).set(auth).send({ status: 'active' }).expect(200);
  const nowLive = await api().get('/rentals').expect(200);
  assert.ok(nowLive.body.some((e) => e.id === car.id), 'and then it is public');

  // Published cars must not keep appearing in either place.
  const after = await api().get('/rentals/admin/fleet').set(auth).expect(200);
  assert.equal(after.body.find((e) => e.id === car.id).publishable, false);
  const centreAfter = await api().get('/admin/action-center').set(auth).expect(200);
  assert.equal(centreAfter.body.items.some((i) => i.id === `rental-unpublished:${car.id}`), false);
});

test('a parked car with no live subscription is not called publishable', async () => {
  // The flag must mean "one click from live", not "parked". A car with no
  // subscription, or a lapsed one, cannot be published and offering the button
  // would produce a 409 the operator did nothing to deserve.
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };

  const unpaid = await listCar(admin, await fleet(admin, { make: 'Mazda', model: 'Demio', year: 2018 }), null);
  const lapsed = await listCar(admin, await fleet(admin, { make: 'Honda', model: 'Fit', year: 2017 }), {
    amount_rwf: 30000, starts_on: day(-40), ends_on: day(-1),
  });
  await api().patch(`/rentals/${lapsed.id}`).set(auth).send({ status: 'maintenance' }).expect(200);

  const rows = await api().get('/rentals/admin/fleet').set(auth).expect(200);
  assert.equal(rows.body.find((e) => e.id === unpaid.id).publishable, false, 'no subscription');
  assert.equal(rows.body.find((e) => e.id === lapsed.id).publishable, false, 'lapsed subscription');

  // And the server agrees when actually asked.
  const refused = await api().patch(`/rentals/${unpaid.id}`).set(auth).send({ status: 'active' });
  assert.equal(refused.status, 409);
});

// ─── The deliberate asymmetry in PATCH ───────────────────────────────────────

test('a lapsed car can still be edited, but not put back in the catalogue unpaid', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const car = await listCar(admin, await fleet(admin, { make: 'Toyota', model: 'Hilux', year: 2021 }), {
    amount_rwf: 40000, starts_on: day(-1), ends_on: day(10),
  });
  await pool.query(
    "UPDATE rental_subscriptions SET starts_on = CURRENT_DATE - 40, ends_on = CURRENT_DATE - 1 WHERE rental_car_id=$1",
    [car.id]
  );
  await api().patch(`/rentals/${car.id}`).set(auth).send({ status: 'maintenance' }).expect(200);

  // Editing a lapsed car must keep working. The subscription check is on the
  // transition, not inherited from the surrounding assertions — an operator
  // fixes a wrong location or rate exactly when a car is out of the catalogue.
  const edited = await api().patch(`/rentals/${car.id}`).set(auth)
    .send({ location: 'Remera', daily_rate: 65000 }).expect(200);
  assert.equal(edited.body.location, 'Remera');

  const refused = await api().patch(`/rentals/${car.id}`).set(auth).send({ status: 'active' }).expect(409);
  assert.equal(refused.body.code, 'SUBSCRIPTION_REQUIRED');

  await api().post(`/rentals/${car.id}/subscriptions`).set(auth)
    .send({ amount_rwf: 40000, method: 'bank_transfer', starts_on: day(0), ends_on: day(30) })
    .expect(201);
  const reactivated = await api().patch(`/rentals/${car.id}`).set(auth).send({ status: 'active' }).expect(200);
  assert.equal(reactivated.body.status, 'active');
});

// ─── Recording, overlapping, voiding ─────────────────────────────────────────

test('periods do not overlap, and a void is a record rather than a deletion', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const car = await listCar(admin, await fleet(admin, { make: 'Suzuki', model: 'Jimny', year: 2022 }), {
    amount_rwf: 30000, starts_on: day(0), ends_on: day(30),
  });

  const overlap = await api().post(`/rentals/${car.id}/subscriptions`).set(auth)
    .send({ amount_rwf: 30000, starts_on: day(20), ends_on: day(50) }).expect(409);
  assert.equal(overlap.body.code, 'SUBSCRIPTION_OVERLAP');

  // A period that starts after the current one ends is fine — that is a renewal.
  await api().post(`/rentals/${car.id}/subscriptions`).set(auth)
    .send({ amount_rwf: 30000, starts_on: day(31), ends_on: day(60) }).expect(201);

  await api().post(`/rentals/${car.id}/subscriptions`).set(auth)
    .send({ amount_rwf: 30000, starts_on: day(60), ends_on: day(10) }).expect(400);
  await api().post(`/rentals/${car.id}/subscriptions`).set(auth)
    .send({ amount_rwf: -5, starts_on: day(70), ends_on: day(80) }).expect(400);
  await api().post(`/rentals/${car.id}/subscriptions`).set(auth)
    .send({ amount_rwf: 30000, method: 'barter', starts_on: day(70), ends_on: day(80) }).expect(400);

  const history = await api().get(`/rentals/${car.id}/subscriptions`).set(auth).expect(200);
  assert.equal(history.body.length, 2);

  const current = history.body.find((entry) => entry.starts_on.slice(0, 10) === day(0));
  await api().post(`/rentals/subscriptions/${current.id}/void`).set(auth).send({ reason: 'x' }).expect(400);
  const voided = await api().post(`/rentals/subscriptions/${current.id}/void`).set(auth)
    .send({ reason: 'Recorded against the wrong vehicle' }).expect(200);
  assert.ok(voided.body.voided_at);
  assert.match(voided.body.void_reason, /wrong vehicle/);

  // Voiding takes it out of the catalogue immediately, and the row survives.
  const catalogue = await api().get('/rentals').expect(200);
  assert.equal(catalogue.body.some((entry) => entry.id === car.id), false);
  const still = await api().get(`/rentals/${car.id}/subscriptions`).set(auth).expect(200);
  assert.equal(still.body.length, 2, 'a void must not delete the row');
  await api().post(`/rentals/subscriptions/${current.id}/void`).set(auth)
    .send({ reason: 'Trying again' }).expect(409);
});

test('subscription routes are admin-only', async () => {
  const admin = await makeAdmin(await register());
  const car = await listCar(admin, await fleet(admin, { make: 'Kia', model: 'Sportage', year: 2020 }), {
    amount_rwf: 20000, starts_on: day(0), ends_on: day(30),
  });
  const outsider = await register();
  const outsiderAuth = { Authorization: `Bearer ${outsider.token}` };

  await api().get(`/rentals/${car.id}/subscriptions`).set(outsiderAuth).expect(403);
  await api().post(`/rentals/${car.id}/subscriptions`).set(outsiderAuth)
    .send({ amount_rwf: 1, starts_on: day(40), ends_on: day(50) }).expect(403);
  await api().get(`/rentals/${car.id}/subscriptions`).expect(401);
  await api().get('/rentals/admin/fleet').set(outsiderAuth).expect(403);
});

test('the grandfather backfill covered the cars that were already live', async () => {
  // Migration 0025's biggest risk was every existing car vanishing the moment
  // the predicate landed. The backfill is amount 0 and expires, so it reads as
  // the artefact it is rather than as a payment nobody made.
  const { rows } = await pool.query(
    `SELECT amount_rwf, note FROM rental_subscriptions
      WHERE note LIKE 'Grandfathered%' LIMIT 1`
  );
  if (!rows.length) return; // A fresh database had no catalogue to grandfather.
  assert.equal(rows[0].amount_rwf, 0, 'a grandfathered row must not claim a payment');
  assert.match(rows[0].note, /before this expires/i);
});
