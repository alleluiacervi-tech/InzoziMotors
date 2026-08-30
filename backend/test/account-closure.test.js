// ─────────────────────────────────────────────────────────────────────────────
// Account closure.
//
// The old flow was one irreversible transaction: correct, compliant, and it
// recorded nothing about why anybody left. The new one closes immediately,
// keeps the row for thirty days, and erases it after.
//
// Three properties carry the whole design and each has a test:
//
//   1. Closing needs NOBODY's approval. Guideline 5.1.1(v) requires deletion to
//      complete inside the app, so the closure must be done the moment the
//      request returns — sessions dead, listings down, contact off.
//   2. The window is real. Signing in during it must offer a way back, and
//      reopening must actually restore the account.
//   3. Nothing erases early, and an operator cannot make it. The purge picks
//      its own subjects by predicate.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { RECOVERY_DAYS, CLOSURE_REASONS } = require('../src/lib/account-closure');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const PASSWORD = 'password123';

async function person(role = 'buyer') {
  const email = unique('closer');
  const reg = await api().post('/auth/register')
    .send({ name: 'Leaving Person', email, password: PASSWORD, role }).expect(201);
  const login = await api().post('/auth/login').send({ email, password: PASSWORD }).expect(200);
  return { id: reg.body.user.id, email, token: login.body.token };
}

async function admin() {
  const user = await person();
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const login = await api().post('/auth/login').send({ email: user.email, password: PASSWORD }).expect(200);
  return login.body.token;
}

test.after(async () => { await pool.end(); });

test('a reason is required, and only one from the fixed list', async () => {
  const user = await person();
  const missing = await api().delete('/auth/me')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ password: PASSWORD }).expect(400);
  assert.equal(missing.body.code, 'CLOSURE_REASON_REQUIRED');
  // The list travels with the refusal, so a client that got here without one
  // can render the options rather than guess them.
  assert.ok(Array.isArray(missing.body.reasons) && missing.body.reasons.length >= 5);

  await api().delete('/auth/me')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ password: PASSWORD, reason: 'because i said so' }).expect(400);

  // And nothing happened to the account on either refusal.
  const { rows } = await pool.query('SELECT account_status FROM users WHERE id=$1', [user.id]);
  assert.equal(rows[0].account_status, 'active');
});

test('the wrong password closes nothing', async () => {
  const user = await person();
  await api().delete('/auth/me')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ password: 'not-the-password', reason: 'other' }).expect(401);
  const { rows } = await pool.query('SELECT account_status FROM users WHERE id=$1', [user.id]);
  assert.equal(rows[0].account_status, 'active');
});

test('closing completes immediately — no approval, no queue', async () => {
  const user = await person();
  const res = await api().delete('/auth/me')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ password: PASSWORD, reason: 'found_a_car', note: 'Bought a RAV4, thanks' }).expect(200);

  assert.equal(res.body.success, true);
  assert.equal(res.body.recovery_days, RECOVERY_DAYS);
  // The date the person can come back by. Without it in the response there is
  // nothing for the confirmation screen to show, and the window may as well
  // not exist.
  assert.ok(res.body.reopen_until, 'the response must say when the window closes');

  const { rows } = await pool.query(
    'SELECT account_status, closed_at, purge_after, closure_reason, closure_note, phone_visible, whatsapp_visible FROM users WHERE id=$1',
    [user.id]
  );
  assert.equal(rows[0].account_status, 'closed');
  assert.ok(rows[0].closed_at, 'closed the moment the request returned');
  assert.equal(rows[0].closure_reason, 'found_a_car');
  assert.equal(rows[0].closure_note, 'Bought a RAV4, thanks');
  // Contact stops being disclosable now, not in thirty days.
  assert.equal(rows[0].phone_visible, false);
  assert.equal(rows[0].whatsapp_visible, false);

  // Roughly thirty days out. Loose bounds: this asserts the window exists and
  // is about the right size, not the exact millisecond.
  const days = (new Date(rows[0].purge_after) - new Date(rows[0].closed_at)) / 86400000;
  assert.ok(days > RECOVERY_DAYS - 1 && days < RECOVERY_DAYS + 1, `window was ${days} days`);
});

test('the session dies on the next request, from any device', async () => {
  const user = await person();
  // A second device, signed in before the closure and never told about it.
  const other = await api().post('/auth/login').send({ email: user.email, password: PASSWORD }).expect(200);

  await api().delete('/auth/me')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ password: PASSWORD, reason: 'privacy' }).expect(200);

  // verifyLiveSession runs on every request, so this needs no logout anywhere.
  const res = await api().get('/auth/me').set('Authorization', `Bearer ${other.body.token}`).expect(401);
  assert.equal(res.body.code, 'SESSION_REVOKED');
});

test('signing in during the window offers the way back, and reopening works', async () => {
  const user = await person();
  await api().delete('/auth/me')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ password: PASSWORD, reason: 'too_many_messages' }).expect(200);

  // Not "invalid email or password" — the whole point of the window is that
  // somebody holding the right credentials is told there is a way back.
  const blocked = await api().post('/auth/login')
    .send({ email: user.email, password: PASSWORD }).expect(403);
  assert.equal(blocked.body.code, 'ACCOUNT_CLOSED');
  assert.ok(blocked.body.reopen_until);

  // A WRONG password on a closed account must not reveal that it is closed.
  const wrong = await api().post('/auth/login')
    .send({ email: user.email, password: 'nope-nope-nope' }).expect(401);
  assert.equal(wrong.body.code, undefined);
  assert.match(wrong.body.error, /Invalid email or password/);

  const reopened = await api().post('/auth/reopen')
    .send({ email: user.email, password: PASSWORD }).expect(200);
  assert.ok(reopened.body.token);

  const { rows } = await pool.query(
    'SELECT account_status, closed_at, purge_after, closure_reason FROM users WHERE id=$1', [user.id]
  );
  assert.equal(rows[0].account_status, 'active');
  assert.equal(rows[0].closed_at, null);
  assert.equal(rows[0].purge_after, null);
  assert.equal(rows[0].closure_reason, null);

  // And the fresh token really works.
  await api().get('/auth/me').set('Authorization', `Bearer ${reopened.body.token}`).expect(200);
});

test('reopen tells an attacker nothing about which accounts are closed', async () => {
  const open = await person();
  // Correct password, but the account was never closed.
  const notClosed = await api().post('/auth/reopen')
    .send({ email: open.email, password: PASSWORD }).expect(401);
  assert.match(notClosed.body.error, /Invalid email or password/);

  // An address that does not exist at all answers identically.
  const nobody = await api().post('/auth/reopen')
    .send({ email: unique('ghost'), password: PASSWORD }).expect(401);
  assert.deepEqual(nobody.body, notClosed.body);
});

test('nothing is erased before its time, and an operator cannot bring it forward', async () => {
  const user = await person();
  await api().delete('/auth/me')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ password: PASSWORD, reason: 'not_useful' }).expect(200);

  const token = await admin();
  const before = await api().get('/admin/account-closures')
    .set('Authorization', `Bearer ${token}`).expect(200);
  const mine = before.body.closures.find((row) => row.id === user.id);
  assert.ok(mine, 'the closure must be visible to an operator');
  assert.equal(mine.due_for_purge, false);
  assert.equal(mine.closure_reason, 'not_useful');
  // Visibility, not control: there is no route that erases a chosen account.
  assert.match(mine.reason_label, /didn.t find/i);

  // Purging now must skip it — the predicate decides, not the operator.
  const swept = await api().post('/admin/account-closures/purge')
    .set('Authorization', `Bearer ${token}`).expect(200);
  const { rows } = await pool.query('SELECT deleted_at, email FROM users WHERE id=$1', [user.id]);
  assert.equal(rows[0].deleted_at, null, `purge erased an account inside its window (swept ${swept.body.purged})`);
  assert.equal(rows[0].email, user.email);
});

test('once the window has passed, the purge erases everything it always did', async () => {
  const user = await person('seller');
  await api().delete('/auth/me')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ password: PASSWORD, reason: 'bad_experience', note: 'a note that must not survive' }).expect(200);

  // Fast-forward rather than wait thirty days.
  await pool.query("UPDATE users SET purge_after = NOW() - INTERVAL '1 day' WHERE id=$1", [user.id]);

  const token = await admin();
  const swept = await api().post('/admin/account-closures/purge')
    .set('Authorization', `Bearer ${token}`).expect(200);
  assert.ok(swept.body.purged >= 1);

  const { rows } = await pool.query(
    'SELECT name, email, phone, password_hash, deleted_at, closure_reason, closure_note FROM users WHERE id=$1',
    [user.id]
  );
  assert.equal(rows[0].name, 'Deleted user');
  assert.match(rows[0].email, /^deleted\+/);
  assert.equal(rows[0].password_hash, null);
  assert.ok(rows[0].deleted_at);
  // The free-text note is personal and goes.
  assert.equal(rows[0].closure_note, null);
  // The reason is not personal, and it is the only thing that makes "why did
  // people leave" answerable after the fact. It stays on purpose.
  assert.equal(rows[0].closure_reason, 'bad_experience');

  // And now the way back really is gone.
  const gone = await api().post('/auth/reopen')
    .send({ email: user.email, password: PASSWORD }).expect(401);
  assert.match(gone.body.error, /Invalid email or password/);
});

test('closing takes a seller off the marketplace without destroying their listings', async () => {
  // Coming back has to mean something. Archiving on closure would make a
  // reopened seller's shopfront unrecoverable, which turns a thirty-day window
  // into a thirty-day tease.
  const seller = await person('seller');
  await pool.query(
    `INSERT INTO cars (seller_id, title, make, model, year, mileage, price, currency, status)
     VALUES ($1, 'Toyota RAV4 2019', 'Toyota', 'RAV4', 2019, 80000, 25000000, 'RWF', 'live')`,
    [seller.id]
  );

  await api().delete('/auth/me')
    .set('Authorization', `Bearer ${seller.token}`)
    .send({ password: PASSWORD, reason: 'sold_my_car' }).expect(200);

  const down = await pool.query('SELECT status FROM cars WHERE seller_id=$1', [seller.id]);
  assert.equal(down.rows[0].status, 'under_review', 'off the marketplace, but recoverable');

  await api().post('/auth/reopen').send({ email: seller.email, password: PASSWORD }).expect(200);
  const after = await pool.query('SELECT status FROM cars WHERE seller_id=$1', [seller.id]);
  // Still under review: coming back does not republish anything without a
  // person looking at it.
  assert.equal(after.rows[0].status, 'under_review');
});

test('the reason vocabulary the app renders is the one the database accepts', async () => {
  const res = await api().get('/auth/closure-reasons').expect(200);
  assert.deepEqual(
    res.body.reasons.map((r) => r.value).sort(),
    CLOSURE_REASONS.map((r) => r.value).sort()
  );
  assert.equal(res.body.recovery_days, RECOVERY_DAYS);

  // Every published value must satisfy the CHECK, or the app offers an option
  // that 400s when somebody picks it.
  for (const reason of res.body.reasons) {
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, account_status,
                          closed_at, closure_reason, purge_after)
       VALUES ('Vocab', $1, 'x', 'buyer', 'closed', NOW(), $2, NOW() + INTERVAL '30 days')`,
      [unique('vocab'), reason.value]
    );
  }
});

test('an operator cannot suspend or restore a closed account', async () => {
  // The trap: restoring would set account_status='active' while closed_at and
  // purge_after stayed set, so the person would appear to have their account
  // back and be silently erased on the next sweep. Reopening is theirs to do.
  const user = await person();
  await api().delete('/auth/me')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ password: PASSWORD, reason: 'duplicate_account' }).expect(200);

  const token = await admin();
  for (const action of ['restore', 'suspend']) {
    const res = await api().patch(`/admin/users/${user.id}/access`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action, reason: 'testing' }).expect(409);
    assert.equal(res.body.code, 'ACCOUNT_CLOSED');
  }

  const { rows } = await pool.query(
    'SELECT account_status, closed_at, purge_after FROM users WHERE id=$1', [user.id]
  );
  assert.equal(rows[0].account_status, 'closed');
  assert.ok(rows[0].closed_at && rows[0].purge_after, 'the closure must be intact');
});

test('the whole admin side is admin-only', async () => {
  const user = await person();
  await api().get('/admin/account-closures')
    .set('Authorization', `Bearer ${user.token}`).expect(403);
  await api().post('/admin/account-closures/purge')
    .set('Authorization', `Bearer ${user.token}`).expect(403);
});
