// ─────────────────────────────────────────────────────────────────────────────
// How many cars a seller may hold on the marketplace.
//
// There was no cap of any kind before this: a verified showroom could publish
// without limit, and what actually bounded them was our own inspection
// capacity. That is a ceiling set by our costs rather than by the terms anybody
// agreed to, and it is not something the business can sell.
//
// The test that matters most here is the last one. Lowering a cap below a
// seller's current live count must NOT pull their cars down — doing that from a
// number field would delete a paying customer's shopfront in bulk, silently.
// They sit over cap, the Action Center says so, and only the NEXT publish is
// refused.
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

async function register(name, role = 'buyer') {
  const email = unique('cap');
  const r = await api().post('/auth/register')
    .send({ name, email, password: 'password123', role }).expect(201);
  return { id: r.body.user.id, email, password: 'password123', token: r.body.token };
}

async function admin() {
  const u = await register('Cap Operator');
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [u.id]);
  const r = await api().post('/auth/login')
    .send({ email: u.email, password: u.password }).expect(200);
  return { ...u, token: r.body.token, auth: { Authorization: `Bearer ${r.body.token}` } };
}

/** A seller who is fully eligible to have listings published. */
async function seller(name = 'Cap Showroom') {
  const u = await register(name, 'seller');
  await pool.query(
    `UPDATE users SET id_verified='approved', account_status='active',
            seller_type='showroom', business_verified=TRUE WHERE id=$1`,
    [u.id]
  );
  return u;
}

// Every item passing. The cap is what is under test here, so the car has to
// clear the publication gate for real — a fixture that fails readiness would
// make every assertion below say LISTING_NOT_READY and prove nothing.
const ALL_PASS = Object.fromEntries(ALL_ITEMS.map((item) => [item.id, 'pass']));

/** A car with a submission and a passing sawa-150-v1 inspection behind it, so
 *  publicationReadiness() is genuinely satisfied. */
async function car(sellerId, status = 'approved') {
  const title = `Cap car ${Math.random().toString(36).slice(2, 8)}`;
  const VEHICLE = { make: 'Toyota', model: 'Corolla', year: 2020 };

  const { rows: [row] } = await pool.query(
    `INSERT INTO cars (seller_id, title, make, model, year, mileage, price, status, images, inspected, inspection_score)
     VALUES ($1, $2, $3, $4, $5, 40000, 15000000, $6, ARRAY['https://example.com/a.jpg'], TRUE, 150)
     RETURNING id, status`,
    [sellerId, title, VEHICLE.make, VEHICLE.model, VEHICLE.year, status]
  );

  // The evidence has to MATCH the car on seller, make, model and year — that
  // pairing is the publication invariant, not a formality.
  const { rows: [submission] } = await pool.query(
    `INSERT INTO submissions (car_id, seller_id, status, make, model, year, mileage, asking_price)
     VALUES ($1, $2, 'live', $3, $4, $5, 40000, 15000000) RETURNING id`,
    [row.id, sellerId, VEHICLE.make, VEHICLE.model, VEHICLE.year]
  );

  await pool.query(
    `INSERT INTO inspections
       (submission_id, car_id, center, status, checklist_results, checklist_version,
        score, passed, critical_failures, completed_at, scheduled_date)
     VALUES ($1, $2, 'Kigali', 'complete', $3::jsonb, $4, 150, TRUE, '[]'::jsonb, NOW(), CURRENT_DATE)`,
    [submission.id, row.id, JSON.stringify(ALL_PASS), CHECKLIST_VERSION]
  );

  return row;
}

const setCap = (a, userId, body) =>
  api().put(`/admin/users/${userId}/listing-cap`).set(a.auth).send(body);

test('with no cap set, a seller can be published without limit', async () => {
  const a = await admin();
  const s = await seller();
  const { rows } = await pool.query('SELECT max_active_listings FROM users WHERE id=$1', [s.id]);
  assert.equal(rows[0].max_active_listings, null, 'no cap is the default, as it was for everybody before');

  for (let i = 0; i < 3; i++) {
    const c = await car(s.id, 'live');
    assert.equal(c.status, 'live');
  }
});

test('a cap is recorded with an author and a date, because it is a commercial term', async () => {
  const a = await admin();
  const s = await seller();

  const res = await setCap(a, s.id, { max_active_listings: 5, note: 'Bronze plan, agreed 12 Aug' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.max_active_listings, 5);
  assert.equal(res.body.listing_cap_note, 'Bronze plan, agreed 12 Aug');

  const { rows } = await pool.query(
    'SELECT listing_cap_set_by, listing_cap_set_at FROM users WHERE id=$1', [s.id]);
  assert.equal(rows[0].listing_cap_set_by, a.id, 'the operator who set it is on the record');
  assert.ok(rows[0].listing_cap_set_at, 'and when');
});

test('a cap of zero is refused, and points at the control that actually means it', async () => {
  const a = await admin();
  const s = await seller();

  const zero = await setCap(a, s.id, { max_active_listings: 0 });
  assert.equal(zero.status, 400);
  assert.equal(zero.body.code, 'INVALID_LISTING_CAP');
  assert.match(zero.body.error, /suspend the account/i,
    'the operator is told where to say "stop publishing" so it is visible');

  assert.equal((await setCap(a, s.id, { max_active_listings: -3 })).status, 400);
  assert.equal((await setCap(a, s.id, { max_active_listings: 2.5 })).status, 400);
});

test('publication is refused once the seller is at their cap, and says what to do', async () => {
  const a = await admin();
  const s = await seller('At The Limit Motors');
  await setCap(a, s.id, { max_active_listings: 2 });

  await car(s.id, 'live');
  await car(s.id, 'live');
  const third = await car(s.id, 'approved');

  const res = await api().patch(`/cars/${third.id}/status`).set(a.auth).send({ status: 'live' });
  assert.equal(res.status, 409, JSON.stringify(res.body));
  assert.equal(res.body.code, 'SELLER_LISTING_CAP_REACHED');
  assert.equal(res.body.cap.limit, 2);
  assert.equal(res.body.cap.occupied, 2);
  assert.match(res.body.error, /pause or sell one/i);

  const after = await pool.query('SELECT status FROM cars WHERE id=$1', [third.id]);
  assert.equal(after.rows[0].status, 'approved', 'the refusal rolled back cleanly');
});

test('a paused car still occupies a slot — otherwise the cap is trivially avoidable', async () => {
  const a = await admin();
  const s = await seller('Pause Trick Motors');
  await setCap(a, s.id, { max_active_listings: 1 });

  const first = await car(s.id, 'live');
  await api().patch(`/cars/${first.id}/status`).set(a.auth).send({ status: 'paused' }).expect(200);

  const second = await car(s.id, 'approved');
  const res = await api().patch(`/cars/${second.id}/status`).set(a.auth).send({ status: 'live' });
  assert.equal(res.status, 409, 'pausing one car does not free the slot');
  assert.equal(res.body.code, 'SELLER_LISTING_CAP_REACHED');
});

test('selling or archiving frees a slot, and the next car publishes', async () => {
  const a = await admin();
  const s = await seller('Turnover Motors');
  await setCap(a, s.id, { max_active_listings: 1 });

  const first = await car(s.id, 'live');
  const second = await car(s.id, 'approved');

  assert.equal(
    (await api().patch(`/cars/${second.id}/status`).set(a.auth).send({ status: 'live' })).status,
    409, 'blocked while the first is live');

  await api().patch(`/cars/${first.id}/status`).set(a.auth).send({ status: 'sold' }).expect(200);

  const now = await api().patch(`/cars/${second.id}/status`).set(a.auth).send({ status: 'live' });
  assert.equal(now.status, 200, `a sold car releases its slot: ${JSON.stringify(now.body)}`);
});

test('a car already live can still be edited and moved around while over cap', async () => {
  const a = await admin();
  const s = await seller('Over Cap Motors');

  const cars = [await car(s.id, 'live'), await car(s.id, 'live'), await car(s.id, 'live')];
  await setCap(a, s.id, { max_active_listings: 1 });   // lowered under their feet

  // Pausing and re-publishing an ALREADY-occupied slot is not a new
  // publication, so the cap must not block an operator tidying up.
  await api().patch(`/cars/${cars[0].id}/status`).set(a.auth).send({ status: 'paused' }).expect(200);
  const back = await api().patch(`/cars/${cars[0].id}/status`).set(a.auth).send({ status: 'live' });
  assert.equal(back.status, 200,
    `moving a car between two occupied statuses is not a new publish: ${JSON.stringify(back.body)}`);

  const priced = await api().patch(`/cars/${cars[1].id}`).set(a.auth).send({ price: 14000000 });
  assert.equal(priced.status, 200, 'editing an over-cap seller\'s live car is exactly when it is needed');
});

test('LOWERING a cap below the current count never unpublishes anything', async () => {
  const a = await admin();
  const s = await seller('Shopfront Motors');

  const cars = [];
  for (let i = 0; i < 4; i++) cars.push(await car(s.id, 'live'));

  const res = await setCap(a, s.id, { max_active_listings: 1, note: 'Downgraded to Bronze' });
  assert.equal(res.status, 200, JSON.stringify(res.body));

  // The whole point.
  const live = await pool.query(
    "SELECT COUNT(*)::int AS n FROM cars WHERE seller_id=$1 AND status='live'", [s.id]);
  assert.equal(live.rows[0].n, 4, 'four cars were live before, and four are live after');

  // And the operator is told, rather than left to discover it.
  assert.equal(res.body.occupied, 4);
  assert.equal(res.body.over_by, 3);
  assert.match(res.body.warning, /Nothing has been unpublished/i);

  // The next publish is the one that is refused.
  const next = await car(s.id, 'approved');
  const blocked = await api().patch(`/cars/${next.id}/status`).set(a.auth).send({ status: 'live' });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.code, 'SELLER_LISTING_CAP_REACHED');

  // ...and the Action Center carries it, so it is not only in one HTTP response
  // that somebody may have closed.
  const centre = await api().get('/admin/action-center?kind=Seller').set(a.auth).expect(200);
  const row = centre.body.items.find((i) => i.id === `seller-over-cap:${s.id}`);
  assert.ok(row, 'an over-cap seller appears in the Action Center');
  assert.equal(row.kind, 'Seller');
  assert.equal(row.priority, 'attention', 'somebody has to choose; it will not clear itself');
  assert.match(row.detail, /3 over/);
  assert.match(row.detail, /Nothing was unpublished/i);

  // The filter narrows the list without hiding the size of the desk: an
  // operator working one queue must still see how much else is waiting.
  assert.deepEqual(centre.body.filtered_kinds, ['seller']);
  assert.ok(centre.body.summary.total >= centre.body.items.length);
  assert.ok(centre.body.kinds.includes('Seller'), 'the available kinds are advertised');
  for (const i of centre.body.items) assert.equal(i.kind, 'Seller');
});

test('removing a cap restores unlimited publishing', async () => {
  const a = await admin();
  const s = await seller('Uncapped Again Motors');
  await setCap(a, s.id, { max_active_listings: 1 });
  await car(s.id, 'live');

  const blocked = await car(s.id, 'approved');
  assert.equal(
    (await api().patch(`/cars/${blocked.id}/status`).set(a.auth).send({ status: 'live' })).status, 409);

  const cleared = await setCap(a, s.id, { max_active_listings: null });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.max_active_listings, null);
  assert.equal(cleared.body.listing_cap_note, null, 'the note goes with the cap it explained');

  const now = await api().patch(`/cars/${blocked.id}/status`).set(a.auth).send({ status: 'live' });
  assert.equal(now.status, 200, JSON.stringify(now.body));
});

test('only a seller can be capped, and only an admin can cap them', async () => {
  const a = await admin();
  const buyer = await register('Not A Seller');
  const s = await seller('Guarded Motors');

  const wrongRole = await setCap(a, buyer.id, { max_active_listings: 3 });
  assert.equal(wrongRole.status, 409);
  assert.equal(wrongRole.body.code, 'NOT_A_SELLER');

  await api().put(`/admin/users/${s.id}/listing-cap`)
    .set('Authorization', `Bearer ${buyer.token}`)
    .send({ max_active_listings: 99 }).expect(403);

  await api().put(`/admin/users/${s.id}/listing-cap`)
    .send({ max_active_listings: 99 }).expect(401);
});

test('the database itself refuses a cap with no author', async () => {
  const s = await seller('Constraint Motors');
  await assert.rejects(
    () => pool.query('UPDATE users SET max_active_listings = 5 WHERE id = $1', [s.id]),
    (err) => err.code === '23514',
    'a commercial term with nobody attached to it is not storable'
  );
});

test.after(() => pool.end());
