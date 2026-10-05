// ─────────────────────────────────────────────────────────────────────────────
// The vehicle record: what Sawa witnessed (odometer readings, listing events)
// and what NHTSA publishes about the model (lib/model-safety.js).
//
// NHTSA is never called: the module's fetcher is replaced with canned answers
// shaped like the real ones (probed 5 Oct 2026). What is under test is what we
// decide from them: which model matches, what is cached, what a failure shows.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { REQUIRED_ITEM_IDS } = require('../src/lib/inspection-policy');
const safety = require('../src/lib/model-safety');
const {
  parseOdometer, assessReadings, declaredMismatch,
} = require('../src/lib/odometer');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const checklist = () => Object.fromEntries(REQUIRED_ITEM_IDS.map((id) => [id, 'pass']));
const VIN = () => `JTMBF${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 9000 + 1000)}`;
let fixtureDay = 2400;
const nextDay = () => new Date(Date.now() + fixtureDay++ * 86400_000).toISOString().slice(0, 10);

async function register(overrides = {}) {
  const body = { name: 'Record User', email: unique('record'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}
async function makeAdmin(user) {
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}
async function clearDay(day) {
  await pool.query(
    "DELETE FROM inspections i WHERE lower(i.center)='nyarutarama center' AND i.scheduled_on=$1::date"
      + ' AND NOT EXISTS (SELECT 1 FROM rental_cars rc WHERE rc.inspection_id = i.id)', [day]
  );
}

test.after(async () => { await pool.end(); });

// ─── Pure rules ──────────────────────────────────────────────────────────────

test('a model matches NHTSA strictly: drivetrain words drop, other models never borrow', () => {
  const names = ['RAV4', 'Land Cruiser', 'Corolla', 'Prius C', 'CAMRY HYBRID'];
  assert.equal(safety.matchModel('RAV4', names), 'RAV4');
  assert.equal(safety.matchModel('rav 4', names), 'RAV4');
  assert.equal(safety.matchModel('RAV4 Hybrid', names), 'RAV4');
  assert.equal(safety.matchModel('Camry Hybrid', names), 'CAMRY HYBRID', 'an exact hybrid model wins');
  assert.equal(safety.matchModel('Land Cruiser Prado', names), null, 'the Prado is not the Land Cruiser');
  assert.equal(safety.matchModel('Corolla Fielder', names), null);
  assert.equal(safety.matchModel('Prius', names), null, 'never a prefix of another model');
  assert.equal(safety.matchModel('', names), null);
});

test('NHTSA dates and complaint summaries', () => {
  assert.equal(safety.isoDate('07/04/2016'), '2016-04-07');
  assert.equal(safety.isoDate('2016-04-07'), null);
  assert.equal(safety.isoDate('31/13/2016'), null);
  const summary = safety.summariseComplaints([
    { components: 'ENGINE, ELECTRICAL SYSTEM', crash: true, numberOfInjuries: 1 },
    { components: 'ENGINE', fire: true },
    { components: 'SUSPENSION' },
  ]);
  assert.equal(summary.total, 3);
  assert.deepEqual(summary.top_components[0], { component: 'ENGINE', count: 2 });
  assert.equal(summary.crashes, 1);
  assert.equal(summary.fires, 1);
  assert.equal(summary.injuries, 1);
});

test('odometer readings: a drop below any earlier reading is reported, rounding is not', () => {
  const at = (d) => new Date(`2026-0${d}-01T10:00:00Z`);
  const steady = assessReadings([
    { inspection_id: 'a', on: at(1), km: 90000 },
    { inspection_id: 'b', on: at(2), km: 104000 },
  ]);
  assert.equal(steady.consistent, true);
  assert.equal(assessReadings([{ inspection_id: 'a', on: at(1), km: 1 }]).consistent, null, 'one reading proves nothing');

  const rolled = assessReadings([
    { inspection_id: 'a', on: at(1), km: 120000 },
    { inspection_id: 'b', on: at(2), km: 125000 },
    { inspection_id: 'c', on: at(3), km: 60000 },
  ]);
  assert.equal(rolled.consistent, false);
  assert.equal(rolled.drops.length, 1);
  assert.equal(rolled.drops[0].earlier_km, 125000, 'measured against the highest earlier reading');
  assert.equal(rolled.drops[0].later_inspection_id, 'c');

  const latest = { on: at(3), km: 60000 };
  assert.equal(declaredMismatch(61000, latest), null, 'within rounding');
  assert.deepEqual(declaredMismatch(45000, latest), { declared_km: 45000, read_km: 60000, read_on: latest.on });
  assert.equal(declaredMismatch(45000, null), null);

  assert.deepEqual(parseOdometer('48,200'), { ok: true, km: 48200 });
  assert.deepEqual(parseOdometer(''), { ok: true, km: null });
  assert.equal(parseOdometer(-1).ok, false);
  assert.equal(parseOdometer('12.5').ok, false);
  assert.equal(parseOdometer(3_000_000).ok, false);
});

// ─── NHTSA lookup and cache ──────────────────────────────────────────────────

function fakeNhtsa({ models = ['RAV4', 'Corolla'], fail = false, recallIndex = [], noRecalls = false } = {}) {
  const calls = [];
  safety.__setFetcher(async (url) => {
    calls.push(url);
    if (fail) throw new Error('NHTSA down');
    if (url.includes('GetModelsForMakeYear')) return { Results: models.map((Model_Name) => ({ Model_Name })) };
    if (url.includes('/products/vehicle/models') && url.includes('issueType=r')) return { results: recallIndex.map((model) => ({ model })) };
    if (url.includes('/products/vehicle/models')) return { results: [] };
    if (url.includes('recallsByVehicle') && noRecalls) return { results: [] };
    if (url.includes('recallsByVehicle')) {
      return { results: [
        { NHTSACampaignNumber: '16V198000', ReportReceivedDate: '07/04/2016', Component: 'SERVICE BRAKES', Summary: 'Brake actuator may leak.', Consequence: 'Longer stopping.', Remedy: 'Dealers replace it.' },
        { NHTSACampaignNumber: '19V001000', ReportReceivedDate: '01/02/2019', Component: 'AIR BAGS', Summary: 'Inflator may rupture.', Consequence: 'Injury.', Remedy: 'Replace.' },
      ] };
    }
    if (url.includes('complaintsByVehicle')) return { results: [{ components: 'ENGINE' }, { components: 'ENGINE, STEERING' }] };
    if (url.includes('/SafetyRatings/modelyear/')) return { Results: [{ VehicleId: 1, VehicleDescription: '2016 Toyota RAV4 AWD' }] };
    if (url.includes('/SafetyRatings/VehicleId/')) return { Results: [{ OverallRating: '5' }] };
    throw new Error(`unexpected ${url}`);
  });
  return calls;
}

test('a US model returns recalls, complaints and stars, then comes from the cache', async () => {
  const model = `RAV4 Hybrid`;
  const year = 2016;
  await pool.query("DELETE FROM model_safety_cache WHERE make_key='toyota' AND model_key='rav4hybrid' AND year=$1", [year]);
  const calls = fakeNhtsa();
  const first = await safety.modelSafety(pool, { make: 'Toyota', model, year });
  assert.equal(first.status, 'covered');
  assert.equal(first.matched_model, 'RAV4');
  assert.equal(first.recall_count, 2);
  assert.equal(first.recalls[0].campaign, '19V001000', 'newest recall first');
  assert.equal(first.recalls[0].reported_on, '2019-02-01');
  assert.equal(first.complaints.total, 2);
  assert.deepEqual(first.rating, { min: 5, max: 5, variants: [{ description: '2016 Toyota RAV4 AWD', overall: 5 }] });

  const before = calls.length;
  const again = await safety.modelSafety(pool, { make: 'toyota', model: 'rav4 hybrid', year });
  assert.equal(again.recall_count, 2);
  assert.equal(calls.length, before, 'a fresh cached answer costs NHTSA nothing');
});

test('a model NHTSA does not know is not_covered, never "0 recalls"', async () => {
  await pool.query("DELETE FROM model_safety_cache WHERE model_key='harrier' AND year=2015");
  fakeNhtsa({ models: ['RAV4'] });
  const result = await safety.modelSafety(pool, { make: 'Toyota', model: 'Harrier', year: 2015 });
  assert.equal(result.status, 'not_covered');
  assert.equal(result.recalls, undefined);
  assert.equal((await safety.modelSafety(pool, { make: 'Toyota', model: 'Harrier', year: 1985 })).status, 'not_covered');
});

test('NHTSA listing recalls for a model but returning none is unknown, never zero', async () => {
  await pool.query("DELETE FROM model_safety_cache WHERE model_key='corolla' AND year=2013");
  fakeNhtsa({ recallIndex: ['COROLLA'], noRecalls: true });
  const contradicted = await safety.modelSafety(pool, { make: 'Toyota', model: 'Corolla', year: 2013 });
  assert.equal(contradicted.status, 'covered');
  assert.equal(contradicted.recalls_known, false);
  assert.equal(contradicted.recall_count, null);

  await pool.query("DELETE FROM model_safety_cache WHERE model_key='corolla' AND year=2013");
  fakeNhtsa({ recallIndex: [], noRecalls: true });
  const none = await safety.modelSafety(pool, { make: 'Toyota', model: 'Corolla', year: 2013 });
  assert.equal(none.recalls_known, true, 'absent from NHTSA\'s own recall index: none filed');
  assert.equal(none.recall_count, 0);
});

test('when NHTSA is down: a stale answer is served, and with none, unavailable', async () => {
  await pool.query("DELETE FROM model_safety_cache WHERE model_key='corolla' AND year=2014");
  fakeNhtsa({ fail: true });
  assert.deepEqual(await safety.modelSafety(pool, { make: 'Toyota', model: 'Corolla', year: 2014 }), { status: 'unavailable' });

  fakeNhtsa();
  await safety.modelSafety(pool, { make: 'Toyota', model: 'Corolla', year: 2014 });
  await pool.query(
    "UPDATE model_safety_cache SET fetched_at = NOW() - INTERVAL '30 days' WHERE model_key='corolla' AND year=2014"
  );
  fakeNhtsa({ fail: true });
  const stale = await safety.modelSafety(pool, { make: 'Toyota', model: 'Corolla', year: 2014 });
  assert.equal(stale.status, 'covered');
  assert.equal(stale.stale, true);
});

// ─── Inspection, readiness and the public record ─────────────────────────────

test('the inspector\'s reading is stored, a drop is flagged, and buyers see the record', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified='approved' WHERE id=$1", [seller.id]);
  const vin = VIN();

  // An earlier walk-in on the same vehicle, at a higher reading.
  let day = nextDay();
  await clearDay(day);
  const walkIn = await api().post('/inspections/standalone').set(auth).send({
    make: 'Toyota', model: 'RAV4', year: 2016, vin, mileage: 125000,
    center: 'Nyarutarama Center', scheduled_date: day, scheduled_time: '09:00 AM',
    customer: { name: 'Earlier owner', email: unique('owner') },
  }).expect(201);
  await api().post(`/inspections/${walkIn.body.id}/start`).set(auth).expect(200);
  await api().post(`/inspections/${walkIn.body.id}/complete`).set(auth)
    .send({ checklist_results: checklist() }).expect(200);

  // Now listed by a new seller, declaring far fewer km.
  const car = await api().post('/cars').set(auth).send({
    seller_id: seller.id, title: '2016 Toyota RAV4', make: 'Toyota', model: 'RAV4', year: 2016, vin,
    mileage: 61000, price: 21000000, images: ['https://example.test/rav4.jpg'],
    description: 'A 2016 Toyota RAV4 with service records, kept in Kigali and driven mostly on tarmac.',
  }).expect(201);
  const submission = await api().post('/submissions').set('Authorization', `Bearer ${seller.token}`)
    .send({ make: 'Toyota', model: 'RAV4', year: 2016, mileage: 61000, asking_price: 21000000 }).expect(201);
  day = nextDay();
  await clearDay(day);
  await api().patch(`/submissions/${submission.body.id}`).set(auth)
    .send({ status: 'scheduled', center: 'Nyarutarama Center', scheduled_date: day, scheduled_time: '10:00 AM' })
    .expect(200);
  const found = await pool.query('SELECT id FROM inspections WHERE submission_id=$1', [submission.body.id]);
  const inspectionId = found.rows[0].id;
  await pool.query('UPDATE inspections SET car_id=$1 WHERE id=$2', [car.body.id, inspectionId]);
  await api().post(`/inspections/${inspectionId}/start`).set(auth).expect(200);

  const refused = await api().post(`/inspections/${inspectionId}/complete`).set(auth)
    .send({ checklist_results: checklist(), odometer_km: '12.5' }).expect(400);
  assert.equal(refused.body.code, 'INVALID_ODOMETER');

  const completed = await api().post(`/inspections/${inspectionId}/complete`).set(auth)
    .send({ checklist_results: checklist(), odometer_km: '60,500' }).expect(200);
  assert.equal(completed.body.odometer_check.consistent, false);
  assert.equal(completed.body.odometer_check.drops.length, 1);
  assert.equal(completed.body.odometer_check.drops[0].earlier_km, 125000);
  const stored = await pool.query('SELECT vehicle_mileage FROM inspections WHERE id=$1', [inspectionId]);
  assert.equal(stored.rows[0].vehicle_mileage, 60500);
  const notes = await pool.query('SELECT review_notes FROM cars WHERE id=$1', [car.body.id]);
  assert.match(notes.rows[0].review_notes, /Odometer went down/);

  // Staff see it before publishing; it warns, it does not block.
  const readiness = await api().get(`/cars/${car.body.id}/readiness`).set(auth).expect(200);
  assert.equal(readiness.body.ready, true);
  assert.ok(readiness.body.warnings.some((w) => /Odometer went down/.test(w)));

  await api().patch(`/cars/${car.body.id}/status`).set(auth).send({ status: 'approved' }).expect(200);
  await api().patch(`/cars/${car.body.id}/status`).set(auth).send({ status: 'live' }).expect(200);

  const history = await api().get(`/cars/${car.body.id}/history`).expect(200);
  const record = history.body.sawa_record;
  assert.deepEqual(record.odometer.readings.map((r) => [r.km, r.this_listing]), [[125000, false], [60500, true]]);
  assert.equal(record.odometer.consistent, false);
  assert.equal(record.odometer.drops[0].later_km, 60500);
  assert.equal(record.odometer.drops[0].later_inspection_id, undefined, 'no internal ids in public');
  const types = record.events.map((e) => e.type);
  assert.ok(types.includes('earlier_inspection'));
  assert.ok(types.includes('inspected'));
  assert.ok(types.includes('listed'));
  assert.ok(types.includes('submitted'));
  const earlier = record.events.find((e) => e.type === 'earlier_inspection');
  assert.deepEqual(Object.keys(earlier).sort(), ['km', 'on', 'type'], 'an earlier owner is a date and a reading, nothing else');
  assert.ok(!JSON.stringify(history.body).includes(vin), 'the VIN never leaves in full');

  // Model safety for the same listing, through the public route.
  fakeNhtsa();
  await pool.query("DELETE FROM model_safety_cache WHERE model_key='rav4' AND year=2016");
  const modelSafety = await api().get(`/cars/${car.body.id}/model-safety`).expect(200);
  assert.equal(modelSafety.body.status, 'covered');
  assert.deepEqual(modelSafety.body.vehicle, { make: 'Toyota', model: 'RAV4', year: 2016 });
  assert.equal(modelSafety.body.recall_count, 2);

  // Not public, not answered.
  await api().patch(`/cars/${car.body.id}/status`).set(auth).send({ status: 'paused' }).expect(200);
  await api().get(`/cars/${car.body.id}/model-safety`).expect(404);
});
