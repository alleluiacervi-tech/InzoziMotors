// ─────────────────────────────────────────────────────────────────────────────
// Report entitlements.
//
// Access to an inspection report was `customer_user_id = me`: one inspection,
// one reader, forever. That made the thing Sawa actually sells sellable exactly
// once. These tests are about the second sale — and about the two shapes that
// must stay impossible while it becomes possible:
//
//   • a "purchase" that names no payment, which is a giveaway wearing a
//     revenue label;
//   • a free grant with no written reason, which is an access decision nobody
//     can account for later.
//
// Both are CHECK constraints, and the last test goes around the routes entirely
// to prove it.
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

async function register(name = 'Person', role = 'buyer') {
  const email = uniq('ent');
  const r = await api().post('/auth/register')
    .send({ name, email, password: 'password123', role }).expect(201);
  return { id: r.body.user.id, email, password: 'password123', token: r.body.token, name };
}
async function admin() {
  const u = await register('Report Operator');
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [u.id]);
  const r = await api().post('/auth/login').send({ email: u.email, password: u.password }).expect(200);
  return { ...u, token: r.body.token };
}
async function centre(auth) {
  const name = `Ent Centre ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const res = await api().post('/centers').set(auth)
    .send({ name, address: 'Kigali', daily_capacity: 20, active: true });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.name || name;
}

/** A completed walk-in inspection and the customer who commissioned it. */
async function walkIn(a) {
  const auth = { Authorization: `Bearer ${a.token}` };
  const day = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  const booked = await api().post('/inspections/standalone').set(auth).send({
    customer: { name: 'Walk-in Customer', email: uniq('walkin') },
    make: 'Toyota', model: 'Vitz', year: 2016,
    center: await centre(auth), scheduled_date: day, scheduled_time: '10:00 AM',
  });
  assert.equal(booked.status, 201, `booking: ${JSON.stringify(booked.body)}`);
  const inspectionId = booked.body.id || booked.body.inspection?.id;
  assert.ok(inspectionId, JSON.stringify(booked.body));

  await api().post(`/inspections/${inspectionId}/start`).set(auth).expect(200);
  await api().post(`/inspections/${inspectionId}/complete`).set(auth)
    .send({ checklist_results: allPass() }).expect(200);
  // Completing scores the inspection; issuing writes the PDF. They are separate
  // acts, so a report nobody issued is a 404 however entitled the reader is.
  const issued = await api().post(`/inspections/${inspectionId}/report`).set(auth);
  assert.ok([200, 201].includes(issued.status), `issue report: ${JSON.stringify(issued.body)}`);

  const { rows } = await pool.query(
    'SELECT customer_user_id FROM inspections WHERE id = $1', [inspectionId]
  );
  return { inspectionId, customerId: rows[0].customer_user_id };
}
/** A token for a user id, without knowing their password. */
async function tokenFor(userId) {
  const email = uniq('holder');
  await pool.query(
    "UPDATE users SET email=$1, password_hash=(SELECT password_hash FROM users WHERE email LIKE 'ent-%' AND password_hash IS NOT NULL LIMIT 1) WHERE id=$2",
    [email, userId]
  );
  const r = await api().post('/auth/login').send({ email, password: 'password123' });
  assert.equal(r.status, 200, `login for holder: ${JSON.stringify(r.body)}`);
  return r.body.token;
}

test('the original customer keeps access, as an entitlement rather than a column', async () => {
  const a = await admin();
  const { inspectionId, customerId } = await walkIn(a);

  const { rows } = await pool.query(
    `SELECT source, revoked_at FROM report_entitlements
      WHERE inspection_id = $1 AND user_id = $2`, [inspectionId, customerId]
  );
  assert.equal(rows.length, 1, 'commissioning an inspection entitles you to its report');
  assert.equal(rows[0].source, 'paid_customer');
  assert.equal(rows[0].revoked_at, null);
});

test('a second buyer can buy the same report, and the money is recorded with the access', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const { inspectionId } = await walkIn(a);
  const secondBuyer = await register('Second Buyer');

  const sold = await api().post(`/inspections/${inspectionId}/entitlements`).set(auth)
    .send({ user_id: secondBuyer.id, source: 'purchased', amount: 15000, method: 'mobile_money', reference: 'MOMO-77' });
  assert.equal(sold.status, 201, `sale: ${JSON.stringify(sold.body)}`);
  assert.equal(sold.body.source, 'purchased');
  assert.ok(sold.body.fee_id, 'a sale points at its payment');

  // The fee is real, and is NOT an 'inspection' fee — that type permits one
  // live row per inspection, which is what made a second sale impossible.
  const fee = (await pool.query('SELECT * FROM platform_fees WHERE id = $1', [sold.body.fee_id])).rows[0];
  assert.equal(fee.fee_type, 'report');
  assert.equal(Number(fee.amount), 15000);
  assert.equal(fee.payer_user_id, secondBuyer.id);
  assert.equal(fee.seller_id, null);
  assert.equal(fee.status, 'paid');

  // And they can actually read it.
  const file = await api().get(`/inspections/${inspectionId}/report/customer-file`)
    .set('Authorization', `Bearer ${secondBuyer.token}`);
  assert.equal(file.status, 200, `download: ${JSON.stringify(file.body)}`);
  assert.match(String(file.headers['content-type']), /pdf/);

  // A third sale is allowed too — that is the whole point.
  const thirdBuyer = await register('Third Buyer');
  await api().post(`/inspections/${inspectionId}/entitlements`).set(auth)
    .send({ user_id: thirdBuyer.id, source: 'purchased', amount: 15000, method: 'cash' }).expect(201);
  const fees = await pool.query(
    "SELECT COUNT(*)::int AS n FROM platform_fees WHERE inspection_id = $1 AND fee_type = 'report'", [inspectionId]
  );
  assert.equal(fees.rows[0].n, 2, 'one inspection, two report sales');
});

test('a stranger cannot read it, and a 404 does not admit it exists', async () => {
  const a = await admin();
  const { inspectionId } = await walkIn(a);
  const stranger = await register('Stranger');

  const res = await api().get(`/inspections/${inspectionId}/report/customer-file`)
    .set('Authorization', `Bearer ${stranger.token}`);
  assert.equal(res.status, 404, 'not 403 — a stranger learns nothing');
  await api().get(`/inspections/${inspectionId}/report/customer-file`).expect(401);
});

test('withdrawing access actually withdraws it, and stays on the record', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const { inspectionId } = await walkIn(a);
  const buyer = await register('Regretted Buyer');

  const sold = await api().post(`/inspections/${inspectionId}/entitlements`).set(auth)
    .send({ user_id: buyer.id, source: 'purchased', amount: 15000, method: 'cash' }).expect(201);
  await api().get(`/inspections/${inspectionId}/report/customer-file`)
    .set('Authorization', `Bearer ${buyer.token}`).expect(200);

  await api().post(`/inspections/${inspectionId}/entitlements/${sold.body.id}/revoke`).set(auth)
    .send({ reason: 'Payment was reversed by the bank.' }).expect(200);

  await api().get(`/inspections/${inspectionId}/report/customer-file`)
    .set('Authorization', `Bearer ${buyer.token}`).expect(404);

  const row = (await pool.query('SELECT * FROM report_entitlements WHERE id = $1', [sold.body.id])).rows[0];
  assert.ok(row, 'the entitlement is revoked, not deleted');
  assert.ok(row.revoked_at);
  assert.equal(row.revoked_by, a.id);
  assert.match(row.revoke_reason, /reversed/i);
  // The fee is untouched: the money was taken and that fact does not change.
  const fee = (await pool.query('SELECT status FROM platform_fees WHERE id = $1', [row.fee_id])).rows[0];
  assert.equal(fee.status, 'paid');

  // And the same person can be granted access again — the unique index excludes
  // revoked rows precisely so a mistake is recoverable.
  await api().post(`/inspections/${inspectionId}/entitlements`).set(auth)
    .send({ user_id: buyer.id, source: 'admin_grant', note: 'Bank reversal was itself an error; access restored.' })
    .expect(201);
  await api().get(`/inspections/${inspectionId}/report/customer-file`)
    .set('Authorization', `Bearer ${buyer.token}`).expect(200);

  const revoke = await pool.query(
    "SELECT action FROM admin_audit_log WHERE target_id = $1 AND action = 'report.access_revoked'", [inspectionId]
  );
  assert.equal(revoke.rows.length, 1);
});

test('the routes refuse a sale with no money and a grant with no reason', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const { inspectionId } = await walkIn(a);
  const person = await register('Would-be Holder');

  for (const [body, field] of [
    [{ user_id: person.id, source: 'purchased' }, 'amount'],
    [{ user_id: person.id, source: 'purchased', amount: 0, method: 'cash' }, 'amount'],
    [{ user_id: person.id, source: 'purchased', amount: -5, method: 'cash' }, 'amount'],
    [{ user_id: person.id, source: 'purchased', amount: 15000 }, 'method'],
    [{ user_id: person.id, source: 'purchased', amount: 15000, method: 'bitcoin' }, 'method'],
    [{ user_id: person.id, source: 'admin_grant' }, 'note'],
    [{ user_id: person.id, source: 'admin_grant', note: 'because' }, 'note'],
    [{ user_id: person.id, source: 'paid_customer' }, 'source'],
    [{ user_id: person.id, source: 'nonsense' }, 'source'],
    [{ user_id: 'not-a-uuid', source: 'seller_copy' }, 'user_id'],
  ]) {
    const res = await api().post(`/inspections/${inspectionId}/entitlements`).set(auth).send(body);
    assert.equal(res.status, 400, `${JSON.stringify(body)} -> ${res.status}`);
    assert.equal(res.body.field, field, JSON.stringify(res.body));
  }
  // Nothing was created by any of that.
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS n FROM report_entitlements WHERE inspection_id = $1 AND user_id = $2',
    [inspectionId, person.id]
  );
  assert.equal(rows[0].n, 0);
});

test('an incomplete inspection has no report to sell', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const day = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  const booked = await api().post('/inspections/standalone').set(auth).send({
    customer: { name: 'Not Yet', email: uniq('notyet') },
    make: 'Honda', model: 'Fit', year: 2015,
    center: await centre(auth), scheduled_date: day, scheduled_time: '11:00 AM',
  }).expect(201);
  const id = booked.body.id || booked.body.inspection?.id;
  const buyer = await register('Eager Buyer');

  const res = await api().post(`/inspections/${id}/entitlements`).set(auth)
    .send({ user_id: buyer.id, source: 'purchased', amount: 15000, method: 'cash' });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'REPORT_NOT_READY');
  // Critically, no fee was taken for a report that does not exist.
  const fees = await pool.query(
    "SELECT COUNT(*)::int AS n FROM platform_fees WHERE inspection_id = $1 AND fee_type = 'report'", [id]
  );
  assert.equal(fees.rows[0].n, 0, 'the transaction rolled the payment back with the access');
});

test('a holder can find their own reports, and only their own', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const { inspectionId } = await walkIn(a);
  const holder = await register('Report Holder');
  const other = await register('Somebody Else');

  await api().post(`/inspections/${inspectionId}/entitlements`).set(auth)
    .send({ user_id: holder.id, source: 'purchased', amount: 15000, method: 'cash' }).expect(201);

  const mine = await api().get('/inspections/my-reports')
    .set('Authorization', `Bearer ${holder.token}`).expect(200);
  const found = mine.body.find((r) => r.inspection_id === inspectionId);
  assert.ok(found, 'an entitlement is worthless if its holder cannot find it');
  assert.equal(found.vehicle, '2016 Toyota Vitz');
  assert.equal(Number(found.score), 150);
  assert.equal(Number(found.paid_rwf), 15000);
  assert.equal(found.file_url, `/inspections/${inspectionId}/report/customer-file`);

  const theirs = await api().get('/inspections/my-reports')
    .set('Authorization', `Bearer ${other.token}`).expect(200);
  assert.equal(theirs.body.some((r) => r.inspection_id === inspectionId), false);
  await api().get('/inspections/my-reports').expect(401);
});

test('the admin view lists who holds a report, and is admin-only', async () => {
  const a = await admin();
  const auth = { Authorization: `Bearer ${a.token}` };
  const { inspectionId } = await walkIn(a);
  const buyer = await register('Listed Buyer');
  await api().post(`/inspections/${inspectionId}/entitlements`).set(auth)
    .send({ user_id: buyer.id, source: 'purchased', amount: 20000, method: 'bank_transfer', reference: 'BK-1' })
    .expect(201);

  const list = await api().get(`/inspections/${inspectionId}/entitlements`).set(auth).expect(200);
  assert.equal(list.body.length, 2, 'the original customer and the buyer');
  const sale = list.body.find((e) => e.user_id === buyer.id);
  assert.equal(sale.source, 'purchased');
  assert.equal(Number(sale.amount_rwf), 20000);
  assert.equal(sale.method, 'bank_transfer');
  assert.equal(sale.granted_by_name, 'Report Operator');

  await api().get(`/inspections/${inspectionId}/entitlements`)
    .set('Authorization', `Bearer ${buyer.token}`).expect(403);
  await api().get(`/inspections/${inspectionId}/entitlements`).expect(401);
});

test('the database itself refuses an unpaid sale and an unexplained grant', async () => {
  // The routes validate, but a route is something a future caller can bypass.
  // This is the floor, reached directly with no HTTP layer in the way.
  const a = await admin();
  const { inspectionId } = await walkIn(a);
  const person = await register('Direct');

  await assert.rejects(
    () => pool.query(
      `INSERT INTO report_entitlements (inspection_id, user_id, source)
       VALUES ($1, $2, 'purchased')`, [inspectionId, person.id]),
    (err) => err.code === '23514', 'a purchase with no fee is an impossible row');

  await assert.rejects(
    () => pool.query(
      `INSERT INTO report_entitlements (inspection_id, user_id, source)
       VALUES ($1, $2, 'admin_grant')`, [inspectionId, person.id]),
    (err) => err.code === '23514', 'a grant with no reason is an impossible row');

  await assert.rejects(
    () => pool.query(
      `INSERT INTO report_entitlements (inspection_id, user_id, source, note)
       VALUES ($1, $2, 'admin_grant', ' short ')`, [inspectionId, person.id]),
    (err) => err.code === '23514', 'and neither is a token one');

  await assert.rejects(
    () => pool.query(
      `INSERT INTO report_entitlements (inspection_id, user_id, source)
       VALUES ($1, $2, 'whatever')`, [inspectionId, person.id]),
    (err) => err.code === '23514', 'nor an invented source');

  // A seller_copy needs neither, and is allowed.
  await pool.query(
    `INSERT INTO report_entitlements (inspection_id, user_id, source)
     VALUES ($1, $2, 'seller_copy')`, [inspectionId, person.id]);

  // And only one live row per person per report.
  await assert.rejects(
    () => pool.query(
      `INSERT INTO report_entitlements (inspection_id, user_id, source)
       VALUES ($1, $2, 'seller_copy')`, [inspectionId, person.id]),
    (err) => err.code === '23505');
});

test.after(async () => { await pool.end(); });
