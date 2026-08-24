// ─────────────────────────────────────────────────────────────────────────────
// API smoke suite — the coded version of checks that until now lived only in a
// markdown file and someone's memory of running curl.
//
// Deliberately covers the paths where being wrong is expensive rather than
// every endpoint: authentication and session revocation, account deletion,
// what a stranger can read off a listing, consent-based contact disclosure,
// retired transaction endpoints, and the inspection/publication separation.
// These are the ones a refactor can quietly break.
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

const { app, server } = require('../server');
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

test('HTTP server timeouts bound slow connections without making uploads impractical', () => {
  assert.equal(server.headersTimeout, 65_000);
  assert.equal(server.requestTimeout, 120_000);
  assert.equal(server.keepAliveTimeout, 5_000);
  assert.ok(server.headersTimeout < server.requestTimeout);
});

test('admin audit history records the actor and state-changing decision', async () => {
  const adminUser = await register();
  const admin = await makeAdmin(adminUser);
  await api().patch('/admin/settings/listing_min_photos')
    .set('Authorization', `Bearer ${admin}`).send({ value: 1 }).expect(200);

  const history = await api().get('/admin/audit-log?type=platform_setting')
    .set('Authorization', `Bearer ${admin}`).expect(200);
  const event = history.body.find((row) => row.target_id === 'listing_min_photos');
  assert.ok(event, 'setting decision is missing from audit history');
  assert.equal(event.actor_email, adminUser.email);
  assert.equal(event.action, 'setting.updated');
  assert.equal(event.metadata.current, 1);

  const ordinaryUser = await register();
  await api().get('/admin/audit-log').set('Authorization', `Bearer ${ordinaryUser.token}`).expect(403);
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

test('admins can suspend, restore, and safely reset a user account with an audit trail', async () => {
  const adminUser = await register({ name: 'Operations Admin' });
  const admin = await makeAdmin(adminUser);
  const member = await register({ name: 'Managed Seller', role: 'seller' });
  const auth = { Authorization: `Bearer ${admin}` };

  await api().patch(`/admin/users/${member.id}/access`)
    .set('Authorization', `Bearer ${member.token}`)
    .send({ action: 'suspend', reason: 'Permission test' }).expect(403);

  const suspended = await api().patch(`/admin/users/${member.id}/access`)
    .set(auth).send({ action: 'suspend', reason: 'Repeated prohibited listings' }).expect(200);
  assert.equal(suspended.body.account_status, 'suspended');
  await api().get('/auth/me').set('Authorization', `Bearer ${member.token}`).expect(401);
  await api().post('/auth/login').send({ email: member.email, password: member.password }).expect(401);

  const restored = await api().patch(`/admin/users/${member.id}/access`)
    .set(auth).send({ action: 'restore' }).expect(200);
  assert.equal(restored.body.account_status, 'active');
  const relogin = await api().post('/auth/login')
    .send({ email: member.email, password: member.password }).expect(200);

  const reset = await api().post(`/admin/users/${member.id}/password-reset`).set(auth).expect(200);
  assert.equal(reset.body.success, true);
  // Reset initiation ends any token that existed before it; no password or
  // reset code may ever be returned to an administrator or the browser.
  assert.equal(Object.hasOwn(reset.body, 'code'), false);
  await api().get('/auth/me').set('Authorization', `Bearer ${relogin.body.token}`).expect(401);

  const audit = await api().get('/admin/audit-log?type=user').set(auth).expect(200);
  const actions = audit.body.filter((row) => row.target_id === member.id).map((row) => row.action);
  assert.ok(actions.includes('user.suspended'));
  assert.ok(actions.includes('user.restored'));
  assert.ok(actions.includes('user.password_reset_initiated'));
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

  // Admin-created listings start under review and are deliberately invisible
  // to the public. Publish this fixture so the assertions below test contact
  // privacy on a real catalogue listing rather than the unpublished-listing
  // access rule.
  await pool.query("UPDATE cars SET status = 'live' WHERE id = $1", [car.body.id]);

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

// ─── Direct marketplace policy ────────────────────────────────────────────────

test('transaction, contract, payment, and guarantee write endpoints are retired', async () => {
  const user = await register();
  const auth = { Authorization: `Bearer ${user.token}` };
  const retired = [
    api().post('/handovers').set(auth).send({ car_id: '00000000-0000-4000-8000-000000000000' }),
    api().post('/contracts/handover/00000000-0000-4000-8000-000000000000').set(auth).send({}),
    api().post('/disputes').set(auth).send({ handover_id: '00000000-0000-4000-8000-000000000000' }),
    api().post('/payments/checkout').set(auth).send({}),
    api().post('/reviews').set(auth).send({ handover_id: '00000000-0000-4000-8000-000000000000', rating: 5 }),
  ];
  for (const attempt of retired) {
    const response = await attempt;
    assert.equal(response.status, 410);
  }
});

test('seller contact requires consent, verification, acknowledgement, and an audit event', async () => {
  const seller = await register({ role: 'seller' });
  await pool.query(
    `UPDATE users SET id_verified='approved', phone='+250788000111', whatsapp_phone='+250788000222',
       phone_visible=TRUE, whatsapp_visible=TRUE, contact_consent_at=NOW()
     WHERE id=$1`, [seller.id]
  );
  const admin = await makeAdmin(await register());
  const car = await api().post('/cars').set('Authorization', `Bearer ${admin}`)
    .send({ seller_id: seller.id, title: 'Direct listing', make: 'Kia', model: 'Sportage', year: 2020, mileage: 41000, price: 19000, images: ['https://example.test/car.jpg'] })
    .expect(201);
  await pool.query("UPDATE cars SET status='live' WHERE id=$1", [car.body.id]);

  const buyer = await register();
  const auth = { Authorization: `Bearer ${buyer.token}` };
  const notice = await api().post(`/cars/${car.body.id}/contact`).set(auth)
    .send({ channel: 'whatsapp' }).expect(428);
  assert.equal(notice.body.code, 'MARKETPLACE_TERMS_REQUIRED');

  const disclosed = await api().post(`/cars/${car.body.id}/contact`).set(auth)
    .send({ channel: 'whatsapp', acknowledge: true }).expect(200);
  assert.equal(disclosed.body.contact, '+250788000222');
  assert.match(disclosed.body.notice, /not a party/i);

  const events = await pool.query(
    'SELECT channel FROM listing_contact_events WHERE car_id=$1 AND buyer_id=$2',
    [car.body.id, buyer.id]
  );
  assert.equal(events.rows.length, 1);
  assert.equal(events.rows[0].channel, 'whatsapp');
});

test('public contact settings require a verified seller and a usable channel', async () => {
  const buyer = await register();
  await api().patch('/auth/me').set('Authorization', `Bearer ${buyer.token}`)
    .send({ phone: '+250788000333', phone_visible: true }).expect(403);

  const seller = await register({ role: 'seller' });
  const auth = { Authorization: `Bearer ${seller.token}` };
  await api().patch('/auth/me').set(auth).send({ phone_visible: true }).expect(403);
  await pool.query("UPDATE users SET id_verified='approved' WHERE id=$1", [seller.id]);
  await api().patch('/auth/me').set(auth).send({ phone_visible: true }).expect(400);
  const updated = await api().patch('/auth/me').set(auth)
    .send({ phone: '+250788000444', phone_visible: true }).expect(200);
  assert.equal(updated.body.phone_visible, true);
  assert.equal(updated.body.account_status, 'active');
});

test('rental inquiries only reach active verified providers and never create a booking', async () => {
  const provider = await register({ role: 'seller' });
  await pool.query(
    `UPDATE users SET id_verified='approved', seller_type='showroom', business_verified=TRUE,
       phone='+250788000555', phone_visible=TRUE, contact_consent_at=NOW()
     WHERE id=$1`,
    [provider.id]
  );
  const admin = await makeAdmin(await register());
  const rental = await api().post('/rentals').set('Authorization', `Bearer ${admin}`)
    .send({
      provider_id: provider.id,
      title: 'Verified rental SUV',
      make: 'Toyota',
      model: 'RAV4',
      daily_rate: 65000,
      images: ['https://example.test/rental.jpg'],
    })
    .expect(201);

  const renter = await register();
  const auth = { Authorization: `Bearer ${renter.token}` };
  const start = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await api().post(`/rentals/${rental.body.id}/inquire`).set(auth)
    .send({ start_date: start, days: 3, preferred_channel: 'phone' }).expect(428);
  const inquiry = await api().post(`/rentals/${rental.body.id}/inquire`).set(auth)
    .send({ start_date: start, days: 3, preferred_channel: 'phone', acknowledge: true }).expect(201);
  assert.equal(inquiry.body.contact, '+250788000555');
  assert.match(inquiry.body.notice, /does not collect or hold transaction funds/i);
  const legacyBookings = await pool.query('SELECT COUNT(*)::int AS count FROM rental_bookings WHERE renter_id=$1', [renter.id]);
  assert.equal(legacyBookings.rows[0].count, 0);

  await pool.query('UPDATE users SET business_verified=FALSE WHERE id=$1', [provider.id]);
  const catalogue = await api().get('/rentals').expect(200);
  assert.equal(catalogue.body.some((car) => car.id === rental.body.id), false);
  await api().post(`/rentals/${rental.body.id}/inquire`).set(auth)
    .send({ start_date: start, days: 3, preferred_channel: 'in_app', acknowledge: true }).expect(404);
});

// ─── Inspection scoring ──────────────────────────────────────────────────────

test('inspection scoring is weighted but never charges or auto-publishes', async () => {
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
  assert.equal(allPass.body.published, false);

  // Inspection is evidence, not a charge or an automatic publication event.
  const cert = await pool.query(
    "SELECT amount FROM platform_fees WHERE submission_id = $1 AND fee_type = 'certification'",
    [submission.body.id]
  );
  assert.equal(cert.rows.length, 0);

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

test('listing photos accept a flexible gallery, retain named replacements, and stay synchronized', async () => {
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
  assert.equal(first.body.complete, true, 'a listing is complete once it has usable photos; no fixed 360° checklist is required');

  const replacement = await api().post(`/inspections/cars/${car.body.id}/photos`).set(auth)
    .field('angle_keys', 'ext_front')
    .attach('photos', png, { filename: 'front-new.png', contentType: 'image/png' })
    .expect(200);
  assert.equal(replacement.body.replaced, 1);
  assert.equal(replacement.body.photos.length, 2, 'replacement must not append a duplicate slot');

  const gallery = await api().get(`/inspections/cars/${car.body.id}/photos`).set(auth).expect(200);
  assert.deepEqual(gallery.body.missing_required, []);
  const deleteId = gallery.body.photos.find((photo) => photo.angle_key === 'ext_fl45').id;
  const afterDelete = await api().delete(`/inspections/cars/${car.body.id}/photos/${deleteId}`).set(auth).expect(200);
  assert.equal(afterDelete.body.photos.length, 1);

  const stored = await pool.query('SELECT images FROM cars WHERE id = $1', [car.body.id]);
  assert.deepEqual(stored.rows[0].images, afterDelete.body.photos.map((photo) => photo.url));
});

test('listing photos accept ordered generic gallery keys from the mobile uploader', async () => {
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified = 'approved' WHERE id = $1", [seller.id]);
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const car = await api().post('/cars').set(auth)
    .send({ seller_id: seller.id, title: 'Flexible gallery', make: 'Mazda', model: 'CX-5', year: 2022, mileage: 18000, price: 28000 })
    .expect(201);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const uploaded = await api().post(`/inspections/cars/${car.body.id}/photos`).set(auth)
    .field('angle_keys', 'gallery-001')
    .attach('photos', png, { filename: 'gallery-001.png', contentType: 'image/png' })
    .expect(200);
  assert.equal(uploaded.body.photos[0].angle_key, 'gallery-001');
  assert.equal(uploaded.body.complete, true);
});

// ─── Review moderation: the second UGC surface ───────────────────────────────

test.skip('legacy sale reviews remain readable and moderatable during the retention window', async () => {
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
