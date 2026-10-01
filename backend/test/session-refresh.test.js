// POST /auth/refresh — renewing a live session.
//
// A renewal proves nothing new: it can only ever be asked for by a token that
// already passed requireAuth, so it must not become a way to widen or revive a
// session. Admin sessions keep their 12-hour limit, and a purpose-scoped token
// (the website's 60-second socket ticket) is not a session at all.
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function register() {
  const body = { name: 'Refresh User', email: unique('refresh'), password: 'password123', role: 'buyer' };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}

test.after(() => pool.end());

test('a refreshed token is a working session for the same account', async () => {
  const user = await register();
  const res = await api().post('/auth/refresh').set('Authorization', `Bearer ${user.token}`).expect(200);
  assert.ok(res.body.token);
  const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.equal(decoded.id, user.id);
  const me = await api().get('/auth/me').set('Authorization', `Bearer ${res.body.token}`).expect(200);
  assert.equal(me.body.id, user.id);
});

test('refresh needs a live session', async () => {
  await api().post('/auth/refresh').expect(401);
  await api().post('/auth/refresh').set('Authorization', 'Bearer not.a.token').expect(401);
});

test('a socket ticket cannot be exchanged for a session', async () => {
  const user = await register();
  const ticket = (await api().post('/auth/socket-ticket')
    .set('Authorization', `Bearer ${user.token}`).expect(200)).body.ticket;
  // Not a session, so it is not even authenticated: 401, exactly as for any
  // other token that is not a login (CLAUDE.md invariant 5).
  await api().post('/auth/refresh').set('Authorization', `Bearer ${ticket}`).expect(401);
});

test('an admin session is not renewable', async () => {
  const user = await register();
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  const login = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  await api().post('/auth/refresh').set('Authorization', `Bearer ${login.body.token}`).expect(403);
});

test('a refresh does not survive the account ending its sessions', async () => {
  const user = await register();
  await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [user.id]);
  await api().post('/auth/refresh').set('Authorization', `Bearer ${user.token}`).expect(401);
});
