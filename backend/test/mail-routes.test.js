const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────────────────────────────────────
// Route-level guarantees for the admin inbox.
//
// The live IMAP/SMTP conversation cannot be exercised here — CI has no route to
// imap.hostinger.com, and pointing these tests at the real mailbox would make
// the build depend on a third party and on a password. What IS tested here is
// everything that does not need the mail host:
//
//   • no buyer or seller can reach any /mail route
//   • an unconfigured mailbox is 503 MAIL_NOT_CONFIGURED, never a 500 and never
//     an empty list — the UI must be able to tell "not set up" from "no mail"
//   • malformed message ids and flags are rejected before any connection opens
//
// The connection, parsing and reply paths are verified against the real mailbox
// on the VPS after deploy; see docs/ADMIN-INBOX.md.
// ─────────────────────────────────────────────────────────────────────────────

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_mail_routes';

// Cleared BEFORE the app is required so no connection is ever attempted.
const savedUser = process.env.MAIL_USER;
const savedPass = process.env.MAIL_PASS;
delete process.env.MAIL_USER;
delete process.env.MAIL_PASS;

const { app } = require('../server');
const pool = require('../src/db');

const api = () => request(app);
const token = (role, id) =>
  jwt.sign({ id, role, email: `${role}@test.local` }, process.env.JWT_SECRET, { expiresIn: '1h' });

const ADMIN_ID = '4a000000-0000-4000-8000-0000000000a1';
const BUYER_ID = '4a000000-0000-4000-8000-0000000000b2';

before(async () => {
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role) VALUES
       ($1,'Mail Admin','mailadmin@test.local','x','admin'),
       ($2,'Mail Buyer','mailbuyer@test.local','x','buyer')
     ON CONFLICT (id) DO NOTHING`,
    [ADMIN_ID, BUYER_ID]
  );
});

after(async () => {
  if (savedUser !== undefined) process.env.MAIL_USER = savedUser;
  if (savedPass !== undefined) process.env.MAIL_PASS = savedPass;
});

const ADMIN_ROUTES = [
  ['get', '/mail/messages'],
  ['get', '/mail/folders'],
  ['get', '/mail/unread'],
  ['get', '/mail/messages/12'],
  ['get', '/mail/messages/12/attachments/0'],
  ['patch', '/mail/messages/12/flags'],
  ['post', '/mail/messages/12/reply'],
];

test('the mailbox is invisible without a session', async () => {
  for (const [method, path] of ADMIN_ROUTES) {
    const res = await api()[method](path);
    assert.equal(res.status, 401, `${method.toUpperCase()} ${path} allowed an anonymous caller`);
  }
});

test('buyers cannot reach any mail route', async () => {
  const auth = { Authorization: `Bearer ${token('buyer', BUYER_ID)}` };
  for (const [method, path] of ADMIN_ROUTES) {
    const res = await api()[method](path).set(auth);
    assert.equal(res.status, 403, `${method.toUpperCase()} ${path} leaked to a buyer`);
  }
});

test('sellers cannot reach any mail route either', async () => {
  // A seller is the closest thing to a privileged non-admin, so it is worth
  // asserting separately rather than assuming the buyer case covers it.
  const auth = { Authorization: `Bearer ${token('seller', BUYER_ID)}` };
  for (const [method, path] of ADMIN_ROUTES) {
    const res = await api()[method](path).set(auth);
    assert.equal(res.status, 403, `${method.toUpperCase()} ${path} leaked to a seller`);
  }
});

test('an unconfigured mailbox is a named 503, not an empty inbox', async () => {
  const auth = { Authorization: `Bearer ${token('admin', ADMIN_ID)}` };
  const res = await api().get('/mail/messages').set(auth);
  assert.equal(res.status, 503);
  assert.equal(res.body.code, 'MAIL_NOT_CONFIGURED');
  // The bug this guards against: returning 200 with [] would make "the mailbox
  // is not set up" indistinguishable from "nobody has written to us".
  assert.ok(!Array.isArray(res.body.messages), 'returned a message list anyway');
});

test('every mail route reports MAIL_NOT_CONFIGURED consistently', async () => {
  const auth = { Authorization: `Bearer ${token('admin', ADMIN_ID)}` };
  for (const [method, path] of ADMIN_ROUTES) {
    const res = await api()[method](path).set(auth).send({ flag: 'seen', value: true, text: 'hi' });
    assert.equal(res.status, 503, `${method.toUpperCase()} ${path} did not report 503`);
    assert.equal(res.body.code, 'MAIL_NOT_CONFIGURED');
  }
});

test('a malformed message id is rejected before any connection is attempted', async () => {
  // MAIL_USER is set for this test only, so reaching the mail layer would mean a
  // real connection attempt. A 400 proves validation happens first.
  process.env.MAIL_USER = 'contact@example.test';
  process.env.MAIL_PASS = 'not-a-real-password';
  try {
    const auth = { Authorization: `Bearer ${token('admin', ADMIN_ID)}` };
    for (const bad of ['abc', '0', '-1']) {
      const res = await api().get(`/mail/messages/${bad}`).set(auth);
      assert.equal(res.status, 400, `uid "${bad}" was not rejected`);
    }
    const badFlag = await api()
      .patch('/mail/messages/12/flags')
      .set(auth)
      .send({ flag: 'deleted', value: true });
    assert.equal(badFlag.status, 400, 'an unsupported flag was accepted');
    assert.match(badFlag.body.error, /seen or flagged/);
  } finally {
    delete process.env.MAIL_USER;
    delete process.env.MAIL_PASS;
  }
});
