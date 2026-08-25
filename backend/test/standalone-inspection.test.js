// ─────────────────────────────────────────────────────────────────────────────
// Walk-in ("standalone") inspections.
//
// A customer brings a car Sawa does not sell, pays for the 150-point check and
// leaves with a report. The commercial value of that report is precisely that
// Sawa has no stake in the vehicle — which makes the dangerous failure mode
// obvious: a walk-in inspection must never become evidence that publishes a
// listing, opens a conversation, or verifies a rental.
//
// The defence is a database CHECK, not seven WHERE clauses. Test 2 is the one
// this file exists for; do not weaken it.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { REQUIRED_ITEM_IDS, CHECKLIST_VERSION, PUBLISH_THRESHOLD } = require('../src/lib/inspection-policy');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const checklist = (verdict = 'pass') => Object.fromEntries(REQUIRED_ITEM_IDS.map((id) => [id, verdict]));

// Each fixture takes its own future day so one test filling a centre cannot
// make an unrelated test fail on capacity.
let fixtureDay = 200;
const nextDay = () => new Date(Date.now() + fixtureDay++ * 86400_000).toISOString().slice(0, 10);

async function register(overrides = {}) {
  const body = { name: 'Test User', email: unique('walkin'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}
async function makeAdmin(user) {
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}

/** Book a walk-in for a brand-new customer, on a day of its own. */
async function bookWalkIn(admin, vehicle = {}, extra = {}) {
  const res = await api().post('/inspections/standalone')
    .set('Authorization', `Bearer ${admin}`)
    .send({
      make: 'Toyota', model: 'Land Cruiser', year: 2016,
      registration_plate: 'RAD 123 X', mileage: 141000,
      center: 'Nyarutarama Center', scheduled_date: nextDay(), scheduled_time: '09:00 AM',
      customer: { name: 'Walk-in Customer', email: unique('customer'), phone: '+250788111222' },
      ...vehicle, ...extra,
    })
    .expect(201);
  return res.body;
}

async function completeWalkIn(admin, inspectionId, verdict = 'pass') {
  await api().post(`/inspections/${inspectionId}/start`).set('Authorization', `Bearer ${admin}`).expect(200);
  return api().post(`/inspections/${inspectionId}/complete`)
    .set('Authorization', `Bearer ${admin}`).send({ checklist_results: checklist(verdict) }).expect(200);
}

test.after(async () => { await pool.end(); });

// ─── 1. The happy path ───────────────────────────────────────────────────────

test('a walk-in is booked against a real centre, inspected, and scored like any other', async () => {
  const admin = await makeAdmin(await register());
  const booked = await bookWalkIn(admin);

  assert.equal(booked.kind, 'standalone');
  assert.equal(booked.submission_id, null, 'a walk-in must never carry a submission');
  assert.equal(booked.car_id, null, 'a walk-in must never carry a car');
  assert.ok(booked.customer_user_id, 'the customer gets an account');
  assert.equal(booked.vehicle_make, 'Toyota');
  assert.equal(booked.vehicle_year, 2016);
  assert.equal(booked.status, 'scheduled');
  assert.equal(booked.customer.email.includes('@'), true);

  // The customer account is created unusable and unverified: booking an
  // inspection is not a back door around the ID check.
  const { rows: account } = await pool.query(
    'SELECT role, id_verified, password_hash, admin_created FROM users WHERE id=$1', [booked.customer_user_id]
  );
  assert.equal(account[0].role, 'buyer');
  assert.notEqual(account[0].id_verified, 'approved');
  assert.equal(account[0].password_hash, null);
  assert.equal(account[0].admin_created, true);

  const completed = await completeWalkIn(admin, booked.id);
  assert.equal(completed.body.score, 150);
  assert.equal(completed.body.passed, true);
  assert.equal(completed.body.kind, 'standalone');
  assert.equal(completed.body.car_id, null);
  assert.equal(completed.body.published, false);
  assert.equal(completed.body.ready_for_review, false, 'a walk-in is never listing-ready');

  // The customer, not a seller, is told the report is ready.
  const { rows: notes } = await pool.query(
    'SELECT user_id, title FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',
    [booked.customer_user_id]
  );
  assert.equal(notes.length, 1);
  assert.match(notes[0].title, /report is ready/i);

  // It is visible in the admin queue with a party and a vehicle to show.
  const list = await api().get('/inspections').set('Authorization', `Bearer ${admin}`).expect(200);
  const row = list.body.find((entry) => entry.id === booked.id);
  assert.ok(row, 'a walk-in must appear in the admin inspections list');
  assert.equal(row.display_make, 'Toyota');
  assert.equal(row.display_year, 2016);
  assert.ok(row.party_name, 'the list must name the customer when there is no seller');

  const detail = await api().get(`/inspections/${booked.id}`).set('Authorization', `Bearer ${admin}`).expect(200);
  assert.equal(detail.body.display_model, 'Land Cruiser');
  assert.equal(detail.body.display_vin, null);
  assert.equal(detail.body.seller_id, null);
  assert.ok(detail.body.customer_name);
});

// ─── 2. The attack this phase exists to prevent ──────────────────────────────

test('a completed walk-in cannot be used as publication, contact or rental evidence', async () => {
  const admin = await makeAdmin(await register());
  const seller = await register({ role: 'seller' });
  await pool.query(
    `UPDATE users SET id_verified='approved', seller_type='showroom', business_verified=TRUE,
       phone='+250788000777', phone_visible=TRUE, contact_consent_at=NOW() WHERE id=$1`,
    [seller.id]
  );

  // The walk-in vehicle and the listing are the same make, model and year —
  // every identity predicate in the gates would match on those alone.
  const vehicle = { make: 'Toyota', model: 'RAV4', year: 2021 };
  const walkIn = await bookWalkIn(admin, vehicle);
  const completed = await completeWalkIn(admin, walkIn.id);
  assert.equal(completed.body.passed, true);
  assert.ok(Number(completed.body.score) >= PUBLISH_THRESHOLD);

  const car = await api().post('/cars').set('Authorization', `Bearer ${admin}`)
    .send({
      seller_id: seller.id, title: 'Identical vehicle listing', ...vehicle,
      mileage: 24000, price: 28000000, images: ['https://example.test/attack.jpg'],
    }).expect(201);

  // Even pointing the car at the walk-in by hand cannot help: the CHECK
  // refuses the write, so the link the gates require can never exist.
  await assert.rejects(
    () => pool.query('UPDATE inspections SET car_id=$1 WHERE id=$2', [car.body.id, walkIn.id]),
    (err) => err.code === '23514',
    'the database must refuse to link a walk-in to a car'
  );

  // Every gate, still closed.
  const blocked = await api().patch(`/cars/${car.body.id}/status`)
    .set('Authorization', `Bearer ${admin}`).send({ status: 'approved' }).expect(409);
  assert.equal(blocked.body.code, 'LISTING_NOT_READY');
  assert.match(blocked.body.readiness.missing.join(' '), /inspection/i);

  await api().get(`/cars/${car.body.id}`).expect(404);

  const buyer = await register();
  await api().post('/messages/conversations').set('Authorization', `Bearer ${buyer.token}`)
    .send({ car_id: car.body.id, message: 'Is this available?' }).expect(404);
  await api().post(`/cars/save/${car.body.id}`).set('Authorization', `Bearer ${buyer.token}`).expect(404);
  await api().get(`/inspections/report/${car.body.id}`).expect(404);

  // And it cannot verify a rental either.
  await api().post('/rentals').set('Authorization', `Bearer ${admin}`)
    .send({
      provider_id: seller.id, title: 'Identical rental', ...vehicle,
      daily_rate: 65000, inspection_id: walkIn.id, images: ['https://example.test/rental.jpg'],
    }).expect(409);
});

// ─── 3. The constraint, from both directions ─────────────────────────────────

test('the kind/shape constraint refuses every malformed inspection', async () => {
  const admin = await makeAdmin(await register());
  const walkIn = await bookWalkIn(admin);

  const refusals = [
    ['a walk-in with a submission', "UPDATE inspections SET submission_id=(SELECT id FROM submissions LIMIT 1) WHERE id=$1"],
    ['a walk-in with no customer', 'UPDATE inspections SET customer_user_id=NULL WHERE id=$1'],
    ['a walk-in with no vehicle', 'UPDATE inspections SET vehicle_make=NULL WHERE id=$1'],
    ['a listing inspection with no submission', "UPDATE inspections SET kind='listing' WHERE id=$1"],
  ];
  for (const [label, sql] of refusals) {
    await assert.rejects(() => pool.query(sql, [walkIn.id]), (err) => err.code === '23514', label);
  }
});

// ─── 4. Capacity counts walk-ins ─────────────────────────────────────────────

test('walk-ins consume centre capacity, and a submission cannot book past it', async () => {
  // `submission_id <> $3` silently dropped every NULL row from this count.
  // Kimironko has the smallest capacity, so it is quickest to fill.
  const { rows: centre } = await pool.query("SELECT daily_capacity FROM inspection_centers WHERE id='kimironko'");
  const capacity = centre[0].daily_capacity;
  const admin = await makeAdmin(await register());
  const day = nextDay();
  await pool.query(
    "DELETE FROM inspections WHERE lower(center)='kimironko center' AND scheduled_on=$1::date", [day]
  );

  for (let i = 0; i < capacity; i++) {
    await api().post('/inspections/standalone').set('Authorization', `Bearer ${admin}`)
      .send({
        make: 'Nissan', model: 'X-Trail', year: 2015,
        center: 'Kimironko Center', scheduled_date: day, scheduled_time: '11:00 AM',
        customer: { name: `Filler ${i}`, email: unique('filler') },
      })
      .expect(201);
  }
  await api().post('/inspections/standalone').set('Authorization', `Bearer ${admin}`)
    .send({
      make: 'Nissan', model: 'X-Trail', year: 2015,
      center: 'Kimironko Center', scheduled_date: day, scheduled_time: '11:00 AM',
      customer: { name: 'One too many', email: unique('overflow') },
    })
    .expect(409);

  // The point of the fix: a *submission* booking sees the walk-ins too.
  const seller = await register({ role: 'seller' });
  const submission = await api().post('/submissions').set('Authorization', `Bearer ${seller.token}`)
    .send({ make: 'Toyota', model: 'Vitz', year: 2014, mileage: 90000, asking_price: 6000000 })
    .expect(201);
  await api().patch(`/submissions/${submission.body.id}`).set('Authorization', `Bearer ${admin}`)
    .send({ status: 'scheduled', center: 'Kimironko Center', scheduled_date: day, scheduled_time: '11:00 AM' })
    .expect(409);
});

// ─── 5. Reschedule and cancel ────────────────────────────────────────────────

test('a walk-in can be moved or cancelled while it is still only scheduled', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const walkIn = await bookWalkIn(admin);

  const moved = await api().patch(`/inspections/${walkIn.id}/schedule`).set(auth)
    .send({ center: 'Kicukiro Center', scheduled_date: nextDay(), scheduled_time: '02:00 PM' })
    .expect(200);
  assert.equal(moved.body.center, 'Kicukiro Center');
  assert.equal(moved.body.status, 'scheduled');

  // A no-op re-save of the same centre and day must not be refused by its own booking.
  const sameDay = String(moved.body.scheduled_on).slice(0, 10);
  await api().patch(`/inspections/${walkIn.id}/schedule`).set(auth)
    .send({ center: 'Kicukiro Center', scheduled_date: sameDay, scheduled_time: '03:00 PM' })
    .expect(200);

  await api().delete(`/inspections/${walkIn.id}`).set(auth).send({ reason: 'Customer did not arrive' }).expect(200);
  const { rows } = await pool.query('SELECT 1 FROM inspections WHERE id=$1', [walkIn.id]);
  assert.equal(rows.length, 0);
  // The audit log keeps what the hard delete removed.
  const { rows: audit } = await pool.query(
    "SELECT action FROM admin_audit_log WHERE target_id=$1 AND action='inspection.cancelled'", [walkIn.id]
  );
  assert.equal(audit.length, 1);

  // Started work is no longer cancellable or movable.
  const second = await bookWalkIn(admin);
  await api().post(`/inspections/${second.id}/start`).set(auth).expect(200);
  await api().patch(`/inspections/${second.id}/schedule`).set(auth)
    .send({ center: 'Nyarutarama Center', scheduled_date: nextDay(), scheduled_time: '09:00 AM' }).expect(409);
  await api().delete(`/inspections/${second.id}`).set(auth).expect(409);
});

test('the walk-in routes refuse a listing inspection, a stranger, and bad input', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };

  await api().post('/inspections/standalone').set(auth)
    .send({ model: 'Land Cruiser', year: 2016, center: 'Nyarutarama Center', scheduled_date: nextDay() })
    .expect(400);
  await api().post('/inspections/standalone').set(auth)
    .send({
      make: 'Toyota', model: 'Hiace', year: 2016, center: 'Nyarutarama Center', scheduled_date: nextDay(),
      customer: { name: 'No Email', email: 'not-an-email' },
    })
    .expect(400);

  const outsider = await register();
  await api().post('/inspections/standalone').set('Authorization', `Bearer ${outsider.token}`)
    .send({ make: 'Toyota', model: 'Hiace', year: 2016, center: 'Nyarutarama Center', scheduled_date: nextDay() })
    .expect(403);

  // A listing inspection belongs to its submission; it is rescheduled there.
  const seller = await register({ role: 'seller' });
  const submission = await api().post('/submissions').set('Authorization', `Bearer ${seller.token}`)
    .send({ make: 'Toyota', model: 'Corolla', year: 2018, mileage: 70000, asking_price: 9000000 })
    .expect(201);
  await api().patch(`/submissions/${submission.body.id}`).set(auth)
    .send({ status: 'scheduled', center: 'Nyarutarama Center', scheduled_date: nextDay(), scheduled_time: '08:00 AM' })
    .expect(200);
  const { rows } = await pool.query('SELECT id FROM inspections WHERE submission_id=$1', [submission.body.id]);
  await api().patch(`/inspections/${rows[0].id}/schedule`).set(auth)
    .send({ center: 'Kicukiro Center', scheduled_date: nextDay(), scheduled_time: '08:00 AM' }).expect(409);
  await api().delete(`/inspections/${rows[0].id}`).set(auth).expect(409);
});

// ─── 6. The report ───────────────────────────────────────────────────────────

test('the report snapshot carries the walk-in vehicle and names the customer', async () => {
  const admin = await makeAdmin(await register());
  const walkIn = await bookWalkIn(admin, { make: 'Mitsubishi', model: 'Pajero', year: 2013 });
  await completeWalkIn(admin, walkIn.id);

  const { snapshotForInspection } = require('../src/lib/documents/inspection-report');
  const snapshot = await snapshotForInspection(walkIn.id);

  assert.equal(snapshot.subject.kind, 'standalone');
  assert.equal(snapshot.subject.party_user_id, walkIn.customer_user_id);
  assert.ok(snapshot.subject.party_name);
  assert.equal(snapshot.vehicle.car_id, null);
  assert.equal(snapshot.vehicle.make, 'Mitsubishi');
  assert.equal(snapshot.vehicle.model, 'Pajero');
  assert.equal(snapshot.vehicle.year, 2013);
  assert.equal(snapshot.vehicle.registration_plate, 'RAD 123 X');
  assert.equal(snapshot.vehicle.mileage, 141000);
  assert.equal(snapshot.vehicle.title, '2013 Mitsubishi Pajero');
  assert.equal(snapshot.inspection.checklist_version, CHECKLIST_VERSION);
  assert.equal(snapshot.seller.user_id, null, 'a walk-in has no seller');

  // A snapshot stored before `subject` existed must still render.
  const { renderInspectionReport } = require('../src/lib/documents/inspection-report');
  const legacy = { ...snapshot };
  delete legacy.subject;
  const pdf = await renderInspectionReport(legacy, { document_number: 'INSP-TEST-00001' });
  assert.ok(pdf.buffer.length > 1000, 'a legacy snapshot must still produce a PDF');
});
