// ─────────────────────────────────────────────────────────────────────────────
// Test accounts and the showroom storefront (migration 0066,
// docs/SHOWROOMS-AND-POLISH.md "World-class showrooms").
//
// What must hold:
//   - a test account can still sign in, but nothing it owns is public, and
//     unmarking brings everything back exactly as it was;
//   - only a marked account can be erased, only with its email typed, never
//     an admin or yourself, never one with payment records; erasing anonymises
//     (the purge's own code) and archives;
//   - a showroom's details are validated, shown only for showrooms, and the
//     account holder's personal name is not part of a showroom's profile;
//   - "replies within" is measured, and silent until there is enough data.
// Real Postgres, real routes.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { REQUIRED_ITEM_IDS } = require('../src/lib/inspection-policy');
const { normalizeHours, replyTimeBucket } = require('../src/lib/showroom-profile');
const { notifyPriceDrop } = require('../src/lib/alerts');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const canonicalChecklist = () => Object.fromEntries(REQUIRED_ITEM_IDS.map((id) => [id, 'pass']));
const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

async function register(overrides = {}) {
  const body = { name: 'Storefront User', email: unique('store'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}

async function makeAdmin(user) {
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}

async function verifiedSeller(overrides = {}) {
  const seller = await register({ role: 'seller', ...overrides });
  await pool.query("UPDATE users SET id_verified = 'approved', phone = '+250788000222', phone_visible = TRUE WHERE id = $1", [seller.id]);
  return seller;
}

let fixtureDay = 900;
async function liveCar({ seller, admin, make = 'Toyota', model = 'Prado', year = 2020 }) {
  const car = await api().post('/cars').set('Authorization', `Bearer ${admin}`)
    .send({ seller_id: seller.id, title: `${year} ${make} ${model}`, make, model, year, mileage: 40000, price: 30000000, images: ['https://example.test/p.jpg'] })
    .expect(201);
  const submission = await api().post('/submissions').set('Authorization', `Bearer ${seller.token}`)
    .send({ make, model, year, mileage: 40000, asking_price: 30000000 }).expect(201);
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

const markTest = (admin, userId, isTest) => api().patch(`/admin/users/${userId}/test-account`)
  .set('Authorization', `Bearer ${admin}`).send({ is_test: isTest });

test.after(async () => { await pool.end(); });

// ─── Test accounts ───────────────────────────────────────────────────────────

test('a test account disappears from every public read, can still sign in, and comes back when unmarked', async () => {
  const admin = await makeAdmin(await register());
  const seller = await verifiedSeller({ name: 'Tester Toby' });
  const car = await liveCar({ seller, admin, make: 'Kia', model: 'Sorento' });
  await pool.query("UPDATE users SET seller_type = 'showroom', business_name = 'Test Motors', business_verified = TRUE WHERE id = $1", [seller.id]);
  const buyer = await register();

  // Public before.
  await api().get(`/cars/${car.id}`).expect(200);
  await api().get(`/sellers/${seller.id}`).expect(200);
  assert.ok((await api().get(`/cars?seller_id=${seller.id}`).expect(200)).body.length === 1);
  assert.ok((await api().get('/showrooms').expect(200)).body.some((s) => s.id === seller.id));

  // Only an admin marks, never their own account and never an admin.
  await markTest(seller.token, seller.id, true).expect(403);
  const marked = await markTest(admin, seller.id, true).expect(200);
  assert.equal(marked.body.is_test, true);
  assert.ok(marked.body.test_marked_at);

  await api().get(`/cars/${car.id}`).expect(404);
  await api().get(`/cars/${car.id}/history`).expect(404);
  await api().get(`/inspections/report/${car.id}`).expect(404);
  await api().get(`/sellers/${seller.id}`).expect(404);
  assert.equal((await api().get(`/cars?seller_id=${seller.id}`).expect(200)).body.length, 0);
  assert.ok(!(await api().get('/showrooms').expect(200)).body.some((s) => s.id === seller.id));
  await api().post(`/cars/${car.id}/contact`).set('Authorization', `Bearer ${buyer.token}`)
    .send({ channel: 'phone', acknowledge: true }).expect(404);
  await api().post(`/cars/save/${car.id}`).set('Authorization', `Bearer ${buyer.token}`).expect(404);

  // The demo account App Review uses must keep working: a test account signs in.
  await api().post('/auth/login').send({ email: seller.email, password: seller.password }).expect(200);
  // Its owner and the team still see the car.
  await api().get(`/cars/${car.id}`).set('Authorization', `Bearer ${seller.token}`).expect(200);
  await api().get(`/cars/${car.id}`).set('Authorization', `Bearer ${admin}`).expect(200);

  // The directory can list only test accounts.
  const listed = await api().get('/admin/users?test=1&limit=100').set('Authorization', `Bearer ${admin}`).expect(200);
  assert.ok(listed.body.length >= 1 && listed.body.every((u) => u.is_test === true));
  assert.ok(listed.body.some((u) => u.id === seller.id));

  // Unmarking is exact: nothing was taken down, so everything is back.
  await markTest(admin, seller.id, false).expect(200);
  await api().get(`/cars/${car.id}`).expect(200);
  await api().get(`/sellers/${seller.id}`).expect(200);
  assert.ok((await api().get('/showrooms').expect(200)).body.some((s) => s.id === seller.id));

  const audit = await pool.query(
    "SELECT action FROM admin_audit_log WHERE target_id = $1 AND action IN ('user.marked_test', 'user.unmarked_test') ORDER BY created_at",
    [seller.id]
  );
  assert.deepEqual(audit.rows.map((r) => r.action), ['user.marked_test', 'user.unmarked_test']);
});

test('the team cannot mark itself or another administrator as a test account', async () => {
  const adminUser = await register();
  const admin = await makeAdmin(adminUser);
  const other = await register();
  await makeAdmin(other);
  await markTest(admin, adminUser.id, true).expect(400);
  await markTest(admin, other.id, true).expect(403);
  await api().patch(`/admin/users/${adminUser.id}/test-account`).set('Authorization', `Bearer ${admin}`)
    .send({ is_test: 'yes' }).expect(400);
});

test('a test account\'s car never alerts real people', async () => {
  const admin = await makeAdmin(await register());
  const seller = await verifiedSeller();
  const car = await liveCar({ seller, admin, make: 'Mazda', model: 'CX-5' });
  const buyer = await register();
  await api().post(`/cars/save/${car.id}`).set('Authorization', `Bearer ${buyer.token}`).expect(200);
  await markTest(admin, seller.id, true).expect(200);
  assert.equal(await notifyPriceDrop(car.id, 30000000, 25000000, car.title), 0);
});

test('only a marked account can be erased, with its email typed, and never one with payment records', async () => {
  const adminUser = await register();
  const admin = await makeAdmin(adminUser);
  const seller = await verifiedSeller({ name: 'Erase Me' });
  const car = await liveCar({ seller, admin, make: 'Honda', model: 'Fit' });
  const { rows: [rental] } = await pool.query(
    "INSERT INTO rental_cars (title, daily_rate, provider_id, status) VALUES ('Test rental', 50000, $1, 'active') RETURNING id",
    [seller.id]
  );
  const erase = (body, token = admin, id = seller.id) => api().post(`/admin/users/${id}/erase`)
    .set('Authorization', `Bearer ${token}`).send(body);

  // Not marked: refused, whatever is typed.
  const notMarked = await erase({ confirm_email: seller.email }).expect(409);
  assert.equal(notMarked.body.code, 'NOT_A_TEST_ACCOUNT');

  await markTest(admin, seller.id, true).expect(200);
  // Not an admin's own account, not by a non-admin, not with the wrong email.
  await erase({ confirm_email: adminUser.email }, admin, adminUser.id).expect(400);
  await erase({ confirm_email: seller.email }, seller.token).expect(403);
  const mismatch = await erase({ confirm_email: 'someone-else@test.local' }).expect(400);
  assert.equal(mismatch.body.code, 'CONFIRMATION_MISMATCH');

  // A paid fee is accounting, not test data.
  const { rows: [fee] } = await pool.query(
    "INSERT INTO platform_fees (fee_type, amount, status, seller_id) VALUES ('featured', 10000, 'paid', $1) RETURNING id",
    [seller.id]
  );
  const blocked = await erase({ confirm_email: seller.email.toUpperCase() }).expect(409);
  assert.equal(blocked.body.code, 'HAS_PAYMENT_RECORDS');
  assert.equal(blocked.body.details.paid_fees, 1);
  await pool.query("UPDATE platform_fees SET status = 'waived' WHERE id = $1", [fee.id]);

  const done = await erase({ confirm_email: ` ${seller.email.toUpperCase()} ` }).expect(200);
  assert.equal(done.body.erased, true);
  assert.equal(done.body.listings_archived, 1);
  assert.equal(done.body.rentals_taken_down, 1);

  const { rows: [after] } = await pool.query(
    'SELECT name, email, phone, password_hash, deleted_at, is_test, business_name FROM users WHERE id = $1', [seller.id]
  );
  assert.equal(after.name, 'Deleted user');
  assert.match(after.email, /^deleted\+.*@deleted\.sawacars\.com$/);
  assert.equal(after.phone, null);
  assert.equal(after.password_hash, null);
  assert.ok(after.deleted_at);
  assert.equal(after.is_test, true, 'the flag survives so reports can leave test data out');
  assert.equal((await pool.query('SELECT status FROM cars WHERE id = $1', [car.id])).rows[0].status, 'archived');
  assert.equal((await pool.query('SELECT status FROM rental_cars WHERE id = $1', [rental.id])).rows[0].status, 'maintenance');

  // Signed out everywhere, and cannot sign back in.
  await api().get('/auth/me').set('Authorization', `Bearer ${seller.token}`).expect(401);
  await api().post('/auth/login').send({ email: seller.email, password: seller.password }).expect(401);

  // The permanent log records the act without the identity.
  const audit = await pool.query(
    "SELECT summary, metadata FROM admin_audit_log WHERE action = 'account.erased_test' AND target_id = $1", [seller.id]
  );
  assert.equal(audit.rowCount, 1);
  assert.doesNotMatch(JSON.stringify(audit.rows[0]), new RegExp(seller.email.split('@')[0]));

  // Gone means gone: a second erase finds nobody.
  await erase({ confirm_email: seller.email }).expect(404);
});

// ─── Showroom storefront ─────────────────────────────────────────────────────

test('opening hours are validated day by day', () => {
  assert.deepEqual(normalizeHours(null), { ok: true, value: null });
  assert.equal(normalizeHours({ mon: { open: '18:00', close: '08:00' } }).ok, false);
  assert.equal(normalizeHours({ mon: { open: '8:00', close: '18:00' } }).ok, false);
  assert.equal(normalizeHours({ funday: null }).ok, false);
  assert.equal(normalizeHours([]).ok, false);
  // All seven closed is the same as no hours at all.
  assert.deepEqual(normalizeHours({ mon: null, tue: null }), { ok: true, value: null });
  const week = normalizeHours({ mon: { open: '08:00', close: '18:00' }, sat: { open: '09:00', close: '13:00' } });
  assert.equal(week.ok, true);
  assert.deepEqual(Object.keys(week.value), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  assert.equal(week.value.tue, null);
  assert.deepEqual(week.value.sat, { open: '09:00', close: '13:00' });
});

test('a showroom\'s details are set by the team and shown only on a showroom\'s profile', async () => {
  const admin = await makeAdmin(await register());
  const showroom = await verifiedSeller({ name: 'Private Owner Name' });
  await liveCar({ seller: showroom, admin, make: 'Toyota', model: 'RAV4' });
  await api().patch(`/admin/users/${showroom.id}`).set('Authorization', `Bearer ${admin}`)
    .send({ seller_type: 'showroom', business_name: 'Kacyiru Motors', business_verified: true }).expect(200);

  // Validation.
  await api().patch(`/admin/users/${showroom.id}`).set('Authorization', `Bearer ${admin}`)
    .send({ business_hours: { mon: { open: '19:00', close: '09:00' } } }).expect(400);
  await api().patch(`/admin/users/${showroom.id}`).set('Authorization', `Bearer ${admin}`)
    .send({ business_about: 'x'.repeat(1201) }).expect(400);

  const hours = { mon: { open: '08:00', close: '18:00' }, sat: { open: '09:00', close: '14:00' } };
  const saved = await api().patch(`/admin/users/${showroom.id}`).set('Authorization', `Bearer ${admin}`)
    .send({ business_about: '  Family showroom since 2012.\r\nEvery car inspected by Sawa.  ', business_address: 'KG 7 Ave, Kacyiru, Kigali', business_hours: hours })
    .expect(200);
  assert.equal(saved.body.business_about, 'Family showroom since 2012.\nEvery car inspected by Sawa.');
  assert.equal(saved.body.business_hours.sun, null);

  const cover = await api().post(`/admin/users/${showroom.id}/cover`).set('Authorization', `Bearer ${admin}`)
    .attach('cover', PNG_1x1, { filename: 'front.png', contentType: 'image/png' }).expect(200);
  assert.match(cover.body.business_cover_url, /\/uploads\/avatars\/|cloudinary/);

  const profile = (await api().get(`/sellers/${showroom.id}`).expect(200)).body;
  assert.equal(profile.name, 'Kacyiru Motors');
  assert.equal(profile.about, 'Family showroom since 2012.\nEvery car inspected by Sawa.');
  assert.equal(profile.address, 'KG 7 Ave, Kacyiru, Kigali');
  assert.deepEqual(profile.hours.mon, { open: '08:00', close: '18:00' });
  assert.equal(profile.cover_url, cover.body.business_cover_url);
  assert.equal(profile.reply_time, null, 'no conversations yet, so nothing is claimed');
  // The person who holds the account is not part of a showroom's profile, and
  // the dead numbers are gone.
  const serialized = JSON.stringify(profile);
  assert.doesNotMatch(serialized, /Private Owner Name/);
  for (const dead of ['completed_sales', 'response_rate', 'trust_score']) assert.equal(profile[dead], undefined);

  // The showroom list prefers the showroom's own photo.
  const row = (await api().get('/showrooms').expect(200)).body.find((s) => s.id === showroom.id);
  assert.equal(row.cover_image, cover.body.business_cover_url);

  // An individual seller's profile carries none of it.
  const person = await verifiedSeller({ name: 'Solo Seller' });
  await pool.query("UPDATE users SET business_about = 'leftover', business_address = 'somewhere' WHERE id = $1", [person.id]);
  const solo = (await api().get(`/sellers/${person.id}`).expect(200)).body;
  assert.equal(solo.name, 'Solo Seller');
  assert.equal(solo.about, null);
  assert.equal(solo.address, null);
  assert.equal(solo.hours, null);

  await api().delete(`/admin/users/${showroom.id}/cover`).set('Authorization', `Bearer ${admin}`).expect(200);
  assert.equal((await api().get(`/sellers/${showroom.id}`).expect(200)).body.cover_url, null);
});

test('"replies within" is measured from real conversations and silent until there is enough', async () => {
  // The bucket rules on their own.
  assert.equal(replyTimeBucket({ asked: 2, answered: 2, median_seconds: 60 }), null);
  assert.equal(replyTimeBucket({ asked: 4, answered: 1, median_seconds: 60 }), null);
  assert.equal(replyTimeBucket({ asked: 3, answered: 3, median_seconds: 1800 }), 'within_hour');
  assert.equal(replyTimeBucket({ asked: 3, answered: 2, median_seconds: 3 * 3600 }), 'within_hours');
  assert.equal(replyTimeBucket({ asked: 3, answered: 3, median_seconds: 20 * 3600 }), 'within_day');
  assert.equal(replyTimeBucket({ asked: 3, answered: 3, median_seconds: 50 * 3600 }), null);

  // And from the database: three buyers asked, the seller answered each within minutes.
  const seller = await verifiedSeller({ name: 'Quick Replier' });
  for (let i = 0; i < 3; i += 1) {
    const buyer = await register();
    const { rows: [conv] } = await pool.query(
      'INSERT INTO conversations (buyer_id, seller_id) VALUES ($1, $2) RETURNING id', [buyer.id, seller.id]
    );
    await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, text, created_at) VALUES
         ($1, $2, 'Is it still for sale?', NOW() - INTERVAL '3 days'),
         ($1, $3, 'Yes it is.', NOW() - INTERVAL '3 days' + INTERVAL '10 minutes')`,
      [conv.id, buyer.id, seller.id]
    );
  }
  assert.equal((await api().get(`/sellers/${seller.id}`).expect(200)).body.reply_time, 'within_hour');
});
