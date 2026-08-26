// ─────────────────────────────────────────────────────────────────────────────
// Admin-created accounts.
//
// The team creates an account, the person sets their own password through a
// one-use link. Nothing here emails a password, and nothing here grants a
// verification the account has not earned — that second point is the one worth
// testing hardest, because id_verified='approved' is a seller-eligibility gate
// and granting it from a dashboard button would hollow out the whole promise.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function register(name = 'Person') {
  const email = unique('acct');
  const password = 'password123';
  const r = await api().post('/auth/register')
    .send({ name, email, password, role: 'buyer' }).expect(201);
  return { id: r.body.user.id, email, password, token: r.body.token };
}
async function admin() {
  const u = await register('Operator');
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [u.id]);
  const r = await api().post('/auth/login')
    .send({ email: u.email, password: u.password }).expect(200);
  return { ...u, token: r.body.token };
}
/** The plaintext token is only ever mailed, so a test has to read the hash
 *  back out and re-derive nothing — instead we look the row up by email and
 *  mint a known token by rewriting the hash. That mirrors what the mail link
 *  carries without depending on the mailer being configured. */
async function inviteTokenFor(email) {
  const token = require('crypto').randomBytes(32).toString('base64url');
  const hash = require('crypto').createHash('sha256').update(token).digest('hex');
  await pool.query('UPDATE users SET invite_token_hash=$1 WHERE email=$2', [hash, email]);
  return token;
}

test.after(async () => { await pool.end(); });

test('an admin can create all three kinds of account, and none can be used before activation', async () => {
  const operator = await admin();
  const auth = { Authorization: `Bearer ${operator.token}` };

  const kinds = [
    { account_type: 'buyer', expect: { role: 'buyer', seller_type: null, id_verified: 'none', business_verified: false } },
    { account_type: 'individual_seller', expect: { role: 'seller', seller_type: 'individual', id_verified: 'none', business_verified: false } },
    { account_type: 'showroom', expect: { role: 'seller', seller_type: 'showroom', id_verified: 'approved', business_verified: true } },
  ];

  for (const kind of kinds) {
    const email = unique(kind.account_type);
    const made = await api().post('/admin/accounts').set(auth)
      .send({ account_type: kind.account_type, name: 'New Person', email, business_name: 'Trusted Motors', phone: '+250788000111' })
      .expect(201);

    for (const [field, value] of Object.entries(kind.expect)) {
      assert.equal(made.body[field], value, `${kind.account_type}.${field}`);
    }

    // The account exists but is unusable: password_hash NULL is what login
    // actually refuses on, so this is the real lock, not must_change_password.
    const { rows } = await pool.query(
      'SELECT password_hash, admin_created, must_change_password, invite_expires_at FROM users WHERE id=$1',
      [made.body.id]
    );
    assert.equal(rows[0].password_hash, null, `${kind.account_type} should have no password yet`);
    assert.equal(rows[0].admin_created, true);
    assert.equal(rows[0].must_change_password, true);
    assert.ok(rows[0].invite_expires_at, 'invite must expire');

    await api().post('/auth/login').send({ email, password: 'password123' }).expect(401);
  }
});

test('an invited buyer is never granted a verification it has not earned', async () => {
  const operator = await admin();
  const email = unique('unverified');
  const made = await api().post('/admin/accounts')
    .set('Authorization', `Bearer ${operator.token}`)
    .send({ account_type: 'buyer', name: 'Walk In', email })
    .expect(201);

  // This is the invariant: creating an account must not be a back door around
  // the ID check that gates seller eligibility and contact disclosure.
  assert.notEqual(made.body.id_verified, 'approved');
  assert.equal(made.body.business_verified, false);

  const seller = unique('indiv');
  const asSeller = await api().post('/admin/accounts')
    .set('Authorization', `Bearer ${operator.token}`)
    .send({ account_type: 'individual_seller', name: 'Solo Seller', email: seller })
    .expect(201);
  assert.notEqual(asSeller.body.id_verified, 'approved');
  assert.equal(asSeller.body.business_verified, false);
});

test('the invite link activates once, then never again', async () => {
  const operator = await admin();
  const email = unique('activate');
  await api().post('/admin/accounts').set('Authorization', `Bearer ${operator.token}`)
    .send({ account_type: 'buyer', name: 'Claimant', email }).expect(201);

  const token = await inviteTokenFor(email);
  const activated = await api().post('/auth/accept-invite')
    .send({ token, password: 'chosen-password-1' }).expect(200);
  assert.equal(activated.body.user.email, email);
  assert.ok(activated.body.token, 'activation should sign the person in');

  // The password they chose works; the invite does not work twice.
  await api().post('/auth/login').send({ email, password: 'chosen-password-1' }).expect(200);
  await api().post('/auth/accept-invite').send({ token, password: 'another-password' }).expect(410);

  const { rows } = await pool.query(
    'SELECT must_change_password, invite_token_hash FROM users WHERE email=$1', [email]
  );
  assert.equal(rows[0].must_change_password, false);
  assert.equal(rows[0].invite_token_hash, null);
});

test('an expired invite is refused', async () => {
  const operator = await admin();
  const email = unique('expired');
  await api().post('/admin/accounts').set('Authorization', `Bearer ${operator.token}`)
    .send({ account_type: 'buyer', name: 'Too Late', email }).expect(201);

  const token = await inviteTokenFor(email);
  await pool.query("UPDATE users SET invite_expires_at = NOW() - INTERVAL '1 hour' WHERE email=$1", [email]);
  await api().post('/auth/accept-invite').send({ token, password: 'chosen-password-1' }).expect(410);
});

test('a self-registered account cannot be claimed with an invite token', async () => {
  // admin_created stays in the predicate on purpose: without it, a guessed or
  // leaked token could take over an ordinary user's account.
  const victim = await register('Self Registered');
  const token = await inviteTokenFor(victim.email);
  await pool.query("UPDATE users SET invite_expires_at = NOW() + INTERVAL '1 hour' WHERE email=$1", [victim.email]);
  await api().post('/auth/accept-invite').send({ token, password: 'attacker-password' }).expect(410);

  // Their original password still works.
  await api().post('/auth/login').send({ email: victim.email, password: victim.password }).expect(200);
});

test('account creation validates its inputs and its caller', async () => {
  const operator = await admin();
  const auth = { Authorization: `Bearer ${operator.token}` };

  await api().post('/admin/accounts').set(auth)
    .send({ account_type: 'wizard', name: 'X', email: unique('bad') }).expect(400);
  await api().post('/admin/accounts').set(auth)
    .send({ account_type: 'buyer', name: 'X', email: 'not-an-email' }).expect(400);
  // A showroom is the one kind that needs its business name.
  await api().post('/admin/accounts').set(auth)
    .send({ account_type: 'showroom', name: 'X', email: unique('nobiz') }).expect(400);

  const taken = unique('dupe');
  await api().post('/admin/accounts').set(auth)
    .send({ account_type: 'buyer', name: 'First', email: taken }).expect(201);
  await api().post('/admin/accounts').set(auth)
    .send({ account_type: 'buyer', name: 'Second', email: taken }).expect(409);

  const outsider = await register();
  await api().post('/admin/accounts').set('Authorization', `Bearer ${outsider.token}`)
    .send({ account_type: 'buyer', name: 'X', email: unique('forbidden') }).expect(403);
  await api().post('/admin/accounts')
    .send({ account_type: 'buyer', name: 'X', email: unique('anon') }).expect(401);
});

test('the original showroom route and activation path still work', async () => {
  // Invite links already sitting in inboxes point at the old activation path,
  // and imports.test.js pins the old creation route's response shape.
  const operator = await admin();
  const email = unique('legacy');
  const made = await api().post('/admin/showrooms')
    .set('Authorization', `Bearer ${operator.token}`)
    .send({ name: 'Contact', business_name: 'Legacy Motors', email })
    .expect(201);
  assert.equal(made.body.seller_type, 'showroom');
  assert.equal(made.body.id_verified, 'approved');

  const token = await inviteTokenFor(email);
  await api().post('/auth/accept-showroom-invite')
    .send({ token, password: 'chosen-password-1' }).expect(200);
  await api().post('/auth/login').send({ email, password: 'chosen-password-1' }).expect(200);
});

test('the dashboard can tell whether email is actually configured', async () => {
  // Every sender is fire-and-forget so a mail outage cannot break a signup.
  // The cost is that an UNCONFIGURED server looks exactly like a working one —
  // production ran sending nothing at all, and no screen said so.
  const operator = await admin();
  const auth = { Authorization: `Bearer ${operator.token}` };

  const status = await api().get('/admin/mail-status').set(auth).expect(200);
  assert.equal(typeof status.body.configured, 'boolean');
  assert.ok(status.body.from.includes('@'), 'the visible From header is reportable');
  assert.ok(status.body.detail.length > 10, 'it must say what to do, not just that something is wrong');
  // No credential may cross this boundary, whatever the environment holds.
  const serialised = JSON.stringify(status.body);
  assert.doesNotMatch(serialised, /re_[A-Za-z0-9]/, 'a Resend key must never be returned');
  assert.equal(serialised.includes(process.env.SMTP_PASS || ' never '), false);

  const outsider = await register();
  await api().get('/admin/mail-status').set('Authorization', `Bearer ${outsider.token}`).expect(403);
  await api().get('/admin/mail-status').expect(401);
});

test('a failed invitation hands the admin the link instead of a dead end', async () => {
  // Mail is unconfigured under test, so this is the real failure path: the
  // account exists, cannot be logged into, and its one-use token lived only in
  // an email nobody received.
  const operator = await admin();
  const email = unique('undeliverable');
  const made = await api().post('/admin/accounts')
    .set('Authorization', `Bearer ${operator.token}`)
    .send({ account_type: 'buyer', name: 'No Mail', email })
    .expect(201);

  assert.equal(made.body.invitation_sent, false);
  assert.ok(made.body.activation_url, 'a failed send must return the link');
  assert.match(made.body.activation_url, /\/activate\?token=/);

  // And the link actually works — it is the same token the email would carry.
  const token = decodeURIComponent(made.body.activation_url.split('token=')[1]);
  const activated = await api().post('/auth/accept-invite')
    .send({ token, password: 'chosen-password-1' }).expect(200);
  assert.equal(activated.body.user.email, email);
  await api().post('/auth/login').send({ email, password: 'chosen-password-1' }).expect(200);
});
