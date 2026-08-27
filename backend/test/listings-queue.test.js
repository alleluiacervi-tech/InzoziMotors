// ─────────────────────────────────────────────────────────────────────────────
// The waiting-on-you view.
//
// The Listings page opened on 'live' — the cars already published — so a
// vehicle that had just passed its inspection at 150/150 was not on screen at
// all. The operator saw a page full of finished work and concluded, reasonably,
// that nothing was waiting. 'needs_action' is the fix: one query for every car
// whose next step is an admin's, oldest first, because it is a queue and not a
// browse.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function register(name, role = 'buyer') {
  const email = unique('queue');
  const r = await api().post('/auth/register')
    .send({ name, email, password: 'password123', role }).expect(201);
  return { id: r.body.user.id, email, password: 'password123', token: r.body.token };
}
async function admin() {
  const u = await register('Queue Operator');
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [u.id]);
  const r = await api().post('/auth/login')
    .send({ email: u.email, password: u.password }).expect(200);
  return { ...u, token: r.body.token };
}
/** A car straight into a chosen status. `created_at` is set explicitly so the
 *  ordering assertion does not depend on how fast the test machine inserts. */
async function car(sellerId, status, ageDays) {
  const { rows } = await pool.query(
    `INSERT INTO cars (seller_id, title, make, model, year, mileage, price, status, created_at)
     VALUES ($1, $2, 'Volkswagen', 'Bora', 2025, 12000, 24000000, $3, NOW() - ($4 || ' days')::interval)
     RETURNING id, status, created_at`,
    [sellerId, `Bora ${status} ${ageDays}d`, status, String(ageDays)]
  );
  return rows[0];
}

test('needs_action returns exactly the cars whose next step is an admin decision', async () => {
  const a = await admin();
  const seller = await register('Queue Seller', 'seller');

  const review   = await car(seller.id, 'under_review', 3);
  const approved = await car(seller.id, 'approved', 2);
  const live     = await car(seller.id, 'live', 1);
  const rejected = await car(seller.id, 'rejected', 1);
  const draft    = await car(seller.id, 'draft', 1);

  const res = await api().get('/admin/listings?status=needs_action&limit=200')
    .set('Authorization', `Bearer ${a.token}`).expect(200);
  const ids = res.body.map((c) => c.id);

  assert.ok(ids.includes(review.id), 'under_review is waiting on an approval');
  assert.ok(ids.includes(approved.id), 'approved is waiting on a publication');
  for (const [label, row] of [['live', live], ['rejected', rejected], ['draft', draft]]) {
    assert.equal(ids.includes(row.id), false, `${label} is not waiting on us`);
  }
  // Every row is one of the two, whatever else the shared test database holds.
  for (const c of res.body) {
    assert.ok(['under_review', 'approved'].includes(c.status), `unexpected status ${c.status}`);
  }
});

test('needs_action is ordered oldest first — a queue, not a feed', async () => {
  const a = await admin();
  const seller = await register('Ordering Seller', 'seller');
  const older = await car(seller.id, 'under_review', 40);
  const newer = await car(seller.id, 'under_review', 39);

  const res = await api().get('/admin/listings?status=needs_action&limit=200')
    .set('Authorization', `Bearer ${a.token}`).expect(200);
  const ids = res.body.map((c) => c.id);
  assert.ok(ids.indexOf(older.id) < ids.indexOf(newer.id), 'the longer-waiting car comes first');

  const times = res.body.map((c) => new Date(c.created_at).getTime());
  assert.deepEqual(times, [...times].sort((x, y) => x - y), 'ascending by created_at throughout');
});

test('the single-status views are unchanged, and still newest first', async () => {
  const a = await admin();
  const seller = await register('Browse Seller', 'seller');
  const older = await car(seller.id, 'rejected', 60);
  const newer = await car(seller.id, 'rejected', 59);

  const res = await api().get('/admin/listings?status=rejected&limit=200')
    .set('Authorization', `Bearer ${a.token}`).expect(200);
  const ids = res.body.map((c) => c.id);
  assert.ok(ids.indexOf(newer.id) < ids.indexOf(older.id), 'browse stays newest first');
  for (const c of res.body) assert.equal(c.status, 'rejected');
});

test('an unknown status is still rejected, and the view is still admin-only', async () => {
  const a = await admin();
  const outsider = await register('Outsider');
  for (const status of ['needs_attention', 'needs-action', 'NEEDS_ACTION', 'anything']) {
    await api().get(`/admin/listings?status=${status}`)
      .set('Authorization', `Bearer ${a.token}`).expect(400);
  }
  await api().get('/admin/listings?status=needs_action')
    .set('Authorization', `Bearer ${outsider.token}`).expect(403);
  await api().get('/admin/listings?status=needs_action').expect(401);
});

test.after(async () => { await pool.end(); });
