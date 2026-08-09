const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert');

// ─────────────────────────────────────────────────────────────────────────────
// The FX module's contract is mostly about failure: a rate must ALWAYS come
// back, never an exception, and its provenance must be honest. Providers are
// stubbed — CI must not depend on a third party, and the failure paths are the
// point.
// ─────────────────────────────────────────────────────────────────────────────

process.env.JWT_SECRET = process.env.JWT_SECRET || 'fx_test_secret';

const pool = require('../src/db');
const fx = require('../src/lib/fx');

const realFetch = global.fetch;

function stubFetch(handler) {
  global.fetch = async (url) => handler(String(url));
}

const okJson = (body) => ({ ok: true, status: 200, json: async () => body });
const httpFail = { ok: false, status: 503, json: async () => ({}) };

beforeEach(async () => {
  fx._resetForTests();
  await pool.query("DELETE FROM fx_rates WHERE base = 'USD' AND quote = 'RWF'");
});

after(async () => {
  global.fetch = realFetch;
  await pool.end();
});

test('a live rate is served, stamped, and persisted', async () => {
  stubFetch(async (url) => {
    if (url.includes('open.er-api.com')) {
      return okJson({ result: 'success', rates: { RWF: 1473.5 } });
    }
    return okJson({ date: '2026-08-09', usd: { rwf: 1470.7 } });
  });

  const got = await fx.getRate('USD', 'RWF');
  assert.equal(got.rate, 1473.5, 'primary provider wins');
  assert.equal(got.source, 'open-er-api');
  assert.equal(got.stale, false);
  assert.ok(got.fetched_at, 'no timestamp');

  const { rows } = await pool.query(
    "SELECT rate::float AS rate, source FROM fx_rates WHERE base='USD' AND quote='RWF'"
  );
  assert.equal(rows.length, 1, 'not persisted');
  assert.equal(rows[0].rate, 1473.5);
});

test('the fallback provider rescues a primary outage', async () => {
  stubFetch(async (url) => {
    if (url.includes('open.er-api.com')) return httpFail;
    return okJson({ date: '2026-08-09', usd: { rwf: 1470.7 } });
  });

  const got = await fx.getRate('USD', 'RWF');
  assert.equal(got.rate, 1470.7);
  assert.equal(got.source, 'currency-api');
  assert.equal(got.stale, false);
});

test('a total provider outage serves last-known-good, marked stale', async () => {
  // Yesterday's real rate is in the DB…
  await pool.query(
    `INSERT INTO fx_rates (base, quote, rate, source, fetched_at)
     VALUES ('USD','RWF', 1465.2, 'open-er-api', NOW() - INTERVAL '3 days')`
  );
  // …and today both providers are down.
  stubFetch(async () => { throw new Error('network is down'); });

  const got = await fx.getRate('USD', 'RWF');
  assert.equal(got.rate, 1465.2, 'did not serve the stored rate');
  assert.equal(got.stale, true, 'a 3-day-old rate must be flagged stale');
});

test('nothing anywhere still yields an answer — the floor, flagged', async () => {
  stubFetch(async () => { throw new Error('network is down'); });

  const got = await fx.getRate('USD', 'RWF');
  assert.equal(got.rate, fx.FLOOR_RATE.rate);
  assert.equal(got.source, 'builtin-floor');
  assert.equal(got.stale, true);
  // The contract that matters most: it did not throw.
});

test('a fresh DB row short-circuits the providers entirely', async () => {
  await pool.query(
    `INSERT INTO fx_rates (base, quote, rate, source, fetched_at)
     VALUES ('USD','RWF', 1471.0, 'open-er-api', NOW() - INTERVAL '1 hour')`
  );
  let called = 0;
  stubFetch(async () => { called += 1; throw new Error('should not be called'); });

  const got = await fx.getRate('USD', 'RWF');
  assert.equal(got.rate, 1471.0);
  assert.equal(got.stale, false, 'an hour-old rate is fresh (providers update daily)');
  assert.equal(called, 0, 'providers were contacted despite a fresh cache');
});

test('concurrent callers share one refresh', async () => {
  let calls = 0;
  stubFetch(async (url) => {
    if (url.includes('open.er-api.com')) {
      calls += 1;
      await new Promise((r) => setTimeout(r, 50));
      return okJson({ result: 'success', rates: { RWF: 1473.5 } });
    }
    return httpFail;
  });

  const results = await Promise.all([fx.getRate(), fx.getRate(), fx.getRate()]);
  assert.ok(results.every((r) => r.rate === 1473.5));
  assert.equal(calls, 1, 'a burst of requests caused multiple provider calls');
});
