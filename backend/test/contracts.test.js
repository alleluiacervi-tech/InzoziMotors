// ─────────────────────────────────────────────────────────────────────────────
// Contract generator suite.
//
// Covers the properties that make this feature legally usable rather than merely
// working: numbers are gap-free even under concurrency, a signed contract can
// never be silently replaced, a document is never produced with a blank required
// field, and a name the font cannot print is refused instead of rendered blank.
//
// Runs against a real PostgreSQL — the numbering guarantee lives in a row lock,
// which no mock can exercise.
//
//   node --test test/contracts.test.js
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';
// Contracts are written to disk; keep the suite out of the real upload dir.
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR
  || fs.mkdtempSync(path.join(os.tmpdir(), 'sawa-contract-test-'));

const { app } = require('../server');
const pool = require('../src/db');
const { allocateNumber } = require('../src/lib/contract/service');
const { validateContractData } = require('../src/lib/contract/validate');
const { renderabilityError } = require('../src/lib/contract/fonts');
const { moneyInWords, formatMoney } = require('../src/lib/contract/format');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function register(overrides = {}) {
  const body = { name: 'Test User', email: unique('user'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}

async function makeAdmin(user) {
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  const res = await api().post('/auth/login')
    .send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}

/** A handover sitting at 'confirmed' — the state a contract is issued against. */
async function agreedHandover() {
  const seller = await register({ role: 'seller', name: 'Habimana Jean-Baptiste' });
  await pool.query("UPDATE users SET id_verified = 'approved' WHERE id = $1", [seller.id]);
  const buyer = await register({ name: 'Uwimana Claudine' });
  const adminUser = await register();
  const admin = await makeAdmin(adminUser);

  const car = await api().post('/cars').set('Authorization', `Bearer ${admin}`)
    .send({ seller_id: seller.id, title: 'Contractable', make: 'Toyota', model: 'RAV4',
      year: 2021, mileage: 64300, price: 20000, vin: 'JTMRZ33V485012345' })
    .expect(201);

  const booking = await api().post('/handovers').set('Authorization', `Bearer ${buyer.token}`)
    .send({ car_id: car.body.id }).expect(201);

  await api().patch(`/handovers/${booking.body.id}/confirm`).set('Authorization', `Bearer ${admin}`)
    .send({ center: 'Sawa Cars Nyarutarama', handover_date: '2099-08-12', handover_time: '10:00 AM' })
    .expect(200);

  return { seller, buyer, admin, car: car.body, handoverId: booking.body.id };
}

/** A complete, valid submission for the generate endpoint. */
function fullBody(extra = {}) {
  return {
    seller: {
      legal_name: 'Habimana Jean-Baptiste', id_number: '1198780012345678',
      id_type: 'national_id', phone: '+250 788 123 456',
      address_line: 'KG 9 Ave', district: 'Gasabo', sector: 'Remera', cell: 'Rukiri',
    },
    buyer: {
      legal_name: 'Uwimana Claudine', id_number: '1199080087654321',
      id_type: 'national_id', phone: '+250 788 654 321',
      address_line: 'KK 15 Rd', district: 'Kicukiro', sector: 'Niboye', cell: 'Gatare',
    },
    vehicle: {
      make: 'Toyota', model: 'RAV4', year: 2021, vin: 'JTMRZ33V485012345',
      plate: 'RAD 123 B', mileage_km: 64300, condition: 'Certified — no undisclosed defects.',
    },
    terms: {
      currency: 'RWF', price_minor: 24500000, deposit_minor: 2000000,
      payment_method: 'Bank transfer', handover_on: '2099-08-12',
      handover_center: 'Sawa Cars Nyarutarama', balance_due_on: '2099-08-12',
    },
    sawa: { officer_name: 'Patrick Nkurunziza', officer_id: 'SC-0114' },
    ...extra,
  };
}

test.after(async () => { await pool.end(); });

// ─── numbering ───────────────────────────────────────────────────────────────

test('contract numbers are sequential and gap-free under concurrency', async () => {
  // A deliberately distant year so the counter is untouched by other tests.
  const year = 4242;
  await pool.query('DELETE FROM contract_counters WHERE year = $1', [year]);

  // 12 concurrent allocations, each in its own transaction, exactly as the
  // generate endpoint does it. A SEQUENCE would leave holes here; the locked
  // counter row must not.
  const allocate = async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const n = await allocateNumber(client, year);
      await client.query('COMMIT');
      return n;
    } finally { client.release(); }
  };
  const numbers = await Promise.all(Array.from({ length: 12 }, allocate));

  const suffixes = numbers.map((n) => Number(n.split('-')[2])).sort((a, b) => a - b);
  assert.deepEqual(suffixes, Array.from({ length: 12 }, (_, i) => i + 1),
    'allocated numbers must be 1..12 with no gaps and no duplicates');
  assert.match(numbers[0], /^SAWA-4242-\d{5}$/);

  await pool.query('DELETE FROM contract_counters WHERE year = $1', [year]);
});

test('a rolled-back allocation does not consume a number', async () => {
  const year = 4243;
  await pool.query('DELETE FROM contract_counters WHERE year = $1', [year]);

  const client = await pool.connect();
  await client.query('BEGIN');
  await allocateNumber(client, year);           // would be 00001
  await client.query('ROLLBACK');               // ...but the caller failed
  client.release();

  // The next successful allocation must still be 00001. This is precisely what
  // a Postgres SEQUENCE cannot promise.
  const client2 = await pool.connect();
  await client2.query('BEGIN');
  const n = await allocateNumber(client2, year);
  await client2.query('COMMIT');
  client2.release();

  assert.equal(n, `SAWA-${year}-00001`);
  await pool.query('DELETE FROM contract_counters WHERE year = $1', [year]);
});

// ─── the happy path ──────────────────────────────────────────────────────────

test('generating a contract produces a downloadable PDF and records its hash', async () => {
  const { admin, handoverId } = await agreedHandover();

  const gen = await api().post(`/contracts/handover/${handoverId}`)
    .set('Authorization', `Bearer ${admin}`).send(fullBody()).expect(201);

  assert.match(gen.body.contract_number, /^SAWA-\d{4}-\d{5}$/);
  assert.equal(gen.body.status, 'issued');
  assert.ok(gen.body.page_count >= 2, 'a sale agreement runs to at least two pages');

  const { rows } = await pool.query(
    'SELECT file_path, file_sha256, snapshot FROM contracts WHERE id = $1', [gen.body.id]
  );
  assert.ok(rows[0].file_sha256, 'the integrity hash must be stored');
  const abs = path.join(process.env.UPLOAD_DIR, rows[0].file_path);
  assert.ok(fs.existsSync(abs), 'the PDF must exist on disk');
  assert.ok(rows[0].file_path.startsWith('contracts/'));

  // The snapshot is the immutable record of what was printed.
  assert.equal(rows[0].snapshot.terms.balance_minor, 22500000);
  assert.equal(rows[0].snapshot.seller.legal_name, 'Habimana Jean-Baptiste');

  const dl = await api().get(`/contracts/${gen.body.id}/file`)
    .set('Authorization', `Bearer ${admin}`).expect(200);
  assert.equal(dl.headers['content-type'], 'application/pdf');
  assert.match(dl.headers['cache-control'], /no-store/);
  assert.ok(dl.body.length > 1000);
  assert.equal(dl.body.slice(0, 5).toString(), '%PDF-');

  // Re-downloading must return the identical bytes — never a regeneration.
  const again = await api().get(`/contracts/${gen.body.id}/file`)
    .set('Authorization', `Bearer ${admin}`).expect(200);
  assert.equal(again.body.length, dl.body.length);
});

test('generating writes the negotiated terms and learned identity back', async () => {
  const { admin, handoverId, seller, car } = await agreedHandover();
  await api().post(`/contracts/handover/${handoverId}`)
    .set('Authorization', `Bearer ${admin}`).send(fullBody()).expect(201);

  const h = await pool.query(
    'SELECT currency, price_minor, deposit_minor, payment_method, agreed_at FROM handovers WHERE id = $1',
    [handoverId]
  );
  assert.equal(h.rows[0].currency, 'RWF');
  assert.equal(Number(h.rows[0].price_minor), 24500000);
  assert.ok(h.rows[0].agreed_at, 'agreed_at must be stamped — it was never recorded before');

  // The ID number and address are kept so the next contract pre-fills itself.
  const u = await pool.query('SELECT national_id_number, district FROM users WHERE id = $1', [seller.id]);
  assert.equal(u.rows[0].national_id_number, '1198780012345678');
  assert.equal(u.rows[0].district, 'Gasabo');

  const c = await pool.query('SELECT registration_plate FROM cars WHERE id = $1', [car.id]);
  assert.equal(c.rows[0].registration_plate, 'RAD 123 B');
});

// ─── never overwrite ─────────────────────────────────────────────────────────

test('a second generate is refused while a contract is live', async () => {
  const { admin, handoverId } = await agreedHandover();
  const first = await api().post(`/contracts/handover/${handoverId}`)
    .set('Authorization', `Bearer ${admin}`).send(fullBody()).expect(201);

  const second = await api().post(`/contracts/handover/${handoverId}`)
    .set('Authorization', `Bearer ${admin}`).send(fullBody()).expect(409);
  assert.equal(second.body.code, 'CONTRACT_EXISTS');
  assert.match(second.body.error, new RegExp(first.body.contract_number));
});

test('a signed contract cannot be regenerated, and superseding mints a new number', async () => {
  const { admin, handoverId } = await agreedHandover();
  const first = await api().post(`/contracts/handover/${handoverId}`)
    .set('Authorization', `Bearer ${admin}`).send(fullBody()).expect(201);

  await api().patch(`/contracts/${first.body.id}/signed`)
    .set('Authorization', `Bearer ${admin}`).expect(200);

  // Signed means signed: no regeneration, not even after signing.
  await api().post(`/contracts/handover/${handoverId}`)
    .set('Authorization', `Bearer ${admin}`).send(fullBody()).expect(409);

  // A reason is mandatory, and a one-word excuse is not one.
  await api().post(`/contracts/${first.body.id}/supersede`)
    .set('Authorization', `Bearer ${admin}`).send({ reason: 'no' }).expect(400);

  await api().post(`/contracts/${first.body.id}/supersede`)
    .set('Authorization', `Bearer ${admin}`)
    .send({ reason: 'Buyer passport number was transcribed incorrectly.' }).expect(200);

  const replacement = await api().post(`/contracts/handover/${handoverId}`)
    .set('Authorization', `Bearer ${admin}`).send(fullBody()).expect(201);
  assert.notEqual(replacement.body.contract_number, first.body.contract_number);

  // The superseded row keeps its number, its file and its place in the register.
  const old = await pool.query('SELECT status, file_path, void_reason FROM contracts WHERE id = $1', [first.body.id]);
  assert.equal(old.rows[0].status, 'superseded');
  assert.ok(old.rows[0].file_path, 'the superseded PDF is retained');
  assert.match(old.rows[0].void_reason, /transcribed incorrectly/);
  assert.ok(fs.existsSync(path.join(process.env.UPLOAD_DIR, old.rows[0].file_path)));
});

// ─── refusals ────────────────────────────────────────────────────────────────

test('a contract cannot be generated before the deal is agreed', async () => {
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified = 'approved' WHERE id = $1", [seller.id]);
  const buyer = await register();
  const admin = await makeAdmin(await register());
  const car = await api().post('/cars').set('Authorization', `Bearer ${admin}`)
    .send({ seller_id: seller.id, title: 'Pending only', make: 'Honda', model: 'Fit',
      year: 2019, mileage: 51000, price: 9000 }).expect(201);
  const booking = await api().post('/handovers').set('Authorization', `Bearer ${buyer.token}`)
    .send({ car_id: car.body.id }).expect(201);   // stays 'pending'

  const res = await api().post(`/contracts/handover/${booking.body.id}`)
    .set('Authorization', `Bearer ${admin}`).send(fullBody()).expect(409);
  assert.match(res.body.error, /only be generated once the deal is agreed/);
});

test('missing required fields are refused as a complete list, and nothing is written', async () => {
  const { admin, handoverId } = await agreedHandover();
  const body = fullBody();
  delete body.seller.id_number;
  body.buyer.legal_name = '   ';
  body.terms.price_minor = 0;

  const res = await api().post(`/contracts/handover/${handoverId}`)
    .set('Authorization', `Bearer ${admin}`).send(body).expect(422);

  assert.equal(res.body.code, 'VALIDATION_FAILED');
  const fields = res.body.errors.map((e) => e.field);
  assert.ok(fields.includes('seller.id_number'));
  assert.ok(fields.includes('buyer.legal_name'));
  assert.ok(fields.includes('terms.price_minor'));
  // Every error carries a human label — the admin form renders these directly.
  assert.ok(res.body.errors.every((e) => e.label && e.problem));

  const count = await pool.query('SELECT COUNT(*)::int AS n FROM contracts WHERE handover_id = $1', [handoverId]);
  assert.equal(count.rows[0].n, 0, 'a failed validation must not create a contract row');
});

test('a name the font cannot print is refused rather than rendered blank', async () => {
  const { admin, handoverId } = await agreedHandover();
  const body = fullBody();
  body.buyer.legal_name = '李伟明';           // glyphs absent from the embedded font

  const res = await api().post(`/contracts/handover/${handoverId}`)
    .set('Authorization', `Bearer ${admin}`).send(body).expect(422);
  const err = res.body.errors.find((e) => e.field === 'buyer.legal_name');
  assert.ok(err, 'the offending field must be named');
  assert.match(err.problem, /cannot print|transliteration/);

  // Arabic has glyphs in the font but cannot be shaped or ordered correctly —
  // it must be refused too, not silently drawn as disconnected letters.
  assert.ok(renderabilityError('عبدالله محمد'));
  assert.equal(renderabilityError('Nyiraneza Ménaïs Şule'), null);
  assert.equal(renderabilityError('Дмитрий Иванов'), null);
});

test('a deposit larger than the price, and impossible dates, are refused', async () => {
  const bad = validateContractData({
    ...fullBody(),
    terms: { ...fullBody().terms, price_minor: 1000, deposit_minor: 5000, balance_due_on: '2020-01-01', handover_on: '2099-08-12' },
  });
  assert.equal(bad.ok, false);
  const fields = bad.errors.map((e) => e.field);
  assert.ok(fields.includes('terms.deposit_minor'));
  assert.ok(fields.includes('terms.balance_due_on'));
});

// ─── access control ──────────────────────────────────────────────────────────

test('contracts are invisible to buyers and sellers', async () => {
  const { admin, handoverId, buyer, seller } = await agreedHandover();
  const gen = await api().post(`/contracts/handover/${handoverId}`)
    .set('Authorization', `Bearer ${admin}`).send(fullBody()).expect(201);

  for (const token of [buyer.token, seller.token]) {
    await api().get(`/contracts/${gen.body.id}/file`).set('Authorization', `Bearer ${token}`).expect(403);
    await api().get(`/contracts/handover/${handoverId}/prefill`).set('Authorization', `Bearer ${token}`).expect(403);
    await api().get('/contracts').set('Authorization', `Bearer ${token}`).expect(403);
    await api().post(`/contracts/${gen.body.id}/supersede`).set('Authorization', `Bearer ${token}`)
      .send({ reason: 'I would like this gone' }).expect(403);
  }
  await api().get(`/contracts/${gen.body.id}/file`).expect(401);

  // The static path must never serve a contract even to an admin.
  await api().get('/uploads/contracts/anything.pdf').expect(403);
});

// ─── prefill ─────────────────────────────────────────────────────────────────

test('prefill reports what is known and what is still missing', async () => {
  const { admin, handoverId } = await agreedHandover();
  const res = await api().get(`/contracts/handover/${handoverId}/prefill`)
    .set('Authorization', `Bearer ${admin}`).expect(200);

  assert.equal(res.body.can_generate, true);
  assert.equal(res.body.data.vehicle.make, 'Toyota');
  assert.equal(res.body.data.vehicle.vin, 'JTMRZ33V485012345');
  assert.equal(res.body.live_contract, null);
  // Nothing has supplied ID numbers or a plate yet, so they must be listed.
  const missing = res.body.missing.map((m) => m.field);
  assert.ok(missing.includes('seller.id_number'));
  assert.ok(missing.includes('vehicle.plate'));
  assert.ok(missing.includes('sawa.officer_name'));
});

// ─── formatting ──────────────────────────────────────────────────────────────

test('amounts in words follow contract convention', async () => {
  assert.equal(moneyInWords(24500000, 'RWF'),
    'Twenty-four million five hundred thousand Rwandan francs only');
  assert.equal(moneyInWords(1005, 'RWF'), 'One thousand and five Rwandan francs only');
  assert.equal(moneyInWords(1, 'RWF'), 'One Rwandan franc only');
  assert.equal(moneyInWords(2450050, 'USD'),
    'Twenty-four thousand five hundred US dollars and fifty cents only');
  // RWF has no circulating subunit, so it must never print decimals.
  assert.equal(formatMoney(24500000, 'RWF'), 'RWF 24,500,000');
  assert.equal(formatMoney(2450050, 'USD'), 'USD 24,500.50');
});
