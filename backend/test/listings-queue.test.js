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

// ─── Finding one specific car ────────────────────────────────────────────────
//
// The queue is oldest-first with a page limit, and the dashboard used to filter
// the fetched page in the browser. Those two facts together mean the newest
// vehicle — the one just worked on — falls off the end of the page, and typing
// its name finds nothing. Indistinguishable, from the operator's chair, from the
// car not existing. Search runs on the server for that reason.

test('search covers the whole matching set, not just the page', async () => {
  const a = await admin();
  const seller = await register('Search Seller', 'seller');
  // Deliberately the NEWEST row, which is where the page window does not reach.
  const needle = await car(seller.id, 'under_review', 0);
  await pool.query("UPDATE cars SET title='Findable Needle Coupe', model='Needle', vin='WVWZZZ1JZXW000001' WHERE id=$1", [needle.id]);

  const bare = await api().get('/admin/listings?status=needs_action&limit=1')
    .set('Authorization', `Bearer ${a.token}`).expect(200);
  assert.equal(bare.body.length, 1, 'the page really is a window');
  const total = Number(bare.headers['x-total-count']);
  assert.ok(total > 1, `the total reports the whole queue (${total})`);

  // Each of these is a thing an operator would actually type.
  for (const [label, q] of [
    ['listing id', needle.id],
    ['model', 'Needle'],
    ['title words', 'Findable'],
    ['vin', 'WVWZZZ1JZXW000001'],
    ['seller name', 'Search Seller'],
    ['lowercase model', 'needle'],
  ]) {
    const res = await api().get(`/admin/listings?status=needs_action&limit=5&q=${encodeURIComponent(q)}`)
      .set('Authorization', `Bearer ${a.token}`).expect(200);
    assert.ok(res.body.some((c) => c.id === needle.id), `findable by ${label}`);
  }

  // And search narrows rather than merely reordering.
  const narrow = await api().get('/admin/listings?status=needs_action&limit=200&q=Findable')
    .set('Authorization', `Bearer ${a.token}`).expect(200);
  assert.ok(Number(narrow.headers['x-total-count']) < total, 'the total reflects the search');
  for (const c of narrow.body) {
    assert.match(`${c.title} ${c.make} ${c.model}`, /Findable|Needle/i);
  }
});

test('search cannot reach past its status filter, or be used for injection', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const seller = await register('Scoped Seller', 'seller');
  const published = await car(seller.id, 'live', 0);
  await pool.query("UPDATE cars SET title='Scoped Live Sedan' WHERE id=$1", [published.id]);

  // A live car is not waiting on anyone, so it must not appear in that view
  // however specifically it is searched for.
  const scoped = await api().get(`/admin/listings?status=needs_action&limit=200&q=${published.id}`)
    .set(auth).expect(200);
  assert.equal(scoped.body.length, 0, 'search respects the status filter');
  const found = await api().get(`/admin/listings?status=live&limit=200&q=${published.id}`)
    .set(auth).expect(200);
  assert.ok(found.body.some((c) => c.id === published.id), 'and finds it under the right one');

  // Parameterised, so these are searched for literally rather than executed.
  for (const q of ["'; DROP TABLE cars; --", '%', '100%', '_', 'a\\b', "''"]) {
    const res = await api().get(`/admin/listings?status=needs_action&limit=5&q=${encodeURIComponent(q)}`)
      .set(auth);
    assert.equal(res.status, 200, `q=${q} is data, not SQL`);
  }
  assert.ok(Number((await pool.query('SELECT COUNT(*) AS n FROM cars')).rows[0].n) > 0,
    'the cars table is still there');
});

test('the reported total honours every filter at once', async () => {
  // The count query reuses the WHERE clause built for the page query, with the
  // trailing limit/offset parameters sliced off. That is correct only while
  // limit and offset are the LAST two pushed — `make` and `q` are pushed before
  // them. If that ever stops holding, the count silently answers a different
  // question than the list, and the page tells the operator a number that is
  // not about the rows in front of them.
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const seller = await register('Total Seller', 'seller');
  const target = await car(seller.id, 'under_review', 0);
  await pool.query("UPDATE cars SET title='Total Filter Bora' WHERE id=$1", [target.id]);

  const totalOf = async (qs) => {
    const res = await api().get(`/admin/listings?${qs}`).set(auth).expect(200);
    const total = Number(res.headers['x-total-count']);
    assert.ok(Number.isFinite(total), `a count came back for ${qs}`);
    return { total, rows: res.body };
  };

  const all = await totalOf('status=under_review&limit=5');
  const byMake = await totalOf('status=under_review&make=Volkswagen&limit=5');
  const byBoth = await totalOf('status=under_review&make=Volkswagen&q=Total%20Filter&limit=5');

  assert.ok(byMake.total <= all.total, `make narrows the total (${byMake.total} <= ${all.total})`);
  assert.ok(byBoth.total <= byMake.total, `q narrows it further (${byBoth.total} <= ${byMake.total})`);
  assert.ok(byBoth.total >= 1, 'and still finds the vehicle it should');
  for (const row of byMake.rows) assert.match(row.make, /volkswagen/i);
  for (const row of byBoth.rows) assert.match(`${row.title} ${row.model}`, /total filter|bora/i);

  // The strongest form: when the page holds the entire result, the total must
  // equal exactly what is on it.
  const full = await api().get('/admin/listings?status=under_review&make=Volkswagen&q=Total%20Filter&limit=200')
    .set(auth).expect(200);
  assert.ok(full.body.length < 200, 'the narrow search fits in one page');
  assert.equal(Number(full.headers['x-total-count']), full.body.length,
    'the count and the list are answering the same question');
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
