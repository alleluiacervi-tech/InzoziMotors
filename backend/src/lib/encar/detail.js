// ─────────────────────────────────────────────────────────────────────────────
// Inspection reports, insurance records and vehicle detail, on demand (plan A2).
//
// These are the heavy, rarely-needed parts of a car, so they are NEVER synced.
// Someone opens a car → we fetch what we do not already hold → keep it for 24
// hours in an UNLOGGED table that empties itself. A car nobody opens costs us
// nothing, and a car many people open costs one provider request a day.
//
// ── What leaves this file ────────────────────────────────────────────────────
// The provider's responses can carry things a browser must never see (the
// licence plate, the VIN, the inspection certificate number, the dealer). So
// nothing is passed through whole. Each kind has a SHAPER that builds our own
// object from named fields:
//
//   record      the documented RecordResponse, field by field, type-checked.
//   inspection  the documented summary (accident flag, simple repair, date) plus
//               the panel codes and the free-form `detail` block, which are
//               undocumented in structure and therefore scrubbed: keys that name
//               a plate, VIN, owner, dealer, contact or address are dropped, and
//               so is any value that LOOKS like a plate, VIN, phone number or
//               email, whatever its key. Depth, width and size are capped.
//   detail      only the engine size and the asking-price history. Nothing else
//               of the vehicle response is kept.
//
// What is stored is the shaped copy, so even a database read cannot leak it.
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
const DENY_KEY = /(plate|\bvin\b|chassis|phone|\btel\b|mobile|contact|dealer|owner|seller|address|e-?mail|partner|agent|showroom|member|user|licen[cs]e|regno|carno|vehicleno|number|supplynum)/i;
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

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const count = (v) => { const n = num(v); return n !== null && n >= 0 && n < 1e9 ? Math.trunc(n) : null; };
const date = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const flag = (v) => (typeof v === 'boolean' ? v : v === 1 ? true : v === 0 ? false : null);
const code = (v) => (typeof v === 'string' && /^[\w .-]{1,20}$/.test(v) ? v : null);
const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined));

/** The documented insurance record, field by field (RecordResponse). */
function shapeRecord(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const accidents = (Array.isArray(raw.accidents) ? raw.accidents : []).slice(0, 50)
    .map((a) => compact({
      date: date(a?.date), type: code(a?.type),
      part_cost: count(a?.partCost), labor_cost: count(a?.laborCost),
      painting_cost: count(a?.paintingCost), insurance_benefit: count(a?.insuranceBenefit),
    }))
    .filter((a) => a.date);
  return compact({
    accident_count: count(raw.accidentCnt),
    own_damage_count: count(raw.myAccidentCnt),
    own_damage_cost_krw: count(raw.myAccidentCost),
    other_damage_count: count(raw.otherAccidentCnt),
    other_damage_cost_krw: count(raw.otherAccidentCost),
    owner_change_count: count(raw.ownerChangeCnt),
    owner_changes: (Array.isArray(raw.ownerChanges) ? raw.ownerChanges : []).slice(0, 30).map(date).filter(Boolean),
    plate_change_count: count(raw.carNoChangeCnt),
    total_loss_count: count(raw.totalLossCnt),
    total_loss_date: date(raw.totalLossDate),
    flood_total_loss_count: count(raw.floodTotalLossCnt),
    flood_partial_loss_count: count(raw.floodPartLossCnt),
    flood_date: date(raw.floodDate),
    theft_count: count(raw.robberCnt),
    theft_date: date(raw.robberDate),
    usage: code(raw.use), // '1' private, '2' commercial, '3' government
    commercial: flag(raw.business),
    first_registered: date(raw.firstDate),
    accidents,
  });
}

/** Scrubs an arbitrary provider value: deny by key and by what a value looks like. */
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

/** The documented inspection summary, plus the scrubbed panel codes and detail. */
function shapeInspection(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const master = raw.master && typeof raw.master === 'object' ? raw.master : {};
  const shaped = compact({
    // The provider spells this field "accdient".
    accident: flag(master.accdient ?? master.accident),
    simple_repair: flag(master.simpleRepair),
    inspected_on: typeof master.registrationDate === 'string' ? date(master.registrationDate) : null,
    detail: scrub(master.detail),
    exterior: scrub(raw.outers),
    structure: scrub(raw.inners),
    notes: scrub(raw.etcs),
  });
  const size = Buffer.byteLength(JSON.stringify(shaped));
  if (size <= MAX_BYTES) return shaped;
  // Too large to keep whole: keep the headline fields and say so.
  return { accident: shaped.accident, simple_repair: shaped.simple_repair, inspected_on: shaped.inspected_on, __truncated: true };
}

/** Only the engine size and the asking-price history of a vehicle response. */
function shapeDetail(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const history = (Array.isArray(raw.priceHistory) ? raw.priceHistory : []).slice(-30)
    .map((h) => ({ price_man: count(h?.price), observed_at: typeof h?.observedAt === 'string' ? h.observedAt.slice(0, 10) : null }))
    .filter((h) => h.price_man && h.observed_at && /^\d{4}-\d{2}-\d{2}$/.test(h.observed_at));
  return compact({ engine_cc: findDisplacement(raw), price_history: history.length ? history : null });
}

const SHAPERS = { record: shapeRecord, inspection: shapeInspection, detail: shapeDetail };

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
      const stored = SHAPERS[kind](await call(id));
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

  return { get };
}

module.exports = { createDetail, scrub, shapeRecord, shapeInspection, shapeDetail, findDisplacement, KINDS, TTL_MS };
