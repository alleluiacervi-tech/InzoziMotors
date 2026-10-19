// ─────────────────────────────────────────────────────────────────────────────
// Alert preferences (migration 0062).
//
// A user can switch off the two alerts Sawa sends on its own: new matches for
// saved searches, and price drops on saved cars. Off means no alert at all —
// no notification row, so no push and no web push either — while everyone
// who left it on is still told.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { matchSavedSearches, notifyPriceDrop } = require('../src/lib/alerts');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function register(role = 'buyer') {
  const res = await api().post('/auth/register')
    .send({ name: 'Alert Tester', email: unique('alerts'), password: 'password123', role }).expect(201);
  return { id: res.body.user.id, token: res.body.token };
}

async function car(sellerId, { make = 'Toyota', model = 'RAV4', price = 25000000 } = {}) {
  const { rows: [row] } = await pool.query(
    `INSERT INTO cars (seller_id, title, make, model, year, mileage, price, status, images)
     VALUES ($1, $2, $3, $4, 2020, 40000, $5, 'live', ARRAY['https://example.com/a.jpg'])
     RETURNING *`,
    [sellerId, `${make} ${model} ${Math.random().toString(36).slice(2, 7)}`, make, model, price]
  );
  return row;
}

const alertsFor = async (userId, type, carId) => (await pool.query(
  `SELECT 1 FROM notifications WHERE user_id = $1 AND type = $2 AND meta->>'carId' = $3`,
  [userId, type, carId]
)).rowCount;

test('both alerts are on for a new account and can be switched off and on', async () => {
  const user = await register();
  const me = await api().get('/auth/me').set('Authorization', `Bearer ${user.token}`).expect(200);
  assert.equal(me.body.alert_search_matches, true);
  assert.equal(me.body.alert_price_drops, true);

  const off = await api().patch('/auth/me').set('Authorization', `Bearer ${user.token}`)
    .send({ alert_search_matches: false, alert_price_drops: false }).expect(200);
  assert.equal(off.body.alert_search_matches, false);
  assert.equal(off.body.alert_price_drops, false);

  const on = await api().patch('/auth/me').set('Authorization', `Bearer ${user.token}`)
    .send({ alert_price_drops: true }).expect(200);
  assert.equal(on.body.alert_search_matches, false, 'a field not sent keeps its value');
  assert.equal(on.body.alert_price_drops, true);
});

test('a preference must be a boolean', async () => {
  const user = await register();
  await api().patch('/auth/me').set('Authorization', `Bearer ${user.token}`)
    .send({ alert_price_drops: 'no' }).expect(400);
});

test('a price drop reaches only savers who left the alert on', async () => {
  const seller = await register('seller');
  const listing = await car(seller.id);
  const keeps = await register();
  const optedOut = await register();
  await pool.query(`UPDATE users SET alert_price_drops = FALSE WHERE id = $1`, [optedOut.id]);
  await pool.query(`INSERT INTO saved_cars (user_id, car_id) VALUES ($1, $3), ($2, $3)`, [keeps.id, optedOut.id, listing.id]);

  const sent = await notifyPriceDrop(listing.id, 25000000, 23000000, listing.title);
  assert.equal(sent, 1);
  assert.equal(await alertsFor(keeps.id, 'price_drop', listing.id), 1);
  assert.equal(await alertsFor(optedOut.id, 'price_drop', listing.id), 0);
});

test('a new listing matches only saved searches whose owner left the alert on', async () => {
  const seller = await register('seller');
  const make = `Make${Math.random().toString(36).slice(2, 8)}`;
  const keeps = await register();
  const optedOut = await register();
  await pool.query(`UPDATE users SET alert_search_matches = FALSE WHERE id = $1`, [optedOut.id]);
  await pool.query(
    `INSERT INTO saved_searches (user_id, label, filters) VALUES ($1, 'Mine', $3), ($2, 'Mine', $3)`,
    [keeps.id, optedOut.id, JSON.stringify({ make })]
  );

  const listing = await car(seller.id, { make });
  const sent = await matchSavedSearches({ ...listing, currency: 'RWF' });
  assert.equal(sent, 1);
  assert.equal(await alertsFor(keeps.id, 'search_match', listing.id), 1);
  assert.equal(await alertsFor(optedOut.id, 'search_match', listing.id), 0);
});

test.after(async () => { await pool.end(); });
