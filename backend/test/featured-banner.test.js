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
  // Chosen as a hot deal, but its price never moved — so the rail says
  // "Featured". "Hot deal" is a claim about a price, and it needs a real drop.
  assert.equal(mine[1].label, 'Featured');
  assert.equal(mine[1].previous_price, null);
});

/** Record a price history the way the price-edit routes do: oldest first. */
async function priceHistory(carId, steps) {
  for (const [price, daysAgo] of steps) {
    await pool.query(
      `INSERT INTO price_history (car_id, price, changed_at)
       VALUES ($1, $2, NOW() - make_interval(days => $3))`,
      [carId, price, daysAgo]);
  }
}

test('"Hot deal" is only said when the price really fell, and the card gets the old price', async () => {
  const a = await admin();
  const s = await seller();
  const dropped = await liveCar(s.id, 'Dropped');       // listed 20M, now 18M
  const stale = await liveCar(s.id, 'Stale');           // dropped, but 40 days ago
  const raised = await liveCar(s.id, 'Raised');         // 17M then up to 18M
  const crumb = await liveCar(s.id, 'Crumb');           // 18,050,000 → 18M, under 1%

  await priceHistory(dropped.id, [[20000000, 6], [18000000, 2]]);
  await priceHistory(stale.id, [[20000000, 60], [18000000, 40]]);
  await priceHistory(raised.id, [[17000000, 6], [18000000, 2]]);
  await priceHistory(crumb.id, [[18050000, 6], [18000000, 2]]);
  for (const car of [dropped, stale, raised, crumb]) {
    await feature(a, car.id, { kind: 'hot_deal', days: 3, slot: 2 }).expect(201);
  }

  const feed = (await banner().expect(200)).body;
  const row = (car) => feed.find((r) => r.id === car.id);

  assert.equal(row(dropped).label, 'Hot deal');
  assert.equal(Number(row(dropped).previous_price), 20000000);
  assert.ok(row(dropped).price_dropped_at, 'the card can say when');

  for (const car of [stale, raised, crumb]) {
    assert.equal(row(car).label, 'Featured', `${car.title}: no real, recent drop`);
    assert.equal(row(car).previous_price, null);
  }
});

test('a sponsored car with a real drop shows the old price and still says Sponsored', async () => {
  const a = await admin();
  const car = await liveCar((await seller()).id);
  await priceHistory(car.id, [[19500000, 4], [18000000, 1]]);
  await feature(a, car.id, { kind: 'sponsored', days: 3, slot: 1, amount_rwf: 100000 }).expect(201);

  const row = (await banner().expect(200)).body.find((r) => r.id === car.id);
  assert.equal(row.label, 'Sponsored', 'the disclosure is never traded for a nicer word');
  assert.equal(Number(row.previous_price), 19500000);
});

test('sponsored slots take turns at the front, one day at a time', () => {
  const { rotateSponsored, kigaliDay } = require('../src/lib/featured');
  const rows = [
    { id: 'e1', kind: 'editorial' },
    { id: 's1', kind: 'sponsored' },
    { id: 'h1', kind: 'hot_deal' },
    { id: 's2', kind: 'sponsored' },
    { id: 's3', kind: 'sponsored' },
  ];
  const firstSponsor = new Map();
  for (let day = 0; day < 30; day += 1) {
    const out = rotateSponsored(rows, day);
    assert.deepEqual(out.map((r) => r.id).filter((id) => !id.startsWith('s')), ['e1', 'h1'],
      'editorial and hot-deal picks keep the slot the operator chose');
    assert.equal(out[0].id, 'e1');
    assert.equal(out[2].id, 'h1');
    assert.equal(new Set(out.map((r) => r.id)).size, 5, 'nothing lost, nothing doubled');
    firstSponsor.set(out[1].id, (firstSponsor.get(out[1].id) || 0) + 1);
  }
  assert.deepEqual([...firstSponsor.values()], [10, 10, 10],
    'over 30 days each sponsor leads the paid positions 10 times');

  const ids = (day) => rotateSponsored(rows, day).map((r) => r.id);
  assert.deepEqual(ids(7), ids(7), 'the same day gives the same order on every client');
  assert.notDeepEqual(ids(7), ids(8), 'and the next day moves it on');
  // Kigali is UTC+2: 22:30 UTC is already the next day there.
  assert.equal(kigaliDay(Date.UTC(2026, 8, 28, 22, 30)), kigaliDay(Date.UTC(2026, 8, 29, 12, 0)));
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

test('the order does not depend on how many cards the caller asked for', async () => {
  const a = await admin();
  const s = await seller('Order Motors');
  // Sponsors inside and beyond the first six, so a rotation that ran after the
  // LIMIT would put a different car first for limit=6 than for limit=12.
  for (const slot of [1, 3, 5, 8, 10]) {
    const car = await liveCar(s.id, `Order ${slot}`);
    await feature(a, car.id, { kind: 'sponsored', days: 3, slot, amount_rwf: 50000 }).expect(201);
  }
  const ids = async (limit) => (await api().get(`/cars/featured?limit=${limit}`).expect(200))
    .body.map((r) => r.placement_id);
  const twelve = await ids(12);
  assert.deepEqual(await ids(6), twelve.slice(0, 6),
    'the homepage (6) and the app (12) show the same first cards on the same day');
});

test('an operator sees every running placement, including the ones buyers cannot', async () => {
  const a = await admin();
  const s = await seller('Hidden Motors');
  const showing = await liveCar(s.id, 'Showing');
  const paused = await liveCar(s.id, 'Paused');
  const later = await liveCar(s.id, 'Later');

  const shown = await feature(a, showing.id, { kind: 'editorial', days: 3 }).expect(201);
  const hidden = await feature(a, paused.id, { kind: 'sponsored', days: 10, amount_rwf: 120000 }).expect(201);
  const tomorrow = new Date(Date.now() + 36 * 3600 * 1000).toISOString();
  const scheduled = await feature(a, later.id, { kind: 'editorial', days: 3, starts_at: tomorrow }).expect(201);
  await pool.query("UPDATE cars SET status='paused' WHERE id=$1", [paused.id]);

  assert.equal((await banner()).body.some((r) => r.id === paused.id), false, 'buyers do not see it');

  const list = await api().get('/cars/feature/placements').set(a.auth).expect(200);
  const row = (placement) => list.body.find((r) => r.placement_id === placement.body.id);
  assert.equal(row(shown).hidden_reason, null);
  assert.equal(row(hidden).hidden_reason, 'listing_not_live', 'the paid slot is still running and says why it is dark');
  assert.equal(row(hidden).sponsored, true);
  assert.equal(row(scheduled).hidden_reason, 'scheduled');

  const buyer = await register('Curious Buyer');
  await api().get('/cars/feature/placements')
    .set('Authorization', `Bearer ${buyer.token}`).expect(403);
  await api().get('/cars/feature/placements').expect(401);
});

test('a price cut on a USD car is recorded in dollars, and the alert says so', async () => {
  const a = await admin();
  const s = await seller('Dollar Motors');
  const car = await liveCar(s.id, 'Dollar');
  await pool.query("UPDATE cars SET currency='USD', price=20000 WHERE id=$1", [car.id]);
  await pool.query(
    `INSERT INTO price_history (car_id, price, currency, changed_at)
     VALUES ($1, 20000, 'USD', NOW() - INTERVAL '5 days')`, [car.id]);
  const saver = await register('Dollar Saver');
  await pool.query('INSERT INTO saved_cars (user_id, car_id) VALUES ($1, $2)', [saver.id, car.id]);

  const sellerAuth = { Authorization: `Bearer ${s.token}` };
  const fractional = await api().patch(`/cars/${car.id}/price`).set(sellerAuth).send({ price: 19000.5 });
  assert.equal(fractional.status, 400, 'a fractional price is refused, not a 500 from Postgres');

  await api().patch(`/cars/${car.id}/price`).set(sellerAuth).send({ price: 19000 }).expect(200);
  const { rows: history } = await pool.query(
    'SELECT currency FROM price_history WHERE car_id=$1 ORDER BY changed_at DESC LIMIT 1', [car.id]);
  assert.equal(history[0].currency, 'USD', 'the history row carries the car\'s currency, not the column default');

  await feature(a, car.id, { kind: 'hot_deal', days: 3 }).expect(201);
  const row = (await banner()).body.find((r) => r.id === car.id);
  assert.equal(row.label, 'Hot deal', 'a real drop in the car\'s own currency counts');

  // The alert is fire-and-forget; give it a moment.
  let body = null;
  for (let i = 0; i < 20 && !body; i += 1) {
    const { rows } = await pool.query(
      "SELECT body FROM notifications WHERE user_id=$1 AND type='price_drop'", [saver.id]);
    body = rows[0]?.body || null;
    if (!body) await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(body, 'the saver was told');
  assert.match(body, /USD 20,000 to USD 19,000/);
  assert.equal(body.includes('$'), false);
});

test('a price alert on a franc car says RWF, never "$"', () => {
  const { formatCarPrice } = require('../src/lib/alerts');
  assert.equal(formatCarPrice(18000000, 'RWF'), 'RWF 18,000,000');
  assert.equal(formatCarPrice(18000000), 'RWF 18,000,000', 'francs when the currency is unknown');
});

test.after(() => pool.end());
