// ─────────────────────────────────────────────────────────────────────────────
// Alerts for cars for hire (migration 0065, lib/rental-alerts.js).
//
// What this pins down:
//   - a rental car is announced only once it is genuinely public (passing
//     Rental Check + paid subscription + active), and only once;
//   - a saved rental search is told once, a sale search never matches a rental
//     car and a rental search never matches a car for sale;
//   - a rental search that does not fit (other category) is left alone;
//   - the daily summary has its own "For hire" line, counted by the same rule;
//   - the wording never says a car is "available" or "booked" (CLAUDE.md).
// ─────────────────────────────────────────────────────────────────────────────
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { announceNewRentals, countNewRentals } = require('../src/lib/rental-alerts');
const { matchSavedSearches } = require('../src/lib/alerts');
const { runDailyDigest } = require('../src/lib/daily-digest');
const { COPY, LANGUAGES } = require('../src/lib/notification-copy');
const { ITEMS } = require('../src/lib/rental-check-policy');
const { kigaliToday } = require('../src/lib/insights-range');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));
const dayFrom = (offset) => {
  const d = new Date(`${kigaliToday()}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const allPass = () => Object.fromEntries(ITEMS.map((entry) => [entry.id, { verdict: 'pass' }]));
const checkBody = () => ({
  results: allPass(), insurance_expires_on: dayFrom(200), technical_control_expires_on: dayFrom(150), odometer_km: 80000,
});

const DAY = new Date('2026-10-20T10:00:00Z');     // 12:00 Kigali
const EVENING = new Date('2026-10-20T16:30:00Z'); // 18:30 Kigali

const realFetch = global.fetch;
const sent = [];
before(() => {
  global.fetch = async (url, init) => {
    if (!String(url).includes('exp.host')) return realFetch(url, init);
    const body = JSON.parse(init.body);
    if (String(url).endsWith('/send')) {
      sent.push(...body);
      return { status: 200, json: async () => ({ data: body.map((m, i) => ({ status: 'ok', id: `r-${i}` })) }) };
    }
    return { status: 200, json: async () => ({ data: {} }) };
  };
});
after(() => { global.fetch = realFetch; });

async function register(overrides = {}) {
  const body = { name: 'Rental Alert', email: unique('rentalalert'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}
async function admin() {
  const user = await register();
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return { Authorization: `Bearer ${res.body.token}` };
}
async function provider() {
  const user = await register({ role: 'seller' });
  await pool.query(
    `UPDATE users SET id_verified='approved', seller_type='showroom', business_verified=TRUE WHERE id=$1`, [user.id]);
  return { ...user, auth: { Authorization: `Bearer ${user.token}` } };
}
async function proposedCar(owner, extra = {}) {
  const res = await api().post('/rentals/propose').set(owner.auth).send({
    title: `Hire ${Math.random().toString(36).slice(2, 7)}`, make: 'Toyota', model: 'RAV4', year: 2019,
    daily_rate: 55000, images: ['https://example.test/rav4.jpg'], ...extra,
  }).expect(201);
  await pool.query(`UPDATE rental_cars SET category = COALESCE($2, category) WHERE id = $1`, [res.body.id, extra.category || null]);
  return res.body;
}
async function makePublic(adminAuth, carId) {
  await api().post(`/rentals/${carId}/subscriptions`).set(adminAuth)
    .send({ amount_rwf: 10000, starts_on: dayFrom(-1), ends_on: dayFrom(29), method: 'cash' }).expect(201);
  await api().post(`/rentals/${carId}/checks`).set(adminAuth).send(checkBody()).expect(201);
  await api().patch(`/rentals/${carId}`).set(adminAuth).send({ status: 'active' }).expect(200);
}
const rentalSearch = async (userId, filters, mode = 'instant') => {
  const { rows: [row] } = await pool.query(
    `INSERT INTO saved_searches (user_id, label, filters, alert_mode) VALUES ($1, 'For hire', $2, $3) RETURNING id`,
    [userId, JSON.stringify({ listingType: 'rental', ...filters }), mode]);
  return row.id;
};
const countRows = async (sql, params) => Number((await pool.query(sql, params)).rows[0].c);

test('a rental car is announced once, only when public, to the right rental searches', async () => {
  const adminAuth = await admin();
  const owner = await provider();
  const matching = await register();
  const otherCategory = await register();
  const saleOnly = await register();
  const SUV = `SUV${Math.random().toString(36).slice(2, 6)}`;
  await rentalSearch(matching.id, { category: SUV });
  await rentalSearch(otherCategory.id, { category: 'Minibus' });
  await pool.query(
    `INSERT INTO saved_searches (user_id, label, filters) VALUES ($1, 'Toyota cars', '{"make":"Toyota"}')`, [saleOnly.id]);
  await pool.query(`INSERT INTO device_tokens (user_id, token, platform) VALUES ($1, 'ExponentPushToken[hire]', 'android')`, [matching.id]);

  const car = await proposedCar(owner, { category: SUV });
  await announceNewRentals({ now: DAY });
  assert.equal(await countRows(`SELECT COUNT(*) c FROM notifications WHERE type = 'search_match' AND meta->>'rentalCarId' = $1`, [car.id]), 0,
    'not public yet: nothing announced');
  const before = await pool.query('SELECT first_listed_at FROM rental_cars WHERE id = $1', [car.id]);
  assert.equal(before.rows[0].first_listed_at, null, 'and it is not stamped, so it can still be announced later');

  await makePublic(adminAuth, car.id);
  sent.length = 0;
  await announceNewRentals({ now: DAY });
  await settle();
  assert.equal(await countRows(`SELECT COUNT(*) c FROM notifications WHERE user_id = $1 AND meta->>'rentalCarId' = $2`, [matching.id, car.id]), 1);
  assert.equal(await countRows(`SELECT COUNT(*) c FROM notifications WHERE user_id = $1 AND meta->>'rentalCarId' = $2`, [otherCategory.id, car.id]), 0);
  assert.equal(await countRows(`SELECT COUNT(*) c FROM notifications WHERE user_id = $1 AND meta->>'rentalCarId' = $2`, [saleOnly.id, car.id]), 0,
    'a search for cars for sale never matches a car for hire');
  const push = sent.find((m) => m.to === 'ExponentPushToken[hire]');
  assert.ok(push, 'the push went out');
  assert.equal(push.channelId, 'alerts');
  assert.equal(push.data.rentalCarId, car.id);
  assert.doesNotMatch(`${push.title} ${push.body}`, /available|booked/i, 'listed for hire, never "available" or "booked"');

  sent.length = 0;
  await announceNewRentals({ now: DAY });
  await settle();
  assert.equal(sent.length, 0, 'a second sweep announces nothing');
  assert.equal(await countRows(`SELECT COUNT(*) c FROM notifications WHERE user_id = $1 AND meta->>'rentalCarId' = $2`, [matching.id, car.id]), 1);
});

test('a rental search never matches a car for sale', async () => {
  const seller = await register();
  const buyer = await register();
  const MAKE = `Rent${Math.random().toString(36).slice(2, 6)}`;
  await rentalSearch(buyer.id, { make: MAKE });
  const { rows: [sale] } = await pool.query(
    `INSERT INTO cars (seller_id, title, make, model, year, mileage, price, status, images)
     VALUES ($1, $2, $2, 'X', 2020, 1000, 9000000, 'live', ARRAY['https://example.com/a.jpg']) RETURNING *`,
    [seller.id, MAKE]);
  assert.equal(await matchSavedSearches(sale, { now: DAY }), 0);
});

test('the daily summary has a "For hire" line counted by the catalogue rule', async () => {
  const adminAuth = await admin();
  const owner = await provider();
  const fan = await register();
  await pool.query('UPDATE users SET alert_daily_digest = TRUE WHERE id = $1', [fan.id]);
  await pool.query(`INSERT INTO device_tokens (user_id, token, platform) VALUES ($1, 'ExponentPushToken[fan]', 'ios')`, [fan.id]);
  const KIND = `Kind${Math.random().toString(36).slice(2, 6)}`;
  await rentalSearch(fan.id, { category: KIND }, 'daily');

  const car = await proposedCar(owner, { category: KIND });
  await makePublic(adminAuth, car.id);
  // The sweep runs at (pretend) midday; the summary at 18:30 the same Kigali day.
  await announceNewRentals({ now: DAY });
  await pool.query(`UPDATE rental_cars SET first_listed_at = $2 WHERE id = $1`, [car.id, DAY]);
  const hire = await countNewRentals(new Date(EVENING.getTime() - 24 * 3_600_000));
  assert.ok(hire >= 1);

  sent.length = 0;
  const result = await runDailyDigest({ now: EVENING });
  assert.ok(result.sent >= 1);
  await settle();
  const push = sent.find((m) => m.to === 'ExponentPushToken[fan]');
  assert.ok(push, 'the opted-in person got the summary');
  assert.match(push.body, new RegExp(`For hire: ${hire}`));
  assert.match(push.body, /Matching your searches: 1/, 'the daily rental search counts as a match');
  assert.equal(push.channelId, 'alerts');
});

test('the rental wording exists in every language and never claims availability', () => {
  for (const lang of LANGUAGES) {
    assert.ok(COPY.rental_match[lang], `rental_match is missing ${lang}`);
    assert.ok(COPY.digest_hire[lang], `digest_hire is missing ${lang}`);
  }
  assert.doesNotMatch(JSON.stringify(COPY.rental_match.en), /available|booked/i);
});
