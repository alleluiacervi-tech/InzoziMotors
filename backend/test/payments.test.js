// ─────────────────────────────────────────────────────────────────────────────
// Rental payments (Pesapal hosted checkout) — the money machine, end to end.
//
// The gateway is stubbed at global.fetch: CI must never depend on Pesapal, and
// the interesting behaviour — holds that expire by falling out of a WHERE
// clause, IPNs delivered twice, money arriving for dates that are gone — is
// all ours, exercised against a real PostgreSQL like the rest of the suite.
//
// The contract under test, in one breath: a pay-online booking is a 35-minute
// HOLD that only verified gateway truth can turn into a real booking; the
// ledger hears about each booking exactly once; a completed payment never
// manufactures a double-booking; and when payments are unconfigured the
// feature simply does not exist.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';
process.env.PESAPAL_CONSUMER_KEY = 'test_consumer_key';
process.env.PESAPAL_CONSUMER_SECRET = 'test_consumer_secret';
process.env.PESAPAL_ENV = 'sandbox';
process.env.PESAPAL_IPN_URL = 'https://api.test.local/payments/ipn';
process.env.PESAPAL_CALLBACK_URL = 'https://web.test.local/rentals/payment-return';

const { app } = require('../server');
const pool = require('../src/db');

// ─── The gateway, stubbed ─────────────────────────────────────────────────────
// Every Pesapal endpoint the client touches, answered locally. Anything else
// reaching fetch during these tests is a bug, so it throws.
const gateway = {
  // Real Pesapal tracking ids are GUIDs; ours must at least be unique across
  // test runs, because payments.order_tracking_id is UNIQUE and the test
  // database keeps its rows between runs.
  runId: `${process.pid.toString(16)}${Date.now().toString(16)}`,
  trkCounter: 0,
  statuses: new Map(),   // orderTrackingId → Pesapal payment_status_description
  orders: new Map(),     // orderTrackingId → the SubmitOrderRequest body we got
  lastOrder: null,
  rejectNextOrder: false,
};

global.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (!u.startsWith('https://cybqa.pesapal.com/pesapalv3')) {
    throw new Error(`unexpected fetch during payments tests: ${u}`);
  }
  const json = (body) => ({ ok: true, status: 200, json: async () => body });

  if (u.includes('/api/Auth/RequestToken')) {
    return json({ token: 'tok_test', expiryDate: new Date(Date.now() + 300_000).toISOString() });
  }
  if (u.includes('/api/URLSetup/RegisterIPN')) {
    return json({ ipn_id: 'ipn_test_0001', url: process.env.PESAPAL_IPN_URL });
  }
  if (u.includes('/api/Transactions/SubmitOrderRequest')) {
    const body = JSON.parse(opts.body);
    gateway.lastOrder = body;
    if (gateway.rejectNextOrder) {
      gateway.rejectNextOrder = false;
      return json({ error: { code: 'order_rejected', message: 'stubbed rejection' } });
    }
    const id = `TRK-${gateway.runId}-${++gateway.trkCounter}`;
    gateway.statuses.set(id, 'PENDING');
    gateway.orders.set(id, body);
    return json({
      order_tracking_id: id,
      merchant_reference: body.id,
      redirect_url: `https://cybqa.pesapal.com/pesapalv3/pay?trk=${id}`,
    });
  }
  if (u.includes('/api/Transactions/GetTransactionStatus')) {
    const id = new URL(u).searchParams.get('orderTrackingId');
    const desc = gateway.statuses.get(id) || 'PENDING';
    const order = gateway.orders.get(id) || {};
    return json({
      payment_status_description: desc,
      payment_method: desc === 'COMPLETED' ? 'MpesaMTNRW' : null,
      confirmation_code: desc === 'COMPLETED' ? `CONF-${id}` : null,
      amount: order.amount ?? null,
      currency: order.currency || 'RWF',
    });
  }
  throw new Error(`unhandled pesapal path in stub: ${u}`);
};

// ─── Helpers (same shapes as api.test.js) ─────────────────────────────────────
const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const auth = (u) => ({ Authorization: `Bearer ${u.token}` });

async function register(overrides = {}) {
  const body = {
    name: 'Payments Tester',
    email: unique('pay'),
    password: 'password123',
    role: 'buyer',
    ...overrides,
  };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}

let adminToken;
test.before(async () => {
  const admin = await register({ name: 'Payments Admin' });
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
  const res = await api().post('/auth/login')
    .send({ email: admin.email, password: admin.password }).expect(200);
  adminToken = res.body.token;
});
test.after(async () => { await pool.end(); });

// Each test gets its own car, so date overlaps never leak between tests.
// daily 50,000 / deposit 100,000 → 3 days = 150,000 subtotal, 250,000 total.
async function createCar(overrides = {}) {
  const res = await api().post('/rentals')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: `Pesapal Test Car ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      daily_rate: 50_000, deposit: 100_000, min_days: 1,
      ...overrides,
    })
    .expect(201);
  return res.body;
}

const START = '2030-01-10';

async function bookOnline(renter, carId, extra = {}) {
  const res = await api().post(`/rentals/${carId}/book`)
    .set(auth(renter))
    .send({ start_date: START, days: 3, pay_online: true, ...extra })
    .expect(201);
  const { rows } = await pool.query(
    'SELECT * FROM payments WHERE merchant_ref = $1', [res.body.payment.merchant_ref]
  );
  return { booking: res.body, payment: rows[0] };
}

const ipn = (payment) => api().post('/payments/ipn').send({
  OrderTrackingId: payment.order_tracking_id,
  OrderMerchantReference: payment.merchant_ref,
});

const ledgerRows = async (bookingId) => (await pool.query(
  "SELECT * FROM platform_fees WHERE booking_id = $1 AND fee_type = 'rental'", [bookingId]
)).rows;

// ─── The booking leg ──────────────────────────────────────────────────────────

test('pay-online charges the rental and pickup fee — never the deposit', async () => {
  const car = await createCar();
  const renter = await register();
  const { booking, payment } = await bookOnline(renter, car.id, { airport_pickup: true });

  assert.equal(booking.status, 'pending_payment');
  assert.match(booking.payment.merchant_ref, /^SP-[A-F0-9]{12}$/);
  assert.ok(booking.payment.redirect_url.includes('/pay?trk='), 'no gateway redirect');

  const expected = booking.subtotal + booking.pickup_fee;
  assert.equal(booking.payment.amount, expected);
  assert.equal(booking.amount_due_online, expected);
  assert.ok(booking.payment.amount < booking.total,
    'the online charge must be less than total — the deposit stays at the center');
  assert.equal(booking.payment.currency, 'RWF');

  // What we actually told the gateway.
  assert.equal(gateway.lastOrder.id, booking.payment.merchant_ref);
  assert.equal(gateway.lastOrder.amount, expected);
  assert.equal(gateway.lastOrder.currency, 'RWF');
  assert.equal(gateway.lastOrder.callback_url, process.env.PESAPAL_CALLBACK_URL);
  assert.ok(gateway.lastOrder.notification_id, 'order submitted without a registered IPN');

  // And what the database remembers about the attempt.
  assert.equal(payment.status, 'pending');
  assert.ok(payment.order_tracking_id, 'tracking id was not stored');
  assert.equal(payment.booking_id, booking.id);
});

test('a pending hold blocks the dates for everyone else', async () => {
  const car = await createCar();
  const holder = await register();
  await bookOnline(holder, car.id);

  const rival = await register();
  await api().post(`/rentals/${car.id}/book`)
    .set(auth(rival))
    .send({ start_date: START, days: 2 })
    .expect(409);
});

test('pay-at-center bookings are untouched by the feature', async () => {
  const car = await createCar();
  const renter = await register();
  const res = await api().post(`/rentals/${car.id}/book`)
    .set(auth(renter))
    .send({ start_date: START, days: 3 })
    .expect(201);

  assert.equal(res.body.status, 'upcoming');
  assert.equal(res.body.payment, null);
  assert.equal(res.body.amount_due_online, null);
  assert.equal(res.body.paid_at, null);
});

test('pay_online without gateway config is a clean 503, and nothing persists', async () => {
  const car = await createCar();
  const renter = await register();
  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;
  delete process.env.PESAPAL_CONSUMER_KEY;
  delete process.env.PESAPAL_CONSUMER_SECRET;
  try {
    const res = await api().post(`/rentals/${car.id}/book`)
      .set(auth(renter))
      .send({ start_date: START, days: 3, pay_online: true })
      .expect(503);
    assert.equal(res.body.code, 'PAYMENTS_NOT_CONFIGURED');
  } finally {
    process.env.PESAPAL_CONSUMER_KEY = key;
    process.env.PESAPAL_CONSUMER_SECRET = secret;
  }
  const { rows } = await pool.query(
    'SELECT COUNT(*) FROM rental_bookings WHERE rental_car_id = $1', [car.id]
  );
  assert.equal(rows[0].count, '0', 'a refused booking left a row behind');
});

test('a USD-priced car refuses online payment but still books at the center', async () => {
  const car = await createCar();
  await pool.query("UPDATE rental_cars SET currency = 'USD' WHERE id = $1", [car.id]);
  const renter = await register();

  const refused = await api().post(`/rentals/${car.id}/book`)
    .set(auth(renter))
    .send({ start_date: START, days: 3, pay_online: true })
    .expect(409);
  assert.equal(refused.body.code, 'PAYMENT_CURRENCY');

  const ok = await api().post(`/rentals/${car.id}/book`)
    .set(auth(renter))
    .send({ start_date: START, days: 3 })
    .expect(201);
  assert.equal(ok.body.currency, 'USD');
});

test('a gateway refusal releases the hold immediately', async () => {
  const car = await createCar();
  const renter = await register();
  gateway.rejectNextOrder = true;

  const res = await api().post(`/rentals/${car.id}/book`)
    .set(auth(renter))
    .send({ start_date: START, days: 3, pay_online: true })
    .expect(502);
  assert.equal(res.body.code, 'GATEWAY_ORDER');

  const { rows: bookings } = await pool.query(
    'SELECT status FROM rental_bookings WHERE rental_car_id = $1', [car.id]
  );
  assert.equal(bookings[0].status, 'expired');
  const { rows: payments } = await pool.query(
    `SELECT p.status FROM payments p
     JOIN rental_bookings b ON b.id = p.booking_id WHERE b.rental_car_id = $1`, [car.id]
  );
  assert.equal(payments[0].status, 'failed');

  // The dates are free again right now, not in 35 minutes.
  const rival = await register();
  await api().post(`/rentals/${car.id}/book`)
    .set(auth(rival))
    .send({ start_date: START, days: 3 })
    .expect(201);
});

// ─── Confirmation: the IPN and the poll converge on one truth ─────────────────

test('a completed IPN confirms the booking and writes the ledger exactly once', async () => {
  const car = await createCar();
  const renter = await register();
  const { booking, payment } = await bookOnline(renter, car.id);

  gateway.statuses.set(payment.order_tracking_id, 'COMPLETED');
  const res = await ipn(payment).expect(200);
  assert.equal(res.body.orderNotificationType, 'IPNCHANGE');
  assert.equal(res.body.status, 200);

  const { rows: p } = await pool.query('SELECT * FROM payments WHERE id = $1', [payment.id]);
  assert.equal(p[0].status, 'completed');
  assert.equal(p[0].confirmation_code, `CONF-${payment.order_tracking_id}`);
  assert.ok(p[0].method, 'payment method was not recorded');
  assert.ok(p[0].confirmed_at, 'confirmed_at was not stamped');
  assert.equal(p[0].raw_status.payment_status_description, 'COMPLETED');

  const { rows: b } = await pool.query('SELECT * FROM rental_bookings WHERE id = $1', [booking.id]);
  assert.equal(b[0].status, 'upcoming');
  assert.ok(b[0].paid_at, 'paid_at was not stamped');

  let fees = await ledgerRows(booking.id);
  assert.equal(fees.length, 1, 'rental revenue missing from the ledger');
  assert.equal(fees[0].status, 'paid');
  assert.equal(Number(fees[0].amount), booking.amount_due_online);
  assert.equal(fees[0].currency, 'RWF');
  assert.equal(fees[0].seller_id, null, 'a house-fleet rental has no seller');

  // Pesapal retries IPNs. Five deliveries, one state change.
  await ipn(payment).expect(200);
  await ipn(payment).expect(200);
  fees = await ledgerRows(booking.id);
  assert.equal(fees.length, 1, 'a duplicate IPN duplicated the ledger row');

  const { rows: notes } = await pool.query(
    'SELECT title FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [renter.id]
  );
  assert.ok(notes.some((n) => n.title === 'Payment received — rental confirmed'),
    'the renter was never told their booking is confirmed');
});

test('a failed charge never confirms the booking', async () => {
  const car = await createCar();
  const renter = await register();
  const { booking, payment } = await bookOnline(renter, car.id);

  gateway.statuses.set(payment.order_tracking_id, 'FAILED');
  await ipn(payment).expect(200);

  const { rows: p } = await pool.query('SELECT * FROM payments WHERE id = $1', [payment.id]);
  assert.equal(p[0].status, 'failed');
  const { rows: b } = await pool.query('SELECT * FROM rental_bookings WHERE id = $1', [booking.id]);
  assert.equal(b[0].status, 'pending_payment', 'a failed payment must not move the booking');
  assert.equal(b[0].paid_at, null);
  assert.equal((await ledgerRows(booking.id)).length, 0, 'a failed payment reached the ledger');
});

test('an IPN for an unknown order is acknowledged, never an error', async () => {
  const res = await api().post('/payments/ipn')
    .send({ OrderTrackingId: 'TRK-NOBODY-KNOWS', OrderMerchantReference: 'SP-DOESNOTEXIST' })
    .expect(200);
  assert.equal(res.body.status, 200);
});

test('the poll endpoint is owner-or-admin and converges like the IPN', async () => {
  const car = await createCar();
  const renter = await register();
  const { booking, payment } = await bookOnline(renter, car.id);
  const ref = payment.merchant_ref;

  // Still on the gateway page: pending, honestly.
  const pending = await api().get(`/payments/${ref}`).set(auth(renter)).expect(200);
  assert.equal(pending.body.status, 'pending');
  assert.equal(pending.body.booking_status, 'pending_payment');

  // Strangers see nothing; malformed and unknown refs are told apart correctly.
  const stranger = await register();
  await api().get(`/payments/${ref}`).set(auth(stranger)).expect(404);
  await api().get(`/payments/${ref}`).expect(401);
  await api().get('/payments/SP-nope').set(auth(renter)).expect(400);
  await api().get('/payments/SP-000000000000').set(auth(renter)).expect(404);

  // The poll is the safety net for a missed IPN: it asks the gateway live.
  gateway.statuses.set(payment.order_tracking_id, 'COMPLETED');
  const done = await api().get(`/payments/${ref}`).set(auth(renter)).expect(200);
  assert.equal(done.body.status, 'completed');
  assert.equal(done.body.booking_status, 'upcoming');
  assert.equal(done.body.booking_ref, booking.booking_ref);
  assert.ok(done.body.confirmation_code);
  assert.equal((await ledgerRows(booking.id)).length, 1);

  // Admin may look too.
  const adminView = await api().get(`/payments/${ref}`)
    .set('Authorization', `Bearer ${adminToken}`).expect(200);
  assert.equal(adminView.body.status, 'completed');
});

// ─── The hold's lifecycle ─────────────────────────────────────────────────────

test('an abandoned hold ages out and frees the dates — no scheduler involved', async () => {
  const car = await createCar();
  const renter = await register();
  const { booking } = await bookOnline(renter, car.id);

  await pool.query(
    "UPDATE rental_bookings SET booked_at = NOW() - INTERVAL '40 minutes' WHERE id = $1",
    [booking.id]
  );

  const rival = await register();
  await api().post(`/rentals/${car.id}/book`)
    .set(auth(rival))
    .send({ start_date: START, days: 3 })
    .expect(201);
});

test('late money for still-free dates confirms the booking anyway', async () => {
  const car = await createCar();
  const renter = await register();
  const { booking, payment } = await bookOnline(renter, car.id);

  await pool.query(
    "UPDATE rental_bookings SET booked_at = NOW() - INTERVAL '40 minutes' WHERE id = $1",
    [booking.id]
  );
  gateway.statuses.set(payment.order_tracking_id, 'COMPLETED');
  await ipn(payment).expect(200);

  const { rows: b } = await pool.query('SELECT * FROM rental_bookings WHERE id = $1', [booking.id]);
  assert.equal(b[0].status, 'upcoming', 'nobody re-took the dates — the payment should stand');
  assert.equal((await ledgerRows(booking.id)).length, 1);
});

test('late money for re-taken dates never double-books — it goes to a human', async () => {
  const car = await createCar();
  const renter = await register();
  const { booking, payment } = await bookOnline(renter, car.id);

  await pool.query(
    "UPDATE rental_bookings SET booked_at = NOW() - INTERVAL '40 minutes' WHERE id = $1",
    [booking.id]
  );
  // The hold aged out and someone else took the dates…
  const rival = await register();
  const taken = await api().post(`/rentals/${car.id}/book`)
    .set(auth(rival))
    .send({ start_date: START, days: 3 })
    .expect(201);

  // …then the original renter's money arrives.
  gateway.statuses.set(payment.order_tracking_id, 'COMPLETED');
  await ipn(payment).expect(200);

  const { rows: p } = await pool.query('SELECT status FROM payments WHERE id = $1', [payment.id]);
  assert.equal(p[0].status, 'completed', 'the money really was captured');

  const { rows: b } = await pool.query('SELECT * FROM rental_bookings WHERE id = $1', [booking.id]);
  assert.equal(b[0].status, 'pending_payment', 'the stale hold must not be revived over a real booking');
  assert.equal(b[0].paid_at, null);
  assert.equal((await ledgerRows(booking.id)).length, 0,
    'money owed back is not revenue and must not reach the ledger');

  // The rival's booking is untouched, and humans were put on the conflict.
  const { rows: rb } = await pool.query(
    'SELECT status FROM rental_bookings WHERE id = $1', [taken.body.id]
  );
  assert.equal(rb[0].status, 'upcoming');

  const { rows: renterNotes } = await pool.query(
    'SELECT title FROM notifications WHERE user_id = $1', [renter.id]
  );
  assert.ok(renterNotes.some((n) => n.title === 'Payment received — booking needs attention'),
    'the renter was left in the dark about their captured payment');
  const { rows: adminNotes } = await pool.query(
    `SELECT n.title FROM notifications n
     JOIN users u ON u.id = n.user_id
     WHERE u.role = 'admin' AND n.title = 'Rental payment needs manual resolution'`
  );
  assert.ok(adminNotes.length >= 1, 'no admin was told to resolve the orphaned payment');
});

test('a renter can cancel a hold but never confirm it', async () => {
  const car = await createCar();
  const renter = await register();
  const { booking } = await bookOnline(renter, car.id);

  // pending_payment only ever advances through verified payment.
  await api().patch(`/rentals/bookings/${booking.id}/status`)
    .set(auth(renter)).send({ status: 'active' }).expect(400);
  await api().patch(`/rentals/bookings/${booking.id}/status`)
    .set(auth(renter)).send({ status: 'completed' }).expect(400);

  const res = await api().patch(`/rentals/bookings/${booking.id}/status`)
    .set(auth(renter)).send({ status: 'cancelled' }).expect(200);
  assert.equal(res.body.status, 'cancelled');
  assert.ok(res.body.cancelled_at, 'cancellation left no timestamp');
  assert.equal(res.body.cancelled_by, renter.id);

  // A cancelled hold frees the dates immediately.
  const rival = await register();
  await api().post(`/rentals/${car.id}/book`)
    .set(auth(rival))
    .send({ start_date: START, days: 3 })
    .expect(201);
});
