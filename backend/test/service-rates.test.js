// ─────────────────────────────────────────────────────────────────────────────
// The rate card — inspection fee, report resale, rental subscription.
//
// Five monetizable lines existed before this and none had a price. These
// tests protect the same two things duty-rates.test.js protects for the duty
// calculator: a validator that names which field is wrong, and a public read
// that cannot be made to fail.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { DEFAULT_RATES, SETTING_KEY, validateRates } = require('../src/lib/service-rates');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function admin() {
  const email = unique('rates');
  const reg = await api().post('/auth/register')
    .send({ name: 'Rates Admin', email, password: 'password123', role: 'buyer' }).expect(201);
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [reg.body.user.id]);
  const login = await api().post('/auth/login').send({ email, password: 'password123' }).expect(200);
  return login.body.token;
}

test.after(async () => {
  await pool.query('UPDATE platform_settings SET value=$1::jsonb WHERE key=$2',
    [JSON.stringify(DEFAULT_RATES), SETTING_KEY]);
  await pool.end();
});

test('the seeded row and the code defaults have not drifted apart', async () => {
  const { rows } = await pool.query('SELECT value, editable FROM platform_settings WHERE key=$1', [SETTING_KEY]);
  assert.equal(rows.length, 1, 'migration 0038 must seed the row');
  assert.equal(rows[0].editable, true, 'unlike the policy rails, rates are meant to be corrected');
  assert.deepEqual(rows[0].value, DEFAULT_RATES);
  assert.deepEqual(validateRates(DEFAULT_RATES), [], 'the defaults must satisfy their own validator');
});

test('the public read is cacheable, complete, and cannot be made to fail', async () => {
  const res = await api().get('/settings/rate-card').expect(200);
  assert.match(res.headers['cache-control'], /max-age=\d+/);
  assert.equal(res.body.inspection_fee_rwf, DEFAULT_RATES.inspection_fee_rwf);
  assert.equal(res.body.report_resale_fee_rwf, DEFAULT_RATES.report_resale_fee_rwf);
  assert.equal(res.body.rental_subscription_monthly_rwf, DEFAULT_RATES.rental_subscription_monthly_rwf);
  assert.ok(res.body.reviewed_on, 'clients must be able to show when this was last reviewed');

  // A corrupted row must not take the pricing page down with it.
  await pool.query("UPDATE platform_settings SET value='{\"inspection_fee_rwf\":\"lots\"}'::jsonb WHERE key=$1", [SETTING_KEY]);
  const degraded = await api().get('/settings/rate-card').expect(200);
  assert.equal(degraded.body.inspection_fee_rwf, DEFAULT_RATES.inspection_fee_rwf, 'it must fall back to the reviewed defaults');
  await pool.query('UPDATE platform_settings SET value=$1::jsonb WHERE key=$2',
    [JSON.stringify(DEFAULT_RATES), SETTING_KEY]);
});

test('the validator names the field that is wrong', async () => {
  const bad = [
    [{ ...DEFAULT_RATES, inspection_fee_rwf: -1 }, /inspection_fee_rwf/],
    [{ ...DEFAULT_RATES, report_resale_fee_rwf: 'five thousand' }, /report_resale_fee_rwf/],
    [{ ...DEFAULT_RATES, rental_subscription_monthly_rwf: 12.5 }, /rental_subscription_monthly_rwf/],
    [{ ...DEFAULT_RATES, reviewed_on: 'last summer' }, /reviewed_on/],
    ['not an object', /object/],
  ];
  for (const [value, expected] of bad) {
    const problems = validateRates(value);
    assert.ok(problems.length, `${JSON.stringify(value).slice(0, 60)} should have been refused`);
    assert.match(problems.join(' '), expected);
  }
});

test('an admin can correct the rates, and a bad correction says which field', async () => {
  const token = await admin();
  const auth = { Authorization: `Bearer ${token}` };

  const corrected = { ...DEFAULT_RATES, inspection_fee_rwf: 20000, reviewed_on: '2026-09-02' };
  const saved = await api().patch(`/admin/settings/${SETTING_KEY}`).set(auth)
    .send({ value: corrected }).expect(200);
  assert.equal(saved.body.value.inspection_fee_rwf, 20000);

  // The public read reflects it immediately — the cache is dropped on write,
  // or an operator reasonably concludes their edit did not save.
  const published = await api().get('/settings/rate-card').expect(200);
  assert.equal(published.body.inspection_fee_rwf, 20000);

  const refused = await api().patch(`/admin/settings/${SETTING_KEY}`).set(auth)
    .send({ value: { ...DEFAULT_RATES, report_resale_fee_rwf: -5 } }).expect(400);
  assert.equal(refused.body.code, 'INVALID_SERVICE_RATES');
  assert.match(refused.body.error, /report_resale_fee_rwf/);
  assert.ok(Array.isArray(refused.body.problems));

  // The change is on the record, with what it was before.
  const history = await api().get('/admin/audit-log?type=platform_setting').set(auth).expect(200);
  const event = history.body.find((row) => row.target_id === SETTING_KEY);
  assert.ok(event, 'a rate change must be auditable');
  assert.equal(event.metadata.current.inspection_fee_rwf, 20000);
  assert.equal(event.metadata.previous.inspection_fee_rwf, DEFAULT_RATES.inspection_fee_rwf);

  const outsider = await api().post('/auth/register')
    .send({ name: 'Nobody', email: unique('outsider'), password: 'password123', role: 'buyer' }).expect(201);
  await api().patch(`/admin/settings/${SETTING_KEY}`)
    .set('Authorization', `Bearer ${outsider.body.token}`).send({ value: DEFAULT_RATES }).expect(403);
});
