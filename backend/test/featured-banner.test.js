// ─────────────────────────────────────────────────────────────────────────────
// The home-screen banner.
//
// Featuring used to be one timestamp on `cars`, floated to the top of the
// browse list by an ORDER BY. It could not say WHY a car was there, WHERE in
// the banner it sat, or WHEN a campaign began — and, most importantly, it could
// not tell a buyer that a seller had paid for the placement.
//
// That last one is the reason most of this file exists. This company's whole
// product is INDEPENDENT verification. A paid slot that renders identically to
// an editorial pick spends exactly the asset being sold, so `sponsored` is
// computed on the server and shipped in the payload — no client can render a
// paid placement as an editorial one by forgetting to check a field.
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

async function register(name, role = 'buyer') {
  const email = unique('feat');
  const r = await api().post('/auth/register')
    .send({ name, email, password: 'password123', role }).expect(201);
  return { id: r.body.user.id, email, password: 'password123', token: r.body.token };
}
async function admin() {
  const u = await register('Banner Operator');
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [u.id]);
  const r = await api().post('/auth/login').send({ email: u.email, password: u.password }).expect(200);
  return { ...u, token: r.body.token, auth: { Authorization: `Bearer ${r.body.token}` } };
}
async function seller(name = 'Banner Motors') {
  const u = await register(name, 'seller');
  await pool.query(
    `UPDATE users SET id_verified='approved', account_status='active' WHERE id=$1`, [u.id]);
  return u;
}

/** A genuinely live, genuinely inspected car — the banner predicate reuses the
 *  browse eligibility rules, so anything less would never appear at all. */
async function liveCar(sellerId, title = 'Banner Corolla') {
  const V = { make: 'Toyota', model: 'Corolla', year: 2021 };
  const { rows: [car] } = await pool.query(
    `INSERT INTO cars (seller_id, title, make, model, year, mileage, price, status, images, inspected, inspection_score, listed_at)
     VALUES ($1,$2,$3,$4,$5,30000,18000000,'live',ARRAY['https://example.com/a.jpg'],TRUE,150,NOW())
     RETURNING id, title`,
    [sellerId, `${title} ${Math.random().toString(36).slice(2, 7)}`, V.make, V.model, V.year]
  );
  const { rows: [sub] } = await pool.query(
    `INSERT INTO submissions (car_id, seller_id, status, make, model, year, mileage, asking_price)
     VALUES ($1,$2,'live',$3,$4,$5,30000,18000000) RETURNING id`,
    [car.id, sellerId, V.make, V.model, V.year]
  );
  await pool.query(
    `INSERT INTO inspections (submission_id, car_id, center, status, checklist_results,
       checklist_version, score, passed, critical_failures, completed_at, scheduled_date)
     VALUES ($1,$2,'Kigali','complete',$3::jsonb,$4,150,TRUE,'[]'::jsonb,NOW(),CURRENT_DATE)`,
    [sub.id, car.id, JSON.stringify(ALL_PASS), CHECKLIST_VERSION]
  );
  return car;
}

const feature = (a, carId, body) =>
  api().patch(`/cars/${carId}/feature`).set(a.auth).send(body);

const banner = () => api().get('/cars/featured?limit=12');

test('a sponsored placement is labelled sponsored, in the payload', async () => {
  const a = await admin();
  const s = await seller();
  const car = await liveCar(s.id);

  const res = await feature(a, car.id, {
    kind: 'sponsored', days: 7, slot: 1, amount_rwf: 150000, headline: 'Ex-embassy, one owner',
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.kind, 'sponsored');
  assert.equal(Number(res.body.amount_rwf), 150000);

  const feed = await banner().expect(200);
  const row = feed.body.find((r) => r.id === car.id);
  assert.ok(row, 'the car is in the banner');
  assert.equal(row.sponsored, true, 'the server decides this, not the client');
  assert.equal(row.label, 'Sponsored', 'and it is the word a buyer will read');
  assert.equal(row.headline, 'Ex-embassy, one owner');
});

test('an editorial pick is never labelled as paid, and cannot carry money', async () => {
  const a = await admin();
  const s = await seller();
  const car = await liveCar(s.id);

  const paidEditorial = await feature(a, car.id, { kind: 'editorial', days: 5, amount_rwf: 50000 });
  assert.equal(paidEditorial.status, 400);
  assert.equal(paidEditorial.body.code, 'AMOUNT_ON_UNPAID_PLACEMENT');

  await feature(a, car.id, { kind: 'editorial', days: 5, slot: 2 }).expect(201);
  const feed = await banner().expect(200);
  const row = feed.body.find((r) => r.id === car.id);
  assert.equal(row.sponsored, false);
  assert.equal(row.label, 'Featured');
  assert.equal(row.amount_rwf ?? null, null);
});

test('a paid placement with no amount is a favour nobody wrote down', async () => {
  const a = await admin();
  const car = await liveCar((await seller()).id);
  const res = await feature(a, car.id, { kind: 'sponsored', days: 7 });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'SPONSORSHIP_AMOUNT_REQUIRED');
  assert.match(res.body.error, /recorded here, not collected/i);
});

test('slots order the banner, lowest first', async () => {
  const a = await admin();
  const s = await seller();
  const [first, second, third] = [await liveCar(s.id, 'A'), await liveCar(s.id, 'B'), await liveCar(s.id, 'C')];

  await feature(a, third.id, { kind: 'editorial', slot: 9, days: 3 }).expect(201);
  await feature(a, first.id, { kind: 'editorial', slot: 1, days: 3 }).expect(201);
  await feature(a, second.id, { kind: 'hot_deal', slot: 5, days: 3 }).expect(201);

  const feed = await banner().expect(200);
  const mine = feed.body.filter((r) => [first.id, second.id, third.id].includes(r.id));
  assert.deepEqual(mine.map((r) => r.id), [first.id, second.id, third.id],
    'slot 1 then 5 then 9 — a banner is an ordered thing');
  assert.equal(mine[1].label, 'Hot deal');
});

test('a scheduled placement does not appear before it starts', async () => {
  const a = await admin();
  const car = await liveCar((await seller()).id);
  const tomorrow = new Date(Date.now() + 36 * 3600 * 1000).toISOString();

  await feature(a, car.id, { kind: 'editorial', days: 3, starts_at: tomorrow }).expect(201);

  const now = await banner().expect(200);
  assert.equal(now.body.some((r) => r.id === car.id), false,
    'featured_until had an end and no beginning; a campaign needs both');
});

test('an expired placement leaves the banner on its own', async () => {
  const a = await admin();
  const car = await liveCar((await seller()).id);
  const created = await feature(a, car.id, { kind: 'editorial', days: 1 }).expect(201);

  await pool.query(
    "UPDATE featured_placements SET starts_at = NOW() - INTERVAL '9 days', ends_at = NOW() - INTERVAL '2 days' WHERE id=$1",
    [created.body.id]
  );
  const feed = await banner().expect(200);
  assert.equal(feed.body.some((r) => r.id === car.id), false,
    'expiry is a WHERE clause, not a job somebody has to run');
});

test('a car that leaves the marketplace leaves the banner with it', async () => {
  const a = await admin();
  const s = await seller();
  const car = await liveCar(s.id);
  await feature(a, car.id, { kind: 'sponsored', days: 30, amount_rwf: 200000 }).expect(201);
  assert.ok((await banner()).body.some((r) => r.id === car.id), 'in the banner to begin with');

  // Sold. Nothing touches featured_placements — the predicate simply stops matching.
  await api().patch(`/cars/${car.id}/status`).set(a.auth).send({ status: 'sold' }).expect(200);
  assert.equal((await banner()).body.some((r) => r.id === car.id), false,
    'a sold car must not keep a paid banner slot');
});

test("a revoked seller's car leaves the banner too", async () => {
  const a = await admin();
  const s = await seller('Revoked Motors');
  const car = await liveCar(s.id);
  await feature(a, car.id, { kind: 'editorial', days: 30 }).expect(201);
  assert.ok((await banner()).body.some((r) => r.id === car.id));

  await pool.query("UPDATE users SET id_verified='rejected' WHERE id=$1", [s.id]);
  assert.equal((await banner()).body.some((r) => r.id === car.id), false,
    'the banner reuses the browse eligibility rules rather than re-deriving them');
});

test('a car cannot hold two overlapping placements', async () => {
  const a = await admin();
  const car = await liveCar((await seller()).id);
  await feature(a, car.id, { kind: 'editorial', days: 7 }).expect(201);

  const second = await feature(a, car.id, { kind: 'sponsored', days: 7, amount_rwf: 90000 });
  assert.equal(second.status, 409);
  assert.equal(second.body.code, 'FEATURE_PLACEMENT_EXISTS');
  assert.match(second.body.error, /Cancel it before booking another/i);
});

test('a placement is cancelled with a reason, and the history is kept', async () => {
  const a = await admin();
  const car = await liveCar((await seller()).id);
  const created = await feature(a, car.id, { kind: 'sponsored', days: 14, amount_rwf: 300000 }).expect(201);

  const noReason = await api().delete(`/cars/feature/${created.body.id}`).set(a.auth).send({});
  assert.equal(noReason.status, 400);
  assert.equal(noReason.body.code, 'REASON_REQUIRED');

  const done = await api().delete(`/cars/feature/${created.body.id}`)
    .set(a.auth).send({ reason: 'Seller withdrew the campaign' }).expect(200);
  assert.ok(done.body.cancelled_at);

  assert.equal((await banner()).body.some((r) => r.id === car.id), false, 'out of the banner');

  const { rows } = await pool.query('SELECT * FROM featured_placements WHERE id=$1', [created.body.id]);
  assert.equal(rows.length, 1, 'the row survives — somebody will ask what ran last month');
  assert.equal(rows[0].cancel_reason, 'Seller withdrew the campaign');
  assert.equal(rows[0].cancelled_by, a.id);

  // ...and the slot is free again.
  await feature(a, car.id, { kind: 'editorial', days: 3 }).expect(201);
});

test('the banner is public, and carries nothing internal', async () => {
  const a = await admin();
  const car = await liveCar((await seller()).id);
  await pool.query("UPDATE cars SET review_notes='internal note', registration_plate='RAB123A' WHERE id=$1", [car.id]);
  await feature(a, car.id, { kind: 'editorial', days: 3 }).expect(201);

  const feed = await banner().expect(200);        // no Authorization header
  const row = feed.body.find((r) => r.id === car.id);
  assert.ok(row, 'a signed-out visitor sees the banner');
  for (const column of ['review_notes', 'registration_plate', 'approved_by', 'description']) {
    assert.equal(column in row, false, `${column} has no business on a banner payload`);
  }
});

test('only an admin can place or cancel, and only a live car can be placed', async () => {
  const a = await admin();
  const buyer = await register('Nosy Buyer');
  const car = await liveCar((await seller()).id);

  await api().patch(`/cars/${car.id}/feature`)
    .set('Authorization', `Bearer ${buyer.token}`).send({ kind: 'editorial' }).expect(403);
  await api().patch(`/cars/${car.id}/feature`).send({ kind: 'editorial' }).expect(401);

  const bad = await feature(a, car.id, { kind: 'nonsense' });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.code, 'INVALID_FEATURE_KIND');

  await pool.query("UPDATE cars SET status='under_review' WHERE id=$1", [car.id]);
  const notLive = await feature(a, car.id, { kind: 'editorial', days: 3 });
  assert.equal(notLive.status, 404, 'a car nobody can open cannot be in the banner');
});

test.after(() => pool.end());
