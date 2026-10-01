// The provider client. No network: fetch and sleep are injected.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClient, EncarError, parseRetryAfter, qs } = require('../src/lib/encar/client');

const KEY = 'test-key-never-log-me-123456';

const res = (status, body = {}, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[String(k).toLowerCase()] ?? null },
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

function make(handler, extra = {}) {
  const calls = [];
  const sleeps = [];
  const client = createClient({
    apiKey: KEY,
    baseUrl: 'https://api.example.test',
    ratePerMinute: 60000, // effectively no pacing unless a test wants it
    fetchImpl: async (url, init) => { calls.push({ url, init }); return handler(url, init, calls.length); },
    sleep: async (ms) => { sleeps.push(ms); },
    ...extra,
  });
  return { client, calls, sleeps };
}

test('without a key nothing is sent', async () => {
  const { client, calls } = make(() => res(200), { apiKey: '' });
  assert.equal(client.configured, false);
  await assert.rejects(() => client.catalog({}), (e) => e.code === 'not_configured');
  assert.equal(calls.length, 0);
});

test('the key goes in a header and never in the URL', async () => {
  const { client, calls } = make(() => res(200, { SearchResults: [] }));
  await client.catalog({ page: 2, limit: 1000, lang: 'en', has_photos: true });
  assert.equal(calls[0].init.headers['x-api-key'], KEY);
  assert.ok(!calls[0].url.includes(KEY), 'key must not be in the URL');
  assert.match(calls[0].url, /^https:\/\/api\.example\.test\/api\/catalog\?/);
  assert.match(calls[0].url, /page=2/);
  assert.match(calls[0].url, /has_photos=true/);
});

test('empty and undefined query values are dropped', () => {
  assert.equal(qs({ a: undefined, b: '', c: null, d: 0, e: false }), '?d=0&e=false');
  assert.equal(qs({}), '');
});

test('errors are classified, and the unrecoverable ones are not retried', async () => {
  for (const [status, code] of [[401, 'auth'], [403, 'plan'], [404, 'not_found'], [409, 'removed'], [410, 'cursor_expired']]) {
    const { client, calls } = make(() => res(status));
    await assert.rejects(() => client.vehicle('1'), (e) => e instanceof EncarError && e.code === code && e.status === status);
    assert.equal(calls.length, 1, `${status} must not be retried`);
  }
});

test('a 429 waits as long as the provider says, then succeeds', async () => {
  const { client, calls, sleeps } = make((u, i, n) => (n === 1 ? res(429, {}, { 'retry-after': '3' }) : res(200, { ok: 1 })));
  assert.deepEqual(await client.vehicle('9'), { ok: 1 });
  assert.equal(calls.length, 2);
  assert.ok(sleeps.includes(3000));
});

test('a provider outage is retried a bounded number of times, then reported', async () => {
  const { client, calls } = make(() => res(503));
  await assert.rejects(() => client.catalog({}), (e) => e.code === 'unavailable');
  assert.equal(calls.length, 4);
});

test('a network failure never leaks the URL or the key', async () => {
  const { client } = make(() => { throw new Error(`connect ECONNREFUSED https://api.example.test/api/catalog?api_key=${KEY}`); });
  await assert.rejects(() => client.catalog({}), (e) => {
    assert.equal(e.code, 'unavailable');
    assert.ok(!e.message.includes(KEY) && !e.message.includes('example.test'));
    return true;
  });
});

test('requests are spaced to the configured rate', async () => {
  const { client, sleeps } = make(() => res(200, {}), { ratePerMinute: 30 });
  assert.equal(client.spacingMs, 2000);
  await client.catalog({});
  await client.catalog({});
  assert.ok(sleeps.some((ms) => ms > 0 && ms <= 2000), 'the second request had to wait');
});

test('a body that is not JSON is a bad_response, not a crash', async () => {
  const { client } = make(() => res(200, '<html>maintenance</html>'));
  await assert.rejects(() => client.catalog({}), (e) => e.code === 'bad_response');
});

test('usage is reported with the response size', async () => {
  const usage = [];
  const { client } = make(() => res(200, { SearchResults: [1, 2, 3] }), { onUsage: (u) => usage.push(u) });
  await client.catalog({});
  assert.equal(usage.length, 1);
  assert.equal(usage[0].requests, 1);
  assert.ok(usage[0].bytes > 10);
});

test('bulk lookups post the ids as JSON', async () => {
  const { client, calls } = make(() => res(200, { results: {} }));
  await client.bulk('inspection', ['1', '2']);
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), { ids: ['1', '2'] });
  assert.match(calls[0].url, /\/api\/inspection\/bulk$/);
});

test('ids are encoded into the path', async () => {
  const { client, calls } = make(() => res(200, {}));
  await client.vehicle('kcar:EC 12/3');
  assert.match(calls[0].url, /\/api\/vehicle\/kcar%3AEC%2012%2F3$/);
});

test('Retry-After is clamped and understands dates', () => {
  assert.equal(parseRetryAfter('5'), 5000);
  assert.equal(parseRetryAfter('99999'), 120000);
  assert.equal(parseRetryAfter(null), null);
  const now = Date.parse('2026-10-01T00:00:00Z');
  assert.equal(parseRetryAfter('Thu, 01 Oct 2026 00:00:10 GMT', now), 10000);
});

test('a non-https base URL is refused', () => {
  assert.throws(() => createClient({ apiKey: KEY, baseUrl: 'http://evil.example.com' }), (e) => e.code === 'not_configured');
});

test('the key is redacted from any log context, whatever it is called', () => {
  const { redact } = require('../src/lib/log');
  const out = redact({ 'x-api-key': KEY, api_key: KEY, apikey: KEY, nested: { 'X-Api-Key': KEY }, ok: 'fine' });
  assert.ok(!JSON.stringify(out).includes(KEY));
  assert.equal(out.ok, 'fine');
});
