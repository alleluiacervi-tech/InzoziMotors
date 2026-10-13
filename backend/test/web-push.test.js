// Web Push for sawacars.com (lib/web-push.js, /devices/web-push, migration 0059).
//
// What each test pins down:
//   - the endpoint allow-list, because the API POSTs to whatever URL a browser
//     sends and an unchecked one is a server-side request forgery;
//   - the payload carries ids only, never the rest of a notification's meta;
//   - off means off: no keys, no toggle, no sends, subscribe refused;
//   - a subscription follows the last account to turn it on, dead ones are
//     pruned, and closing the account removes them.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const webPush = require('../src/lib/web-push');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const PASSWORD = 'password123';

// A real key pair, generated for these tests only.
const KEYS = require('web-push').generateVAPIDKeys();
const P256DH = 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM';
const AUTH = 'tBHItJI5svbpez7KI4CCXg';

function subscription(n = Math.floor(Math.random() * 1e9)) {
  return { endpoint: `https://fcm.googleapis.com/fcm/send/test-${Date.now()}-${n}`, keys: { p256dh: P256DH, auth: AUTH } };
}

function enable() {
  process.env.VAPID_PUBLIC_KEY = KEYS.publicKey;
  process.env.VAPID_PRIVATE_KEY = KEYS.privateKey;
  process.env.VAPID_SUBJECT = 'mailto:contact@sawacars.com';
}

function disable() {
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_SUBJECT;
}

async function person() {
  const email = unique('webpush');
  const reg = await api().post('/auth/register')
    .send({ name: 'Browser Person', email, password: PASSWORD, role: 'buyer' }).expect(201);
  const login = await api().post('/auth/login').send({ email, password: PASSWORD }).expect(200);
  return { id: reg.body.user.id, token: login.body.token };
}

let sent;
before(() => {
  webPush._setSenderForTests(async (sub, payload) => {
    sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
    if (sub.endpoint.includes('gone')) throw Object.assign(new Error('Gone'), { statusCode: 410 });
    if (sub.endpoint.includes('broken')) throw Object.assign(new Error('Unauthorized'), { statusCode: 403 });
  });
});
beforeEach(() => { sent = []; disable(); });
after(async () => { disable(); await pool.end(); });

// ── pure checks ─────────────────────────────────────────────────────────────
test('endpoint allow-list: the browsers\' push services only, https, no port or credentials', () => {
  for (const ok of [
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/QK2x',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
  ]) assert.equal(webPush.allowedEndpoint(ok), true, ok);

  for (const bad of [
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://fcm.googleapis.com:8443/fcm/send/abc',
    'https://user:pw@fcm.googleapis.com/fcm/send/abc',
    'https://fcm.googleapis.com.evil.example/x',
    'https://evilfcm.googleapis.com.example/x',
    'https://notpush.apple.com.example/x',
    'https://169.254.169.254/latest/meta-data',
    'https://localhost/x',
    'https://db:5432/',
    `https://fcm.googleapis.com/${'a'.repeat(1100)}`,
    '',
    null,
  ]) assert.equal(webPush.allowedEndpoint(bad), false, String(bad).slice(0, 60));
});

test('subscription parsing refuses malformed keys', () => {
  assert.ok(webPush.parseSubscription(subscription()));
  assert.equal(webPush.parseSubscription({ ...subscription(), keys: { p256dh: 'not base64!', auth: AUTH } }), null);
  assert.equal(webPush.parseSubscription({ ...subscription(), keys: { p256dh: P256DH } }), null);
  assert.equal(webPush.parseSubscription({ endpoint: 'https://example.com/push', keys: { p256dh: P256DH, auth: AUTH } }), null);
});

test('payload carries the type and ids only, and a long body is cut short', () => {
  const payload = JSON.parse(webPush.buildPayload({
    title: 'New message',
    body: 'x'.repeat(2000),
    data: { type: 'new_message', conversationId: 'c1', amount: 1500000, sellerPhone: '+250788000000', carId: 42 },
  }));
  assert.deepEqual(payload.data, { type: 'new_message', conversationId: 'c1' });
  assert.equal(payload.tag, 'conversation:c1');
  assert.ok(payload.body.length <= 600);
});

// ── off by default ──────────────────────────────────────────────────────────
test('without VAPID keys: config says disabled, subscribing is refused, nothing is sent', async () => {
  const me = await person();
  const cfg = await api().get('/devices/web-push/config').expect(200);
  assert.deepEqual(cfg.body, { enabled: false });

  await api().post('/devices/web-push').set('Authorization', `Bearer ${me.token}`)
    .send({ subscription: subscription() }).expect(503);
  assert.equal(await webPush.sendWebPushToUsers([me.id], { title: 't', body: 'b' }), 0);
  assert.equal(sent.length, 0);
});

// ── on ──────────────────────────────────────────────────────────────────────
test('with keys: config exposes the public key only', async () => {
  enable();
  const cfg = await api().get('/devices/web-push/config').expect(200);
  assert.equal(cfg.body.enabled, true);
  assert.equal(cfg.body.publicKey, KEYS.publicKey);
  assert.ok(!JSON.stringify(cfg.body).includes(KEYS.privateKey));
});

test('subscribe needs a session and a push-service endpoint', async () => {
  enable();
  const me = await person();
  await api().post('/devices/web-push').send({ subscription: subscription() }).expect(401);
  await api().post('/devices/web-push').set('Authorization', `Bearer ${me.token}`)
    .send({ subscription: { endpoint: 'https://169.254.169.254/x', keys: { p256dh: P256DH, auth: AUTH } } })
    .expect(400);
});

test('subscribe, status, send, unsubscribe', async () => {
  enable();
  const me = await person();
  const sub = subscription();
  const auth = { Authorization: `Bearer ${me.token}` };

  await api().post('/devices/web-push').set(auth).send({ subscription: sub }).expect(201);
  const status = await api().get('/devices/web-push').query({ endpoint: sub.endpoint }).set(auth).expect(200);
  assert.equal(status.body.subscribed, true);

  const delivered = await webPush.sendWebPushToUsers([me.id], {
    title: 'Price drop', body: 'A car you saved is cheaper', data: { type: 'price_drop', carId: 'car-1' },
  });
  assert.equal(delivered, 1);
  assert.equal(sent[0].endpoint, sub.endpoint);
  assert.equal(sent[0].payload.data.carId, 'car-1');

  await api().delete('/devices/web-push').set(auth).send({ endpoint: sub.endpoint }).expect(200);
  // Idempotent: already off is still a success.
  await api().delete('/devices/web-push').set(auth).send({ endpoint: sub.endpoint }).expect(200);
  const after = await api().get('/devices/web-push').query({ endpoint: sub.endpoint }).set(auth).expect(200);
  assert.equal(after.body.subscribed, false);
});

test('a browser subscription follows the last account to turn it on', async () => {
  enable();
  const first = await person();
  const second = await person();
  const sub = subscription();
  await api().post('/devices/web-push').set('Authorization', `Bearer ${first.token}`).send({ subscription: sub }).expect(201);
  await api().post('/devices/web-push').set('Authorization', `Bearer ${second.token}`).send({ subscription: sub }).expect(201);

  assert.equal(await webPush.sendWebPushToUsers([first.id], { title: 't', body: 'b' }), 0);
  assert.equal(await webPush.sendWebPushToUsers([second.id], { title: 't', body: 'b' }), 1);
  const { rows } = await pool.query('SELECT user_id FROM web_push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
  assert.deepEqual(rows.map((r) => r.user_id), [second.id]);
});

test('a subscription the push service says is gone is deleted; a credential error is kept', async () => {
  enable();
  const me = await person();
  const gone = { ...subscription(), endpoint: `https://fcm.googleapis.com/fcm/send/gone-${Date.now()}` };
  const broken = { ...subscription(), endpoint: `https://fcm.googleapis.com/fcm/send/broken-${Date.now()}` };
  for (const sub of [gone, broken]) {
    await api().post('/devices/web-push').set('Authorization', `Bearer ${me.token}`).send({ subscription: sub }).expect(201);
  }
  const delivered = await webPush.sendWebPushToUsers([me.id], { title: 't', body: 'b' });
  assert.equal(delivered, 0);
  const { rows } = await pool.query('SELECT endpoint FROM web_push_subscriptions WHERE user_id = $1', [me.id]);
  assert.deepEqual(rows.map((r) => r.endpoint), [broken.endpoint]);
});

test('subscriptions per account are capped at ten, oldest dropped', async () => {
  enable();
  const me = await person();
  const subs = Array.from({ length: 12 }, (_, i) => subscription(i));
  for (const sub of subs) {
    await api().post('/devices/web-push').set('Authorization', `Bearer ${me.token}`).send({ subscription: sub }).expect(201);
  }
  const { rows } = await pool.query('SELECT endpoint FROM web_push_subscriptions WHERE user_id = $1', [me.id]);
  assert.equal(rows.length, 10);
  assert.ok(!rows.some((r) => r.endpoint === subs[0].endpoint));
  assert.ok(rows.some((r) => r.endpoint === subs[11].endpoint));
});

test('the test notification reaches the browser too', async () => {
  enable();
  const me = await person();
  await api().post('/devices/web-push').set('Authorization', `Bearer ${me.token}`).send({ subscription: subscription() }).expect(201);
  const res = await api().post('/devices/test').set('Authorization', `Bearer ${me.token}`).expect(200);
  assert.equal(res.body.sent, 1);
  assert.deepEqual(res.body.devices, [{ platform: 'browser', ok: true, error: null }]);
});

test('closing the account removes its browser subscriptions', async () => {
  enable();
  const me = await person();
  await api().post('/devices/web-push').set('Authorization', `Bearer ${me.token}`).send({ subscription: subscription() }).expect(201);
  await api().delete('/auth/me').set('Authorization', `Bearer ${me.token}`)
    .send({ password: PASSWORD, reason: 'other' }).expect(200);
  const { rows } = await pool.query('SELECT 1 FROM web_push_subscriptions WHERE user_id = $1', [me.id]);
  assert.equal(rows.length, 0);
});
