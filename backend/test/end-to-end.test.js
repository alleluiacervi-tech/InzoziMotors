// ─────────────────────────────────────────────────────────────────────────────
// The whole workflow, once, through real HTTP.
//
// Every other test file proves one mechanism. This one proves they compose:
// a person walks in, an account is created, their identity is verified without
// an upload, the vehicle is taken in for rental AND sale, inspected, put on the
// public rental feed and published as a listing — from ONE inspection — its
// plate is covered, mis-covered, corrected, and a photo is added and removed
// while the listing is live.
//
// It exists because the failures that actually strand an operator are never in
// one route. They are in the seam between two: a payload that omits the column
// the next screen reads, a queue that is filtered by the status the record just
// left, a gate three steps downstream that refuses what step one allowed. A
// green unit suite says nothing about those.
//
// If this file passes, the dashboard can carry a vehicle from the door to the
// website without anybody having to open psql.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const sharp = require('sharp');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { ALL_ITEMS } = require('../src/lib/inspection-policy');

const api = () => request(app);
const uniq = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e9)}@test.local`;
const allPass = () => Object.fromEntries(ALL_ITEMS.map((item) => [item.id, 'pass']));

async function adminToken() {
  const email = uniq('e2e-admin');
  const reg = await api().post('/auth/register')
    .send({ name: 'E2E Operator', email, password: 'password123', role: 'buyer' }).expect(201);
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [reg.body.user.id]);
  const login = await api().post('/auth/login').send({ email, password: 'password123' }).expect(200);
  return { token: login.body.token, id: reg.body.user.id };
}

/** A centre with room today, so scheduling is not at the mercy of whatever the
 *  shared test database has already filled. */
async function freeCentre(auth) {
  const name = `E2E Centre ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const res = await api().post('/centers').set(auth)
    .send({ name, address: 'Kigali', daily_capacity: 20, active: true });
  assert.equal(res.status, 201, `centre create: ${JSON.stringify(res.body)}`);
  return res.body.name || name;
}

const plateFixture = { x: 380, y: 560, w: 440, h: 110, W: 1200, H: 800 };
async function photoWithPlate() {
  const { x, y, w, h, W, H } = plateFixture;
  return sharp({ create: { width: W, height: H, channels: 3, background: { r: 74, g: 81, b: 88 } } })
    .composite([{
      input: Buffer.from(`<svg width="${W}" height="${H}">
        <rect width="${W}" height="${H}" fill="#4A5158"/>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#FFFFFF" stroke="#111" stroke-width="4"/>
      </svg>`), top: 0, left: 0,
    }]).png().toBuffer();
}
const quadOverPlate = () => {
  const { x, y, w, h, W, H } = plateFixture;
  return [
    { x: x / W, y: y / H }, { x: (x + w) / W, y: y / H },
    { x: (x + w) / W, y: (y + h) / H }, { x: x / W, y: (y + h) / H },
  ];
};
async function whiteShare(buffer) {
  const { x, y, w, h } = plateFixture;
  const { data, info } = await sharp(buffer)
    .extract({ left: x + 20, top: y + 20, width: w - 40, height: h - 40 })
    .raw().toBuffer({ resolveWithObject: true });
  let white = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) white += 1;
  }
  return white / (info.width * info.height);
}
const fetchImage = (pathname) => api().get(pathname).expect(200).buffer(true)
  .parse((res, cb) => { const c = []; res.on('data', (d) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); });

const VEHICLE = { make: 'Volkswagen', model: 'Bora', year: 2025 };

test('door to website: one vehicle, one inspection, a rental and a listing', async () => {
  const admin = await adminToken();
  const auth = { Authorization: `Bearer ${admin.token}` };

  // ── 1. The team creates the provider's account ─────────────────────────────
  // An individual seller, deliberately — NOT a showroom. A showroom is created
  // already identity-approved and business-verified, which skips exactly the two
  // steps that used to be dead ends. An individual arrives with neither.
  const providerEmail = uniq('e2e-provider');
  const account = await api().post('/admin/accounts').set(auth)
    .send({ account_type: 'individual_seller', name: 'E2E Provider', email: providerEmail });
  assert.equal(account.status, 201, `account create: ${JSON.stringify(account.body)}`);
  const providerId = account.body.user?.id || account.body.id;
  assert.ok(providerId, `provider id in ${JSON.stringify(account.body)}`);

  const created = (await pool.query(
    'SELECT id_verified, business_verified FROM users WHERE id=$1', [providerId])).rows[0];
  assert.notEqual(created.id_verified, 'approved',
    'an individual seller must NOT be handed a verification they have not earned');
  assert.notEqual(created.business_verified, true);

  // ── 2. Identity, verified at the counter with no upload ────────────────────
  // The ID queue lists only accounts sitting at 'pending' — people who uploaded
  // documents. This account uploaded nothing, so before this route existed there
  // was no queue row and no button, and the workflow stopped dead right here.
  const queueBefore = await api().get('/id-verification/queue').set(auth).expect(200);
  assert.equal(queueBefore.body.some((u) => u.id === providerId), false,
    'and it is genuinely absent from the only screen that could have approved it');

  const verified = await api().post(`/id-verification/${providerId}/manual`).set(auth)
    .send({ method: 'in_person', note: 'National ID and vehicle logbook seen at the Kicukiro office.' });
  assert.equal(verified.status, 200, `manual verify: ${JSON.stringify(verified.body)}`);

  // Holding rental stock additionally needs the business flag, granted from the
  // user directory. This is the whole eligibility path an operator walks.
  const granted = await api().patch(`/admin/users/${providerId}`).set(auth)
    .send({ business_verified: true, business_name: 'E2E Motors Ltd' });
  assert.equal(granted.status, 200, `grant business: ${JSON.stringify(granted.body)}`);

  const afterId = (await pool.query(
    'SELECT id_verified, id_verification_method, id_verification_note, id_verified_by, business_verified FROM users WHERE id=$1',
    [providerId])).rows[0];
  assert.equal(afterId.id_verified, 'approved');
  assert.equal(afterId.id_verification_method, 'in_person');
  assert.ok(afterId.id_verification_note.length >= 10, 'the attestation is on the record');
  assert.equal(afterId.id_verified_by, admin.id, 'and names who made the call');
  assert.equal(afterId.business_verified, true);

  // ── 3. Intake, filed by the team, for BOTH sale and rental ─────────────────
  const intake = await api().post('/submissions/admin').set(auth)
    .send({ seller_id: providerId, purpose: 'both', ...VEHICLE, mileage: 12000, asking_price: 24000000 });
  assert.equal(intake.status, 201, `intake: ${JSON.stringify(intake.body)}`);
  assert.equal(intake.body.purpose, 'both');
  assert.deepEqual(intake.body.warnings, [], 'a business-verified provider raises no warning');
  const submissionId = intake.body.id;

  // ── 4. Book, start, complete the 150 points ───────────────────────────────
  const centre = await freeCentre(auth);
  const day = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const scheduled = await api().patch(`/submissions/${submissionId}`).set(auth)
    .send({ status: 'scheduled', center: centre, scheduled_date: day, scheduled_time: '10:00 AM' });
  assert.equal(scheduled.status, 200, `schedule: ${JSON.stringify(scheduled.body)}`);

  const inspectionId = (await pool.query(
    'SELECT id FROM inspections WHERE submission_id=$1', [submissionId])).rows[0].id;

  // The queue has to name what the vehicle is for, or the dashboard offers
  // "Create Listing" for a van going into the hire fleet.
  const queue = await api().get('/inspections?status=scheduled').set(auth).expect(200);
  const queued = queue.body.find((i) => i.id === inspectionId);
  assert.ok(queued, 'the booked inspection is in the queue');
  assert.equal(queued.submission_purpose, 'both');
  assert.equal(queued.display_make, VEHICLE.make, 'the queue renders a vehicle, not a blank row');

  await api().post(`/inspections/${inspectionId}/start`).set(auth).expect(200);
  const completed = await api().post(`/inspections/${inspectionId}/complete`).set(auth)
    .send({ checklist_results: allPass(), notes: 'End-to-end audit run.' });
  assert.equal(completed.status, 200, `complete: ${JSON.stringify(completed.body)}`);
  assert.equal(completed.body.score ?? completed.body.inspection?.score, 150);

  // ── 5. The rental fleet, from that inspection ─────────────────────────────
  const rental = await api().post('/rentals').set(auth).send({
    provider_id: providerId, title: `${VEHICLE.year} ${VEHICLE.make} ${VEHICLE.model}`,
    ...VEHICLE, mileage: 12000, daily_rate: 120000, location: 'Kigali',
    inspection_id: inspectionId,
    images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
    subscription: { amount_rwf: 50000, method: 'cash', starts_on: new Date().toISOString().slice(0, 10),
                    ends_on: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10) },
  });
  assert.equal(rental.status, 201, `rental create: ${JSON.stringify(rental.body)}`);
  assert.equal(rental.body.status, 'active', 'an inline subscription publishes it immediately');
  const rentalId = rental.body.id;

  const publicRentals = await api().get('/rentals').expect(200);
  assert.ok(publicRentals.body.some((r) => r.id === rentalId), 'it is on the public rental feed');
  await api().get(`/rentals/${rentalId}`).expect(200);

  // ── 6. THE SAME inspection also backs the sale listing ───────────────────
  // Before migration 0030 the unique index made this impossible, and the only
  // way to offer a car for hire and for sale was to inspect it twice.
  const listing = await api().post('/cars').set(auth).send({
    seller_id: providerId, title: `${VEHICLE.year} ${VEHICLE.make} ${VEHICLE.model}`,
    ...VEHICLE, mileage: 12000, price: 24000000, location: 'Kigali',
    submission_id: submissionId, inspection_id: inspectionId, images: [],
  });
  assert.equal(listing.status, 201, `listing create: ${JSON.stringify(listing.body)}`);
  const carId = listing.body.id;

  // ── 7. A photo, and the plate hidden ─────────────────────────────────────
  const png = await photoWithPlate();
  const uploaded = await api().post(`/inspections/cars/${carId}/photos`).set(auth)
    .attach('photos', png, { filename: 'front.png', contentType: 'image/png' }).expect(200);
  const photo = uploaded.body.photos[0];
  assert.equal(photo.plate_state, 'unreviewed', 'a fresh photo is honestly undecided');

  // Placed badly first — the realistic case, and the one that used to be final.
  const wrong = [{ x: 0.05, y: 0.05 }, { x: 0.35, y: 0.05 }, { x: 0.35, y: 0.16 }, { x: 0.05, y: 0.16 }];
  await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`).set(auth)
    .send({ quad: wrong }).expect(200);
  const removed = await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`).set(auth)
    .send({ plate_state: 'none' }).expect(200);
  assert.ok(await whiteShare((await fetchImage(new URL(removed.body.photos[0].url).pathname)).body) > 0.9,
    'removing the cover really republished the original');

  const fixed = await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`).set(auth)
    .send({ quad: quadOverPlate() }).expect(200);
  const fixedPhoto = fixed.body.photos.find((p) => p.id === photo.id);
  assert.equal(fixedPhoto.plate_state, 'masked');
  assert.equal(fixedPhoto.has_original, true);
  assert.equal(fixedPhoto.plate_mask.points.length, 4, 'the editor can reopen at this placement');
  assert.ok(await whiteShare((await fetchImage(new URL(fixedPhoto.url).pathname)).body) < 0.25,
    'the plate is gone from the published pixels');

  // ── 8. Publish: the waiting-on-you view, then approve and publish ────────
  const readiness = await api().get(`/cars/${carId}/readiness`).set(auth).expect(200);
  assert.equal(readiness.body.ready, true, `not ready: ${JSON.stringify(readiness.body.missing)}`);

  // The queue is oldest-first, so with a backlog longer than one page THIS car —
  // the newest — is off the end. That is not a test artefact: it is exactly how
  // an operator loses a vehicle they just finished working on. Search therefore
  // has to run on the server, across the whole matching set, not over whatever
  // the page happened to fetch.
  const waiting = await api().get(`/admin/listings?status=needs_action&limit=200&q=${carId}`)
    .set(auth).expect(200);
  assert.ok(waiting.body.some((c) => c.id === carId),
    'a car awaiting an admin decision is findable however long the queue is');
  assert.ok(Number(waiting.headers['x-total-count']) >= 1,
    'and the page reports how many match, so truncation is visible');

  const byName = await api().get('/admin/listings?status=needs_action&limit=200&q=Bora')
    .set(auth).expect(200);
  assert.ok(byName.body.some((c) => c.id === carId), 'and findable by make or model, not just by id');

  // The unfiltered queue must still report a total larger than the page when the
  // backlog is larger — the operator is told, rather than left to infer.
  const unfiltered = await api().get('/admin/listings?status=needs_action&limit=200')
    .set(auth).expect(200);
  const queueTotal = Number(unfiltered.headers['x-total-count']);
  assert.ok(queueTotal >= unfiltered.body.length, 'the total is never smaller than the page');

  await api().patch(`/cars/${carId}/status`).set(auth).send({ status: 'approved' }).expect(200);
  await api().patch(`/cars/${carId}/status`).set(auth).send({ status: 'live' }).expect(200);

  const publicCar = await api().get(`/cars/${carId}`).expect(200);
  assert.equal(publicCar.body.status, 'live');
  assert.equal(publicCar.body.registration_plate ?? null, null, 'no plate text in a public payload');
  assert.ok(!JSON.stringify(publicCar.body).includes('plate-originals'), 'the unmasked file is never addressed publicly');

  // ── The public payload carries nothing the office wrote to itself ────────
  // `SELECT c.*` published every column the cars table would ever grow. The
  // worst of them was review_notes: revoking a seller's identity appends
  // "Seller identity approval was revoked; review is required before
  // republication." to that column, and it was being served to strangers.
  const INTERNAL = ['review_notes', 'archive_reason', 'archived_at', 'approved_at',
    'approved_by', 'registration_plate', 'vin_key'];
  await pool.query(
    `UPDATE cars SET review_notes='Seller identity approval was revoked.' WHERE id=$1`, [carId]);

  const anonymous = await api().get(`/cars/${carId}`).expect(200);
  for (const column of INTERNAL) {
    assert.equal(column in anonymous.body, false,
      `${column} is the office's own note — it must not be on a public payload`);
  }

  // ...but the people who are allowed to see them still do, because the admin
  // listing editor reads review_notes from this very route.
  const insider = await api().get(`/cars/${carId}`).set(auth).expect(200);
  assert.equal(insider.body.review_notes, 'Seller identity approval was revoked.',
    'an admin keeps the internal columns');

  const browse = await api().get('/cars?limit=100').expect(200);
  const listed = browse.body.find((c) => c.id === carId);
  assert.ok(listed, 'the published car is in the public feed');
  for (const column of [...INTERNAL, 'description']) {
    assert.equal(column in listed, false,
      `${column} has no business in a browse response`);
  }
  const gone = await api().get(`/admin/listings?status=needs_action&limit=200&q=${carId}`)
    .set(auth).expect(200);
  assert.equal(gone.body.some((c) => c.id === carId), false, 'and it leaves the queue once published');
  const nowLive = await api().get(`/admin/listings?status=live&limit=200&q=${carId}`).set(auth).expect(200);
  assert.ok(nowLive.body.some((c) => c.id === carId), 'it is where it should be — under live');

  // ── 9. Editing a LIVE listing ───────────────────────────────────────────
  const second = await api().post(`/inspections/cars/${carId}/photos`).set(auth)
    .attach('photos', png, { filename: 'rear.png', contentType: 'image/png' }).expect(200);
  assert.equal(second.body.photos.length, 2, 'a photo can be added while public');

  const del = await api().delete(`/inspections/cars/${carId}/photos/${second.body.photos[1].id}`).set(auth).expect(200);
  assert.equal(del.body.photos.length, 1, 'and removed again');

  // The guard: a live listing cannot be stripped below the minimum.
  const tooFar = await api().delete(`/inspections/cars/${carId}/photos/${del.body.photos[0].id}`).set(auth);
  assert.equal(tooFar.status, 409, 'the last photo on a live listing is protected');
  await api().get(`/cars/${carId}`).expect(200);   // still public, unharmed

  const priced = await api().patch(`/cars/${carId}`).set(auth).send({ price: 23500000 });
  assert.equal(priced.status, 200, `live edit: ${JSON.stringify(priced.body)}`);
  // Retyping the model on the listing alone used to be allowed and then refused
  // at publication, stranding the operator on an error whose fix was in a
  // record the form never showed. It is now refused at the point of the edit,
  // pointing at the route that changes the vehicle and its evidence together.
  const bad = await api().patch(`/cars/${carId}`).set(auth).send({ model: 'Passat' });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.code, 'USE_VEHICLE_IDENTITY_ROUTE');
  assert.deepEqual(bad.body.fields, ['model']);
  assert.equal((await api().get(`/cars/${carId}`).expect(200)).body.model, 'Bora', 'nothing changed');



  // ── 10. Retiring the rental frees its evidence ──────────────────────────
  await pool.query("UPDATE rental_cars SET retired_at=NOW(), status='retired' WHERE id=$1", [rentalId]);
  const replacement = await api().post('/rentals').set(auth).send({
    provider_id: providerId, title: 'Replacement row', ...VEHICLE, mileage: 12000,
    daily_rate: 130000, inspection_id: inspectionId,
    images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
  });
  assert.equal(replacement.status, 201,
    `a retired rental must release its inspection: ${JSON.stringify(replacement.body)}`);
  assert.equal(replacement.body.status, 'maintenance', 'no subscription means present, not published');
  const feed = await api().get('/rentals').expect(200);
  assert.equal(feed.body.some((r) => r.id === replacement.body.id), false,
    'and an unsubscribed car is never on the public feed');

  // ── 11. Correcting what the vehicle is ──────────────────────────────────
  // And the correction route does what the operator actually meant: the listing
  // and the inspected submission move together, so the vehicle stays publishable.
  const corrected = await api().patch(`/cars/${carId}/vehicle-identity`).set(auth)
    .send({ make: 'Volkswagen', model: 'Bora Comfortline', year: 2025, reason: 'Trim level added at the seller\'s request.' });
  assert.equal(corrected.status, 200, JSON.stringify(corrected.body));
  assert.equal(corrected.body.readiness.ready, true, 'still publishable — that is the whole point');
  assert.equal((await api().get(`/cars/${carId}`).expect(200)).body.model, 'Bora Comfortline');
  const evidence = (await pool.query(
    'SELECT model FROM submissions WHERE id = $1', [submissionId])).rows[0];
  assert.equal(evidence.model, 'Bora Comfortline', 'the evidence moved with it');
});

test('the gates still refuse what they are there to refuse', async () => {
  const admin = await adminToken();
  const auth = { Authorization: `Bearer ${admin.token}` };

  // An unverified seller's car cannot be published, however complete it looks.
  const email = uniq('e2e-unverified');
  const reg = await api().post('/auth/register')
    .send({ name: 'Unverified', email, password: 'password123', role: 'seller' }).expect(201);

  const intake = await api().post('/submissions/admin').set(auth)
    .send({ seller_id: reg.body.user.id, purpose: 'rental', ...VEHICLE });
  assert.equal(intake.status, 201);
  // The warning is the point: the rental gate would refuse this provider three
  // steps later, and the operator is told now.
  assert.equal(intake.body.warnings.length, 1, JSON.stringify(intake.body.warnings));
  assert.match(intake.body.warnings[0], /business-verified/i);

  // A rental for that provider is refused outright.
  const rental = await api().post('/rentals').set(auth).send({
    provider_id: reg.body.user.id, title: 'Nope', ...VEHICLE, daily_rate: 100000,
    inspection_id: '00000000-0000-0000-0000-000000000000',
    images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
  });
  assert.equal(rental.status, 400);
  assert.match(rental.body.error, /verified/i);

  // An intake for a non-existent seller is a 404, not a 500.
  await api().post('/submissions/admin').set(auth)
    .send({ seller_id: '00000000-0000-0000-0000-000000000000', ...VEHICLE }).expect(404);

  // And a malformed one is a 400, not a 500. `WHERE id = $1` against a
  // non-UUID raises 22P02, which reaches the operator as "Server error" for
  // what is plainly a bad request.
  for (const bad of ['abc', '123', 'not-a-uuid', '', null, 42, {}, []]) {
    const res = await api().post('/submissions/admin').set(auth).send({ seller_id: bad, ...VEHICLE });
    assert.equal(res.status, 400, `seller_id=${JSON.stringify(bad)} must be a 400, got ${res.status}`);
  }
  // Same for the other field that reaches a query directly.
  const badYear = await api().post('/submissions/admin').set(auth)
    .send({ seller_id: reg.body.user.id, make: 'VW', model: 'Bora', year: 'soon' });
  assert.equal(badYear.status, 400);

  // And the intake route is admin-only.
  await api().post('/submissions/admin').set('Authorization', `Bearer ${reg.body.token}`)
    .send({ seller_id: reg.body.user.id, ...VEHICLE }).expect(403);
  await api().post('/submissions/admin').send({ seller_id: reg.body.user.id, ...VEHICLE }).expect(401);
});

test('liveness and readiness answer honestly', async () => {
  const health = await api().get('/health').expect(200);
  assert.equal(health.body.status ?? health.body.ok ?? 'ok', health.body.status ?? health.body.ok ?? 'ok');
  await api().get('/health/ready').expect(200);
  // A retired transaction surface must still answer 410, not quietly work.
  await api().post('/payments/anything').expect(410);
});

test.after(async () => { await pool.end(); });
