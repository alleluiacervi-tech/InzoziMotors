// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 of docs/WEB-PARITY-PLAN.md: public seller profiles, one seller's
// listings, contact-request counts, and the seller's own listing controls.
//
// The property that matters most: a profile is public for exactly the sellers
// whose listings are public (invariant 4), and never carries contact details
// (invariant 3). Real Postgres, real routes.
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
  const body = { name: 'Profile User', email: unique('prof'), password: 'password123', role: 'buyer', ...overrides };
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
  await pool.query("UPDATE users SET id_verified = 'approved', phone = '+250788000111', phone_visible = TRUE WHERE id = $1", [seller.id]);
  return seller;
}

let fixtureDay = 400;
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

test.after(async () => { await pool.end(); });

test('a verified seller has a public profile that never carries contact details', async () => {
  const seller = await verifiedSeller({ name: 'Profile Pat' });
  const res = await api().get(`/sellers/${seller.id}`).expect(200);

  assert.equal(res.body.name, 'Profile Pat');
  assert.equal(res.body.id_verified, true);
  assert.equal(res.body.is_showroom, false);
  assert.ok(res.body.member_since);
  const serialized = JSON.stringify(res.body);
  for (const secret of ['phone', 'whatsapp', 'email', '+250788000111', seller.email, 'id_front', 'password']) {
    assert.ok(!serialized.includes(secret), `profile must not carry ${secret}`);
  }
});

test('a profile is only public for sellers whose listings are public', async () => {
  const admin = await makeAdmin(await register());

  const unverified = await register({ role: 'seller' });
  await api().get(`/sellers/${unverified.id}`).expect(404);

  const buyer = await register();
  await pool.query("UPDATE users SET id_verified = 'approved' WHERE id = $1", [buyer.id]);
  await api().get(`/sellers/${buyer.id}`).expect(404);

  const suspended = await verifiedSeller();
  await api().patch(`/admin/users/${suspended.id}/access`).set('Authorization', `Bearer ${admin}`)
    .send({ action: 'suspend', reason: 'profile test' }).expect(200);
  await api().get(`/sellers/${suspended.id}`).expect(404);

  const showroom = await verifiedSeller();
  await pool.query("UPDATE users SET seller_type = 'showroom', business_name = 'Kigali Motors', business_verified = FALSE WHERE id = $1", [showroom.id]);
  await api().get(`/sellers/${showroom.id}`).expect(404);
  await pool.query('UPDATE users SET business_verified = TRUE WHERE id = $1', [showroom.id]);
  const open = await api().get(`/sellers/${showroom.id}`).expect(200);
  assert.equal(open.body.is_showroom, true);
  assert.equal(open.body.business_name, 'Kigali Motors');
  assert.equal(open.body.business_verified, true);

  await api().get('/sellers/00000000-0000-4000-8000-000000000000').expect(404);
  await api().get('/sellers/not-a-uuid').expect(400);
});

test('GET /cars?seller_id= lists only that seller\'s public cars, and pausing or selling removes them', async () => {
  const admin = await makeAdmin(await register());
  const seller = await verifiedSeller();
  const other = await verifiedSeller();
  const mine = await liveCar({ seller, admin, model: 'Land Cruiser' });
  await liveCar({ seller: other, admin, model: 'Hilux' });

  const listed = await api().get(`/cars?seller_id=${seller.id}`).expect(200);
  assert.deepEqual(listed.body.map((c) => c.id), [mine.id]);
  await api().get('/cars?seller_id=not-a-uuid').expect(400);

  // Pause: gone from the profile and the catalogue, back when made live again.
  await api().patch(`/cars/${mine.id}/seller-status`).set('Authorization', `Bearer ${seller.token}`)
    .send({ status: 'paused' }).expect(200);
  assert.equal((await api().get(`/cars?seller_id=${seller.id}`).expect(200)).body.length, 0);
  await api().patch(`/cars/${mine.id}/seller-status`).set('Authorization', `Bearer ${seller.token}`)
    .send({ status: 'live' }).expect(200);
  assert.equal((await api().get(`/cars?seller_id=${seller.id}`).expect(200)).body.length, 1);

  // Sold is final: it leaves the catalogue and can't come back.
  const sold = await api().patch(`/cars/${mine.id}/seller-status`).set('Authorization', `Bearer ${seller.token}`)
    .send({ status: 'sold' }).expect(200);
  assert.ok(sold.body.sold_at);
  assert.equal((await api().get(`/cars?seller_id=${seller.id}`).expect(200)).body.length, 0);
  await api().patch(`/cars/${mine.id}/seller-status`).set('Authorization', `Bearer ${seller.token}`)
    .send({ status: 'live' }).expect(409);

  // Nobody else can change it.
  await api().patch(`/cars/${mine.id}/seller-status`).set('Authorization', `Bearer ${other.token}`)
    .send({ status: 'paused' }).expect(404);
});

test('the seller sees how many buyers requested their contact details', async () => {
  const admin = await makeAdmin(await register());
  const seller = await verifiedSeller();
  const car = await liveCar({ seller, admin, model: 'Fortuner' });
  const buyer = await register();
  await pool.query(
    `INSERT INTO listing_contact_events (car_id, buyer_id, seller_id, channel)
     VALUES ($1, $2, $3, 'phone'), ($1, $2, $3, 'whatsapp'), ($1, $2, $3, 'in_app')`,
    [car.id, buyer.id, seller.id]
  );

  const mine = await api().get('/cars/seller/mine').set('Authorization', `Bearer ${seller.token}`).expect(200);
  const row = mine.body.find((c) => c.id === car.id);
  // An in-app enquiry is a conversation, counted in inquiries_count instead.
  assert.equal(row.contacts_count, 2);
  assert.equal(typeof row.inquiries_count, 'number');
});

// ─── Showrooms (docs/SHOWROOMS-AND-POLISH.md) ────────────────────────────────

const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

test('a showroom sells under its business name, and GET /showrooms lists it with the brands it carries', async () => {
  const admin = await makeAdmin(await register());
  const showroom = await verifiedSeller({ name: 'Owner Person' });
  const businessName = `Showroom ${Date.now()}`;
  const toyota = await liveCar({ seller: showroom, admin, make: 'Toyota', model: 'RAV4' });
  await liveCar({ seller: showroom, admin, make: 'Toyota', model: 'Harrier' });
  await liveCar({ seller: showroom, admin, make: 'Hyundai', model: 'Tucson' });

  // Marking the account a showroom and verifying the business in ONE save keeps
  // every listing public; the individual name is what buyers saw before.
  let listed = await api().get(`/cars?seller_id=${showroom.id}`).expect(200);
  assert.equal(listed.body[0].seller_name, 'Owner Person');
  assert.equal(listed.body[0].seller_is_showroom, false);
  await api().patch(`/admin/users/${showroom.id}`).set('Authorization', `Bearer ${admin}`)
    .send({ seller_type: 'showroom', business_name: businessName, business_verified: true }).expect(200);

  listed = await api().get(`/cars?seller_id=${showroom.id}`).expect(200);
  assert.equal(listed.body.length, 3, 'no listing may drop out when the account becomes a showroom');
  assert.ok(listed.body.every((c) => c.seller_name === businessName && c.seller_is_showroom === true));
  const detail = await api().get(`/cars/${toyota.id}`).expect(200);
  assert.equal(detail.body.seller_name, businessName);

  const all = await api().get('/showrooms').expect(200);
  const row = all.body.find((s) => s.id === showroom.id);
  assert.ok(row, 'a verified showroom with public cars is listed');
  assert.equal(row.name, businessName);
  assert.equal(row.live_count, 3);
  assert.deepEqual(row.brands, [{ make: 'Toyota', count: 2 }, { make: 'Hyundai', count: 1 }]);
  assert.ok(row.cover_image);
  const serialized = JSON.stringify(all.body);
  for (const secret of ['phone', 'whatsapp', 'email', showroom.email, '+250788000111']) {
    assert.ok(!serialized.includes(secret), `showrooms must not carry ${secret}`);
  }

  // An individual seller is not a showroom, and an unverified business is not
  // public at all.
  const individual = await verifiedSeller();
  await liveCar({ seller: individual, admin, model: 'Corolla' });
  assert.ok(!(await api().get('/showrooms').expect(200)).body.some((s) => s.id === individual.id));
  await pool.query('UPDATE users SET business_verified = FALSE WHERE id = $1', [showroom.id]);
  assert.ok(!(await api().get('/showrooms').expect(200)).body.some((s) => s.id === showroom.id));
});

test('an admin sets and removes a showroom photo, and only real images are accepted', async () => {
  const adminUser = await register();
  const admin = await makeAdmin(adminUser);
  const showroom = await verifiedSeller();
  await pool.query("UPDATE users SET seller_type = 'showroom', business_name = 'Photo Motors', business_verified = TRUE WHERE id = $1", [showroom.id]);

  await api().post(`/admin/users/${showroom.id}/avatar`).set('Authorization', `Bearer ${showroom.token}`)
    .attach('avatar', PNG_1x1, { filename: 'logo.png', contentType: 'image/png' }).expect(403);
  await api().post(`/admin/users/${showroom.id}/avatar`).set('Authorization', `Bearer ${admin}`)
    .attach('avatar', Buffer.from('<?php echo 1; ?>'), { filename: 'logo.png', contentType: 'image/png' }).expect(400);

  const set = await api().post(`/admin/users/${showroom.id}/avatar`).set('Authorization', `Bearer ${admin}`)
    .attach('avatar', PNG_1x1, { filename: 'logo.png', contentType: 'image/png' }).expect(200);
  assert.match(set.body.avatar_url, /\/uploads\/avatars\/|cloudinary/);
  assert.equal((await api().get(`/sellers/${showroom.id}`).expect(200)).body.avatar_url, set.body.avatar_url);
  const audit = await pool.query("SELECT 1 FROM admin_audit_log WHERE action = 'user.avatar_set' AND target_id = $1", [showroom.id]);
  assert.equal(audit.rowCount, 1);

  // An admin's own photo is not an operator's to change.
  await api().post(`/admin/users/${adminUser.id}/avatar`).set('Authorization', `Bearer ${admin}`)
    .attach('avatar', PNG_1x1, { filename: 'logo.png', contentType: 'image/png' }).expect(403);

  await api().delete(`/admin/users/${showroom.id}/avatar`).set('Authorization', `Bearer ${admin}`).expect(200);
  assert.equal((await api().get(`/sellers/${showroom.id}`).expect(200)).body.avatar_url, null);
});

test('an admin deletes an archived listing for good, keeping its inspection record', async () => {
  const adminUser = await register();
  const admin = await makeAdmin(adminUser);
  const seller = await verifiedSeller();
  const car = await liveCar({ seller, admin, make: 'Mazda', model: 'CX-5' });
  const buyer = await register();
  await api().post(`/cars/save/${car.id}`).set('Authorization', `Bearer ${buyer.token}`).expect(200);

  // Only an archived listing, only an admin, and only with a reason.
  await api().delete(`/cars/${car.id}/permanently`).set('Authorization', `Bearer ${admin}`)
    .send({ reason: 'duplicate listing' }).expect(409);
  await api().delete(`/cars/${car.id}`).set('Authorization', `Bearer ${admin}`)
    .send({ reason: 'duplicate listing' }).expect(200);
  await api().delete(`/cars/${car.id}/permanently`).set('Authorization', `Bearer ${seller.token}`)
    .send({ reason: 'duplicate listing' }).expect(403);
  await api().delete(`/cars/${car.id}/permanently`).set('Authorization', `Bearer ${admin}`)
    .send({ reason: '' }).expect(400);

  const inspection = await pool.query('SELECT id FROM inspections WHERE car_id = $1', [car.id]);
  assert.equal(inspection.rowCount, 1);

  const res = await api().delete(`/cars/${car.id}/permanently`).set('Authorization', `Bearer ${admin}`)
    .send({ reason: 'duplicate listing' }).expect(200);
  assert.equal(res.body.deleted, true);

  assert.equal((await pool.query('SELECT 1 FROM cars WHERE id = $1', [car.id])).rowCount, 0);
  assert.equal((await pool.query('SELECT 1 FROM saved_cars WHERE car_id = $1', [car.id])).rowCount, 0);
  // The 150-point record survives, detached, with anything that hangs off it.
  const kept = await pool.query('SELECT car_id FROM inspections WHERE id = $1', [inspection.rows[0].id]);
  assert.equal(kept.rowCount, 1);
  assert.equal(kept.rows[0].car_id, null);
  const audit = await pool.query(
    "SELECT metadata FROM admin_audit_log WHERE action = 'listing.deleted' AND target_id = $1", [car.id]
  );
  assert.equal(audit.rowCount, 1);
  assert.equal(audit.rows[0].metadata.listing.id, car.id);
  assert.equal(audit.rows[0].metadata.reason, 'duplicate listing');
  await api().get(`/cars/${car.id}`).expect(404);
  await api().delete(`/cars/${car.id}/permanently`).set('Authorization', `Bearer ${admin}`)
    .send({ reason: 'duplicate listing' }).expect(404);
});

test('an admin closes a submission from any stage short of a public listing', async () => {
  const admin = await makeAdmin(await register());
  const seller = await verifiedSeller();

  // Booked but never inspected: the appointment is released.
  const booked = await api().post('/submissions').set('Authorization', `Bearer ${seller.token}`)
    .send({ make: 'Nissan', model: 'Note', year: 2019, mileage: 50000, asking_price: 9000000 }).expect(201);
  const day = new Date(Date.now() + fixtureDay++ * 86400_000).toISOString().slice(0, 10);
  await api().patch(`/submissions/${booked.body.id}`).set('Authorization', `Bearer ${admin}`)
    .send({ status: 'scheduled', center: 'Nyarutarama Center', scheduled_date: day, scheduled_time: '10:00 AM' }).expect(200);
  assert.equal((await pool.query('SELECT 1 FROM inspections WHERE submission_id=$1', [booked.body.id])).rowCount, 1);

  await api().post(`/submissions/${booked.body.id}/close`).set('Authorization', `Bearer ${seller.token}`)
    .send({ reason: 'seller sold it privately' }).expect(403);
  await api().post(`/submissions/${booked.body.id}/close`).set('Authorization', `Bearer ${admin}`)
    .send({ reason: '' }).expect(400);
  const closed = await api().post(`/submissions/${booked.body.id}/close`).set('Authorization', `Bearer ${admin}`)
    .send({ reason: 'seller sold it privately' }).expect(200);
  assert.equal(closed.body.submission.status, 'rejected');
  assert.equal(closed.body.released_appointment, true);
  assert.equal((await pool.query('SELECT 1 FROM inspections WHERE submission_id=$1', [booked.body.id])).rowCount, 0);
  await api().post(`/submissions/${booked.body.id}/close`).set('Authorization', `Bearer ${admin}`)
    .send({ reason: 'seller sold it privately' }).expect(409);

  const board = await api().get('/admin/journey').set('Authorization', `Bearer ${admin}`).expect(200);
  assert.ok(!board.body.vehicles.some((v) => v.subject.submission_id === booked.body.id), 'a closed submission leaves the board');

  // Reopen puts it back under review.
  await api().patch(`/submissions/${booked.body.id}`).set('Authorization', `Bearer ${admin}`)
    .send({ status: 'under_review' }).expect(200);

  // A public listing is not closed from here.
  const car = await liveCar({ seller, admin, make: 'Honda', model: 'Fit' });
  const { rows: [sub] } = await pool.query('SELECT id FROM submissions WHERE car_id=$1', [car.id]);
  const refused = await api().post(`/submissions/${sub.id}/close`).set('Authorization', `Bearer ${admin}`)
    .send({ reason: 'not going ahead' }).expect(409);
  assert.equal(refused.body.code, 'IS_A_LISTING');
});

test('reassigning a listing to another seller keeps it public', async () => {
  const admin = await makeAdmin(await register());
  const from = await verifiedSeller();
  const to = await verifiedSeller({ name: 'New Owner' });
  const car = await liveCar({ seller: from, admin, make: 'Suzuki', model: 'Swift' });

  await api().post(`/cars/${car.id}/reassign-seller`).set('Authorization', `Bearer ${admin}`)
    .send({ new_seller_id: to.id, reason: 'moved into the showroom account' }).expect(200);

  const pub = await api().get(`/cars/${car.id}`).expect(200);
  assert.equal(pub.body.seller_id, to.id);
  assert.equal(pub.body.seller_name, 'New Owner');
  const listed = await api().get(`/cars?seller_id=${to.id}`).expect(200);
  assert.deepEqual(listed.body.map((c) => c.id), [car.id]);
});
