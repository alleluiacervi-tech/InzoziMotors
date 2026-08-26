// ─────────────────────────────────────────────────────────────────────────────
// Import duty rates.
//
// The calculator these feed was publicly wrong — excise at 10/20/25/35% against
// an actual 5/10/15%, no withholding tax, no EAC depreciation allowance. Rates
// are now data so the next correction is data entry rather than a release, and
// these tests protect the two things that makes possible: a validator that says
// which field is wrong, and a public read that cannot be made to fail.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { DEFAULT_RATES, SETTING_KEY, validateRates } = require('../src/lib/duty-rates');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function admin() {
  const email = unique('duty');
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
  // Migration 0024 embeds a JSON literal and lib/duty-rates.js holds the same
  // object. Nothing but this test stops the two diverging.
  const { rows } = await pool.query('SELECT value, editable FROM platform_settings WHERE key=$1', [SETTING_KEY]);
  assert.equal(rows.length, 1, 'migration 0024 must seed the row');
  assert.equal(rows[0].editable, true, 'unlike the policy rails, rates are meant to be corrected');
  assert.deepEqual(rows[0].value, DEFAULT_RATES);
  assert.deepEqual(validateRates(DEFAULT_RATES), [], 'the defaults must satisfy their own validator');
});

test('the published schedule is the corrected one, not the one that shipped', async () => {
  // The specific regression: excise was 10/20/25/35 and there was no
  // withholding tax and no depreciation relief at all.
  assert.deepEqual(DEFAULT_RATES.excise_brackets.map((b) => b.rate_pct), [5, 10, 15]);
  assert.equal(DEFAULT_RATES.withholding_pct, 5);
  assert.ok(DEFAULT_RATES.depreciation.length >= 2);
  assert.equal(DEFAULT_RATES.depreciation[0].allowance_pct, 0);
  assert.equal(DEFAULT_RATES.depreciation.at(-1).allowance_pct, 80);
  // Visibly dated, so an unreviewed schedule reads as unreviewed.
  assert.match(DEFAULT_RATES.reviewed_on, /^\d{4}-\d{2}-\d{2}$/);
});

test('the public read is cacheable, complete, and cannot be made to fail', async () => {
  const res = await api().get('/settings/duty-rates').expect(200);
  assert.match(res.headers['cache-control'], /max-age=\d+/);
  assert.equal(res.body.customs_pct, DEFAULT_RATES.customs_pct);
  assert.ok(Array.isArray(res.body.excise_brackets));
  assert.ok(res.body.reviewed_on, 'clients must be able to show when this was last reviewed');

  // A corrupted row must not take the calculator down with it.
  await pool.query("UPDATE platform_settings SET value='{\"customs_pct\":\"lots\"}'::jsonb WHERE key=$1", [SETTING_KEY]);
  const degraded = await api().get('/settings/duty-rates').expect(200);
  assert.equal(degraded.body.customs_pct, DEFAULT_RATES.customs_pct, 'it must fall back to the reviewed defaults');
  await pool.query('UPDATE platform_settings SET value=$1::jsonb WHERE key=$2',
    [JSON.stringify(DEFAULT_RATES), SETTING_KEY]);
});

test('the validator names the field that is wrong', async () => {
  const bad = [
    [{ ...DEFAULT_RATES, customs_pct: -1 }, /customs_pct/],
    [{ ...DEFAULT_RATES, vat_pct: 'eighteen' }, /vat_pct/],
    [{ ...DEFAULT_RATES, excise_brackets: [{ max_cc: 2500, rate_pct: 5 }, { max_cc: 1500, rate_pct: 10 }, { max_cc: null, rate_pct: 15 }] }, /excise_brackets\[1\]/],
    [{ ...DEFAULT_RATES, excise_brackets: [{ max_cc: null, rate_pct: 5 }, { max_cc: null, rate_pct: 10 }] }, /excise_brackets\[0\]/],
    [{ ...DEFAULT_RATES, excise_brackets: [] }, /excise_brackets/],
    [{ ...DEFAULT_RATES, depreciation: [] }, /depreciation/],
    [{ ...DEFAULT_RATES, depreciation: [{ min_age_years: 4, allowance_pct: 30 }, { min_age_years: 2, allowance_pct: 20 }] }, /depreciation\[1\]/],
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

  const corrected = { ...DEFAULT_RATES, customs_pct: 26, reviewed_on: '2026-09-01' };
  const saved = await api().patch(`/admin/settings/${SETTING_KEY}`).set(auth)
    .send({ value: corrected }).expect(200);
  assert.equal(saved.body.value.customs_pct, 26);

  // The public read reflects it immediately — the cache is dropped on write,
  // or an operator reasonably concludes their edit did not save.
  const published = await api().get('/settings/duty-rates').expect(200);
  assert.equal(published.body.customs_pct, 26);
  assert.equal(published.body.reviewed_on, '2026-09-01');

  const refused = await api().patch(`/admin/settings/${SETTING_KEY}`).set(auth)
    .send({ value: { ...DEFAULT_RATES, withholding_pct: 500 } }).expect(400);
  assert.equal(refused.body.code, 'INVALID_DUTY_RATES');
  assert.match(refused.body.error, /withholding_pct/);
  assert.ok(Array.isArray(refused.body.problems));

  // The change is on the record, with what it was before.
  const history = await api().get('/admin/audit-log?type=platform_setting').set(auth).expect(200);
  const event = history.body.find((row) => row.target_id === SETTING_KEY);
  assert.ok(event, 'a rate change must be auditable');
  assert.equal(event.metadata.current.customs_pct, 26);
  assert.equal(event.metadata.previous.customs_pct, DEFAULT_RATES.customs_pct);

  const outsider = await api().post('/auth/register')
    .send({ name: 'Nobody', email: unique('outsider'), password: 'password123', role: 'buyer' }).expect(201);
  await api().patch(`/admin/settings/${SETTING_KEY}`)
    .set('Authorization', `Bearer ${outsider.body.token}`).send({ value: DEFAULT_RATES }).expect(403);
});
