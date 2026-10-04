// ─────────────────────────────────────────────────────────────────────────────
// A VIN is only shown, and only called verified, when it is a real one — and
// the admin VIN lookup saves what the decoders return.
//
// Found by the 4 Oct 2026 readiness audit: live listings carried "VIN Hidden"
// (pasted back from a masked screen) and other stray text in the VIN column,
// and the public history card still said the VIN "matches documents" because
// the inspector had ticked d06. Separately, every admin VIN lookup failed with
// a 500: provider notes arrive as { message, evidence } but were saved as
// { publicMessage, internalEvidence } into NOT NULL columns, and NHTSA's
// 54-character SUV label overflowed a 50-character column.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';
const { app } = require('../server');
const pool = require('../src/db');
const { ALL_ITEMS } = require('../src/lib/inspection-policy');
const { VehiclePipelineOrchestrator } = require('../src/lib/data-providers/pipeline-orchestrator');
const CommercialProviderAdapter = require('../src/lib/data-providers/commercial-adapter');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e9)}@test.local`;
const allPass = () => Object.fromEntries(ALL_ITEMS.map((item) => [item.id, 'pass']));
const REAL_VIN = 'JTMBFREV40J123456';

async function register(overrides = {}) {
  const body = { name: 'VIN Test', email: unique('vin'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}

async function adminToken() {
  const user = await register();
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  return (await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200)).body.token;
}

let fixtureDay = 400;
async function liveCar(admin, vin) {
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified='approved' WHERE id=$1", [seller.id]);
  const auth = { Authorization: `Bearer ${admin}` };
  const car = await api().post('/cars').set(auth)
    .send({ seller_id: seller.id, title: '2021 Toyota RAV4', make: 'Toyota', model: 'RAV4', year: 2021, mileage: 30000, price: 18000000, vin, images: ['https://api.sawacars.com/uploads/c.jpg'] })
    .expect(201);
  const sub = await api().post('/submissions').set('Authorization', `Bearer ${seller.token}`)
    .send({ make: 'Toyota', model: 'RAV4', year: 2021, mileage: 30000, asking_price: 18000000 }).expect(201);
  const day = new Date(Date.now() + fixtureDay++ * 86_400_000).toISOString().slice(0, 10);
  await api().patch(`/submissions/${sub.body.id}`).set(auth)
    .send({ status: 'scheduled', center: 'Nyarutarama Center', scheduled_date: day, scheduled_time: '10:00 AM' }).expect(200);
  const insp = (await pool.query('SELECT id FROM inspections WHERE submission_id=$1', [sub.body.id])).rows[0];
  await pool.query('UPDATE inspections SET car_id=$1 WHERE id=$2', [car.body.id, insp.id]);
  await api().post(`/inspections/${insp.id}/start`).set(auth).expect(200);
  await api().post(`/inspections/${insp.id}/complete`).set(auth).send({ checklist_results: allPass() }).expect(200);
  await api().patch(`/cars/${car.body.id}/status`).set(auth).send({ status: 'approved' }).expect(200);
  await api().patch(`/cars/${car.body.id}/status`).set(auth).send({ status: 'live' }).expect(200);
  return car.body;
}

test.after(async () => { await pool.end(); });

test('an admin cannot store text that is not a VIN, and empty means not recorded', async () => {
  const admin = await adminToken();
  const auth = { Authorization: `Bearer ${admin}` };
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified='approved' WHERE id=$1", [seller.id]);
  const base = { seller_id: seller.id, title: '2021 Toyota RAV4', make: 'Toyota', model: 'RAV4', year: 2021, mileage: 30000, price: 18000000 };

  for (const junk of ['VIN Hidden', 'VIN Verified', 'abc', 'JTMBFREV***3456']) {
    const res = await api().post('/cars').set(auth).send({ ...base, vin: junk }).expect(400);
    assert.equal(res.body.code, 'INVALID_VIN', junk);
  }

  const created = await api().post('/cars').set(auth).send({ ...base, vin: REAL_VIN.toLowerCase() }).expect(201);
  assert.equal(created.body.vin, REAL_VIN, 'a real VIN is stored upper-cased');

  const refused = await api().patch(`/cars/${created.body.id}`).set(auth).send({ vin: 'VIN Hidden' }).expect(400);
  assert.equal(refused.body.code, 'INVALID_VIN');
  const stored = await pool.query('SELECT vin FROM cars WHERE id=$1', [created.body.id]);
  assert.equal(stored.rows[0].vin, REAL_VIN, 'a refused edit changes nothing');

  await api().patch(`/cars/${created.body.id}`).set(auth).send({ vin: '' }).expect(200);
  const cleared = await pool.query('SELECT vin FROM cars WHERE id=$1', [created.body.id]);
  assert.equal(cleared.rows[0].vin, null, 'an empty VIN is stored as not recorded');

  await api().patch(`/cars/${created.body.id}`).set(auth).send({ vin: 'NZE141-5028491' }).expect(200);
});

test('a stored VIN that is not real is never shown or called verified', async () => {
  const admin = await adminToken();
  const car = await liveCar(admin, REAL_VIN);

  const good = await api().get(`/cars/${car.id}/history`).expect(200);
  assert.equal(good.body.vin_verified, true, 'a real VIN with the d06 tick is verified');
  assert.ok(good.body.vin_masked && good.body.vin_masked !== REAL_VIN, 'masked, never whole');
  const goodDetail = await api().get(`/cars/${car.id}`).expect(200);
  assert.equal(goodDetail.body.vin_verified, true);

  // Rows written before the guard existed: the d06 tick is still there.
  for (const legacy of ['VIN Hidden', 'VINHIDDEN', 'X1']) {
    await pool.query('UPDATE cars SET vin=$1 WHERE id=$2', [legacy, car.id]);
    const history = await api().get(`/cars/${car.id}/history`).expect(200);
    assert.equal(history.body.vin_verified, false, legacy);
    assert.equal(history.body.vin_masked, null, legacy);
    assert.equal(history.body.vin, null, legacy);
    const detail = await api().get(`/cars/${car.id}`).expect(200);
    assert.equal(detail.body.vin_verified, false, legacy);
    assert.equal(detail.body.vin_masked, null, legacy);
    assert.equal(detail.body.vin, undefined, 'the raw column never leaves the API');
  }
});

test('a VIN lookup saves long decoder labels and provider notes, and skips unconfigured feeds', async () => {
  const longBody = 'Sport Utility Vehicle [SUV]/Multipurpose Vehicle [MPV]';
  const stub = {
    id: 'stub_decoder',
    name: 'Stub decoder',
    async safeFetch() {
      return {
        providerId: 'stub_decoder',
        providerName: 'Stub decoder',
        success: true,
        data: {
          specs: { make: 'Toyota', model: 'RAV4', year: 2020, bodyType: longBody, drivetrain: '4WD/4-Wheel Drive/4x4' },
          events: [],
          // The base-provider contract: { message, evidence }.
          qualityFlags: [{ signalType: 'check_digit_mismatch', severity: 'info', title: 'Non-standard check digit', message: 'Check digit mismatch', evidence: { position: 9 } }],
        },
      };
    },
  };
  const orchestrator = new VehiclePipelineOrchestrator();
  orchestrator.providers = [stub, new CommercialProviderAdapter({ id: 'carfax', name: 'Carfax Partner Feed' })];

  const vin = `JTMBFREV40J${String(Date.now()).slice(-6)}`;
  const result = await orchestrator.processVin(vin, { persist: true });
  assert.equal(result.success, true);
  assert.ok(result.vehicleId);

  const feed = result.activeProviders.find((p) => p.id === 'carfax');
  assert.deepEqual([feed.success, feed.error], [false, 'Not configured'], 'an unconfigured feed never claims success');

  const vehicle = await pool.query('SELECT body_type, drivetrain FROM vehicles WHERE id=$1', [result.vehicleId]);
  assert.equal(vehicle.rows[0].body_type, longBody, 'the full label fits');
  const signals = await pool.query('SELECT signal_type, public_message, internal_evidence FROM vehicle_data_quality_signals WHERE vehicle_id=$1', [result.vehicleId]);
  assert.deepEqual(signals.rows.map((s) => s.signal_type), ['check_digit_mismatch'], 'no standby note is saved against the vehicle');
  assert.equal(signals.rows[0].public_message, 'Check digit mismatch');
  assert.deepEqual(signals.rows[0].internal_evidence, { position: 9 });
});
