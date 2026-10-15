// ─────────────────────────────────────────────────────────────────────────────
// Rentals: how renters reach a provider, and the provider's calendar
// (migration 0061, lib/rental-calendar.js).
//
// What each test pins down:
//   - an availability request opens a real thread the provider can answer in,
//     and the provider's first reply is timed;
//   - the renter's number reaches the provider only with the renter's consent;
//   - a WhatsApp request comes back with a ready-to-send message and reference;
//   - only the provider writes the calendar; renters see "taken" and "back on"
//     with a freshness stamp, an inquiry for taken days is warned, never
//     refused, and never writes the calendar (not a booking system);
//   - "rented out" from an inquiry pre-fills the dates and closes it.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { ITEMS } = require('../src/lib/rental-check-policy');
const calendar = require('../src/lib/rental-calendar');
const { kigaliToday } = require('../src/lib/insights-range');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const today = () => kigaliToday();
const dayFrom = (n) => calendar.addDays(today(), n);

async function register(overrides = {}) {
  const body = { name: 'Renter', email: unique('rentcal'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, id: res.body.user.id, auth: { Authorization: `Bearer ${res.body.token}` } };
}

let admin;
async function liveCar({ whatsapp = true } = {}) {
  const owner = await register({ role: 'seller', name: 'Kigali Wheels' });
  await pool.query(
    `UPDATE users SET id_verified='approved', seller_type='showroom', business_verified=TRUE,
       business_name='Kigali Wheels Ltd', whatsapp_phone='+250788111222', whatsapp_visible=$2,
       contact_consent_at=NOW() WHERE id=$1`,
    [owner.id, whatsapp]
  );
  const car = (await api().post('/rentals/propose').set(owner.auth).send({
    title: '2020 Toyota Prado', make: 'Toyota', model: 'Prado', year: 2020,
    daily_rate: 90000, images: ['https://example.test/prado.jpg'],
  }).expect(201)).body;
  await api().post(`/rentals/${car.id}/subscriptions`).set(admin)
    .send({ amount_rwf: 10000, starts_on: dayFrom(-1), ends_on: dayFrom(29), method: 'cash' }).expect(201);
  await api().post(`/rentals/${car.id}/checks`).set(admin).send({
    results: Object.fromEntries(ITEMS.map((i) => [i.id, { verdict: 'pass' }])),
    insurance_expires_on: dayFrom(200), technical_control_expires_on: dayFrom(200), odometer_km: 50000,
  }).expect(201);
  await api().patch(`/rentals/${car.id}`).set(admin).send({ status: 'active' }).expect(200);
  return { owner, car };
}

test.before(async () => {
  const user = await register();
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  admin = { Authorization: `Bearer ${res.body.token}` };
});
test.after(async () => { await pool.end(); });

// ── pure calendar rules ─────────────────────────────────────────────────────
test('calendar: touching periods merge; out now gives the day it is back; freshness ages', () => {
  assert.deepEqual(
    calendar.mergeRanges([{ from: '2026-10-04', to: '2026-10-06' }, { from: '2026-10-01', to: '2026-10-03' }, { from: '2026-10-09', to: '2026-10-09' }]),
    [{ from: '2026-10-01', to: '2026-10-06' }, { from: '2026-10-09', to: '2026-10-09' }]
  );
  const s = calendar.availabilitySummary({ ranges: [{ from: '2026-10-10', to: '2026-10-14' }], today: '2026-10-12', updatedAt: null, withPeriods: true });
  assert.equal(s.out_now, true);
  assert.equal(s.back_on, '2026-10-15');
  assert.equal(s.freshness, 'never');
  assert.deepEqual(s.busy, [{ from: '2026-10-12', to: '2026-10-14' }], 'past days are clipped');
  const now = new Date('2026-10-30T10:00:00Z');
  assert.equal(calendar.freshness(new Date('2026-10-28T10:00:00Z'), now), 'fresh');
  assert.equal(calendar.freshness(new Date('2026-10-15T10:00:00Z'), now), 'aging');
  assert.equal(calendar.freshness(new Date('2026-09-01T10:00:00Z'), now), 'stale');
  assert.deepEqual(calendar.overlap([{ from: '2026-10-10', to: '2026-10-14' }], '2026-10-13', '2026-10-20'), [{ from: '2026-10-13', to: '2026-10-14' }]);
  assert.ok(calendar.validatePeriod('2026-10-05', '2026-10-04', '2026-10-01'));
  assert.ok(calendar.validatePeriod('2026-09-01', '2026-09-02', '2026-10-01'), 'past dates refused');
  assert.equal(calendar.validatePeriod('2026-10-01', '2026-10-03', '2026-10-01'), null);
});

// ── contact ─────────────────────────────────────────────────────────────────
test('an in-app request opens a thread; the renter number stays private; the reply is timed', async () => {
  const { owner, car } = await liveCar();
  const renter = await register({ phone: '+250788333444' });
  const sent = await api().post(`/rentals/${car.id}/inquire`).set(renter.auth)
    .send({ start_date: dayFrom(5), days: 3, pickup_location: 'Kigali airport', message: 'Need a driver too?', acknowledge: true })
    .expect(201);
  assert.ok(sent.body.conversation_id, 'an inquiry opens a conversation');
  assert.equal(sent.body.whatsapp_text, null);

  const thread = await api().get(`/messages/conversations/${sent.body.conversation_id}`).set(owner.auth).expect(200);
  assert.match(thread.body[0].text, new RegExp(sent.body.inquiry_ref));
  assert.match(thread.body[0].text, /Kigali airport/);
  assert.match(thread.body[0].text, /Need a driver too\?/);
  const list = await api().get('/messages/conversations').set(owner.auth).expect(200);
  assert.equal(list.body.find((c) => c.id === sent.body.conversation_id).car_title, '2020 Toyota Prado', 'the pinned card shows the rental car');

  const inbox = await api().get('/rentals/inquiries').set(owner.auth).expect(200);
  const lead = inbox.body.find((i) => i.id === sent.body.id);
  assert.equal(lead.renter_phone, null, 'in-app only: no number without consent');
  assert.equal(lead.renter_whatsapp, null);

  await api().post(`/messages/conversations/${sent.body.conversation_id}`).set(owner.auth)
    .send({ text: 'Yes, free on those dates.' }).expect(201);
  // The stamp is written after the response; give it a moment.
  for (let i = 0; i < 20; i += 1) {
    const { rows } = await pool.query('SELECT first_response_at, status FROM rental_inquiries WHERE id=$1', [sent.body.id]);
    if (rows[0].first_response_at) { assert.equal(rows[0].status, 'contacted'); return; }
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.fail('first_response_at was never set');
});

test('asking for a call or WhatsApp shares the number, and WhatsApp gets a ready message', async () => {
  const { owner, car } = await liveCar();
  const renter = await register({ phone: '+250788555666' });
  const sent = await api().post(`/rentals/${car.id}/inquire`).set(renter.auth)
    .send({ start_date: dayFrom(7), days: 2, preferred_channel: 'whatsapp', acknowledge: true }).expect(201);
  assert.equal(sent.body.contact, '+250788111222');
  assert.match(sent.body.whatsapp_text, new RegExp(sent.body.inquiry_ref));
  assert.match(sent.body.whatsapp_text, /Kigali Wheels Ltd/);
  const inbox = await api().get('/rentals/inquiries').set(owner.auth).expect(200);
  assert.equal(inbox.body.find((i) => i.id === sent.body.id).renter_phone, '+250788555666');

  // In-app plus an explicit tick is consent too.
  const other = await register({ phone: '+250788777888' });
  const ticked = await api().post(`/rentals/${car.id}/inquire`).set(other.auth)
    .send({ start_date: dayFrom(9), days: 1, share_contact: true, acknowledge: true }).expect(201);
  const inbox2 = await api().get('/rentals/inquiries').set(owner.auth).expect(200);
  assert.equal(inbox2.body.find((i) => i.id === ticked.body.id).renter_phone, '+250788777888');
});

// ── calendar ────────────────────────────────────────────────────────────────
test('only the provider marks days taken; renters see taken and back-on; nothing is hidden or refused', async () => {
  const { owner, car } = await liveCar();
  const stranger = await register();
  await api().post(`/rentals/${car.id}/mine/busy`).set(stranger.auth).send({ starts_on: today(), ends_on: dayFrom(3) }).expect(403);
  await api().post(`/rentals/${car.id}/mine/busy`).set(admin).send({ starts_on: today(), ends_on: dayFrom(3) }).expect(403);
  await api().post(`/rentals/${car.id}/mine/busy`).set(owner.auth).send({ starts_on: dayFrom(-5), ends_on: dayFrom(-2) }).expect(400);

  const marked = await api().post(`/rentals/${car.id}/mine/busy`).set(owner.auth).send({ starts_on: today(), ends_on: dayFrom(3) }).expect(201);
  // A touching period joins the first one.
  const joined = await api().post(`/rentals/${car.id}/mine/busy`).set(owner.auth).send({ starts_on: dayFrom(4), ends_on: dayFrom(5) }).expect(201);
  assert.equal(joined.body.periods.length, 1);
  assert.equal(joined.body.periods[0].ends_on, dayFrom(5));
  assert.equal(joined.body.availability.freshness, 'fresh');
  assert.ok(marked.body.period.id);

  const catalogue = await api().get('/rentals').expect(200);
  const card = catalogue.body.find((c) => c.id === car.id);
  assert.ok(card, 'a taken car stays in the catalogue');
  assert.equal(card.availability.out_now, true);
  assert.equal(card.availability.back_on, dayFrom(6));
  assert.equal(card.unavailable_until, dayFrom(6), 'old builds still get their pill');
  assert.equal(card.availability.busy, undefined, 'the list carries no calendar');

  const detail = await api().get(`/rentals/${car.id}`).expect(200);
  assert.deepEqual(detail.body.availability.busy, [{ from: today(), to: dayFrom(5) }]);

  // Asking for taken days is warned, not refused, and writes nothing.
  const renter = await register();
  const before = await pool.query('SELECT COUNT(*)::int AS n FROM rental_busy_periods WHERE rental_car_id=$1', [car.id]);
  const asked = await api().post(`/rentals/${car.id}/inquire`).set(renter.auth)
    .send({ start_date: dayFrom(4), days: 4, acknowledge: true }).expect(201);
  assert.deepEqual(asked.body.busy_overlap, [{ from: dayFrom(4), to: dayFrom(5) }]);
  const after = await pool.query('SELECT COUNT(*)::int AS n FROM rental_busy_periods WHERE rental_car_id=$1', [car.id]);
  assert.equal(after.rows[0].n, before.rows[0].n, 'an inquiry never writes the calendar');
  const note = await pool.query(
    "SELECT body FROM notifications WHERE user_id=$1 AND title='New rental inquiry' ORDER BY created_at DESC LIMIT 1", [owner.id]
  );
  assert.match(note.rows[0].body, /marked taken/);

  // Back early: ending yesterday frees it.
  const periodId = joined.body.periods[0].id;
  const back = await api().patch(`/rentals/${car.id}/mine/busy/${periodId}`).set(owner.auth).send({ ends_on: dayFrom(-1) }).expect(200);
  assert.equal(back.body.periods.length, 0);
  assert.equal((await api().get(`/rentals/${car.id}`).expect(200)).body.availability.out_now, false);
});

test('rented out from an inquiry pre-fills its dates and closes it; the period names no renter', async () => {
  const { owner, car } = await liveCar();
  const renter = await register();
  const sent = await api().post(`/rentals/${car.id}/inquire`).set(renter.auth)
    .send({ start_date: dayFrom(10), days: 4, acknowledge: true }).expect(201);
  await api().post(`/rentals/inquiries/${sent.body.id}/rented-out`).set(renter.auth).expect(403);
  const out = await api().post(`/rentals/inquiries/${sent.body.id}/rented-out`).set(owner.auth).expect(201);
  assert.deepEqual(out.body.periods.map((p) => [p.starts_on, p.ends_on]), [[dayFrom(10), dayFrom(13)]]);
  const { rows } = await pool.query('SELECT status, first_response_at FROM rental_inquiries WHERE id=$1', [sent.body.id]);
  assert.equal(rows[0].status, 'closed');
  assert.ok(rows[0].first_response_at);
  const cols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='rental_busy_periods'"
  );
  const names = cols.rows.map((r) => r.column_name);
  for (const forbidden of ['renter_id', 'inquiry_id', 'price', 'amount', 'status']) {
    assert.equal(names.includes(forbidden), false, `rental_busy_periods must not grow a ${forbidden} column`);
  }
});

test('the old single date still works: it becomes a period, and re-saving it changes nothing', async () => {
  const { owner, car } = await liveCar();
  await api().patch(`/rentals/${car.id}/mine`).set(owner.auth).send({ unavailable_until: dayFrom(4) }).expect(200);
  const cal = await api().get(`/rentals/${car.id}/mine/busy`).set(owner.auth).expect(200);
  assert.deepEqual(cal.body.periods.map((p) => [p.starts_on, p.ends_on]), [[today(), dayFrom(3)]]);
  const stamp = cal.body.calendar_updated_at;

  await api().patch(`/rentals/${car.id}/mine`).set(owner.auth).send({ daily_rate: 95000, unavailable_until: dayFrom(4) }).expect(200);
  const same = await api().get(`/rentals/${car.id}/mine/busy`).set(owner.auth).expect(200);
  assert.equal(same.body.calendar_updated_at, stamp, 'saving the rates form did not refresh the calendar');

  await api().patch(`/rentals/${car.id}/mine`).set(owner.auth).send({ unavailable_until: '' }).expect(200);
  const cleared = await api().get(`/rentals/${car.id}/mine/busy`).set(owner.auth).expect(200);
  assert.equal(cleared.body.availability.out_now, false);

  const confirmed = await api().post(`/rentals/${car.id}/mine/calendar/confirm`).set(owner.auth).expect(200);
  assert.equal(confirmed.body.availability.freshness, 'fresh');
});

test('a provider adds a car with no photos from a phone, then uploads them; GPS is stripped', async () => {
  const sharp = require('sharp');
  const fs = require('fs');
  const path = require('path');
  const owner = await register({ role: 'seller' });
  await pool.query(
    "UPDATE users SET id_verified='approved', seller_type='showroom', business_verified=TRUE WHERE id=$1", [owner.id]
  );
  const car = (await api().post('/rentals/propose').set(owner.auth).send({
    title: '2018 Suzuki Swift', make: 'Suzuki', model: 'Swift', year: 2018, daily_rate: 35000,
  }).expect(201)).body;
  assert.deepEqual(car.images, []);

  const photo = await sharp({ create: { width: 32, height: 24, channels: 3, background: { r: 10, g: 120, b: 200 } } })
    .jpeg().withExif({ IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '1/1 56/1 0/1' } }).toBuffer();
  const stranger = await register();
  await api().post(`/rentals/${car.id}/mine/photos`).set(stranger.auth)
    .attach('photos', photo, { filename: 'front.jpg', contentType: 'image/jpeg' }).expect(403);
  const res = await api().post(`/rentals/${car.id}/mine/photos`).set(owner.auth)
    .attach('photos', photo, { filename: 'front.jpg', contentType: 'image/jpeg' })
    .attach('photos', photo, { filename: 'side.jpg', contentType: 'image/jpeg' })
    .expect(201);
  assert.equal(res.body.images.length, 2);
  for (const url of res.body.images) {
    assert.match(url, new RegExp(`/uploads/rental-cars/${car.id}/`), 'listing photos are public, never in id-docs');
    const stored = path.join(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'), new URL(url).pathname.replace(/^\/uploads\//, ''));
    assert.equal((await sharp(fs.readFileSync(stored)).metadata()).exif, undefined, 'GPS must not survive');
  }
});

test('the team adds a car without photos, then uploads them from the fleet form', async () => {
  const sharp = require('sharp');
  const owner = await register({ role: 'seller', name: 'Gasabo Hire' });
  await pool.query(
    "UPDATE users SET id_verified='approved', seller_type='showroom', business_verified=TRUE WHERE id=$1", [owner.id]
  );
  // No image links to paste: the car is saved first, out of the catalogue.
  const car = (await api().post('/rentals').set(admin).send({
    provider_id: owner.id, title: 'Honda Civic 2025', make: 'Honda', model: 'Civic', year: 2025, daily_rate: 70000,
  }).expect(201)).body;
  assert.deepEqual(car.images, []);
  assert.equal(car.status, 'maintenance');
  // And it cannot be put live while it has no photo.
  const early = await api().patch(`/rentals/${car.id}`).set(admin).send({ status: 'active' });
  assert.equal(early.status, 409);

  const photo = await sharp({ create: { width: 32, height: 24, channels: 3, background: { r: 200, g: 20, b: 20 } } })
    .jpeg().toBuffer();
  // Staff only: the provider has their own route, a stranger has none.
  await api().post(`/rentals/${car.id}/photos`).set(owner.auth)
    .attach('photos', photo, { filename: 'front.jpg', contentType: 'image/jpeg' }).expect(403);
  const res = await api().post(`/rentals/${car.id}/photos`).set(admin)
    .attach('photos', photo, { filename: 'front.jpg', contentType: 'image/jpeg' })
    .expect(201);
  assert.equal(res.body.images.length, 1);
  assert.match(res.body.images[0], new RegExp(`/uploads/rental-cars/${car.id}/`), 'listing photos are public, never in id-docs');
  const logged = await pool.query(
    "SELECT 1 FROM admin_audit_log WHERE action = 'rental_car.photos_added' AND target_id = $1", [car.id]
  );
  assert.equal(logged.rowCount, 1);
});

test('the fleet says why a car is not public, and a running listing can be renewed', async () => {
  const { owner, car } = await liveCar();
  const find = async () => (await api().get('/rentals/admin/fleet').set(admin).expect(200)).body.find((c) => c.id === car.id);
  // Live: nothing in the way.
  assert.deepEqual((await find()).public_blockers, []);

  // "Pay 30 days" on a listing that still runs starts after it, not on top of it.
  const renewed = await api().post(`/rentals/${car.id}/subscriptions`).set(admin)
    .send({ amount_rwf: 10000, starts_on: dayFrom(0), ends_on: dayFrom(30), method: 'cash', extend: true }).expect(201);
  assert.equal(String(renewed.body.starts_on).slice(0, 10), dayFrom(30));
  // Without extend it is still refused as an overlap.
  const clash = await api().post(`/rentals/${car.id}/subscriptions`).set(admin)
    .send({ amount_rwf: 10000, starts_on: dayFrom(0), ends_on: dayFrom(30), method: 'cash' });
  assert.equal(clash.status, 409);

  // An ordinary edit of a live car never re-runs the listing gates.
  await api().patch(`/rentals/${car.id}`).set(admin).send({ daily_rate: 95000, status: 'active', location: 'Kicukiro' }).expect(200);
  // A provider cannot strip a live car of its last photo.
  const stripped = await api().patch(`/rentals/${car.id}/mine`).set(owner.auth).send({ images: [] });
  assert.equal(stripped.status, 409);

  // Unverify the provider: the fleet names it as the reason, and publishable stays false.
  await pool.query("UPDATE users SET business_verified = FALSE WHERE id = $1", [owner.id]);
  const parked = await find();
  assert.ok(parked.public_blockers.some((b) => b.code === 'provider'), JSON.stringify(parked.public_blockers));
  assert.equal(parked.publishable, false);
});

test('a reply in the thread stamps only the inquiry the thread is about', async () => {
  const { owner, car: first } = await liveCar();
  const second = (await api().post('/rentals/propose').set(owner.auth).send({
    title: '2021 Toyota Hilux', make: 'Toyota', model: 'Hilux', year: 2021,
    daily_rate: 80000, images: ['https://example.test/hilux.jpg'],
  }).expect(201)).body;
  await api().post(`/rentals/${second.id}/subscriptions`).set(admin)
    .send({ amount_rwf: 10000, starts_on: dayFrom(-1), ends_on: dayFrom(29), method: 'cash' }).expect(201);
  await api().post(`/rentals/${second.id}/checks`).set(admin).send({
    results: Object.fromEntries(ITEMS.map((i) => [i.id, { verdict: 'pass' }])),
    insurance_expires_on: dayFrom(200), technical_control_expires_on: dayFrom(200), odometer_km: 30000,
  }).expect(201);
  await api().patch(`/rentals/${second.id}`).set(admin).send({ status: 'active' }).expect(200);

  const renter = await register();
  const a = (await api().post(`/rentals/${first.id}/inquire`).set(renter.auth)
    .send({ start_date: dayFrom(5), days: 2, acknowledge: true }).expect(201)).body;
  const b = (await api().post(`/rentals/${second.id}/inquire`).set(renter.auth)
    .send({ start_date: dayFrom(9), days: 2, acknowledge: true }).expect(201)).body;
  assert.equal(a.conversation_id, b.conversation_id, 'one thread per renter and provider');

  await api().post(`/messages/conversations/${b.conversation_id}`).set(owner.auth)
    .send({ text: 'The Hilux is free then.' }).expect(201);
  for (let i = 0; i < 20; i += 1) {
    const { rows } = await pool.query('SELECT first_response_at FROM rental_inquiries WHERE id = $1', [b.id]);
    if (rows[0].first_response_at) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  const { rows } = await pool.query(
    'SELECT id, first_response_at, status FROM rental_inquiries WHERE id = ANY($1::uuid[])', [[a.id, b.id]]
  );
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.ok(byId[b.id].first_response_at, 'the Hilux request is answered');
  assert.equal(byId[a.id].first_response_at, null, 'the Prado request is not');
  assert.equal(byId[a.id].status, 'new');
});
