// ─────────────────────────────────────────────────────────────────────────────
// Private 1:1 messaging — one thread per buyer<->seller pair (Instagram DMs).
//
// The property this file protects is the one the product actually promises:
// messaging the same seller about a second, third, fourth car does NOT spawn a
// new conversation — every message lands in the single private thread between
// those two people. Before migration 0041 conversations were keyed per car, so
// the same buyer appeared once per listing and read as duplicates.
//
// It also pins the reliability edges the rebuild had to get right: unread only
// counts the other party's unseen messages, opening a thread clears it, and a
// block removes the thread from the list and refuses both read and write.
//
// Real Postgres, real routes — the unique(buyer_id, seller_id) constraint and
// the ON CONFLICT find-or-create only mean something against a live database.
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
const canonicalChecklist = () => Object.fromEntries(REQUIRED_ITEM_IDS.map((id) => [id, 'pass']));

async function register(overrides = {}) {
  const body = { name: 'Test User', email: unique('msg'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}

async function makeAdmin(user) {
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}

let fixtureDay = 200;

// Stand up a live, inspection-backed listing the messaging routes will accept.
async function liveCar({ seller, admin, make, model, year }) {
  const car = await api().post('/cars').set('Authorization', `Bearer ${admin}`)
    .send({ seller_id: seller.id, title: `${year} ${make} ${model}`, make, model, year, mileage: 30000, price: 18000000, images: ['https://example.test/c.jpg'] })
    .expect(201);
  const submission = await api().post('/submissions').set('Authorization', `Bearer ${seller.token}`)
    .send({ make, model, year, mileage: 30000, asking_price: 18000000 }).expect(201);
  const day = new Date(Date.now() + fixtureDay++ * 86400_000).toISOString().slice(0, 10);
  await api().patch(`/submissions/${submission.body.id}`).set('Authorization', `Bearer ${admin}`)
    .send({ status: 'scheduled', center: 'Nyarutarama Center', scheduled_date: day, scheduled_time: '10:00 AM' }).expect(200);
  const found = await pool.query('SELECT id FROM inspections WHERE submission_id=$1', [submission.body.id]);
  await pool.query('UPDATE inspections SET car_id=$1 WHERE id=$2', [car.body.id, found.rows[0].id]);
  await api().post(`/inspections/${found.rows[0].id}/start`).set('Authorization', `Bearer ${admin}`).expect(200);
  await api().post(`/inspections/${found.rows[0].id}/complete`).set('Authorization', `Bearer ${admin}`)
    .send({ checklist_results: canonicalChecklist() }).expect(200);
  await api().patch(`/cars/${car.body.id}/status`).set('Authorization', `Bearer ${admin}`).send({ status: 'approved' }).expect(200);
  await api().patch(`/cars/${car.body.id}/status`).set('Authorization', `Bearer ${admin}`).send({ status: 'live' }).expect(200);
  return car.body;
}

test.after(async () => { await pool.end(); });

test('messaging one seller about several cars stays a single private thread', async () => {
  const seller = await register({ role: 'seller', name: 'Seller Sam' });
  await pool.query("UPDATE users SET id_verified='approved' WHERE id=$1", [seller.id]);
  const admin = await makeAdmin(await register());
  const buyer = await register({ name: 'Buyer Alleluia' });

  const carA = await liveCar({ seller, admin, make: 'Toyota', model: 'RAV4', year: 2021 });
  const carB = await liveCar({ seller, admin, make: 'Honda', model: 'CR-V', year: 2022 });

  // First contact about car A creates the thread.
  const first = await api().post('/messages/conversations').set('Authorization', `Bearer ${buyer.token}`)
    .send({ car_id: carA.id, message: 'Is the RAV4 still available?' }).expect(201);
  const convId = first.body.conversation.id;

  // "Starting" a conversation about a DIFFERENT car returns the SAME thread —
  // this is the whole point of the per-person model.
  const second = await api().post('/messages/conversations').set('Authorization', `Bearer ${buyer.token}`)
    .send({ car_id: carB.id, message: 'And is the CR-V available too?' }).expect(201);
  assert.equal(second.body.conversation.id, convId, 'a second car must not open a second thread');

  // Exactly one thread on each side, and one row in the table for the pair.
  const buyerList = await api().get('/messages/conversations').set('Authorization', `Bearer ${buyer.token}`).expect(200);
  const withSeller = buyerList.body.filter((c) => c.seller_id === seller.id);
  assert.equal(withSeller.length, 1, 'buyer should see one thread with the seller, not one per car');

  const sellerList = await api().get('/messages/conversations').set('Authorization', `Bearer ${seller.token}`).expect(200);
  const withBuyer = sellerList.body.filter((c) => c.buyer_id === buyer.id);
  assert.equal(withBuyer.length, 1, 'seller should see one thread with the buyer');

  const rows = await pool.query('SELECT id, car_id FROM conversations WHERE buyer_id=$1 AND seller_id=$2', [buyer.id, seller.id]);
  assert.equal(rows.rows.length, 1);
  assert.equal(rows.rows[0].car_id, carB.id, 'the thread tracks the most recently discussed car');

  // Both messages live in the one thread, in order.
  const history = await api().get(`/messages/conversations/${convId}`).set('Authorization', `Bearer ${buyer.token}`).expect(200);
  const texts = history.body.map((m) => m.text);
  assert.deepEqual(texts, ['Is the RAV4 still available?', 'And is the CR-V available too?']);
});

test('unread counts the other party only, and opening the thread clears it', async () => {
  const seller = await register({ role: 'seller', name: 'Seller Sara' });
  await pool.query("UPDATE users SET id_verified='approved' WHERE id=$1", [seller.id]);
  const admin = await makeAdmin(await register());
  const buyer = await register({ name: 'Buyer Ben' });
  const car = await liveCar({ seller, admin, make: 'Toyota', model: 'Hilux', year: 2020 });

  const start = await api().post('/messages/conversations').set('Authorization', `Bearer ${buyer.token}`)
    .send({ car_id: car.id, message: 'Hello' }).expect(201);
  const convId = start.body.conversation.id;
  await api().post(`/messages/conversations/${convId}`).set('Authorization', `Bearer ${buyer.token}`)
    .send({ text: 'Second message' }).expect(201);

  // Seller has two unread from the buyer; the buyer's own view shows zero.
  const sellerView = await api().get('/messages/conversations').set('Authorization', `Bearer ${seller.token}`).expect(200);
  const sellerThread = sellerView.body.find((c) => c.id === convId);
  assert.equal(Number(sellerThread.unread_count), 2);

  const buyerView = await api().get('/messages/conversations').set('Authorization', `Bearer ${buyer.token}`).expect(200);
  assert.equal(Number(buyerView.body.find((c) => c.id === convId).unread_count), 0, 'you are never unread to yourself');

  // Opening the thread marks the buyer's messages read.
  await api().get(`/messages/conversations/${convId}`).set('Authorization', `Bearer ${seller.token}`).expect(200);
  const afterOpen = await api().get('/messages/conversations').set('Authorization', `Bearer ${seller.token}`).expect(200);
  assert.equal(Number(afterOpen.body.find((c) => c.id === convId).unread_count), 0, 'opening the thread clears unread');
});

test('a block hides the thread and refuses both reading and writing', async () => {
  const seller = await register({ role: 'seller', name: 'Seller Sio' });
  await pool.query("UPDATE users SET id_verified='approved' WHERE id=$1", [seller.id]);
  const admin = await makeAdmin(await register());
  const buyer = await register({ name: 'Buyer Bea' });
  const car = await liveCar({ seller, admin, make: 'Nissan', model: 'X-Trail', year: 2021 });

  const start = await api().post('/messages/conversations').set('Authorization', `Bearer ${buyer.token}`)
    .send({ car_id: car.id, message: 'Hi there' }).expect(201);
  const convId = start.body.conversation.id;

  await api().post(`/messages/users/${seller.id}/block`).set('Authorization', `Bearer ${buyer.token}`).expect(201);

  const listed = await api().get('/messages/conversations').set('Authorization', `Bearer ${buyer.token}`).expect(200);
  assert.equal(listed.body.some((c) => c.id === convId), false, 'a blocked thread must not appear in the list');
  await api().get(`/messages/conversations/${convId}`).set('Authorization', `Bearer ${buyer.token}`).expect(404);
  const refused = await api().post(`/messages/conversations/${convId}`).set('Authorization', `Bearer ${buyer.token}`)
    .send({ text: 'still there?' }).expect(403);
  assert.equal(refused.body.code, 'BLOCKED');

  // Unblocking brings the same thread back — nothing was destroyed.
  await api().delete(`/messages/users/${seller.id}/block`).set('Authorization', `Bearer ${buyer.token}`).expect(200);
  const back = await api().get('/messages/conversations').set('Authorization', `Bearer ${buyer.token}`).expect(200);
  assert.equal(back.body.some((c) => c.id === convId), true, 'unblocking restores the thread');
});

test('a seller cannot open a thread about their own listing', async () => {
  const seller = await register({ role: 'seller', name: 'Seller Solo' });
  await pool.query("UPDATE users SET id_verified='approved' WHERE id=$1", [seller.id]);
  const admin = await makeAdmin(await register());
  const car = await liveCar({ seller, admin, make: 'Mazda', model: 'CX-5', year: 2020 });

  await api().post('/messages/conversations').set('Authorization', `Bearer ${seller.token}`)
    .send({ car_id: car.id, message: 'talking to myself' }).expect(400);
});
