// ─────────────────────────────────────────────────────────────────────────────
// Sign in / sign up with Google and Apple (routes/oauth.js, lib/oauth.js).
//
// Tokens are signed here with a locally generated RSA key, and the module's
// key fetcher is pointed at that key, so nothing reaches Google or Apple. What
// is under test is everything the server decides: which tokens it believes,
// whose account a token opens, and what it refuses.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';
process.env.GOOGLE_CLIENT_IDS = 'web-client.apps.googleusercontent.com,ios-client.apps.googleusercontent.com';
process.env.APPLE_CLIENT_IDS = 'com.sawacars.app';
const { app } = require('../server');
const pool = require('../src/db');
const oauth = require('../src/lib/oauth');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e9)}@test.local`;
const sub = () => `sub-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const stranger = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'test-key-1';
oauth.__setJwksFetcher(async () => ({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' }] }));

const ISS = { google: 'https://accounts.google.com', apple: 'https://appleid.apple.com' };
const AUD = { google: 'web-client.apps.googleusercontent.com', apple: 'com.sawacars.app' };

function idToken(provider, claims = {}, { key = privateKey, expiresIn = '10m' } = {}) {
  const { __opts: overrides = {}, ...payload } = claims;
  return jwt.sign(
    { email_verified: true, ...payload },
    key,
    { algorithm: 'RS256', keyid: KID, issuer: ISS[provider], audience: AUD[provider], expiresIn, ...overrides }
  );
}

test.after(async () => { await pool.end(); });

test('providers are reported only when configured, and a switched-off one refuses', async () => {
  const on = await api().get('/auth/oauth/providers').expect(200);
  assert.deepEqual(on.body, { google: true, apple: true });

  const saved = process.env.GOOGLE_CLIENT_IDS;
  process.env.GOOGLE_CLIENT_IDS = '';
  try {
    const off = await api().get('/auth/oauth/providers').expect(200);
    assert.equal(off.body.google, false);
    const refused = await api().post('/auth/oauth/google').send({ id_token: idToken('google', { sub: sub(), email: unique('g') }) }).expect(503);
    assert.equal(refused.body.code, 'PROVIDER_DISABLED');
  } finally {
    process.env.GOOGLE_CLIENT_IDS = saved;
  }
});

test('a first Google sign-in creates a password-less account that still needs a phone', async () => {
  const email = unique('google-new');
  const subject = sub();
  const first = await api().post('/auth/oauth/google')
    .send({ id_token: idToken('google', { sub: subject, email, name: 'Aline Uwase' }) }).expect(201);
  assert.equal(first.body.is_new, true);
  assert.equal(first.body.needs_profile, true);
  assert.equal(first.body.user.email, email);
  assert.equal(first.body.user.name, 'Aline Uwase');
  assert.equal(first.body.user.role, 'buyer');
  assert.equal(first.body.user.token_version, undefined, 'internal columns stay internal');

  const me = await api().get('/auth/me').set('Authorization', `Bearer ${first.body.token}`).expect(200);
  assert.equal(me.body.has_password, false);
  assert.deepEqual(me.body.sign_in_providers, ['google']);
  assert.equal(me.body.profile_complete, false);

  const again = await api().post('/auth/oauth/google')
    .send({ id_token: idToken('google', { sub: subject, email }) }).expect(200);
  assert.equal(again.body.is_new, false);
  assert.equal(again.body.user.id, first.body.user.id, 'the same person reaches the same account');

  // A password login cannot open an account that has no password.
  await api().post('/auth/login').send({ email, password: 'anything123' }).expect(401);
});

test('a verified provider email joins the existing account; an unverified one is refused', async () => {
  const email = unique('linked');
  const reg = await api().post('/auth/register')
    .send({ name: 'Password Person', email, password: 'password123', role: 'seller', phone: '+250788000111' }).expect(201);

  const unverified = await api().post('/auth/oauth/google')
    .send({ id_token: idToken('google', { sub: sub(), email, email_verified: false }) }).expect(409);
  assert.equal(unverified.body.code, 'EMAIL_IN_USE');

  const linked = await api().post('/auth/oauth/google')
    .send({ id_token: idToken('google', { sub: sub(), email }) }).expect(200);
  assert.equal(linked.body.user.id, reg.body.user.id);
  assert.equal(linked.body.user.role, 'seller', 'linking never changes who the person is');
  assert.equal(linked.body.needs_profile, false);

  await api().post('/auth/login').send({ email, password: 'password123' }).expect(200);
});

test('only a token we can fully verify is believed', async () => {
  const email = unique('bad');
  const cases = {
    'another app\'s token': idToken('google', { sub: sub(), email, __opts: { audience: 'someone-else.apps.googleusercontent.com' } }),
    'another issuer': idToken('google', { sub: sub(), email, __opts: { issuer: 'https://evil.example' } }),
    'expired': idToken('google', { sub: sub(), email }, { expiresIn: '-5m' }),
    'signed by an unknown key': idToken('google', { sub: sub(), email }, { key: stranger.privateKey }),
    'an Apple token sent as Google': idToken('apple', { sub: sub(), email }),
    'not a token': 'abc.def',
  };
  // Checked against the verifier directly: through HTTP, each refusal would
  // also spend the per-IP sign-in allowance this file shares.
  for (const [label, token] of Object.entries(cases)) {
    await assert.rejects(oauth.verifyIdToken('google', token), (err) => err.code === 'INVALID_TOKEN', label);
  }
  // And once end to end: refused, and nothing created.
  const res = await api().post('/auth/oauth/google').send({ id_token: cases.expired }).expect(401);
  assert.equal(res.body.code, 'INVALID_TOKEN');
  const rows = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
  assert.equal(rows.rowCount, 0, 'a refused token creates nothing');
});

test('a nonce must come back inside the token, raw or as its SHA-256', async () => {
  const nonce = crypto.randomBytes(16).toString('hex');
  const hashed = crypto.createHash('sha256').update(nonce).digest('hex');
  await assert.rejects(
    oauth.verifyIdToken('apple', idToken('apple', { sub: sub(), nonce: 'something-else' }), { nonce }),
    (err) => err.code === 'INVALID_TOKEN'
  );
  await api().post('/auth/oauth/apple')
    .send({ id_token: idToken('apple', { sub: sub(), email: unique('n2'), nonce: hashed }), nonce }).expect(201);
  await api().post('/auth/oauth/google')
    .send({ id_token: idToken('google', { sub: sub(), email: unique('n3'), nonce }), nonce }).expect(201);
});

test('Apple: the name comes from the client the first time, and "true" counts as verified', async () => {
  const email = unique('apple');
  const res = await api().post('/auth/oauth/apple')
    .send({
      id_token: idToken('apple', { sub: sub(), email, email_verified: 'true' }),
      full_name: { givenName: 'Jean', familyName: 'Mugabo' },
      role: 'seller',
    }).expect(201);
  assert.equal(res.body.user.name, 'Jean Mugabo');
  assert.equal(res.body.user.role, 'seller');
  const identity = await pool.query(
    "SELECT email_verified, apple_client_id, apple_refresh_token FROM user_identities WHERE user_id = $1 AND provider = 'apple'",
    [res.body.user.id]
  );
  assert.equal(identity.rows[0].email_verified, true);
  assert.equal(identity.rows[0].apple_client_id, 'com.sawacars.app');
  assert.equal(identity.rows[0].apple_refresh_token, null, 'nothing stored without the Apple key configured');
});

test('staff, suspended and closed accounts are handled exactly as with a password', async () => {
  const admin = await api().post('/auth/register')
    .send({ name: 'Staff', email: unique('staff'), password: 'password123', phone: '+250788000222' }).expect(201);
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.body.user.id]);
  const staff = await api().post('/auth/oauth/google')
    .send({ id_token: idToken('google', { sub: sub(), email: admin.body.user.email }) }).expect(403);
  assert.equal(staff.body.code, 'ADMIN_PASSWORD_ONLY');
  const staffLinks = await pool.query('SELECT 1 FROM user_identities WHERE user_id = $1', [admin.body.user.id]);
  assert.equal(staffLinks.rowCount, 0, 'a staff account is never linked to a provider');

  const subject = sub();
  const person = await api().post('/auth/oauth/google')
    .send({ id_token: idToken('google', { sub: subject, email: unique('suspended') }) }).expect(201);
  await pool.query("UPDATE users SET account_status = 'suspended' WHERE id = $1", [person.body.user.id]);
  const suspended = await api().post('/auth/oauth/google')
    .send({ id_token: idToken('google', { sub: subject }) }).expect(403);
  assert.equal(suspended.body.code, 'ACCOUNT_UNAVAILABLE');

  // Closed with no password to give: closure needs only the reason.
  const closerSub = sub();
  const closer = await api().post('/auth/oauth/apple')
    .send({ id_token: idToken('apple', { sub: closerSub, email: unique('closer') }) }).expect(201);
  await api().delete('/auth/me').set('Authorization', `Bearer ${closer.body.token}`)
    .send({ reason: 'other' }).expect(200);
  const closed = await api().post('/auth/oauth/apple')
    .send({ id_token: idToken('apple', { sub: closerSub }) }).expect(403);
  assert.equal(closed.body.code, 'ACCOUNT_CLOSED');
  assert.ok(closed.body.reopen_until);
  const reopened = await api().post('/auth/oauth/apple')
    .send({ id_token: idToken('apple', { sub: closerSub }), reopen: true }).expect(200);
  assert.equal(reopened.body.user.id, closer.body.user.id);
  assert.equal(reopened.body.user.account_status, 'active');
});

test('completing the profile sets phone and role once, and the new token carries the role', async () => {
  const signup = await api().post('/auth/oauth/google')
    .send({ id_token: idToken('google', { sub: sub(), email: unique('complete') }) }).expect(201);
  const auth = { Authorization: `Bearer ${signup.body.token}` };

  const bad = await api().post('/auth/oauth/complete-profile').set(auth).send({ phone: '0788' }).expect(400);
  assert.equal(bad.body.code, 'INVALID_PHONE');

  const done = await api().post('/auth/oauth/complete-profile').set(auth)
    .send({ phone: '+250 788 123 456', role: 'seller' }).expect(200);
  assert.equal(done.body.user.phone, '+250788123456');
  assert.equal(done.body.user.role, 'seller');
  assert.equal(jwt.decode(done.body.token).role, 'seller');

  const me = await api().get('/auth/me').set('Authorization', `Bearer ${done.body.token}`).expect(200);
  assert.equal(me.body.profile_complete, true);

  const twice = await api().post('/auth/oauth/complete-profile').set('Authorization', `Bearer ${done.body.token}`)
    .send({ phone: '+250788999999', role: 'buyer' }).expect(409);
  assert.equal(twice.body.code, 'PROFILE_COMPLETE');
});
