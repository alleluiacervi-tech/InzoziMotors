// ─────────────────────────────────────────────────────────────────────────────
// API smoke suite — the coded version of checks that until now lived only in a
// markdown file and someone's memory of running curl.
//
// Deliberately covers the paths where being wrong is expensive rather than
// every endpoint: authentication and session revocation, account deletion,
// what a stranger can read off a listing, the handover state machine that
// records commission, and the inspection scoring that decides whether a car
// goes live. These are the ones a refactor can quietly break.
//
// Runs against a real PostgreSQL — the interesting behaviour here is in
// transactions, constraints and row locks, none of which a mocked pool would
// exercise. Set DB_* to a throwaway database; CI provides one as a service.
//
//   node --test test/
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';
process.env.CERTIFICATION_FEE = '150';

const { app } = require('../server');
const pool = require('../src/db');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function register(overrides = {}) {
  const body = {
    name: 'Test User',
    email: unique('user'),
    password: 'password123',
    role: 'buyer',
    ...overrides,
  };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}

async function makeAdmin(user) {
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  const res = await api()
    .post('/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);
  return res.body.token;
}

test.after(async () => { await pool.end(); });

test('admin audit history records the actor and state-changing decision', async () => {
  const adminUser = await register();
  const admin = await makeAdmin(adminUser);
  const seller = await register({ role: 'seller' });
  const { rows: feeRows } = await pool.query(
    `INSERT INTO platform_fees (seller_id, fee_type, amount, currency, status)
     VALUES ($1, 'featured', 5000, 'RWF', 'due') RETURNING id`, [seller.id]
  );

  await api().patch(`/admin/fees/${feeRows[0].id}`)
    .set('Authorization', `Bearer ${admin}`).send({ status: 'paid' }).expect(200);

  const history = await api().get('/admin/audit-log?type=fee')
    .set('Authorization', `Bearer ${admin}`).expect(200);
  const event = history.body.find((row) => row.target_id === feeRows[0].id);
  assert.ok(event, 'fee decision is missing from audit history');
  assert.equal(event.actor_email, adminUser.email);
  assert.equal(event.action, 'fee.status_changed');
  assert.equal(event.metadata.status, 'paid');

  await api().get('/admin/audit-log').set('Authorization', `Bearer ${seller.token}`).expect(403);
});

// ─── Health ──────────────────────────────────────────────────────────────────

test('liveness and readiness are separate answers', async () => {
  await api().get('/health').expect(200);
  const ready = await api().get('/health/ready').expect(200);
  assert.equal(ready.body.database, 'up');
});

// ─── Auth ────────────────────────────────────────────────────────────────────

test('register rejects a short password and a malformed email', async () => {
  await api().post('/auth/register')
    .send({ name: 'X', email: unique('short'), password: '123' }).expect(400);
  await api().post('/auth/register')
    .send({ name: 'X', email: 'not-an-email', password: 'password123' }).expect(400);
});

test('register refuses a duplicate email', async () => {
  const user = await register();
  await api().post('/auth/register')
    .send({ name: 'Other', email: user.email, password: 'password123' })
    .expect(409);
});

test('login is vague about which half was wrong', async () => {
  const user = await register();
  const bad = await api().post('/auth/login')
    .send({ email: user.email, password: 'wrongpassword' }).expect(401);
  const missing = await api().post('/auth/login')
    .send({ email: unique('ghost'), password: 'password123' }).expect(401);
  // Identical wording, or the endpoint becomes an account-existence oracle.
  assert.equal(bad.body.error, missing.body.error);
});

test('changing a password revokes old tokens but keeps the caller signed in', async () => {
  const user = await register();
  await api().get('/auth/me').set('Authorization', `Bearer ${user.token}`).expect(200);

  const changed = await api().post('/auth/change-password')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ current_password: user.password, new_password: 'newpassword456' })
    .expect(200);

  await api().get('/auth/me').set('Authorization', `Bearer ${user.token}`).expect(401);
  await api().get('/auth/me').set('Authorization', `Bearer ${changed.body.token}`).expect(200);
});

test('deleting an account needs the password, then ends every session', async () => {
  const user = await register();

  await api().delete('/auth/me')
    .set('Authorization', `Bearer ${user.token}`).send({}).expect(400);
  await api().delete('/auth/me')
    .set('Authorization', `Bearer ${user.token}`).send({ password: 'nope' }).expect(401);
  await api().delete('/auth/me')
    .set('Authorization', `Bearer ${user.token}`).send({ password: user.password }).expect(200);

  await api().get('/auth/me').set('Authorization', `Bearer ${user.token}`).expect(401);
  await api().post('/auth/login')
    .send({ email: user.email, password: user.password }).expect(401);

  const { rows } = await pool.query(
    'SELECT name, phone, password_hash, deleted_at FROM users WHERE id = $1', [user.id]
  );
  assert.equal(rows[0].name, 'Deleted user');
  assert.equal(rows[0].password_hash, null);
  assert.notEqual(rows[0].deleted_at, null);
});

// ─── Authorization ───────────────────────────────────────────────────────────

test('admin routes reject a non-admin token', async () => {
  const user = await register();
  const auth = { Authorization: `Bearer ${user.token}` };
  await api().get('/admin/stats').set(auth).expect(403);
  await api().get('/admin/listings').set(auth).expect(403);
  await api().get('/id-verification/queue').set(auth).expect(403);
  await api().get('/handovers').set(auth).expect(403);
});

test('protected routes reject a missing or forged token', async () => {
  await api().get('/auth/me').expect(401);
  await api().get('/auth/me').set('Authorization', 'Bearer not.a.token').expect(401);
});

test('unverified sellers cannot submit a car', async () => {
  const seller = await register({ role: 'seller' });
  const res = await api().post('/submissions')
    .set('Authorization', `Bearer ${seller.token}`)
    .send({ make: 'Toyota', model: 'RAV4', year: 2020 })
    .expect(403);
  assert.equal(res.body.code, 'ID_VERIFICATION_REQUIRED');
});

// ─── Validation ──────────────────────────────────────────────────────────────

test('malformed ids are a client error, not a server error', async () => {
  for (const path of ['/cars/not-a-uuid', '/cars/123/history', '/rentals/oops']) {
    const res = await api().get(path).expect(400);
    assert.equal(res.body.code, 'INVALID_ID');
  }
});

// ─── Listings ────────────────────────────────────────────────────────────────

test('a stranger cannot read a seller phone number off a listing', async () => {
  const seller = await register({ role: 'seller' });
  await pool.query(
    "UPDATE users SET id_verified = 'approved', phone = '+250788000111' WHERE id = $1",
    [seller.id]
  );
  const admin = await makeAdmin(await register());
  const car = await api().post('/cars').set('Authorization', `Bearer ${admin}`)
    .send({
      seller_id: seller.id, title: '2020 Toyota RAV4', make: 'Toyota',
      model: 'RAV4', year: 2020, mileage: 30000, price: 25000,
    })
    .expect(201);

  const anon = await api().get(`/cars/${car.body.id}`).expect(200);
  assert.equal(anon.body.seller_phone, null, 'anonymous callers must not see it');

  const buyer = await register();
  const signedIn = await api().get(`/cars/${car.body.id}`)
    .set('Authorization', `Bearer ${buyer.token}`).expect(200);
  assert.equal(signedIn.body.seller_phone, null, 'a signed-in stranger must not see it either');
});

test('cars that were never published are not publicly readable', async () => {
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified = 'approved' WHERE id = $1", [seller.id]);
  const admin = await makeAdmin(await register());
  const car = await api().post('/cars').set('Authorization', `Bearer ${admin}`)
    .send({ seller_id: seller.id, title: 'Hidden', make: 'Honda', model: 'Civic', year: 2019, mileage: 45000, price: 15000 })
    .expect(201);

  await pool.query("UPDATE cars SET status = 'under_review' WHERE id = $1", [car.body.id]);
  await api().get(`/cars/${car.body.id}`).expect(404);
  await api().get(`/cars/${car.body.id}`)
    .set('Authorization', `Bearer ${admin}`).expect(200);
});

test('saving is idempotent and the cached counter matches the table', async () => {
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified = 'approved' WHERE id = $1", [seller.id]);
  const admin = await makeAdmin(await register());
  const car = await api().post('/cars').set('Authorization', `Bearer ${admin}`)
    .send({ seller_id: seller.id, title: 'Saveable', make: 'Mazda', model: 'CX-5', year: 2021, mileage: 22000, price: 28000 })
    .expect(201);

  const buyer = await register();
  const auth = { Authorization: `Bearer ${buyer.token}` };

  const on = await api().post(`/cars/save/${car.body.id}`).set(auth).expect(200);
  assert.equal(on.body.saved, true);
  const off = await api().post(`/cars/save/${car.body.id}`).set(auth).expect(200);
  assert.equal(off.body.saved, false);
  await api().post(`/cars/save/${car.body.id}`).set(auth).expect(200);

  const { rows } = await pool.query(
    `SELECT c.saves, (SELECT COUNT(*)::int FROM saved_cars s WHERE s.car_id = c.id) AS actual
     FROM cars c WHERE c.id = $1`, [car.body.id]
  );
  assert.equal(rows[0].saves, rows[0].actual);

  await api().post('/cars/save/00000000-0000-4000-8000-000000000000').set(auth).expect(404);
});

// ─── Handover: the money path ────────────────────────────────────────────────

test('a completed handover records commission exactly once', async () => {
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified = 'approved' WHERE id = $1", [seller.id]);
  const admin = await makeAdmin(await register());
  const buyer = await register();

  const car = await api().post('/cars').set('Authorization', `Bearer ${admin}`)
    .send({ seller_id: seller.id, title: 'Sellable', make: 'Nissan', model: 'X-Trail', year: 2020, mileage: 38000, price: 20000 })
    .expect(201);

  const booking = await api().post('/handovers')
    .set('Authorization', `Bearer ${buyer.token}`)
    .send({ car_id: car.body.id }).expect(201);

  // Reserving takes the car off the market, so a second buyer cannot book it.
  const other = await register();
  await api().post('/handovers')
    .set('Authorization', `Bearer ${other.token}`)
    .send({ car_id: car.body.id }).expect(409);

  await api().patch(`/handovers/${booking.body.id}/confirm`)
    .set('Authorization', `Bearer ${admin}`).send({}).expect(200);
  await api().patch(`/handovers/${booking.body.id}/complete`)
    .set('Authorization', `Bearer ${admin}`).expect(200);

  // Re-completing must not double-count the sale or the commission.
  await api().patch(`/handovers/${booking.body.id}/complete`)
    .set('Authorization', `Bearer ${admin}`).expect(409);

  const fees = await pool.query(
    "SELECT amount FROM platform_fees WHERE handover_id = $1 AND fee_type = 'commission'",
    [booking.body.id]
  );
  assert.equal(fees.rows.length, 1, 'exactly one commission row');
  assert.equal(fees.rows[0].amount, 1000, '5% of 20000');

  const sales = await pool.query('SELECT completed_sales FROM users WHERE id = $1', [seller.id]);
  assert.equal(sales.rows[0].completed_sales, 1);

  const sold = await pool.query('SELECT status FROM cars WHERE id = $1', [car.body.id]);
  assert.equal(sold.rows[0].status, 'sold');
});

test('a buyer cannot request their own listing', async () => {
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified = 'approved' WHERE id = $1", [seller.id]);
  const admin = await makeAdmin(await register());
  const car = await api().post('/cars').set('Authorization', `Bearer ${admin}`)
    .send({ seller_id: seller.id, title: 'Own car', make: 'Kia', model: 'Sportage', year: 2020, mileage: 41000, price: 19000 })
    .expect(201);

  await api().post('/handovers')
    .set('Authorization', `Bearer ${seller.token}`)
    .send({ car_id: car.body.id }).expect(400);
});

// ─── Inspection scoring ──────────────────────────────────────────────────────

test('inspection scoring is weighted and gates publication', async () => {
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified = 'approved' WHERE id = $1", [seller.id]);
  const admin = await makeAdmin(await register());

  const submission = await api().post('/submissions')
    .set('Authorization', `Bearer ${seller.token}`)
    .send({ make: 'Toyota', model: 'Corolla', year: 2019, mileage: 50000, asking_price: 14000 })
    .expect(201);

  await api().patch(`/submissions/${submission.body.id}`)
    .set('Authorization', `Bearer ${admin}`)
    .send({
      status: 'scheduled', center: 'Kicukiro Center',
      scheduled_date: '2026-09-01', scheduled_time: '10:00 AM',
    })
    .expect(200);

  const { rows } = await pool.query(
    'SELECT id FROM inspections WHERE submission_id = $1', [submission.body.id]
  );
  const inspectionId = rows[0].id;

  // All passes = full marks on the 150-point scale.
  const allPass = await api().post(`/inspections/${inspectionId}/complete`)
    .set('Authorization', `Bearer ${admin}`)
    .send({
      checklist_results: {
        'Engine oil level & condition': 'pass',
        'Front brake pads': 'pass',
        'Paint condition': 'pass',
        'Seat condition': 'pass',
        'Battery health': 'pass',
        'Front-left tread': 'pass',
        'Registration / logbook': 'pass',
      },
    })
    .expect(200);
  assert.equal(allPass.body.score, 150);

  // The certification fee is charged once, when the check completes.
  const cert = await pool.query(
    "SELECT amount FROM platform_fees WHERE submission_id = $1 AND fee_type = 'certification'",
    [submission.body.id]
  );
  assert.equal(cert.rows.length, 1);
  assert.equal(cert.rows[0].amount, 150);

  await api().post(`/inspections/${inspectionId}/complete`)
    .set('Authorization', `Bearer ${admin}`)
    .send({ checklist_results: { 'Battery health': 'pass' } })
    .expect(409);
});

// ─── Scheduling dates ────────────────────────────────────────────────────────

test('scheduling rejects non-ISO dates and past days', async () => {
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified = 'approved' WHERE id = $1", [seller.id]);
  const auth = { Authorization: `Bearer ${seller.token}` };

  const submission = await api().post('/submissions').set(auth)
    .send({ make: 'Toyota', model: 'Vitz', year: 2018, mileage: 80000, asking_price: 9000 })
    .expect(201);

  const attempt = (scheduled_date) =>
    api().patch(`/submissions/${submission.body.id}/schedule`).set(auth)
      .send({ center: 'Kicukiro Center', scheduled_date, scheduled_time: '10:00 AM' });

  // "Aug 12" is what the app used to send: no year, so it could not be
  // compared or ordered, and the capacity check silently stopped working.
  await attempt('Aug 12').expect(400);
  await attempt('2026-02-30').expect(400);   // not a real day
  await attempt('12/08/2026').expect(400);   // ambiguous
  await attempt('2020-01-01').expect(400);   // in the past

  // Cleared first for the same reason as the capacity test below: the database
  // is not reset between runs, and each run books this same day at Kicukiro —
  // enough runs and the valid attempt starts failing on capacity, not format.
  const future = new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10);
  await pool.query(
    `DELETE FROM inspections WHERE lower(center) = 'kicukiro center' AND scheduled_on = $1::date`,
    [future]
  );
  await attempt(future).expect(200);

  // Formatted by Postgres, not by JS. node-postgres hands a DATE back as local
  // midnight, so .toISOString() on it reports the previous day wherever the
  // offset is positive — an artifact of the readback, not of what was stored.
  const { rows } = await pool.query(
    `SELECT to_char(inspection_on, 'YYYY-MM-DD') AS on FROM submissions WHERE id = $1`,
    [submission.body.id]
  );
  assert.equal(rows[0].on, future);
});

test('a centre cannot be booked past its daily capacity', async () => {
  // Kimironko has the smallest capacity (5), so it is quickest to fill.
  const { rows: centre } = await pool.query(
    "SELECT daily_capacity FROM inspection_centers WHERE id = 'kimironko'"
  );
  const capacity = centre[0].daily_capacity;

  // A day far enough out that nothing else competes for it, cleared first so
  // the test does not depend on whether it has been run before — the database
  // is not reset between runs, and a fixed day fills up permanently.
  const day = new Date(Date.now() + 60 * 86400_000).toISOString().slice(0, 10);
  await pool.query(
    `DELETE FROM inspections WHERE lower(center) = 'kimironko center' AND scheduled_on = $1::date`,
    [day]
  );

  // Returns the status rather than a supertest Test — this helper is async, so
  // it resolves to a Response and cannot be chained with .expect().
  const book = async () => {
    const seller = await register({ role: 'seller' });
    await pool.query("UPDATE users SET id_verified = 'approved' WHERE id = $1", [seller.id]);
    const auth = { Authorization: `Bearer ${seller.token}` };
    const submission = await api().post('/submissions').set(auth)
      .send({ make: 'Toyota', model: 'Vitz', year: 2018, mileage: 80000, asking_price: 9000 })
      .expect(201);
    const res = await api().patch(`/submissions/${submission.body.id}/schedule`).set(auth)
      .send({ center: 'Kimironko Center', scheduled_date: day, scheduled_time: '10:00 AM' });
    return res.status;
  };

  for (let i = 0; i < capacity; i++) {
    assert.equal(await book(), 200, `booking ${i + 1} of ${capacity} should fit`);
  }
  // One past the cap is refused rather than quietly accepted, which is what
  // used to happen whenever the two clients disagreed about the date format.
  assert.equal(await book(), 409, 'the booking past capacity must be refused');

  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM inspections
     WHERE lower(center) = 'kimironko center' AND scheduled_on = $1::date`, [day]
  );
  assert.equal(rows[0].n, capacity);
});

test('inspection rejects verdicts outside pass/flag/fail', async () => {
  const admin = await makeAdmin(await register());
  await api().post('/inspections/00000000-0000-4000-8000-000000000000/complete')
    .set('Authorization', `Bearer ${admin}`)
    .send({ checklist_results: { 'Battery health': 'excellent' } })
    .expect(400);
});

test('listing photos keep named slots, replace in place, and report completeness', async () => {
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified = 'approved' WHERE id = $1", [seller.id]);
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const car = await api().post('/cars').set(auth)
    .send({ seller_id: seller.id, title: 'Photographed', make: 'Toyota', model: 'RAV4', year: 2021, mileage: 20000, price: 25000 })
    .expect(201);

  // Valid 1×1 PNG. Content verification checks bytes, not the supplied MIME.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const first = await api().post(`/inspections/cars/${car.body.id}/photos`).set(auth)
    .field('angle_keys', 'ext_front').field('angle_keys', 'ext_fl45')
    .attach('photos', png, { filename: 'front.png', contentType: 'image/png' })
    .attach('photos', png, { filename: 'front-left.png', contentType: 'image/png' })
    .expect(200);
  assert.equal(first.body.uploaded, 2);
  assert.equal(first.body.photos.length, 2);
  assert.equal(first.body.photos[0].angle_key, 'ext_front');
  assert.equal(first.body.photos[0].is_cover, true);
  assert.equal(first.body.complete, false);

  const replacement = await api().post(`/inspections/cars/${car.body.id}/photos`).set(auth)
    .field('angle_keys', 'ext_front')
    .attach('photos', png, { filename: 'front-new.png', contentType: 'image/png' })
    .expect(200);
  assert.equal(replacement.body.replaced, 1);
  assert.equal(replacement.body.photos.length, 2, 'replacement must not append a duplicate slot');

  const gallery = await api().get(`/inspections/cars/${car.body.id}/photos`).set(auth).expect(200);
  assert.ok(gallery.body.missing_required.includes('ext_rear'));
  const deleteId = gallery.body.photos.find((photo) => photo.angle_key === 'ext_fl45').id;
  const afterDelete = await api().delete(`/inspections/cars/${car.body.id}/photos/${deleteId}`).set(auth).expect(200);
  assert.equal(afterDelete.body.photos.length, 1);

  const stored = await pool.query('SELECT images FROM cars WHERE id = $1', [car.body.id]);
  assert.deepEqual(stored.rows[0].images, afterDelete.body.photos.map((photo) => photo.url));
});

// ─── Review moderation: the second UGC surface ───────────────────────────────

test('a review can be reported and taken down, and stops counting', async () => {
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified = 'approved' WHERE id = $1", [seller.id]);
  const admin = await makeAdmin(await register());
  const buyer = await register();

  const car = await api().post('/cars').set('Authorization', `Bearer ${admin}`)
    .send({ seller_id: seller.id, title: 'Reviewable', make: 'Honda', model: 'CR-V', year: 2019, mileage: 41000, price: 15000 })
    .expect(201);
  const booking = await api().post('/handovers')
    .set('Authorization', `Bearer ${buyer.token}`)
    .send({ car_id: car.body.id }).expect(201);
  await api().patch(`/handovers/${booking.body.id}/confirm`)
    .set('Authorization', `Bearer ${admin}`).send({}).expect(200);
  await api().patch(`/handovers/${booking.body.id}/complete`)
    .set('Authorization', `Bearer ${admin}`).expect(200);

  // Free text is capped server-side — an unbounded comment is a storage and
  // moderation problem at once.
  const review = await api().post('/reviews')
    .set('Authorization', `Bearer ${buyer.token}`)
    .send({ handover_id: booking.body.id, rating: 1, comment: 'x'.repeat(5000) })
    .expect(201);
  assert.equal(review.body.comment.length, 1000, 'comment capped at 1000 chars');

  const pub = await api().get(`/reviews/seller/${seller.id}`).expect(200);
  assert.equal(pub.body.total, 1);

  // Anyone signed in can report; repeats from the same person do not stack.
  const rando = await register();
  await api().post(`/reviews/${review.body.id}/report`)
    .set('Authorization', `Bearer ${rando.token}`)
    .send({ reason: 'Harassment or abuse' }).expect(201);
  await api().post(`/reviews/${review.body.id}/report`)
    .set('Authorization', `Bearer ${rando.token}`)
    .send({ reason: 'Harassment or abuse' }).expect(201);
  const { rows: reportRows } = await pool.query(
    'SELECT id, status FROM review_reports WHERE review_id = $1', [review.body.id]
  );
  assert.equal(reportRows.length, 1, 'duplicate report did not stack');

  // The queue is admin-only.
  await api().get('/reviews/admin/reports')
    .set('Authorization', `Bearer ${rando.token}`).expect(403);
  const queue = await api().get('/reviews/admin/reports')
    .set('Authorization', `Bearer ${admin}`).expect(200);
  assert.ok(queue.body.some((r) => r.review_id === review.body.id), 'report reached the queue');

  // Takedown: soft-removed, gone from the public read, reports resolved.
  await api().delete(`/reviews/${review.body.id}`)
    .set('Authorization', `Bearer ${admin}`)
    .send({ reason: 'abusive content' }).expect(200);

  const after = await api().get(`/reviews/seller/${seller.id}`).expect(200);
  assert.equal(after.body.total, 0, 'removed review left the public profile');
  const { rows: closed } = await pool.query(
    'SELECT status FROM review_reports WHERE review_id = $1', [review.body.id]
  );
  assert.equal(closed[0].status, 'resolved');
  const { rows: kept } = await pool.query(
    'SELECT removed_at, removed_reason FROM reviews WHERE id = $1', [review.body.id]
  );
  assert.ok(kept[0].removed_at, 'row kept as evidence, not deleted');

  // A second takedown of the same review is a 404, not a silent success.
  await api().delete(`/reviews/${review.body.id}`)
    .set('Authorization', `Bearer ${admin}`).send({}).expect(404);
});
