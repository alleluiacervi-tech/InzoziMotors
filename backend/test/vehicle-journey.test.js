// ─────────────────────────────────────────────────────────────────────────────
// The vehicle journey.
//
// The rail's only job is to be true. Two tests here matter more than the rest:
//
//   • "stage 6 agrees with the transaction" — if the rail's readiness ever
//     drifts from the check that actually refuses to publish, the dashboard
//     starts saying "ready" beside a button that returns 409, and after that
//     nobody believes any of it.
//   • "the rail goes backwards" — a failed re-inspection demotes a live
//     listing on its own. A rail that only advances would be at its least
//     truthful exactly when the stakes are highest.
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

let fixtureDay = 400;
const nextDay = () => new Date(Date.now() + fixtureDay++ * 86400_000).toISOString().slice(0, 10);

async function register(overrides = {}) {
  const body = { name: 'Journey User', email: unique('journey'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}
async function makeAdmin(user) {
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}
const stageOf = (journey, key) => journey.stages.find((stage) => stage.key === key);

/** Walk a vehicle as far along the pipeline as `upTo` allows. */
async function pipeline(admin, { upTo = 'live', verdict = 'pass', vehicle = {} } = {}) {
  const seller = await register({ role: 'seller' });
  const auth = { Authorization: `Bearer ${admin}` };
  const car = { make: 'Toyota', model: 'Corolla Journey', year: 2019, ...vehicle };

  if (upTo === 'unverified_seller') return { seller, car: null, submissionId: null };
  await pool.query("UPDATE users SET id_verified='approved' WHERE id=$1", [seller.id]);
  if (upTo === 'seller') return { seller, submissionId: null };

  const submission = await api().post('/submissions').set('Authorization', `Bearer ${seller.token}`)
    .send({ ...car, mileage: 41000, asking_price: 14000000 }).expect(201);
  const submissionId = submission.body.id;
  if (upTo === 'submitted') return { seller, submissionId };

  const day = nextDay();
  await api().patch(`/submissions/${submissionId}`).set(auth)
    .send({ status: 'scheduled', center: 'Nyarutarama Center', scheduled_date: day, scheduled_time: '10:00 AM' })
    .expect(200);
  const { rows } = await pool.query('SELECT id FROM inspections WHERE submission_id=$1', [submissionId]);
  const inspectionId = rows[0].id;
  if (upTo === 'booked') return { seller, submissionId, inspectionId, day };

  await api().post(`/inspections/${inspectionId}/start`).set(auth).expect(200);
  await api().post(`/inspections/${inspectionId}/complete`).set(auth)
    .send({ checklist_results: checklist(verdict) }).expect(200);
  if (upTo === 'inspected') return { seller, submissionId, inspectionId };

  const created = await api().post('/cars').set(auth).send({
    seller_id: seller.id, title: `${car.year} ${car.make} ${car.model}`, ...car,
    mileage: 41000, price: 14000000, submission_id: submissionId, images: [],
  }).expect(201);
  const carId = created.body.id;
  if (upTo === 'listing') return { seller, submissionId, inspectionId, carId };

  await pool.query("UPDATE cars SET images = ARRAY['https://example.test/j.jpg'] WHERE id=$1", [carId]);
  if (upTo === 'ready') return { seller, submissionId, inspectionId, carId };

  await api().patch(`/cars/${carId}/status`).set(auth).send({ status: 'approved' }).expect(200);
  await api().patch(`/cars/${carId}/status`).set(auth).send({ status: 'live' }).expect(200);
  return { seller, submissionId, inspectionId, carId };
}

test.after(async () => { await pool.end(); });

// ─── The whole walk ──────────────────────────────────────────────────────────

test('the rail advances one stage at a time and names who each is waiting on', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const read = (id) => api().get(`/admin/journey/submission/${id}`).set(auth).expect(200);

  const booked = await pipeline(admin, { upTo: 'booked' });
  let journey = (await read(booked.submissionId)).body;
  assert.equal(stageOf(journey, 'seller_verified').state, 'done');
  assert.equal(stageOf(journey, 'submitted').state, 'done');
  assert.equal(stageOf(journey, 'booked').state, 'done');
  // The appointment is in the future: nothing for anyone to do but wait.
  assert.equal(stageOf(journey, 'inspected').state, 'active');
  assert.equal(stageOf(journey, 'inspected').actor, 'clock');
  assert.equal(stageOf(journey, 'listing_created').state, 'locked');
  assert.equal(journey.actor, 'clock');
  assert.equal(journey.complete, false);

  const inspected = await pipeline(admin, { upTo: 'inspected' });
  journey = (await read(inspected.submissionId)).body;
  assert.equal(stageOf(journey, 'inspected').state, 'done');
  assert.equal(stageOf(journey, 'listing_created').state, 'active');
  assert.equal(stageOf(journey, 'listing_created').actor, 'us');
  // The blocker is the fix: it carries the pre-linked create URL.
  assert.match(stageOf(journey, 'listing_created').blockers[0].fix, /submissionId=/);
  assert.match(stageOf(journey, 'listing_created').blockers[0].fix, /inspectionId=/);

  const listing = await pipeline(admin, { upTo: 'listing' });
  journey = (await read(listing.submissionId)).body;
  assert.equal(stageOf(journey, 'listing_created').state, 'done');
  const ready = stageOf(journey, 'ready');
  assert.equal(ready.state, 'active');
  assert.equal(ready.actor, 'us');
  assert.ok(ready.blockers.length, 'a listing with no photos must show a blocker');
  assert.match(ready.blockers.map((b) => b.label).join(' '), /photo/i);
  assert.match(ready.blockers.find((b) => /photo/i.test(b.label)).fix, /\/photos$/);

  const live = await pipeline(admin, { upTo: 'live' });
  journey = (await read(live.submissionId)).body;
  assert.equal(journey.complete, true);
  assert.equal(journey.stages_done, 7);
  assert.equal(journey.actor, 'none');
  assert.equal(stageOf(journey, 'live').state, 'done');
});

// ─── The anti-drift test ─────────────────────────────────────────────────────

test('stage six agrees with the transaction that actually refuses to publish', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const listing = await pipeline(admin, { upTo: 'listing' });

  // Not ready: the rail says so, and the transaction refuses for the same reasons.
  const before = (await api().get(`/admin/journey/car/${listing.carId}`).set(auth).expect(200)).body;
  assert.equal(stageOf(before, 'ready').state, 'active');
  const refused = await api().patch(`/cars/${listing.carId}/status`)
    .set(auth).send({ status: 'approved' }).expect(409);
  assert.equal(refused.body.code, 'LISTING_NOT_READY');
  assert.deepEqual(
    stageOf(before, 'ready').blockers.map((b) => b.label.replace(/^Needs /, '')).sort(),
    [...refused.body.readiness.missing].sort(),
    'the rail must quote the refusal verbatim, not paraphrase it'
  );

  // Ready: the rail says so, and the same transaction now succeeds.
  await pool.query("UPDATE cars SET images = ARRAY['https://example.test/ok.jpg'] WHERE id=$1", [listing.carId]);
  const after = (await api().get(`/admin/journey/car/${listing.carId}`).set(auth).expect(200)).body;
  assert.equal(stageOf(after, 'ready').state, 'done');
  assert.equal(stageOf(after, 'ready').blockers.length, 0);
  await api().patch(`/cars/${listing.carId}/status`).set(auth).send({ status: 'approved' }).expect(200);

  const approved = (await api().get(`/admin/journey/car/${listing.carId}`).set(auth).expect(200)).body;
  assert.equal(stageOf(approved, 'live').state, 'active');
  assert.equal(stageOf(approved, 'live').actor, 'us');
});

// ─── Regression ──────────────────────────────────────────────────────────────

test('the rail goes backwards when the system does', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const live = await pipeline(admin, { upTo: 'live' });

  // 1. A failed re-inspection demotes the listing; the rail must show it.
  await pool.query(
    `UPDATE inspections SET passed=FALSE, score=70,
       critical_failures='[{"id":"brakes","label":"Brake system"}]'::jsonb
     WHERE submission_id=$1`, [live.submissionId]
  );
  await pool.query("UPDATE cars SET status='under_review' WHERE id=$1", [live.carId]);
  let journey = (await api().get(`/admin/journey/submission/${live.submissionId}`).set(auth).expect(200)).body;
  assert.equal(stageOf(journey, 'inspected').state, 'blocked');
  assert.match(stageOf(journey, 'inspected').blockers[0].label, /critical failure/i);
  assert.equal(stageOf(journey, 'live').state, 'locked');
  assert.equal(journey.blocked, true);
  assert.equal(journey.complete, false);
  // A blocked stage outranks a later active one — the earliest real problem wins.
  assert.equal(journey.current_stage, 'inspected');

  // 2. Revoking the seller's identity drops the very first stage.
  const clean = await pipeline(admin, { upTo: 'live' });
  await pool.query("UPDATE users SET id_verified='rejected' WHERE id=$1", [clean.seller.id]);
  journey = (await api().get(`/admin/journey/submission/${clean.submissionId}`).set(auth).expect(200)).body;
  assert.equal(stageOf(journey, 'seller_verified').state, 'blocked');
  assert.equal(stageOf(journey, 'seller_verified').actor, 'seller');
  assert.equal(journey.current_stage, 'seller_verified');
  // Stage 6 must notice too, because publication readiness checks the seller.
  assert.equal(stageOf(journey, 'ready').state, 'active');
  assert.match(stageOf(journey, 'ready').blockers.map((b) => b.label).join(' '), /identity|seller/i);
});

// ─── The stall nothing surfaced before ───────────────────────────────────────

test('an appointment that came and went is reported as missed, not as scheduled', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const booked = await pipeline(admin, { upTo: 'booked' });

  // Before: a future booking is a clock, and nobody is at fault.
  let journey = (await api().get(`/admin/journey/inspection/${booked.inspectionId}`).set(auth).expect(200)).body;
  assert.equal(stageOf(journey, 'inspected').actor, 'clock');

  // Move the appointment into the past without ever starting it.
  // scheduled_date is the human display string; clearing it also exercises the
  // fallback that formats the raw `date` column.
  await pool.query(
    `UPDATE inspections SET scheduled_on = (NOW() - INTERVAL '3 days')::date,
       scheduled_at = NOW() - INTERVAL '3 days', scheduled_date = NULL
     WHERE id=$1`, [booked.inspectionId]
  );
  journey = (await api().get(`/admin/journey/inspection/${booked.inspectionId}`).set(auth).expect(200)).body;
  const stage = stageOf(journey, 'inspected');
  assert.equal(stage.state, 'blocked');
  assert.equal(stage.actor, 'us', 'a missed appointment is our problem, not the clock’s');
  // Not pinned to an exact number: the appointment is a calendar day read in
  // Kigali time, so a three-day UTC interval is three or four Kigali days ago
  // depending on the hour the suite runs. What must hold is that it is reported
  // as missed, with an age.
  assert.match(stage.detail, /appointment missed \d+ days? ago/i);
  assert.ok(Number(stage.detail.match(/(\d+)/)[1]) >= 3);
  assert.equal(journey.blocked, true);

  // A `date` column arrives as a Date object; slicing its String() gives
  // "Fri Aug 2", which is neither a date nor obviously wrong on screen.
  assert.match(stageOf(journey, 'booked').detail, /· \d{4}-\d{2}-\d{2}$/,
    'the booked stage must format the raw date column, not slice Date.toString()');
});

// ─── Resolution from any direction, and the walk-in refusal ──────────────────

test('a journey resolves from a submission, an inspection or a car alike', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const live = await pipeline(admin, { upTo: 'live' });

  const bySubmission = (await api().get(`/admin/journey/submission/${live.submissionId}`).set(auth).expect(200)).body;
  const byInspection = (await api().get(`/admin/journey/inspection/${live.inspectionId}`).set(auth).expect(200)).body;
  const byCar        = (await api().get(`/admin/journey/car/${live.carId}`).set(auth).expect(200)).body;
  assert.deepEqual(bySubmission.subject, byInspection.subject);
  assert.deepEqual(bySubmission.subject, byCar.subject);
  assert.equal(byCar.vehicle.title, bySubmission.vehicle.title);
});

test('a listing with no submission is drawn, and says why it can never be published', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified='approved' WHERE id=$1", [seller.id]);
  const car = await api().post('/cars').set(auth).send({
    seller_id: seller.id, title: 'Orphan listing', make: 'Toyota', model: 'Orphan',
    year: 2018, mileage: 60000, price: 9000000, images: [],
  }).expect(201);

  const journey = (await api().get(`/admin/journey/car/${car.body.id}`).set(auth).expect(200)).body;
  assert.equal(stageOf(journey, 'submitted').state, 'blocked');
  assert.match(stageOf(journey, 'submitted').blockers[0].label, /can never be published/i);
  assert.equal(stageOf(journey, 'booked').state, 'locked');
});

test('a walk-in inspection has no pipeline, and says so plainly', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const walkIn = await api().post('/inspections/standalone').set(auth).send({
    make: 'Toyota', model: 'Hiace', year: 2015,
    center: 'Nyarutarama Center', scheduled_date: nextDay(), scheduled_time: '08:00 AM',
    customer: { name: 'Walk In', email: unique('walkin-journey') },
  }).expect(201);

  const refused = await api().get(`/admin/journey/inspection/${walkIn.body.id}`).set(auth).expect(409);
  assert.equal(refused.body.code, 'STANDALONE_INSPECTION');
  assert.match(refused.body.error, /does not list/i);
});

// ─── The board ───────────────────────────────────────────────────────────────

test('the board lists what is in flight, waiting on us first, and excludes what is finished', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const inFlight = await pipeline(admin, { upTo: 'inspected' });
  const finished = await pipeline(admin, { upTo: 'live' });

  const board = (await api().get('/admin/journey').set(auth).expect(200)).body;
  assert.equal(board.stages.length, 7);
  assert.equal(board.stages[0].key, 'seller_verified');

  const ids = board.vehicles.map((v) => v.subject.submission_id);
  assert.ok(ids.includes(inFlight.submissionId), 'a vehicle mid-pipeline belongs on the board');
  assert.equal(ids.includes(finished.submissionId), false, 'a published listing is finished, not in flight');

  // Ordering is the product: everything waiting on us comes before everything
  // waiting on somebody else.
  const weight = { us: 0, seller: 1, clock: 2, none: 3 };
  const order = board.vehicles.map((v) => weight[v.actor]);
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'waiting-on-us must sort first');

  assert.equal(typeof board.summary.waiting_on_us, 'number');
  assert.equal(typeof board.summary.live, 'number');
  assert.equal(board.truncated, false);
});

test('the journey reads are admin-only and validate what they are given', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const outsider = await register();

  await api().get('/admin/journey').set('Authorization', `Bearer ${outsider.token}`).expect(403);
  await api().get('/admin/journey').expect(401);
  await api().get(`/admin/journey/wizard/${outsider.id}`).set(auth).expect(400);
  await api().get('/admin/journey/car/not-a-uuid').set(auth).expect(400);
  await api().get('/admin/journey/car/00000000-0000-0000-0000-000000000000').set(auth).expect(404);
});
