// ─────────────────────────────────────────────────────────────────────────────
// The API process's one provider client.
//
// The provider's limit is 60 requests a minute across everything we run. The
// budget is the worker at 35 and the API at 20, which only holds if the API has
// ONE limiter: each createClient() has its own, so two clients in this process
// (public reports and the admin's refresh) could together send 40 a minute.
// Everything in the API that talks to the provider shares this instance.
//
// Usage is recorded here too, so the admin's "provider allowance" bar counts
// what the API spends and not only what the worker does.
// ─────────────────────────────────────────────────────────────────────────────
const pool = require('../../db');
const store = require('./store');
const { createClient } = require('./client');

const client = createClient({
  ratePerMinute: Number(process.env.ENCAR_RATE_PER_MIN || 20),
  onUsage: (u) => { store.recordUsage(pool, u).catch(() => {}); },
});

module.exports = client;
