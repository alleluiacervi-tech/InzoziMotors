// ─────────────────────────────────────────────────────────────────────────────
// The Korea market guide: what Korea has for sale, by make and model, and what
// recent listings ask. Built for the provider's FREE plan, which allows 25
// requests a day, 20 results a request, and no photos or vehicle details, so
// the full mirror (sync.js, migration 0052) cannot run on it.
//
// This is the one place the API asks the provider at a visitor's request, and
// it is fenced in on every side:
//   - Three kinds of answer, cached in encar_market_cache (migration 0058):
//       overview            every make and its count             24 h
//       make:<make>         that make's model lines and counts   24 h
//       model:<make>:<m>    count, price spread, 20 latest ads   48 h
//   - A make or model is only ever asked about if it appears in the provider's
//     own list one level up, so visitor input cannot mint new keys.
//   - A hard daily budget (ENCAR_MARKET_DAILY_MAX, default 20 of the 25),
//     reserved atomically in the database before each request, so two
//     visitors at once cannot both take the last one.
//   - Past the budget, or when the provider fails, the last answer is served
//     (marked stale); with no answer yet, the result says so (`pending`) and
//     the clients still show the level above.
//   - A visitor waits at most WAIT_MS; a slower answer still lands in the
//     cache for the next one.
//
// What it shows, and how the clients phrase it: Korean asking prices on a
// Korean marketplace, before shipping, duty and fees. Never a Sawa price,
// never "certified", never a car Sawa holds. Listing ids, cities and dealers
// are not stored; there is nothing to link to without the paid plan anyway.
// ─────────────────────────────────────────────────────────────────────────────
const { normalizeItem, DEFAULT_RULES } = require('./normalize');

const TTL = { overview: 24 * 3600e3, make: 24 * 3600e3, model: 48 * 3600e3 };
const WAIT_MS = 8000;
const LISTINGS_SHOWN = 20;
const MODEL_YEARS = 10;

// The provider's internal make names, as people say them.
const MAKE_LABELS = {
  KG_Mobility_Ssangyong: 'KG Mobility (SsangYong)',
  ChevroletGMDaewoo: 'Chevrolet (GM Daewoo)',
  'Renault-KoreaSamsung': 'Renault Korea (Samsung)',
  'Citroen-DS': 'Citroën / DS',
};
const MODEL_LABELS = { Santafe: 'Santa Fe' };

const label = (value, table) => table[value] || String(value).replace(/_/g, ' ').trim();
const facetsOf = (node, name) => (node?.Nodes || []).find((n) => n.Name === name)?.Facets || [];
const count = (n) => (Number.isFinite(Number(n)) ? Math.max(0, Math.trunc(Number(n))) : 0);

/** /api/nav (no filter) → every make with its count. */
function parseOverview(nav) {
  const makes = [];
  for (const type of facetsOf(nav?.iNav, 'CarType')) {
    for (const f of facetsOf(type.Refinements, 'Manufacturer')) {
      if (!f?.Value || !count(f.Count)) continue;
      makes.push({ make: String(f.Value), label: label(f.Value, MAKE_LABELS), count: count(f.Count) });
    }
  }
  makes.sort((a, b) => b.count - a.count);
  return { total: count(nav?.Count), makes };
}

/** /api/nav?manufacturer=X → that make's model lines with counts. */
function parseMake(nav, make) {
  for (const type of facetsOf(nav?.iNav, 'CarType')) {
    const facet = facetsOf(type.Refinements, 'Manufacturer').find((f) => f.Value === make);
    if (!facet) continue;
    const models = facetsOf(facet.Refinements, 'ModelGroup')
      .filter((f) => f?.Value && count(f.Count))
      .map((f) => ({ model: String(f.Value), label: label(f.Value, MODEL_LABELS), count: count(f.Count) }))
      .sort((a, b) => b.count - a.count);
    return { make, label: label(make, MAKE_LABELS), total: count(facet.Count), models };
  }
  return { make, label: label(make, MAKE_LABELS), total: 0, models: [] };
}

function median(sorted) {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** /api/catalog for one model line → count, price spread, recent listings. */
function parseModel(catalog, { make, model, minYear }) {
  const listings = [];
  for (const raw of Array.isArray(catalog?.SearchResults) ? catalog.SearchResults : []) {
    const row = normalizeItem(raw);
    // Dealers park reserved cars on placeholder prices; the mirror's own rule.
    if (!row || row.price_man < DEFAULT_RULES.min_price_man) continue;
    listings.push({
      model: row.model,
      badge: row.badge,
      year: row.year,
      month: row.month,
      mileage_km: row.mileage_km,
      fuel: row.fuel,
      price_man: row.price_man,
    });
  }
  const prices = listings.map((l) => l.price_man).sort((a, b) => a - b);
  return {
    make,
    model,
    make_label: label(make, MAKE_LABELS),
    model_label: label(model, MODEL_LABELS),
    min_year: minYear,
    total: count(catalog?.Count),
    sample: listings.length,
    price_man: prices.length ? { min: prices[0], median: median(prices), max: prices[prices.length - 1] } : null,
    listings: listings.slice(0, LISTINGS_SHOWN),
  };
}

/**
 * @param {object} deps
 *   db       pg pool or client
 *   client   the provider client (shared-client.js); needs .configured, .nav, .catalog
 *   loadFlags(db) → { market_public }
 *   dailyMax requests a day this module may spend
 *   now()    clock, injectable for tests
 */
function createMarket({ db, client, loadFlags, dailyMax = Number(process.env.ENCAR_MARKET_DAILY_MAX || 20), now = () => new Date(), waitMs = WAIT_MS }) {
  const inFlight = new Map();
  let refusedOn = null; // the provider said "no more today"

  async function available() {
    if (!client?.configured) return false;
    const flags = await loadFlags(db).catch(() => ({}));
    return flags.market_public !== false;
  }

  async function readCache(key) {
    const { rows } = await db.query('SELECT payload, fetched_at FROM encar_market_cache WHERE key = $1', [key]);
    return rows[0] || null;
  }

  async function writeCache(key, payload) {
    await db.query(
      `INSERT INTO encar_market_cache (key, payload, fetched_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, fetched_at = NOW()`,
      [key, JSON.stringify(payload)]
    );
  }

  /** Takes one request from today's budget, atomically. False when it is spent. */
  async function reserve() {
    const today = now().toISOString().slice(0, 10);
    if (refusedOn === today || !(dailyMax >= 1)) return false; // the INSERT below takes the first one unchecked
    const { rows } = await db.query(
      `INSERT INTO encar_market_cache (key, payload) VALUES ($1, '{"requests":1}')
       ON CONFLICT (key) DO UPDATE
         SET payload = jsonb_build_object('requests', (encar_market_cache.payload->>'requests')::int + 1)
       WHERE (encar_market_cache.payload->>'requests')::int < $2
       RETURNING (payload->>'requests')::int AS requests`,
      [`budget:${today}`, dailyMax]
    );
    if (rows.length && Math.random() < 0.05) {
      db.query(`DELETE FROM encar_market_cache WHERE key LIKE 'budget:%' AND fetched_at < NOW() - INTERVAL '14 days'`).catch(() => {});
    }
    return rows.length > 0;
  }

  async function spentToday() {
    const row = await readCache(`budget:${now().toISOString().slice(0, 10)}`);
    return row ? count(row.payload.requests) : 0;
  }

  /**
   * The cached answer if fresh; otherwise one budgeted fetch (shared by every
   * caller asking at the same time); otherwise the stale answer; otherwise
   * { pending }. Never throws.
   */
  async function get(key, ttl, fetcher) {
    let cached = null;
    try {
      cached = await readCache(key);
    } catch {
      return { pending: true };
    }
    const age = cached ? now().getTime() - new Date(cached.fetched_at).getTime() : Infinity;
    const result = (row, stale) => ({ data: row.payload, fetched_at: new Date(row.fetched_at).toISOString(), stale });
    if (cached && age < ttl) return result(cached, false);

    if (!inFlight.has(key)) {
      const job = (async () => {
        if (!(await reserve())) return null;
        try {
          const payload = await fetcher();
          await writeCache(key, payload);
          return { payload, fetched_at: now() };
        } catch (err) {
          if (err?.code === 'rate_limited') refusedOn = now().toISOString().slice(0, 10);
          return null;
        }
      })().finally(() => inFlight.delete(key));
      inFlight.set(key, job);
    }
    const fresh = await Promise.race([inFlight.get(key), new Promise((r) => setTimeout(() => r(undefined), waitMs))]);
    if (fresh) return result(fresh, false);
    if (cached) return result(cached, true);
    return { pending: true };
  }

  async function overview() {
    return get('overview', TTL.overview, async () => parseOverview(await client.nav({ lang: 'en' })));
  }

  /** The provider's own spelling of a make, or null if it has none by that name. */
  async function resolveMake(make) {
    const top = await overview();
    const wanted = String(make || '').trim().toLowerCase();
    const hit = top.data?.makes?.find((m) => m.make.toLowerCase() === wanted);
    return { top, make: hit?.make || null };
  }

  async function makeView(make) {
    const { top, make: known } = await resolveMake(make);
    if (!known) return top.pending ? { pending: true } : { notFound: true };
    return get(`make:${known}`, TTL.make, async () => parseMake(await client.nav({ manufacturer: known, lang: 'en' }), known));
  }

  async function modelView(make, model) {
    const parent = await makeView(make);
    if (parent.notFound || parent.pending) return parent;
    const wanted = String(model || '').trim().toLowerCase();
    const hit = parent.data.models.find((m) => m.model.toLowerCase() === wanted);
    if (!hit) return { notFound: true };
    const known = parent.data.make;
    const minYear = now().getFullYear() - (MODEL_YEARS - 1);
    return get(`model:${known}:${hit.model}`, TTL.model, async () => parseModel(
      await client.catalog({
        manufacturer: known,
        model_group: hit.model,
        min_year: minYear,
        sort: 'newest',
        exclude_duplicates: 'true',
        exclude_prices: DEFAULT_RULES.exclude_prices_man.join(','),
        lang: 'en',
        count: 'true',
      }),
      { make: known, model: hit.model, minYear }
    ));
  }

  return { available, overview, makeView, modelView, spentToday };
}

module.exports = { createMarket, parseOverview, parseMake, parseModel, MAKE_LABELS, TTL };
