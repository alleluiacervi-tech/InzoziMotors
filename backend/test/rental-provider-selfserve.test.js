// ─────────────────────────────────────────────────────────────────────────────
// Provider self-serve — a verified rental provider proposing and managing
// their OWN fleet, without an admin typing every vehicle in by hand.
//
// The one property that matters more than any other: POST /propose can only
// ever produce 'pending_review', and that status must be exactly as invisible
// to every public read as 'maintenance' already is. Nothing here may let a
// provider publish their own car — only requireAdmin routes move status
// further, unchanged by this feature.
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
const checklist = () => Object.fromEntries(REQUIRED_ITEM_IDS.map((id) => [id, 'pass']));
const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

let fixtureDay = 1200;
const nextDay = () => new Date(Date.now() + fixtureDay++ * 86400_000).toISOString().slice(0, 10);

async function register(overrides = {}) {
  const body = { name: 'Rental Provider', email: unique('rentalself'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}
async function makeAdmin(user) {
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}

/** A verified, business_verified provider with a complete, passing inspection
 *  for one vehicle — eligible on both the admin path and the self-serve path. */
async function fleet(admin, vehicle = { make: 'Toyota', model: 'Land Cruiser', year: 2020 }, { verified = true } = {}) {
  const auth = { Authorization: `Bearer ${admin}` };
  const provider = await register({ role: 'seller' });
  if (verified) {
    await pool.query(
      `UPDATE users SET id_verified='approved', seller_type='showroom', business_verified=TRUE,
         phone='+250788000998', phone_visible=TRUE, contact_consent_at=NOW() WHERE id=$1`,
      [provider.id]
    );
  }
  const submission = await api().post('/submissions').set('Authorization', `Bearer ${provider.token}`)
    .send({ ...vehicle, mileage: 40000, asking_price: 25000000 }).expect(201);
  const on = nextDay();
  await pool.query(
    "DELETE FROM inspections i WHERE lower(i.center)='nyarutarama center' AND i.scheduled_on=$1::date"
    + " AND NOT EXISTS (SELECT 1 FROM rental_cars rc WHERE rc.inspection_id = i.id)", [on]
  );
  await api().patch(`/submissions/${submission.body.id}`).set(auth)
    .send({ status: 'scheduled', center: 'Nyarutarama Center', scheduled_date: on, scheduled_time: '10:00 AM' })
    .expect(200);
  const { rows } = await pool.query('SELECT id FROM inspections WHERE submission_id=$1', [submission.body.id]);
  await api().post(`/inspections/${rows[0].id}/start`).set(auth).expect(200);
  await api().post(`/inspections/${rows[0].id}/complete`).set(auth)
    .send({ checklist_results: checklist() }).expect(200);
  return { provider, inspectionId: rows[0].id, vehicle };
}

function proposeBody({ vehicle, inspectionId, overrides = {} }) {
  return {
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    ...vehicle,
    daily_rate: 60000,
    inspection_id: inspectionId,
    images: ['https://example.test/rental-mine.jpg'],
    ...overrides,
  };
}

test.after(async () => { await pool.end(); });

// ─── Propose ─────────────────────────────────────────────────────────────────

test('a verified provider can propose their own car, and it starts pending_review', async () => {
  const admin = await makeAdmin(await register());
  const { provider, inspectionId, vehicle } = await fleet(admin);
  const res = await api().post('/rentals/propose')
    .set('Authorization', `Bearer ${provider.token}`)
    .send(proposeBody({ vehicle, inspectionId }))
    .expect(201);
  assert.equal(res.body.status, 'pending_review');
  assert.equal(res.body.provider_id, provider.id);
  assert.equal(res.body.inspected, true);

  // The one property that matters most: invisible everywhere public reads,
  // exactly like 'maintenance'.
  const catalogue = await api().get('/rentals').expect(200);
  assert.equal(catalogue.body.some((c) => c.id === res.body.id), false, 'pending_review must not reach the catalogue');
  await api().get(`/rentals/${res.body.id}`).expect(404);
});

test('propose trusts the caller for provider_id, never the request body', async () => {
  const admin = await makeAdmin(await register());
  const { provider, inspectionId, vehicle } = await fleet(admin);
  const someoneElse = await register();
  const res = await api().post('/rentals/propose')
    .set('Authorization', `Bearer ${provider.token}`)
    .send(proposeBody({ vehicle, inspectionId, overrides: { provider_id: someoneElse.id } }))
    .expect(201);
  assert.equal(res.body.provider_id, provider.id, 'a spoofed provider_id in the body must be ignored');
});

test('propose rejects a seller who is not business-verified', async () => {
  const admin = await makeAdmin(await register());
  const { provider, inspectionId, vehicle } = await fleet(admin, undefined, { verified: false });
  await pool.query("UPDATE users SET id_verified='approved' WHERE id=$1", [provider.id]);
  const res = await api().post('/rentals/propose')
    .set('Authorization', `Bearer ${provider.token}`)
    .send(proposeBody({ vehicle, inspectionId }))
    .expect(403);
  assert.match(res.body.error, /verified/i);
});

test('propose rejects an inspection that belongs to another provider', async () => {
  const admin = await makeAdmin(await register());
  const { inspectionId, vehicle } = await fleet(admin, { make: 'Toyota', model: 'RAV4', year: 2021 });
  const otherProvider = (await fleet(admin, { make: 'Honda', model: 'CR-V', year: 2020 })).provider;
  const res = await api().post('/rentals/propose')
    .set('Authorization', `Bearer ${otherProvider.token}`)
    .send(proposeBody({ vehicle, inspectionId }))
    .expect(409);
  assert.match(res.body.error, /your own/i);
});

test('propose rejects a vehicle that does not match the inspection', async () => {
  const admin = await makeAdmin(await register());
  const { provider, inspectionId, vehicle } = await fleet(admin, { make: 'Toyota', model: 'Hiace', year: 2019 });
  const res = await api().post('/rentals/propose')
    .set('Authorization', `Bearer ${provider.token}`)
    .send(proposeBody({ vehicle, inspectionId, overrides: { model: 'Hilux' } }))
    .expect(409);
  assert.match(res.body.error, /different make, model/i);
});

// ─── Mine (fleet + scoping) ───────────────────────────────────────────────────

test('GET /rentals/mine only ever shows the caller’s own cars', async () => {
  const admin = await makeAdmin(await register());
  const a = await fleet(admin, { make: 'Toyota', model: 'Fortuner', year: 2022 });
  const b = await fleet(admin, { make: 'Mazda', model: 'CX-5', year: 2021 });
  const proposedA = await api().post('/rentals/propose').set('Authorization', `Bearer ${a.provider.token}`)
    .send(proposeBody({ vehicle: a.vehicle, inspectionId: a.inspectionId })).expect(201);
  await api().post('/rentals/propose').set('Authorization', `Bearer ${b.provider.token}`)
    .send(proposeBody({ vehicle: b.vehicle, inspectionId: b.inspectionId })).expect(201);

  const mineA = await api().get('/rentals/mine').set('Authorization', `Bearer ${a.provider.token}`).expect(200);
  assert.ok(mineA.body.some((c) => c.id === proposedA.body.id), 'a provider must see their own proposal');
  assert.ok(mineA.body.every((c) => c.provider_id === a.provider.id), 'a provider must never see another provider’s car');
});

test('GET /rentals/mine/eligible-inspections lists an unused passing inspection, then excludes it once claimed', async () => {
  const admin = await makeAdmin(await register());
  const { provider, inspectionId, vehicle } = await fleet(admin, { make: 'Toyota', model: 'Prado', year: 2020 });
  const before = await api().get('/rentals/mine/eligible-inspections')
    .set('Authorization', `Bearer ${provider.token}`).expect(200);
  assert.ok(before.body.some((row) => row.id === inspectionId));

  await api().post('/rentals/propose').set('Authorization', `Bearer ${provider.token}`)
    .send(proposeBody({ vehicle, inspectionId })).expect(201);

  const after = await api().get('/rentals/mine/eligible-inspections')
    .set('Authorization', `Bearer ${provider.token}`).expect(200);
  assert.equal(after.body.some((row) => row.id === inspectionId), false, 'a claimed inspection must not be offered again');
});

// ─── PATCH .../mine (terms, not publication) ─────────────────────────────────

test('PATCH /rentals/:id/mine lets the owner edit terms, but never status, provider, or inspection', async () => {
  const admin = await makeAdmin(await register());
  const { provider, inspectionId, vehicle } = await fleet(admin, { make: 'Suzuki', model: 'Vitara', year: 2020 });
  const proposed = await api().post('/rentals/propose').set('Authorization', `Bearer ${provider.token}`)
    .send(proposeBody({ vehicle, inspectionId })).expect(201);

  const other = await fleet(admin, { make: 'Ford', model: 'Ranger', year: 2019 });

  // Not the owner.
  await api().patch(`/rentals/${proposed.body.id}/mine`).set('Authorization', `Bearer ${other.provider.token}`)
    .send({ daily_rate: 99999 }).expect(403);

  // The owner, editing a legitimate field plus attempting to smuggle in
  // status/provider_id/inspection_id — those keys are simply not in the
  // allowlist, so they must be silently ignored rather than erroring.
  const otherInspection = other.inspectionId;
  const res = await api().patch(`/rentals/${proposed.body.id}/mine`).set('Authorization', `Bearer ${provider.token}`)
    .send({ daily_rate: 80000, status: 'active', provider_id: other.provider.id, inspection_id: otherInspection })
    .expect(200);
  assert.equal(res.body.daily_rate, 80000);
  assert.equal(res.body.status, 'pending_review', 'status must stay admin-only');
  assert.equal(res.body.provider_id, provider.id, 'provider_id must stay admin-only');

  const { rows } = await pool.query('SELECT inspection_id FROM rental_cars WHERE id=$1', [proposed.body.id]);
  assert.equal(rows[0].inspection_id, inspectionId, 'inspection_id must stay admin-only');
});

test('PATCH /rentals/:id/mine sets and clears unavailable_until, which is informational only', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const { provider, inspectionId, vehicle } = await fleet(admin, { make: 'Toyota', model: 'Noah', year: 2018 });
  const proposed = await api().post('/rentals/propose').set('Authorization', `Bearer ${provider.token}`)
    .send(proposeBody({ vehicle, inspectionId })).expect(201);

  // Publish it so the "informational, not a gate" claim is testable on the
  // public surfaces.
  await api().patch(`/rentals/${proposed.body.id}`).set(auth)
    .send({ status: 'active' }).expect(409); // no subscription yet
  await api().post(`/rentals/${proposed.body.id}/subscriptions`).set(auth)
    .send({ amount_rwf: 50000, method: 'cash', starts_on: day(0), ends_on: day(30) }).expect(201);
  await api().patch(`/rentals/${proposed.body.id}`).set(auth).send({ status: 'active' }).expect(200);

  const future = day(10);
  const set = await api().patch(`/rentals/${proposed.body.id}/mine`).set('Authorization', `Bearer ${provider.token}`)
    .send({ unavailable_until: future }).expect(200);
  assert.equal(String(set.body.unavailable_until).slice(0, 10), future);

  // Still fully public: catalogue, detail, and a renter can still inquire.
  const catalogue = await api().get('/rentals').expect(200);
  assert.ok(catalogue.body.some((c) => c.id === proposed.body.id), 'unavailable_until must not hide the car');
  const detail = await api().get(`/rentals/${proposed.body.id}`).expect(200);
  assert.equal(String(detail.body.unavailable_until).slice(0, 10), future);
  const renter = await register();
  await api().post(`/rentals/${proposed.body.id}/inquire`).set('Authorization', `Bearer ${renter.token}`)
    .send({ start_date: day(20), days: 3, preferred_channel: 'phone', acknowledge: true }).expect(201);

  const cleared = await api().patch(`/rentals/${proposed.body.id}/mine`).set('Authorization', `Bearer ${provider.token}`)
    .send({ unavailable_until: '' }).expect(200);
  assert.equal(cleared.body.unavailable_until, null);
});

// ─── Admin publish, from pending_review ──────────────────────────────────────

test('admin can move pending_review to active, still gated by a live subscription', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const { provider, inspectionId, vehicle } = await fleet(admin, { make: 'Kia', model: 'Sorento', year: 2021 });
  const proposed = await api().post('/rentals/propose').set('Authorization', `Bearer ${provider.token}`)
    .send(proposeBody({ vehicle, inspectionId })).expect(201);

  const denied = await api().patch(`/rentals/${proposed.body.id}`).set(auth)
    .send({ status: 'active' }).expect(409);
  assert.equal(denied.body.code, 'SUBSCRIPTION_REQUIRED');

  await api().post(`/rentals/${proposed.body.id}/subscriptions`).set(auth)
    .send({ amount_rwf: 50000, method: 'bank_transfer', starts_on: day(0), ends_on: day(30) }).expect(201);
  const published = await api().patch(`/rentals/${proposed.body.id}`).set(auth)
    .send({ status: 'active' }).expect(200);
  assert.equal(published.body.status, 'active');

  const catalogue = await api().get('/rentals').expect(200);
  assert.ok(catalogue.body.some((c) => c.id === proposed.body.id));
});

test('the admin fleet view shows a pending_review row unfiltered, like every other status', async () => {
  const admin = await makeAdmin(await register());
  const { provider, inspectionId, vehicle } = await fleet(admin, { make: 'Peugeot', model: '3008', year: 2020 });
  const proposed = await api().post('/rentals/propose').set('Authorization', `Bearer ${provider.token}`)
    .send(proposeBody({ vehicle, inspectionId })).expect(201);

  const fleetView = await api().get('/rentals/admin/fleet').set('Authorization', `Bearer ${admin}`).expect(200);
  const row = fleetView.body.find((c) => c.id === proposed.body.id);
  assert.ok(row, 'a pending_review car must still be visible to the operator');
  assert.equal(row.status, 'pending_review');
});
