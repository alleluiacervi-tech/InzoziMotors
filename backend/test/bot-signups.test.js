// ─────────────────────────────────────────────────────────────────────────────
// Scripted sign-ups and where accounts are used from (migration 0069).
//
// What has to be true:
//   - a sign-up that proves itself a script (hidden field, failed Turnstile) is
//     refused and no account exists;
//   - one that only looks like a script is held: it signs in, sees its profile,
//     and nothing else answers until its emailed code is confirmed, which lifts
//     the hold by itself;
//   - every account's addresses are recorded with first and last seen, so a
//     change of network is a new row, and only the team can read them;
//   - the team can hold, release and erase, and an erase with no one else's
//     history behind it removes the row completely.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';
process.env.RESET_CODE_ECHO = 'true';

const { app } = require('../server');
const pool = require('../src/db');
const { looksGenerated, disposableDomain } = require('../src/lib/signup-risk');
const { isInternalIp } = require('../src/lib/client-ip');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
// A fresh public-looking address per call (documentation range), so runs within
// the velocity window never see each other's sign-ups.
const hextet = () => crypto.randomInt(0x1000, 0x10000).toString(16);
const freshIp = () => `2001:db8:${hextet()}::${hextet()}`;
const digits = () => String(10000 + Math.floor(Math.random() * 89999));

function register(body, ip = freshIp()) {
  return api().post('/auth/register').set('X-Forwarded-For', ip)
    .send({ password: 'password123', role: 'buyer', name: 'Real Person', email: unique('real'), ...body });
}

async function adminToken() {
  const email = unique('admin');
  const res = await register({ email }).expect(201);
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [res.body.user.id]);
  const login = await api().post('/auth/login').send({ email, password: 'password123' }).expect(200);
  return { token: login.body.token, id: res.body.user.id };
}

test('the scripted address pattern, and what it leaves alone', () => {
  assert.equal(looksGenerated('Margie Tate', 'margietate.70658@gmail.com'), true);
  assert.equal(looksGenerated('Muriel Todd', 'murieltodd.06886@gmail.com'), true);
  assert.equal(looksGenerated('Alejandro Clark', 'alejandroclark.09870@gmail.com'), true);
  assert.equal(looksGenerated('Tate Margie', 'margietate123456@gmail.com'), true, 'either name order');
  assert.equal(looksGenerated('John Smith', 'johnsmith1990@gmail.com'), false, 'four digits is usually a birth year');
  assert.equal(looksGenerated('John Smith', 'john.smith@gmail.com'), false);
  assert.equal(looksGenerated('Aline Uwase', 'jean.70658@gmail.com'), false, 'not the name');
  assert.equal(disposableDomain('x@mailinator.com'), true);
  assert.equal(disposableDomain('x@gmail.com'), false);
  assert.equal(isInternalIp('127.0.0.1'), true);
  assert.equal(isInternalIp('172.18.0.4'), true);
  assert.equal(isInternalIp('41.186.1.1'), false);
});

test('a filled hidden field is refused, and no account is made', async () => {
  const email = unique('honeypot');
  const res = await register({ email, client: 'web', website: 'http://spam.example' }).expect(400);
  assert.equal(res.body.code, 'BOT_CHECK_FAILED');
  assert.doesNotMatch(res.body.error, /honeypot|hidden/i, 'never says which rule tripped');
  assert.equal((await pool.query('SELECT 1 FROM users WHERE email = $1', [email])).rowCount, 0);
  const { rows: [row] } = await pool.query(
    'SELECT decision, reasons, user_id FROM signup_screenings WHERE email = $1', [email]
  );
  assert.equal(row.decision, 'blocked');
  assert.deepEqual(row.reasons, ['honeypot']);
  assert.equal(row.user_id, null);
});

test('a held account can only confirm its email, and confirming lifts the hold', async () => {
  const email = `margietate.${digits()}-${Date.now()}@test.local`.replace(/-\d+@/, '@');
  const signup = await register({ name: 'Margie Tate', email }).expect(201);
  assert.equal(signup.body.user.access_hold, 'suspected_bot');
  const auth = { Authorization: `Bearer ${signup.body.token}` };

  const { rows: [user] } = await pool.query(
    'SELECT access_hold, access_hold_reasons FROM users WHERE id = $1', [signup.body.user.id]
  );
  assert.equal(user.access_hold, 'suspected_bot');
  assert.deepEqual(user.access_hold_reasons, ['generated_email']);

  // Its own profile, yes; anything else, no.
  const me = await api().get('/auth/me').set(auth).expect(200);
  assert.equal(me.body.access_hold, 'suspected_bot');
  assert.equal(me.body.access_hold_reasons, undefined, 'reasons stay with the team');
  const refused = await api().get('/notifications').set(auth).expect(403);
  assert.equal(refused.body.code, 'ACCOUNT_VERIFICATION_REQUIRED');
  await api().post('/auth/socket-ticket').set(auth).expect(403);

  // Signing in again does not get round it.
  const login = await api().post('/auth/login').send({ email, password: 'password123' }).expect(200);
  assert.equal(login.body.user.access_hold, 'suspected_bot');
  assert.equal(login.body.user.access_hold_reasons, undefined);

  // The code, once a minute.
  const sent = await api().post('/auth/email-verification/send').set(auth).expect(200);
  assert.equal(sent.body.sent, true);
  assert.match(sent.body.dev_code, /^\d{6}$/);
  const again = await api().post('/auth/email-verification/send').set(auth).expect(429);
  assert.equal(again.body.code, 'EMAIL_CODE_RECENT');

  const wrong = sent.body.dev_code === '000000' ? '111111' : '000000';
  const bad = await api().post('/auth/email-verification/confirm').set(auth).send({ code: wrong }).expect(400);
  assert.equal(bad.body.code, 'EMAIL_CODE_INVALID');

  await api().post('/auth/email-verification/confirm').set(auth).send({ code: sent.body.dev_code }).expect(200);
  const after = await api().get('/auth/me').set(auth).expect(200);
  assert.equal(after.body.access_hold, null);
  assert.ok(after.body.email_verified_at);
  await api().get('/notifications').set(auth).expect(200);
});

test('five wrong guesses burn the code', async () => {
  const signup = await register({ name: 'Muriel Todd', email: `murieltodd.${digits()}@test.local` }).expect(201);
  const auth = { Authorization: `Bearer ${signup.body.token}` };
  const sent = await api().post('/auth/email-verification/send').set(auth).expect(200);
  const wrong = sent.body.dev_code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i += 1) {
    await api().post('/auth/email-verification/confirm').set(auth).send({ code: wrong }).expect(400);
  }
  await api().post('/auth/email-verification/confirm').set(auth).send({ code: sent.body.dev_code }).expect(400);
  assert.equal((await api().get('/auth/me').set(auth)).body.access_hold, 'suspected_bot');
});

test('many sign-ups from one address hold the next one, and only from a public address', async () => {
  const ip = freshIp();
  for (let i = 0; i < 3; i += 1) {
    const ok = await register({}, ip).expect(201);
    assert.equal(ok.body.user.access_hold, null);
  }
  const fourth = await register({}, ip).expect(201);
  assert.equal(fourth.body.user.access_hold, 'suspected_bot');

  // This server's own network (the website not forwarding, tests) is never a reason.
  for (let i = 0; i < 4; i += 1) {
    const local = await register({}, '10.0.0.5').expect(201);
    assert.equal(local.body.user.access_hold, null);
  }
});

test('Turnstile on website sign-ups: passed is allowed, failed refused, missing held', async (t) => {
  const realFetch = global.fetch;
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  t.after(() => { global.fetch = realFetch; delete process.env.TURNSTILE_SECRET_KEY; });
  global.fetch = async (url, init) => {
    assert.match(String(url), /challenges\.cloudflare\.com/);
    const token = new URLSearchParams(String(init.body)).get('response');
    return { ok: true, json: async () => ({ success: token === 'good', action: 'signup' }) };
  };

  const passed = await register({ client: 'web', turnstile_token: 'good' }).expect(201);
  assert.equal(passed.body.user.access_hold, null);

  const failed = await register({ client: 'web', turnstile_token: 'forged' }).expect(400);
  assert.equal(failed.body.code, 'BOT_CHECK_FAILED');

  const missing = await register({ client: 'web' }).expect(201);
  assert.equal(missing.body.user.access_hold, 'suspected_bot');

  // The app has no Turnstile and is not asked for one.
  const app = await register({}).expect(201);
  assert.equal(app.body.user.access_hold, null);
});

test('addresses are recorded per account, and only the team can read them', async () => {
  const admin = await adminToken();
  const home = freshIp();
  const phone = freshIp();
  const email = unique('mover');
  const person = await register({ email }, home).expect(201);
  // Same person, new network, Cloudflare says Rwanda.
  await api().post('/auth/login').set('X-Forwarded-For', phone).set('CF-IPCountry', 'RW')
    .send({ email, password: 'password123' }).expect(200);
  // Another account from the first address.
  const other = await register({}, home).expect(201);
  // ip writes are fire-and-forget; give them a moment.
  await new Promise((r) => setTimeout(r, 150));

  await api().get(`/admin/users/${person.body.user.id}/network`)
    .set('Authorization', `Bearer ${person.body.token}`).expect(403);
  const net = await api().get(`/admin/users/${person.body.user.id}/network`)
    .set('Authorization', `Bearer ${admin.token}`).expect(200);
  assert.equal(net.body.addresses.length, 2);
  assert.equal(net.body.current.ip, phone);
  assert.equal(net.body.current.country, 'RW');
  assert.equal(net.body.current.last_source, 'login');
  const first = net.body.addresses.find((a) => a.ip === home);
  assert.equal(first.first_source, 'signup');
  assert.equal(first.other_accounts, 1);
  assert.ok(net.body.related_accounts.some((u) => u.id === other.body.user.id));
  assert.equal(net.body.screenings[0].decision, 'allowed');

  const list = await api().get(`/admin/users?q=${encodeURIComponent(email)}`)
    .set('Authorization', `Bearer ${admin.token}`).expect(200);
  assert.equal(list.body[0].last_ip, phone);
  assert.equal(list.body[0].last_country, 'RW');

  const audit = await pool.query(
    "SELECT 1 FROM admin_audit_log WHERE action = 'user.network_viewed' AND target_id = $1", [person.body.user.id]
  );
  assert.equal(audit.rowCount, 1);
});

test('the team holds, releases and erases; an account with no history is removed completely', async () => {
  const admin = await adminToken();
  const as = { Authorization: `Bearer ${admin.token}` };
  const email = unique('suspect');
  const suspect = await register({ email }).expect(201);
  const id = suspect.body.user.id;

  // Not erasable while it is an ordinary account.
  const refused = await api().post(`/admin/users/${id}/erase`).set(as).send({ confirm_email: email }).expect(409);
  assert.equal(refused.body.code, 'NOT_A_TEST_ACCOUNT');

  await api().patch(`/admin/users/${id}/hold`).set(as).send({ action: 'hold', reason: 'odd sign-up' }).expect(200);
  await api().get('/notifications').set('Authorization', `Bearer ${suspect.body.token}`).expect(403);
  const held = await api().get('/admin/users?held=1').set(as).expect(200);
  assert.ok(held.body.some((u) => u.id === id));

  await api().patch(`/admin/users/${id}/hold`).set(as).send({ action: 'release' }).expect(200);
  await api().get('/notifications').set('Authorization', `Bearer ${suspect.body.token}`).expect(200);

  await api().patch(`/admin/users/${id}/hold`).set(as).send({ action: 'hold' }).expect(200);
  const done = await api().post(`/admin/users/${id}/erase`).set(as).send({ confirm_email: email }).expect(200);
  assert.equal(done.body.removed, 'completely');
  assert.equal((await pool.query('SELECT 1 FROM users WHERE id = $1', [id])).rowCount, 0);
  assert.equal((await pool.query('SELECT 1 FROM user_ip_addresses WHERE user_id = $1', [id])).rowCount, 0);
  const audit = await pool.query(
    "SELECT metadata FROM admin_audit_log WHERE action = 'account.erased_suspected_bot' AND target_id = $1", [id]
  );
  assert.equal(audit.rows[0].metadata.removed, 'completely');
  assert.doesNotMatch(JSON.stringify(audit.rows[0]), new RegExp(email.split('@')[0]));
});

test('erasing every held bot at once, only when the count still matches', async () => {
  const admin = await adminToken();
  const as = { Authorization: `Bearer ${admin.token}` };
  const bot = await register({ name: 'Alejandro Clark', email: `alejandroclark.${digits()}@test.local` }).expect(201);
  // A held account that wrote to someone is not swept up with the bots.
  const talker = await register({ name: 'Lewis Grant', email: `lewisgrant.${digits()}@test.local` }).expect(201);
  const sellerRes = await register({ role: 'seller' }).expect(201);
  const { rows: [conv] } = await pool.query(
    'INSERT INTO conversations (buyer_id, seller_id) VALUES ($1, $2) RETURNING id',
    [talker.body.user.id, sellerRes.body.user.id]
  );
  await pool.query(
    "INSERT INTO messages (conversation_id, sender_id, text) VALUES ($1, $2, 'Is it still for sale?')",
    [conv.id, talker.body.user.id]
  );

  const list = await api().get('/admin/suspected-bots').set(as).expect(200);
  assert.ok(list.body.accounts.some((u) => u.id === bot.body.user.id));
  assert.ok(!list.body.accounts.some((u) => u.id === talker.body.user.id));

  const stale = await api().post('/admin/suspected-bots/erase').set(as).send({ confirm_count: list.body.count + 1 }).expect(409);
  assert.equal(stale.body.code, 'BOT_LIST_CHANGED');

  const erased = await api().post('/admin/suspected-bots/erase').set(as).send({ confirm_count: list.body.count }).expect(200);
  assert.equal(erased.body.erased, list.body.count);
  assert.equal((await pool.query('SELECT 1 FROM users WHERE id = $1', [bot.body.user.id])).rowCount, 0);
  assert.equal((await pool.query('SELECT 1 FROM users WHERE id = $1', [talker.body.user.id])).rowCount, 1);
});

test('rows left by earlier erases are removed when nothing needs them', async () => {
  const admin = await adminToken();
  const old = await register({}).expect(201);
  // What an erase used to leave: an anonymised test account row.
  await pool.query(
    `UPDATE users SET is_test = TRUE, name = 'Deleted user', email = 'deleted+' || id || '@deleted.sawacars.com',
            deleted_at = NOW() WHERE id = $1`,
    [old.body.user.id]
  );
  const hidden = await api().get('/admin/users?test=1').set('Authorization', `Bearer ${admin.token}`).expect(200);
  assert.ok(!hidden.body.some((u) => u.id === old.body.user.id), 'erased rows are not listed');

  const res = await api().post('/admin/users/purge-erased').set('Authorization', `Bearer ${admin.token}`).expect(200);
  assert.ok(res.body.removed >= 1);
  assert.equal((await pool.query('SELECT 1 FROM users WHERE id = $1', [old.body.user.id])).rowCount, 0);
});

test.after(async () => { await pool.end(); });
