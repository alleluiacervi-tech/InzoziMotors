// ─────────────────────────────────────────────────────────────────────────────
// The inspection fee, and delivering what it paid for.
//
// Money is collected offline and only RECORDED here — payments_enabled is false
// and locked, and there is no provider client in the tree. What these tests
// protect is therefore not a payment flow but a bookkeeping one:
//
//   • a fee is recorded exactly once, and a correction is void-and-re-record
//     rather than a silent edit, so the mistake and its reason both survive;
//   • a listing inspection is never billed to a customer (it's bundled into
//     the free submission process — billing it at all is the failure mode);
//   • the report reaches its own customer and nobody else, answering 404 rather
//     than 403 so a stranger cannot learn an inspection exists.
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
const checklist = (verdict = 'pass') => Object.fromEntries(REQUIRED_ITEM_IDS.map((id) => [id, verdict]));

let fixtureDay = 600;
const nextDay = () => new Date(Date.now() + fixtureDay++ * 86400_000).toISOString().slice(0, 10);

async function register(overrides = {}) {
  const body = { name: 'Fee User', email: unique('fee'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}
async function makeAdmin(user) {
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}
async function walkIn(admin, { complete = false } = {}) {
  const auth = { Authorization: `Bearer ${admin}` };
  const day = nextDay();
  // Fixture days repeat across runs and would eventually fill the centre.
  await pool.query(
    // rental_cars.inspection_id is ON DELETE RESTRICT, so a fixture inspection a
  // previous run turned into a rental car must be left alone.
  "DELETE FROM inspections i WHERE lower(i.center)='nyarutarama center' AND i.scheduled_on=$1::date"
    + " AND NOT EXISTS (SELECT 1 FROM rental_cars rc WHERE rc.inspection_id = i.id)", [day]
  );
  const booked = await api().post('/inspections/standalone').set(auth).send({
    make: 'Toyota', model: 'Prado', year: 2014,
    center: 'Nyarutarama Center', scheduled_date: day, scheduled_time: '10:00 AM',
    customer: { name: 'Paying Customer', email: unique('payer') },
  }).expect(201);
  if (complete) {
    await api().post(`/inspections/${booked.body.id}/start`).set(auth).expect(200);
    await api().post(`/inspections/${booked.body.id}/complete`).set(auth)
      .send({ checklist_results: checklist() }).expect(200);
  }
  return booked.body;
}

test.after(async () => { await pool.end(); });

test('a walk-in fee is recorded once, and a correction is a void and a re-record', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const inspection = await walkIn(admin);

  const fee = await api().post(`/inspections/${inspection.id}/fee`).set(auth)
    .send({ amount: 30000, method: 'mobile_money', reference: 'MOMO-88213' }).expect(201);
  assert.equal(fee.body.fee_type, 'inspection');
  assert.equal(fee.body.amount, 30000);
  assert.equal(fee.body.status, 'paid');
  assert.equal(fee.body.payer_user_id, inspection.customer_user_id);
  // A walk-in has a customer, never a seller — the database enforces it too.
  assert.equal(fee.body.seller_id, null);
  assert.ok(fee.body.collected_at);

  // Recorded twice is refused, not silently duplicated.
  const again = await api().post(`/inspections/${inspection.id}/fee`).set(auth)
    .send({ amount: 30000, method: 'cash' }).expect(409);
  assert.equal(again.body.code, 'FEE_ALREADY_RECORDED');

  // A void needs a reason, because the reason is the point of keeping the row.
  await api().delete(`/inspections/${inspection.id}/fee`).set(auth).send({ reason: 'x' }).expect(400);
  const voided = await api().delete(`/inspections/${inspection.id}/fee`).set(auth)
    .send({ reason: 'Entered 30,000 instead of 25,000' }).expect(200);
  assert.equal(voided.body.status, 'waived');
  assert.match(voided.body.void_reason, /25,000/);

  // The corrected amount can now be entered, and both rows survive.
  const corrected = await api().post(`/inspections/${inspection.id}/fee`).set(auth)
    .send({ amount: 25000, method: 'cash' }).expect(201);
  assert.equal(corrected.body.amount, 25000);
  const { rows } = await pool.query(
    "SELECT amount, status FROM platform_fees WHERE inspection_id=$1 ORDER BY created_at", [inspection.id]
  );
  assert.equal(rows.length, 2, 'the voided entry must not be deleted');
  assert.deepEqual(rows.map((r) => r.status).sort(), ['paid', 'waived']);
});

test('a listing inspection is never billed to a customer', async () => {
  // Listing inspections are free, bundled into the submission process — there
  // is no fee to bill here at all.
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified='approved' WHERE id=$1", [seller.id]);
  const submission = await api().post('/submissions').set('Authorization', `Bearer ${seller.token}`)
    .send({ make: 'Toyota', model: 'Fee Guard', year: 2019, mileage: 30000, asking_price: 12000000 })
    .expect(201);
  await api().patch(`/submissions/${submission.body.id}`).set(auth)
    .send({ status: 'scheduled', center: 'Nyarutarama Center', scheduled_date: nextDay(), scheduled_time: '09:00 AM' })
    .expect(200);
  const { rows } = await pool.query('SELECT id FROM inspections WHERE submission_id=$1', [submission.body.id]);

  const refused = await api().post(`/inspections/${rows[0].id}/fee`).set(auth)
    .send({ amount: 30000, method: 'cash' }).expect(409);
  assert.match(refused.body.error, /walk-in/i);
  await api().delete(`/inspections/${rows[0].id}/fee`).set(auth).send({ reason: 'attempted' }).expect(404);
});

test('the fee route validates its inputs and its caller', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const inspection = await walkIn(admin);

  await api().post(`/inspections/${inspection.id}/fee`).set(auth).send({ method: 'cash' }).expect(400);
  await api().post(`/inspections/${inspection.id}/fee`).set(auth).send({ amount: 0, method: 'cash' }).expect(400);
  await api().post(`/inspections/${inspection.id}/fee`).set(auth).send({ amount: 30000, method: 'bitcoin' }).expect(400);

  const outsider = await register();
  await api().post(`/inspections/${inspection.id}/fee`)
    .set('Authorization', `Bearer ${outsider.token}`).send({ amount: 30000, method: 'cash' }).expect(403);
  await api().post(`/inspections/${inspection.id}/fee`).send({ amount: 30000, method: 'cash' }).expect(401);
});

test('the report reaches its own customer, and answers 404 to everyone else', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const inspection = await walkIn(admin, { complete: true });
  await api().post(`/inspections/${inspection.id}/report`).set(auth).expect((res) => {
    assert.ok([200, 201].includes(res.status), `issuing the report returned ${res.status}`);
  });

  // The customer's account is created unusable, so give them a password the way
  // the activation link would.
  const token = require('crypto').randomBytes(32).toString('base64url');
  await pool.query('UPDATE users SET invite_token_hash=$1 WHERE id=$2', [
    require('crypto').createHash('sha256').update(token).digest('hex'), inspection.customer_user_id,
  ]);
  const activated = await api().post('/auth/accept-invite')
    .send({ token, password: 'customer-password-1' }).expect(200);

  await api().get(`/inspections/${inspection.id}/report/customer-file`)
    .set('Authorization', `Bearer ${activated.body.token}`).expect(200);
  // Admins keep their own route and can also use this one.
  await api().get(`/inspections/${inspection.id}/report/customer-file`).set(auth).expect(200);

  // Anyone else is told the report does not exist, not that it is forbidden.
  const stranger = await register();
  await api().get(`/inspections/${inspection.id}/report/customer-file`)
    .set('Authorization', `Bearer ${stranger.token}`).expect(404);
  await api().get(`/inspections/${inspection.id}/report/customer-file`).expect(401);
});

test('the report is issued whether or not the fee has been typed in', async () => {
  // Deliberate: gating the PDF on a recorded fee turns a data-entry omission
  // into a customer stuck at the counter. The admin sees a banner instead.
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const inspection = await walkIn(admin, { complete: true });

  const issued = await api().post(`/inspections/${inspection.id}/report`).set(auth);
  assert.ok([200, 201].includes(issued.status));

  const detail = await api().get(`/inspections/${inspection.id}`).set(auth).expect(200);
  assert.equal(detail.body.fee, null, 'the detail must show the fee is missing so the banner can');

  await api().post(`/inspections/${inspection.id}/fee`).set(auth)
    .send({ amount: 30000, method: 'bank_transfer', reference: 'BK-4471' }).expect(201);
  const paid = await api().get(`/inspections/${inspection.id}`).set(auth).expect(200);
  assert.equal(paid.body.fee.amount, 30000);
  assert.equal(paid.body.fee.method, 'bank_transfer');
});

test('telling the customer the report is ready is its own deliberate step', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const incomplete = await walkIn(admin);
  await api().post(`/inspections/${incomplete.id}/report/notify`).set(auth).expect(409);

  const done = await walkIn(admin, { complete: true });
  const notified = await api().post(`/inspections/${done.id}/report/notify`).set(auth).expect(200);
  // Mail is not configured under test; what matters is that the route reports
  // the outcome honestly rather than claiming a send it did not make.
  assert.equal(typeof notified.body.sent, 'boolean');

  const { rows } = await pool.query(
    "SELECT action FROM admin_audit_log WHERE target_id=$1 AND action='inspection.report_notified'", [done.id]
  );
  assert.equal(rows.length, 1);

  const outsider = await register();
  await api().post(`/inspections/${done.id}/report/notify`)
    .set('Authorization', `Bearer ${outsider.token}`).expect(403);
});
