const pool = require('../db');
const { log } = require('./log');

// ─────────────────────────────────────────────────────────────────────────────
// The USD⇄RWF exchange rate, from live providers, with layered fallback.
//
// Design rules, in order of importance:
//
//   1. NEVER throw to a caller. A missing rate must never take down a listing
//      page — the worst permitted outcome is a clearly-flagged stale figure.
//   2. Every consumer gets the SAME rate. Clients read GET /fx from our API;
//      nobody talks to a third-party provider directly, so there are no keys
//      in clients and swapping providers is a change in this one file.
//   3. Freshness is part of the answer. Every response carries fetched_at,
//      source, and a stale flag — a converted figure without its provenance
//      is how the hardcoded 1300 went ~12% wrong without anyone noticing.
//
// Lookup chain:
//   memory (15 min) → DB row younger than 24h → providers (primary, then
//   fallback, 8s bound each) → DB last-known-good, marked stale → the
//   compile-time floor, marked stale — which only ever serves on a fresh
//   database that has never once reached a provider.
//
// Providers (both keyless, both verified to carry RWF):
//   · open.er-api.com          — daily rates, explicit next-update time
//   · currency-api (jsDelivr)  — community dataset on a CDN, daily
// When both answer, they cross-check: >5% disagreement logs loudly and the
// primary wins (a wrong rate that two independent sources disagree on is a
// thing a human should hear about).
// ─────────────────────────────────────────────────────────────────────────────

/** Last resort only. Deliberately close to the real rate at the time this file
 *  was written (Aug 2026: ~1473); it serves only on a fresh database that has
 *  never reached a provider, and always flagged stale. */
const FLOOR_RATE = { rate: 1470, source: 'builtin-floor' };

const MEMORY_TTL_MS = 15 * 60 * 1000;      // how often a busy server re-checks
const DB_FRESH_MS = 24 * 60 * 60 * 1000;   // providers update daily
const FETCH_TIMEOUT_MS = 8_000;

// pair key -> { value: {rate, source, fetched_at, stale}, at: epoch-ms }
const memory = new Map();
// pair key -> in-flight refresh promise, so a burst of requests after the TTL
// expires produces ONE provider call, not fifty.
const inflight = new Map();

async function fetchOpenErApi(base, quote) {
  const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`open-er-api HTTP ${res.status}`);
  const data = await res.json();
  const rate = Number(data?.rates?.[quote]);
  if (data?.result !== 'success' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('open-er-api: no usable rate in response');
  }
  return { rate, source: 'open-er-api' };
}

async function fetchCurrencyApi(base, quote) {
  const b = base.toLowerCase();
  const res = await fetch(
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${encodeURIComponent(b)}.min.json`,
    { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { accept: 'application/json' } }
  );
  if (!res.ok) throw new Error(`currency-api HTTP ${res.status}`);
  const data = await res.json();
  const rate = Number(data?.[b]?.[quote.toLowerCase()]);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('currency-api: no usable rate in response');
  }
  return { rate, source: 'currency-api' };
}

/** Ask the providers. Primary first; the fallback both rescues an outage and
 *  cross-checks the primary when both answer. Throws only if BOTH fail. */
async function fetchFromProviders(base, quote) {
  const results = await Promise.allSettled([
    fetchOpenErApi(base, quote),
    fetchCurrencyApi(base, quote),
  ]);
  const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!ok.length) {
    const reasons = results.map((r) => r.reason?.message).join(' | ');
    throw new Error(`all FX providers failed: ${reasons}`);
  }
  if (ok.length === 2) {
    const [a, b] = ok;
    const drift = Math.abs(a.rate - b.rate) / a.rate;
    if (drift > 0.05) {
      // Two independent sources disagreeing by >5% means one of them is wrong,
      // and we cannot tell which from here. Serve the primary, but loudly.
      log.error('FX providers disagree', {
        pair: `${base}/${quote}`, [a.source]: a.rate, [b.source]: b.rate,
        drift: `${(drift * 100).toFixed(1)}%`,
      });
    }
  }
  return ok[0]; // Promise.allSettled preserves order: primary wins when present
}

async function readDb(base, quote) {
  const { rows } = await pool.query(
    'SELECT rate, source, fetched_at FROM fx_rates WHERE base = $1 AND quote = $2',
    [base, quote]
  );
  if (!rows.length) return null;
  return { rate: Number(rows[0].rate), source: rows[0].source, fetched_at: rows[0].fetched_at };
}

async function writeDb(base, quote, { rate, source }) {
  await pool.query(
    `INSERT INTO fx_rates (base, quote, rate, source, fetched_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (base, quote)
     DO UPDATE SET rate = $3, source = $4, fetched_at = NOW()`,
    [base, quote, rate, source]
  );
}

/**
 * The rate, with provenance. Never throws.
 *
 * @returns {{ base, quote, rate: number, source: string,
 *             fetched_at: string, stale: boolean }}
 *   `stale` means "this did not come from a provider within the last 24h" —
 *   render it, but do not make irreversible decisions with it.
 */
async function getRate(base = 'USD', quote = 'RWF') {
  const key = `${base}/${quote}`;

  const cached = memory.get(key);
  if (cached && Date.now() - cached.at < MEMORY_TTL_MS) return cached.value;

  if (inflight.has(key)) return inflight.get(key);

  const refresh = (async () => {
    // A DB row younger than a day is as good as a provider call.
    let dbRow = null;
    try {
      dbRow = await readDb(base, quote);
    } catch (err) {
      log.error('fx db read failed', { error: err.message });
    }
    if (dbRow && Date.now() - new Date(dbRow.fetched_at).getTime() < DB_FRESH_MS) {
      const value = { base, quote, ...dbRow, fetched_at: new Date(dbRow.fetched_at).toISOString(), stale: false };
      memory.set(key, { value, at: Date.now() });
      return value;
    }

    try {
      const fresh = await fetchFromProviders(base, quote);
      try {
        await writeDb(base, quote, fresh);
      } catch (err) {
        log.error('fx db write failed', { error: err.message });
      }
      const value = { base, quote, ...fresh, fetched_at: new Date().toISOString(), stale: false };
      memory.set(key, { value, at: Date.now() });
      log.info('fx rate refreshed', { pair: key, rate: fresh.rate, source: fresh.source });
      return value;
    } catch (err) {
      log.error('fx providers unreachable', { pair: key, error: err.message });
    }

    // Providers down: last-known-good beats a constant from months ago.
    if (dbRow) {
      const value = { base, quote, ...dbRow, fetched_at: new Date(dbRow.fetched_at).toISOString(), stale: true };
      // Short-cache the stale answer so a provider outage does not turn every
      // page view into a doomed 16s provider attempt.
      memory.set(key, { value, at: Date.now() });
      return value;
    }

    const value = { base, quote, ...FLOOR_RATE, fetched_at: null, stale: true };
    memory.set(key, { value, at: Date.now() });
    return value;
  })().finally(() => inflight.delete(key));

  inflight.set(key, refresh);
  return refresh;
}

/** Test hook: forget everything cached in this process. */
function _resetForTests() {
  memory.clear();
  inflight.clear();
}

module.exports = { getRate, FLOOR_RATE, _resetForTests };
