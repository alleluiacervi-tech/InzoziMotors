// ─────────────────────────────────────────────────────────────────────────────
// The one place that talks to the Encar data provider (encarapi.com).
//
// Everything about the provider's behaviour — its URL, its header, its limits,
// its failure modes — lives here, so nothing else in the codebase needs to know
// any of it. Plan: docs/ENCAR-IMPORT-PLAN.md (A1).
//
//   · The key travels in the `x-api-key` header and nowhere else. It is never
//     put in a URL (URLs end up in logs, proxies and error messages), never
//     included in an error, and never returned to a caller.
//   · One shared pace. The Business plan allows 60 requests a minute; the worker
//     and the API's on-demand detail calls share this limiter, so together they
//     cannot exceed it. The default leaves headroom (50/min).
//   · Failures are classified, not just thrown: a wrong key, a plan that lacks
//     the endpoint, an expired cursor and a provider outage each need a
//     different reaction from the caller.
//   · Nothing here ever throws because the provider is slow. Timeouts become
//     EncarError('timeout') and the caller decides.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'https://api.encarapi.com';
const DEFAULT_RATE_PER_MIN = 50;
const DEFAULT_MAX_QUEUE = 8;
const HEADERS_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 4;
const MAX_JSON_BYTES = 80 * 1024 * 1024; // a runaway response is a bug, not data

class EncarError extends Error {
  /**
   * @param {string} code  not_configured | auth | plan | not_found | cursor_expired |
   *                       rate_limited | removed | unavailable | timeout | bad_response
   */
  constructor(code, message, { status = null, retryAfterMs = null } = {}) {
    super(message);
    this.name = 'EncarError';
    this.code = code;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

const sleepReal = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function classify(status, retryAfterMs) {
  if (status === 401) return new EncarError('auth', 'The provider rejected the API key', { status });
  if (status === 403) return new EncarError('plan', 'The provider plan does not include this endpoint, or the cursor is outside the trial window', { status });
  if (status === 404) return new EncarError('not_found', 'Listing not found at the provider', { status });
  if (status === 409) return new EncarError('removed', 'The listing has been removed at the provider', { status });
  if (status === 410) return new EncarError('cursor_expired', 'The change cursor is older than the provider retains', { status });
  if (status === 429) return new EncarError('rate_limited', 'The provider rate limit was hit', { status, retryAfterMs });
  if (status >= 500) return new EncarError('unavailable', `The provider answered ${status}`, { status });
  return new EncarError('bad_response', `Unexpected provider status ${status}`, { status });
}

/** Seconds ("30") or an HTTP date; clamped so a hostile header cannot park us. */
function parseRetryAfter(value, now = Date.now()) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.min(Math.max(seconds, 0), 120) * 1000;
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.min(Math.max(at - now, 0), 120_000) : null;
}

function qs(params) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    out.set(k, typeof v === 'boolean' ? String(v) : String(v));
  }
  const text = out.toString();
  return text ? `?${text}` : '';
}

/**
 * @param {object}   [opts]
 * @param {string}   [opts.apiKey]        defaults to process.env.ENCAR_API_KEY
 * @param {string}   [opts.baseUrl]       defaults to ENCAR_API_BASE or the provider's
 * @param {number}   [opts.ratePerMinute]
 * @param {number}   [opts.maxQueue]      callers allowed to wait for a turn before new ones are refused
 * @param {Function} [opts.fetchImpl]     injected in tests
 * @param {Function} [opts.sleep]         injected in tests
 * @param {Function} [opts.onUsage]       ({ requests, bytes }) after every response
 */
// Passes a stream through unchanged and reports how many bytes went by, once,
// when it ends: complete, abandoned or failed, the traffic was spent either way.
async function* countBytes(source, report) {
  let bytes = 0;
  try {
    for await (const chunk of source) {
      bytes += chunk.length;
      yield chunk;
    }
  } finally {
    if (bytes) report(bytes);
  }
}

function createClient(opts = {}) {
  const apiKey = opts.apiKey ?? process.env.ENCAR_API_KEY ?? '';
  const baseUrl = String(opts.baseUrl ?? process.env.ENCAR_API_BASE ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  const ratePerMinute = Number(opts.ratePerMinute ?? process.env.ENCAR_RATE_PER_MIN ?? DEFAULT_RATE_PER_MIN);
  const doFetch = opts.fetchImpl ?? ((...args) => fetch(...args));
  const sleep = opts.sleep ?? sleepReal;
  const onUsage = opts.onUsage ?? (() => {});
  const spacingMs = Math.ceil(60_000 / Math.max(1, ratePerMinute));
  const maxQueue = Math.max(1, Number(opts.maxQueue ?? DEFAULT_MAX_QUEUE));

  if (!/^https:\/\//.test(baseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(baseUrl)) {
    throw new EncarError('not_configured', 'ENCAR_API_BASE must be https');
  }

  // Serialises request starts so they are at least `spacingMs` apart, however
  // many callers are waiting. A promise chain, not a timer: order is preserved.
  //
  // The queue is bounded: past `maxQueue` waiting callers a new one is refused at
  // once, rather than joining a line it would give up on (a visitor's browser
  // waits seconds, not minutes) while still spending the provider's allowance
  // for an answer nobody reads. The worker never has more than one waiting.
  let lastStart = 0;
  let gate = Promise.resolve();
  let waiting = 0;
  function takeTurn() {
    if (waiting >= maxQueue) throw new EncarError('rate_limited', 'Too many requests are waiting for the provider');
    waiting += 1;
    const turn = gate.then(async () => {
      const wait = lastStart + spacingMs - Date.now();
      if (wait > 0) await sleep(wait);
      lastStart = Date.now();
    }).finally(() => { waiting -= 1; });
    gate = turn.catch(() => {});
    return turn;
  }

  function requireKey() {
    if (!apiKey) throw new EncarError('not_configured', 'ENCAR_API_KEY is not set');
  }

  // One request, with retries for the failures worth retrying. Returns the raw
  // Response (body unread) so a caller can stream it.
  async function send(method, path, { query, body, timeoutMs = HEADERS_TIMEOUT_MS } = {}) {
    requireKey();
    const url = `${baseUrl}${path}${qs(query)}`;
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      await takeTurn();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await doFetch(url, {
          method,
          headers: {
            'x-api-key': apiKey,
            Accept: 'application/json',
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) return res;
        const error = classify(res.status, parseRetryAfter(res.headers?.get?.('retry-after')));
        onUsage({ requests: 1, bytes: 0 });
        // Only these are worth another go; everything else will fail the same way.
        if (error.code !== 'rate_limited' && error.code !== 'unavailable') throw error;
        lastError = error;
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof EncarError) {
          if (err.code !== 'rate_limited' && err.code !== 'unavailable') throw err;
          lastError = err;
        } else if (err?.name === 'AbortError') {
          lastError = new EncarError('timeout', 'The provider did not answer in time');
        } else {
          // Network failure. The message of a fetch error can include the URL,
          // so it is replaced rather than passed on.
          lastError = new EncarError('unavailable', 'Could not reach the provider');
        }
      }
      if (attempt < MAX_ATTEMPTS) {
        const backoff = lastError.retryAfterMs ?? Math.min(2000 * 2 ** (attempt - 1), 30_000);
        await sleep(backoff);
      }
    }
    throw lastError;
  }

  async function json(method, path, options) {
    const res = await send(method, path, options);
    const text = await res.text();
    if (text.length > MAX_JSON_BYTES) throw new EncarError('bad_response', 'The provider response was unreasonably large');
    onUsage({ requests: 1, bytes: Buffer.byteLength(text) });
    try {
      return JSON.parse(text);
    } catch {
      throw new EncarError('bad_response', 'The provider returned something that is not JSON');
    }
  }

  return {
    spacingMs,
    configured: Boolean(apiKey),

    /** Search / list. Pass lang:'en' to get English values. */
    catalog: (query) => json('GET', '/api/catalog', { query }),

    /** Incremental changes. First call: { since } or { cursor: 0 }; then { cursor }. */
    changes: (query) => json('GET', '/api/catalog/changes', { query }),

    vehicle: (id) => json('GET', `/api/vehicle/${encodeURIComponent(id)}`),
    inspection: (id) => json('GET', `/api/inspection/${encodeURIComponent(id)}`),
    record: (id) => json('GET', `/api/record/${encodeURIComponent(id)}`),

    /** kind: 'vehicle' | 'inspection' | 'record'; up to 500 ids. */
    bulk: (kind, ids) => json('POST', `/api/${kind}/bulk`, { body: { ids } }),

    /** Asks the provider to re-collect one listing (100/day on Business). */
    refresh: (id) => json('POST', `/api/vehicle/${encodeURIComponent(id)}/refresh`),

    /**
     * The daily full export, as { headers, body }: the body is a stream, unread.
     * Its bytes are reported as they are read, because the provider's monthly
     * traffic allowance counts them (the export is exempt from the request cap,
     * not from the 12 GB).
     */
    exportCsv: async (query) => {
      const res = await send('GET', '/api/catalog/export', { query, timeoutMs: 120_000 });
      return { headers: res.headers, status: res.status, body: countBytes(res.body, (bytes) => onUsage({ requests: 0, bytes })) };
    },

    enums: () => json('GET', '/api/enums'),
  };
}

module.exports = { createClient, EncarError, classify, parseRetryAfter, qs, DEFAULT_BASE_URL };
