// ─────────────────────────────────────────────────────────────────────────────
// All SQL for the Encar mirror. Nothing here talks to the provider.
//
// `db` is a pool or a transaction client — both have .query. The sync wraps a
// page of work in one transaction so a crash can never leave rows applied but
// the cursor not advanced (which would re-apply them: harmless) or the cursor
// advanced but the rows not applied (which would lose them: not harmless).
// ─────────────────────────────────────────────────────────────────────────────
const { DEFAULT_RULES, validateRules } = require('./normalize');

const DEFAULT_FLAGS = Object.freeze({ sync_enabled: false, catalog_public: false });

async function loadSetting(db, key) {
  const { rows } = await db.query('SELECT value FROM platform_settings WHERE key = $1', [key]);
  return rows[0]?.value ?? null;
}

async function loadFlags(db) {
  const stored = await loadSetting(db, 'encar_flags');
  return { ...DEFAULT_FLAGS, ...(stored && typeof stored === 'object' ? stored : {}) };
}

/** Stored rules merged over the defaults; an invalid stored value falls back. */
async function loadRules(db) {
  const stored = await loadSetting(db, 'encar_ingest_rules');
  if (stored && validateRules(stored).length === 0) return { ...DEFAULT_RULES, ...stored };
  return { ...DEFAULT_RULES };
}

async function getState(db) {
  const { rows } = await db.query('SELECT * FROM encar_sync_state WHERE id = 1');
  return rows[0];
}

const STATE_COLUMNS = new Set([
  'baseline_started_at', 'baseline_completed_at', 'baseline_page', 'change_cursor',
  'last_success_at', 'last_error', 'last_error_at', 'last_repair_at',
]);

/** Allow-listed, so a typo can never become SQL. */
async function patchState(db, patch) {
  const keys = Object.keys(patch).filter((k) => STATE_COLUMNS.has(k));
  if (!keys.length) return;
  const sets = keys.map((k, i) => `${k} = $${i + 1}`);
  await db.query(
    `UPDATE encar_sync_state SET ${sets.join(', ')}, updated_at = NOW() WHERE id = 1`,
    keys.map((k) => patch[k])
  );
}

async function countListings(db) {
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM encar_listings');
  return rows[0].n;
}

// Rewrites a row only when something we keep actually changed. The provider
// emits an update for fields we do not store (a dealer's description, say);
// letting those through would rewrite the row, its photo array and every index
// entry for nothing. The WHERE clause is what stops that.
//
// A price change clears the landed-cost estimate: the batch that computes it
// will fill it in again, and a stale figure must never be shown.
//
// Returns { inserted, updated }.
async function upsertListings(db, rowsIn) {
  const byId = new Map();
  for (const r of rowsIn) byId.set(r.id, r); // one row per id per statement
  const rows = [...byId.values()];
  if (!rows.length) return { inserted: 0, updated: 0 };

  const payload = rows.map((r) => ({
    id: r.id, make: r.make, model: r.model, badge: r.badge, fuel: r.fuel,
    transmission: r.transmission, color: r.color, category: r.category,
    year: r.year, month: r.month, mileage_km: r.mileage_km, price_man: r.price_man,
    power_ps: r.power_ps, seats: r.seats, photo_count: r.photo_count, photos: r.photos,
  }));

  const { rows: out } = await db.query(
    `INSERT INTO encar_listings
       (id, make, model, badge, fuel, transmission, color, category, year, month,
        mileage_km, price_man, power_ps, seats, photo_count, photos)
     SELECT r.id, r.make, r.model, r.badge, r.fuel, r.transmission, r.color, r.category,
            r.year, r.month, r.mileage_km, r.price_man, r.power_ps, r.seats, r.photo_count,
            ARRAY(SELECT jsonb_array_elements_text(r.photos))
       FROM jsonb_to_recordset($1::jsonb) AS r(
              id text, make text, model text, badge text, fuel text, transmission text,
              color text, category text, year int, month int, mileage_km int,
              price_man int, power_ps int, seats int, photo_count int, photos jsonb)
     ON CONFLICT (id) DO UPDATE SET
       make = EXCLUDED.make, model = EXCLUDED.model, badge = EXCLUDED.badge,
       fuel = EXCLUDED.fuel, transmission = EXCLUDED.transmission, color = EXCLUDED.color,
       category = EXCLUDED.category, year = EXCLUDED.year, month = EXCLUDED.month,
       mileage_km = EXCLUDED.mileage_km, price_man = EXCLUDED.price_man,
       power_ps = EXCLUDED.power_ps, seats = EXCLUDED.seats,
       photo_count = EXCLUDED.photo_count, photos = EXCLUDED.photos,
       est_landed_rwf  = CASE WHEN encar_listings.price_man IS DISTINCT FROM EXCLUDED.price_man
                              THEN NULL ELSE encar_listings.est_landed_rwf END,
       est_computed_at = CASE WHEN encar_listings.price_man IS DISTINCT FROM EXCLUDED.price_man
                              THEN NULL ELSE encar_listings.est_computed_at END,
       changed_at = NOW(), synced_at = NOW()
     WHERE (encar_listings.make, encar_listings.model, encar_listings.badge, encar_listings.fuel,
            encar_listings.transmission, encar_listings.color, encar_listings.category,
            encar_listings.year, encar_listings.month, encar_listings.mileage_km,
            encar_listings.price_man, encar_listings.power_ps, encar_listings.seats,
            encar_listings.photo_count, encar_listings.photos)
           IS DISTINCT FROM
           (EXCLUDED.make, EXCLUDED.model, EXCLUDED.badge, EXCLUDED.fuel,
            EXCLUDED.transmission, EXCLUDED.color, EXCLUDED.category,
            EXCLUDED.year, EXCLUDED.month, EXCLUDED.mileage_km,
            EXCLUDED.price_man, EXCLUDED.power_ps, EXCLUDED.seats,
            EXCLUDED.photo_count, EXCLUDED.photos)
     RETURNING (xmax = 0) AS inserted`,
    [JSON.stringify(payload)]
  );
  const inserted = out.filter((r) => r.inserted).length;
  return { inserted, updated: out.length - inserted };
}

async function deleteListings(db, ids) {
  const unique = [...new Set(ids)];
  if (!unique.length) return 0;
  const { rowCount } = await db.query('DELETE FROM encar_listings WHERE id = ANY($1::text[])', [unique]);
  return rowCount;
}

/** Every id we hold, for the weekly cross-check against the export. */
async function listIds(db) {
  const { rows } = await db.query('SELECT id FROM encar_listings');
  return rows.map((r) => r.id);
}

/**
 * Everything the admin status card shows, in a handful of cheap queries.
 * `size_bytes` is the table plus its indexes: the number to watch against the
 * storage budget (plan section 6).
 */
async function statusSummary(db) {
  const [state, count, size, runs, cache, usage, month] = await Promise.all([
    getState(db),
    countListings(db),
    db.query(`SELECT pg_total_relation_size('encar_listings')::bigint AS bytes`),
    db.query(`SELECT id, kind, started_at, finished_at, ok, added, updated, removed, skipped, error
                FROM encar_sync_runs ORDER BY started_at DESC LIMIT 10`),
    db.query('SELECT COUNT(*)::int AS n FROM encar_detail_cache'),
    db.query(`SELECT day, requests, bytes FROM encar_usage ORDER BY day DESC LIMIT 14`),
    monthUsage(db),
  ]);
  return {
    state,
    listings: count,
    size_bytes: Number(size.rows[0].bytes),
    recent_runs: runs.rows,
    cache_rows: cache.rows[0].n,
    usage_days: usage.rows,
    month,
  };
}

async function startRun(db, kind) {
  const { rows } = await db.query('INSERT INTO encar_sync_runs (kind) VALUES ($1) RETURNING id', [kind]);
  return rows[0].id;
}

async function finishRun(db, id, { ok, added = 0, updated = 0, removed = 0, skipped = 0, error = null }) {
  await db.query(
    `UPDATE encar_sync_runs SET finished_at = NOW(), ok = $2, added = $3, updated = $4,
            removed = $5, skipped = $6, error = $7 WHERE id = $1`,
    [id, ok, added, updated, removed, skipped, error ? String(error).slice(0, 500) : null]
  );
}

async function recordUsage(db, { requests = 0, bytes = 0 }) {
  await db.query(
    `INSERT INTO encar_usage (day, requests, bytes) VALUES (CURRENT_DATE, $1, $2)
     ON CONFLICT (day) DO UPDATE
       SET requests = encar_usage.requests + EXCLUDED.requests,
           bytes    = encar_usage.bytes    + EXCLUDED.bytes`,
    [requests, bytes]
  );
}

async function monthUsage(db) {
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(requests), 0)::int AS requests, COALESCE(SUM(bytes), 0)::bigint AS bytes
       FROM encar_usage WHERE day >= date_trunc('month', CURRENT_DATE)`
  );
  return { requests: rows[0].requests, bytes: Number(rows[0].bytes) };
}

/** Housekeeping the worker runs hourly. Returns what it removed. */
async function housekeeping(db) {
  const cache = await db.query('DELETE FROM encar_detail_cache WHERE expires_at < NOW()');
  const runs = await db.query("DELETE FROM encar_sync_runs WHERE started_at < NOW() - INTERVAL '30 days'");
  const usage = await db.query("DELETE FROM encar_usage WHERE day < CURRENT_DATE - 400");
  return { cache: cache.rowCount, runs: runs.rowCount, usage: usage.rowCount };
}

module.exports = {
  DEFAULT_FLAGS, loadSetting, loadFlags, loadRules, getState, patchState, countListings,
  upsertListings, deleteListings, listIds, statusSummary, startRun, finishRun, recordUsage, monthUsage, housekeeping,
};
