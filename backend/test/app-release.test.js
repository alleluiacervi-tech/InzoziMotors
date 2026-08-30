// ─────────────────────────────────────────────────────────────────────────────
// App release.
//
// This row can lock every install out of the app. That is the whole reason the
// tests exist, and the first three are the ones that matter: the validator must
// refuse a minimum above the latest version, the public read must never fail,
// and an empty store link must make both settings inert — because the only
// recovery from a bad minimum goes through a store review.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const {
  DEFAULT_RELEASE, SETTING_KEY, validateRelease, compareVersions,
} = require('../src/lib/app-release');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function admin() {
  const email = unique('release');
  const reg = await api().post('/auth/register')
    .send({ name: 'Release Admin', email, password: 'password123', role: 'buyer' }).expect(201);
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [reg.body.user.id]);
  const login = await api().post('/auth/login').send({ email, password: 'password123' }).expect(200);
  return login.body.token;
}

const clone = () => JSON.parse(JSON.stringify(DEFAULT_RELEASE));

test.after(async () => {
  await pool.query('UPDATE platform_settings SET value=$1::jsonb WHERE key=$2',
    [JSON.stringify(DEFAULT_RELEASE), SETTING_KEY]);
  await pool.end();
});

test('migration 0034 seeds the row, editable, matching the code defaults', async () => {
  const { rows } = await pool.query('SELECT value, editable FROM platform_settings WHERE key=$1', [SETTING_KEY]);
  assert.equal(rows.length, 1, 'migration 0034 must seed the row');
  assert.equal(rows[0].editable, true);
  assert.deepEqual(rows[0].value, DEFAULT_RELEASE);
  // The store links MUST ship empty. A seeded link would make the version
  // fields live on day one, before anything is on a store to send people to.
  assert.equal(rows[0].value.ios.url, '');
  assert.equal(rows[0].value.android.url, '');
});

test('a minimum newer than the latest version is refused, by name', () => {
  const value = clone();
  value.ios.latest_version = '1.2.0';
  value.ios.min_supported_version = '1.3.0';
  const problems = validateRelease(value);
  assert.ok(problems.length, 'this is the mistake that cannot be undone from inside the app');
  assert.match(problems[0], /ios\.min_supported_version/);
  assert.match(problems[0], /latest_version/);
});

test('a minimum equal to the latest version is allowed', () => {
  const value = clone();
  value.android.latest_version = '2.0.0';
  value.android.min_supported_version = '2.0.0';
  assert.deepEqual(validateRelease(value), []);
});

test('the validator names the field for every other bad shape', () => {
  const bad = clone();
  bad.ios.latest_version = 'v1.2';
  assert.match(validateRelease(bad)[0], /ios\.latest_version/);

  const http = clone();
  http.android.url = 'http://play.google.com/store';
  assert.match(validateRelease(http).find((p) => /url/.test(p)), /android\.url/);

  const missing = clone();
  delete missing.android;
  assert.match(validateRelease(missing)[0], /^android/);

  assert.deepEqual(validateRelease(null), ['App release must be an object']);
  assert.deepEqual(validateRelease([]), ['App release must be an object']);

  const paused = clone();
  paused.ota_paused = 'yes';
  assert.match(validateRelease(paused)[0], /ota_paused/);
});

test('compareVersions treats missing components as zero', () => {
  assert.equal(compareVersions('1.2', '1.2.0'), 0);
  assert.equal(compareVersions('1.2.1', '1.2'), 1);
  assert.equal(compareVersions('1.9.0', '1.10.0'), -1, 'numeric, not lexicographic');
  assert.equal(compareVersions('', '0.0.1'), -1);
});

test('GET /settings/app-release is public, cached, and shaped', async () => {
  const res = await api().get('/settings/app-release').expect(200);
  assert.ok(res.body.ios && res.body.android);
  assert.equal(typeof res.body.ota_paused, 'boolean');
  assert.match(res.headers['cache-control'], /max-age=\d+/);
});

test('an admin can pause over-the-air updates, and the public read says so', async () => {
  const token = await admin();
  const value = { ...clone(), ota_paused: true, ota_pause_reason: 'Bad bundle on production' };
  await api().patch(`/admin/settings/${SETTING_KEY}`)
    .set('Authorization', `Bearer ${token}`).send({ value }).expect(200);

  // The publish workflow reads exactly this. A stale cache here would mean an
  // operator hits the stop switch and updates keep going out anyway.
  const res = await api().get('/settings/app-release').expect(200);
  assert.equal(res.body.ota_paused, true);
  assert.equal(res.body.ota_pause_reason, 'Bad bundle on production');
});

test('the server refuses to store a bricking minimum, and says which field', async () => {
  const token = await admin();
  const value = clone();
  value.android.latest_version = '1.0.0';
  value.android.min_supported_version = '9.9.9';
  const res = await api().patch(`/admin/settings/${SETTING_KEY}`)
    .set('Authorization', `Bearer ${token}`).send({ value }).expect(400);
  assert.equal(res.body.code, 'INVALID_APP_RELEASE');
  assert.match(res.body.error, /android\.min_supported_version/);

  // And nothing was written.
  const after = await api().get('/settings/app-release').expect(200);
  assert.equal(after.body.android.min_supported_version, '1.0.0');
});

test('a non-admin cannot touch it', async () => {
  const email = unique('nobody');
  await api().post('/auth/register')
    .send({ name: 'Buyer', email, password: 'password123', role: 'buyer' }).expect(201);
  const login = await api().post('/auth/login').send({ email, password: 'password123' }).expect(200);
  await api().patch(`/admin/settings/${SETTING_KEY}`)
    .set('Authorization', `Bearer ${login.body.token}`).send({ value: clone() }).expect(403);
});
