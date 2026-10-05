// Sign in with Apple, server side: the code exchange at sign-in and the revoke
// Apple requires at account deletion (lib/apple-tokens.js). fetch is stubbed;
// what is checked is what we send Apple and what we do with the answer.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const appleTokens = require('../src/lib/apple-tokens');

const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });

function withApple(env, fn) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  return fn().finally(() => {
    for (const key of ['APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY']) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
  });
}

function stubFetch(responder) {
  const calls = [];
  const original = global.fetch;
  global.fetch = async (url, init) => {
    calls.push({ url, form: Object.fromEntries(new URLSearchParams(init.body)) });
    return responder(url);
  };
  return { calls, restore: () => { global.fetch = original; } };
}

const json = (status, body) => ({ ok: status < 300, status, json: async () => body });

const ENV = {
  APPLE_TEAM_ID: '5Z2LA9U639',
  APPLE_KEY_ID: 'ABC123DEFG',
  // As a .env file usually carries it: one line, escaped newlines.
  APPLE_PRIVATE_KEY: privateKey.export({ format: 'pem', type: 'pkcs8' }).replace(/\n/g, '\\n'),
};

test('without the Apple key nothing is called and nothing is claimed', async () => {
  const fake = stubFetch(() => json(200, {}));
  try {
    assert.equal(appleTokens.configured(), false);
    assert.equal(await appleTokens.exchangeCode('com.sawacars.app', 'code'), null);
    assert.equal(await appleTokens.revoke('com.sawacars.app', 'refresh'), false);
    assert.equal(fake.calls.length, 0);
  } finally { fake.restore(); }
});

test('the code is exchanged with a client secret Apple will accept', () => withApple(ENV, async () => {
  const fake = stubFetch(() => json(200, { refresh_token: 'r-123', id_token: 'x' }));
  try {
    const refresh = await appleTokens.exchangeCode('com.sawacars.app', 'one-time-code');
    assert.equal(refresh, 'r-123');
    const [call] = fake.calls;
    assert.equal(call.url, 'https://appleid.apple.com/auth/token');
    assert.equal(call.form.grant_type, 'authorization_code');
    assert.equal(call.form.code, 'one-time-code');
    assert.equal(call.form.client_id, 'com.sawacars.app');

    const secret = jwt.verify(call.form.client_secret, publicKey, { algorithms: ['ES256'] });
    assert.equal(secret.iss, '5Z2LA9U639');
    assert.equal(secret.sub, 'com.sawacars.app');
    assert.equal(secret.aud, 'https://appleid.apple.com');
    assert.equal(jwt.decode(call.form.client_secret, { complete: true }).header.kid, 'ABC123DEFG');
  } finally { fake.restore(); }
}));

test('revoke sends the refresh token, and a refusal or outage never throws', () => withApple(ENV, async () => {
  let fake = stubFetch(() => json(200, {}));
  try {
    assert.equal(await appleTokens.revoke('com.sawacars.web', 'r-123'), true);
    assert.equal(fake.calls[0].url, 'https://appleid.apple.com/auth/revoke');
    assert.equal(fake.calls[0].form.token, 'r-123');
    assert.equal(fake.calls[0].form.token_type_hint, 'refresh_token');
    assert.equal(fake.calls[0].form.client_id, 'com.sawacars.web');
  } finally { fake.restore(); }

  fake = stubFetch(() => json(400, { error: 'invalid_grant' }));
  try {
    assert.equal(await appleTokens.revoke('com.sawacars.app', 'stale'), false);
    assert.equal(await appleTokens.exchangeCode('com.sawacars.app', 'used-code'), null);
  } finally { fake.restore(); }

  fake = stubFetch(() => { throw new Error('network down'); });
  try {
    assert.equal(await appleTokens.revoke('com.sawacars.app', 'r'), false);
  } finally { fake.restore(); }
}));
