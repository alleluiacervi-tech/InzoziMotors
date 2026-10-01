// ─────────────────────────────────────────────────────────────────────────────
// Socket auth (docs/WEB-PARITY-PLAN.md D2, fixes B3).
//
// Two things this pins down:
// 1. POST /auth/socket-ticket only mints a ticket for a live session (it sits
//    behind requireAuth), the ticket carries the current token version, and it
//    expires in ~60s — it is not just a second copy of the session token.
// 2. The socket handshake itself now re-checks the live session for BOTH the
//    app's long-lived token and the website's ticket, so a suspended or
//    deleted account can no longer hold a realtime connection open past its
//    next handshake attempt.
//
// The second part needs a real listening server and a real socket client —
// supertest alone can't drive a socket.io handshake.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { io: ioClient } = require('socket.io-client');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app, server } = require('../server');
const pool = require('../src/db');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function register(overrides = {}) {
  const body = { name: 'Test User', email: unique('sock'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}

async function makeAdmin(user) {
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}

let baseUrl;
test.before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  await pool.end();
  await new Promise((resolve) => server.close(resolve));
});

function connect(auth) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, { auth, transports: ['websocket'], reconnection: false, forceNew: true, timeout: 3000 });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => { socket.close(); reject(err); });
  });
}

test('socket-ticket requires a live session and cannot be minted by a stranger', async () => {
  await api().post('/auth/socket-ticket').expect(401);
  await api().post('/auth/socket-ticket').set('Authorization', 'Bearer not.a.token').expect(401);
});

test('socket-ticket carries the current token version and a ~60s expiry', async () => {
  const user = await register();
  const res = await api().post('/auth/socket-ticket').set('Authorization', `Bearer ${user.token}`).expect(200);
  assert.ok(res.body.ticket);
  const decoded = jwt.verify(res.body.ticket, process.env.JWT_SECRET);
  assert.equal(decoded.id, user.id);
  assert.equal(decoded.purpose, 'socket');
  assert.equal(decoded.tv, 0);
  const ttl = decoded.exp - decoded.iat;
  assert.ok(ttl <= 60 && ttl > 0, `expected a short-lived ticket, got ${ttl}s`);
});

test('a socket ticket cannot be minted for a suspended account', async () => {
  const admin = await makeAdmin(await register());
  const target = await register();
  await api().patch(`/admin/users/${target.id}/access`).set('Authorization', `Bearer ${admin}`)
    .send({ action: 'suspend', reason: 'socket ticket test' }).expect(200);
  await api().post('/auth/socket-ticket').set('Authorization', `Bearer ${target.token}`).expect(401);
});

test('the app token and the web ticket can both open a socket', async () => {
  const user = await register();
  const viaToken = await connect({ token: user.token });
  viaToken.close();

  const ticketRes = await api().post('/auth/socket-ticket').set('Authorization', `Bearer ${user.token}`).expect(200);
  const viaTicket = await connect({ ticket: ticketRes.body.ticket });
  viaTicket.close();
});

test('a suspended account cannot open a socket, even with a token minted before suspension', async () => {
  const admin = await makeAdmin(await register());
  const target = await register();
  await api().patch(`/admin/users/${target.id}/access`).set('Authorization', `Bearer ${admin}`)
    .send({ action: 'suspend', reason: 'socket handshake test' }).expect(200);
  await assert.rejects(() => connect({ token: target.token }));
});

test('a deleted account cannot open a socket', async () => {
  const target = await register();
  await api().delete('/auth/me').set('Authorization', `Bearer ${target.token}`)
    .send({ reason: 'not_useful', password: target.password }).expect(200);
  await assert.rejects(() => connect({ token: target.token }));
});

test('a forged or garbage credential is rejected on both fields', async () => {
  await assert.rejects(() => connect({ token: 'not.a.jwt' }));
  await assert.rejects(() => connect({ ticket: 'not.a.jwt' }));
  await assert.rejects(() => connect({}));
});

test('a ticket opens the socket and nothing else', async () => {
  const user = await register();
  const { body: { ticket } } = await api().post('/auth/socket-ticket')
    .set('Authorization', `Bearer ${user.token}`).expect(200);
  // Not a session on any route — including the one that mints tickets, so it
  // cannot renew itself.
  await api().get('/auth/me').set('Authorization', `Bearer ${ticket}`).expect(401);
  await api().post('/auth/socket-ticket').set('Authorization', `Bearer ${ticket}`).expect(401);
  // Each handshake field takes only its own kind.
  await assert.rejects(() => connect({ token: ticket }));
  await assert.rejects(() => connect({ ticket: user.token }));
});

test('an admin session is refused once it is older than the admin lifetime', async () => {
  const admin = await register();
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
  const old = jwt.sign(
    { id: admin.id, role: 'admin', tv: 0, iat: Math.floor(Date.now() / 1000) - 13 * 3600 },
    process.env.JWT_SECRET, { expiresIn: '30d' }
  );
  await api().get('/auth/me').set('Authorization', `Bearer ${old}`).expect(401);
});
