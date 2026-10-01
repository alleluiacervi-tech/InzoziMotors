// ─────────────────────────────────────────────────────────────────────────────
// Inspection reports, insurance records and vehicle detail, on demand (plan A2).
//
// These are the heavy, rarely-needed parts of a car, so they are NEVER synced.
// Someone opens a car → we fetch what we do not already hold → keep it for 24
// hours in an UNLOGGED table that empties itself. A car nobody opens costs us
// nothing, and a car many people open costs one provider request a day.
//
// ── What leaves this file ────────────────────────────────────────────────────
// The provider's inspection/record/detail responses are not documented, and the
// vehicle detail may carry the licence plate, the VIN and the dealer's contact.
// None of that may reach a browser, so every payload is SCRUBBED on the way in:
//   · keys that name a plate, VIN, owner, dealer, contact, address… are dropped
//   · values that LOOK like a plate, VIN, phone number or email are dropped,
//     whatever their key (a leak under an unexpected name is still a leak)
//   · depth, width and total size are capped
// What is stored is the scrubbed copy, so even a database read cannot leak it.
// This is a deny-by-pattern guard for a shape we have not seen yet; once the
// spike's fixtures exist it should be tightened to an explicit allow-list
// (docs/ENCAR-IMPORT-TODO.md, Phase 0).
// ─────────────────────────────────────────────────────────────────────────────
const { EncarError } = require('./client');

const TTL_MS = 24 * 3_600_000;
const MISSING_TTL_MS = 3_600_000;
const MAX_DEPTH = 6;
const MAX_ARRAY = 200;
const MAX_KEYS = 100;
const MAX_STRING = 400;
const MAX_BYTES = 60_000;

const KINDS = ['detail', 'inspection', 'record'];

// Key names that identify a person, a business or a vehicle's registration.
const DENY_KEY = /(plate|\bvin\b|chassis|phone|\btel\b|mobile|contact|dealer|owner|seller|address|e-?mail|partner|agent|showroom|member|user|licen[cs]e|registration|regno|carno|vehicleno|number)/i;
// Values that look like one, wherever they hide.
const KOREAN_PLATE = /\d{2,3}\s?[가-힣]\s?\d{4}/;
const VIN = /\b[A-HJ-NPR-Z0-9]{17}\b/;
const PHONE = /(\+?\d{1,3}[\s-]?)?\(?0?\d{1,3}\)?[\s-]\d{3,4}[\s-]\d{4}|\b\d{10,11}\b/;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const leaky = (s) => KOREAN_PLATE.test(s) || VIN.test(s) || PHONE.test(s) || EMAIL.test(s);

function scrub(value, depth = 0) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s || leaky(s)) return undefined;
    return s.slice(0, MAX_STRING);
  }
  if (depth >= MAX_DEPTH) return undefined;
  if (Array.isArray(value)) {
    const out = value.slice(0, MAX_ARRAY).map((v) => scrub(v, depth + 1)).filter((v) => v !== undefined);
    return out.length ? out : undefined;
  }
  if (typeof value === 'object') {
    const out = {};
    let n = 0;
    for (const [key, v] of Object.entries(value)) {
      if (n >= MAX_KEYS) break;
      if (!/^[A-Za-z0-9_ .-]{1,60}$/.test(key) || DENY_KEY.test(key)) continue;
      const clean = scrub(v, depth + 1);
      if (clean !== undefined) { out[key] = clean; n += 1; }
    }
    return n ? out : undefined;
  }
  return undefined;
}

/** Scrubs and size-caps a provider payload. Returns { payload, truncated }. */
function sanitize(raw) {
  const clean = scrub(raw) ?? {};
  const size = Buffer.byteLength(JSON.stringify(clean));
  if (size <= MAX_BYTES) return { payload: clean, truncated: false };
  // Too large to keep whole: keep the top-level scalars and say so.
  const flat = {};
  for (const [k, v] of Object.entries(clean)) if (typeof v !== 'object') flat[k] = v;
  return { payload: flat, truncated: true };
}

/** The first plausible engine size (cc) anywhere in a detail payload, or null. */
function findDisplacement(payload, depth = 0) {
  if (!payload || typeof payload !== 'object' || depth > MAX_DEPTH) return null;
  for (const [key, v] of Object.entries(payload)) {
    if (/displacement|engine.?(size|cc|capacity)|^cc$/i.test(key)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 600 && n <= 8000) return Math.round(n);
    }
  }
  for (const v of Object.values(payload)) {
    const found = typeof v === 'object' ? findDisplacement(v, depth + 1) : null;
    if (found) return found;
  }
  return null;
}

function createDetail({ db, client, now = () => Date.now(), dailyMax = Number(process.env.ENCAR_DETAIL_DAILY_MAX || 3000) }) {
  const inflight = new Map(); // `${id}|${kind}` -> Promise: one fetch per car however many open it
  let day = '';
  let today = 0;

  const withinBudget = () => {
    const d = new Date(now()).toISOString().slice(0, 10);
    if (d !== day) { day = d; today = 0; }
    return today < dailyMax;
  };

  async function readCache(id, kind) {
    const { rows } = await db.query(
      'SELECT payload, fetched_at, expires_at FROM encar_detail_cache WHERE id = $1 AND kind = $2', [id, kind]
    );
    return rows[0] || null;
  }

  async function writeCache(id, kind, payload, ttlMs) {
    await db.query(
      `INSERT INTO encar_detail_cache (id, kind, payload, fetched_at, expires_at)
       VALUES ($1, $2, $3::jsonb, NOW(), NOW() + ($4 || ' milliseconds')::interval)
       ON CONFLICT (id, kind) DO UPDATE
         SET payload = EXCLUDED.payload, fetched_at = NOW(), expires_at = EXCLUDED.expires_at`,
      [id, kind, JSON.stringify(payload), String(ttlMs)]
    );
  }

  async function fetchFresh(id, kind) {
    const call = { detail: client.vehicle, inspection: client.inspection, record: client.record }[kind];
    today += 1;
    try {
      const raw = await call(id);
      const { payload, truncated } = sanitize(raw);
      const stored = truncated ? { ...payload, __truncated: true } : payload;
      await writeCache(id, kind, stored, TTL_MS);
      return { status: 'ok', payload: stored, fetched_at: new Date(now()).toISOString() };
    } catch (err) {
      if (err instanceof EncarError && (err.code === 'not_found' || err.code === 'removed')) {
        await writeCache(id, kind, { __missing: true }, MISSING_TTL_MS).catch(() => {});
        return { status: 'none' };
      }
      throw err;
    }
  }

  /**
   * @returns {Promise<{status: 'ok'|'none'|'unavailable', payload?: object, fetched_at?: string, stale?: boolean}>}
   * Never throws: the car page must render with or without its reports.
   */
  async function get(id, kind) {
    if (!KINDS.includes(kind)) return { status: 'none' };
    let cached = null;
    try { cached = await readCache(id, kind); } catch { /* the cache is an optimisation */ }
    if (cached && new Date(cached.expires_at).getTime() > now()) {
      return cached.payload.__missing
        ? { status: 'none' }
        : { status: 'ok', payload: cached.payload, fetched_at: new Date(cached.fetched_at).toISOString() };
    }
    const stale = cached && !cached.payload.__missing
      ? { status: 'ok', payload: cached.payload, fetched_at: new Date(cached.fetched_at).toISOString(), stale: true }
      : null;

    if (!client.configured || !withinBudget()) return stale || { status: 'unavailable' };

    const key = `${id}|${kind}`;
    if (!inflight.has(key)) {
      inflight.set(key, fetchFresh(id, kind).finally(() => inflight.delete(key)));
    }
    try {
      return await inflight.get(key);
    } catch {
      // A provider hiccup: an older copy beats an empty box.
      return stale || { status: 'unavailable' };
    }
  }

  return { get, sanitize };
}

module.exports = { createDetail, sanitize, scrub, findDisplacement, KINDS, TTL_MS };
