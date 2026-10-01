const express = require('express');
const pool = require('../db');
const { log } = require('../lib/log');
const { getRate } = require('../lib/fx');
const { loadFlags } = require('../lib/encar/store');
const { photoUrl } = require('../lib/encar/normalize');

// ─────────────────────────────────────────────────────────────────────────────
// Used cars in South Korea, browsable from our own database (docs/
// ENCAR-IMPORT-PLAN.md, A10). Nothing here calls the provider: it reads the
// mirror the sync worker keeps, so a search costs one indexed query.
//
// Public, and gated by platform_settings.encar_flags.catalog_public: while that
// is false every route answers `available: false` and clients show the request
// form instead. The routes are safe to deploy before the data exists.
//
// What a response never carries: the provider's key, a licence plate, a VIN,
// the dealer's name or contact. Items are built from an explicit list of
// columns, never from `SELECT *`.
//
// Paging is by cursor, not page number: "the next 24 after this car" costs the
// same on page 500 as on page 1, and does not skip or repeat cars when the
// stock changes between requests.
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

const PAGE_DEFAULT = 24;
const PAGE_MAX = 48;
const PHOTO_PREFIX = () => process.env.ENCAR_PHOTO_PREFIX || '';

// A sort is an expression plus a direction; the id breaks ties in the SAME
// direction so (expr, id) is a total order the cursor can resume from.
const SORTS = {
  newest:       { expr: 'first_seen_at', dir: 'DESC', cast: 'timestamptz', select: 'first_seen_at::text' },
  price_asc:    { expr: 'price_man', dir: 'ASC', cast: 'int', select: 'price_man::text' },
  price_desc:   { expr: 'price_man', dir: 'DESC', cast: 'int', select: 'price_man::text' },
  mileage_asc:  { expr: 'COALESCE(mileage_km, 2147483647)', dir: 'ASC', cast: 'int', select: 'COALESCE(mileage_km, 2147483647)::text' },
  year_desc:    { expr: '(year * 100 + COALESCE(month, 0))', dir: 'DESC', cast: 'int', select: '(year * 100 + COALESCE(month, 0))::text' },
};

const LIST_COLUMNS = `id, make, model, badge, year, month, mileage_km, fuel, transmission, color,
  price_man, photo_count, photos[1] AS cover, first_seen_at`;

function encodeCursor(v, id) {
  return Buffer.from(JSON.stringify({ v, id })).toString('base64url');
}
function decodeCursor(text) {
  try {
    const { v, id } = JSON.parse(Buffer.from(String(text), 'base64url').toString('utf8'));
    return typeof v === 'string' && typeof id === 'string' ? { v, id } : null;
  } catch { return null; }
}

/** LIKE wildcards in what a person typed are literal characters, not patterns. */
const likeEscape = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

const intParam = (value, { min = 0, max = 1e9 } = {}) => {
  if (value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined; // undefined = invalid
};

const SEARCH_TEXT = "lower(make || ' ' || model || ' ' || COALESCE(badge, ''))";

async function krwPerUsd() {
  const fx = await getRate('USD', 'KRW'); // never throws
  return fx.rate ? fx : null;
}

function present(row, fx, prefix) {
  const krw = row.price_man * 10000;
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    badge: row.badge,
    year: row.year,
    month: row.month,
    mileage_km: row.mileage_km,
    fuel: row.fuel,
    transmission: row.transmission,
    color: row.color,
    price_krw: krw,
    // Display convenience, never stored and never binding: the quote is the only
    // binding figure. Rounded to the nearest 10 so it does not pretend to be exact.
    price_usd: fx ? Math.round(krw / fx.rate / 10) * 10 : null,
    photo_count: row.photo_count,
    cover: photoUrl(row.cover, prefix),
    first_seen_at: row.first_seen_at,
  };
}

const unavailable = (res) => {
  res.set('Cache-Control', 'public, max-age=60');
  return res.json({ available: false, items: [], next_cursor: null });
};

// GET /imports/korea — search and browse.
router.get('/', async (req, res) => {
  try {
    if (!(await loadFlags(pool)).catalog_public) return unavailable(res);

    const q = req.query;
    const sortKey = q.sort === undefined ? 'newest' : String(q.sort);
    const sort = SORTS[sortKey];
    if (!sort) return res.status(400).json({ error: `sort must be one of ${Object.keys(SORTS).join(', ')}` });

    const limit = intParam(q.limit, { min: 1, max: PAGE_MAX });
    const minYear = intParam(q.min_year, { min: 1980, max: 2100 });
    const maxYear = intParam(q.max_year, { min: 1980, max: 2100 });
    const maxMileage = intParam(q.max_mileage, { min: 0, max: 2_000_000 });
    const minUsd = intParam(q.min_price_usd, { min: 0, max: 10_000_000 });
    const maxUsd = intParam(q.max_price_usd, { min: 0, max: 10_000_000 });
    if ([limit, minYear, maxYear, maxMileage, minUsd, maxUsd].includes(undefined)) {
      return res.status(400).json({ error: 'A numeric filter is out of range' });
    }

    const fx = await krwPerUsd();
    if ((minUsd !== null || maxUsd !== null) && !fx) {
      return res.status(503).json({ error: 'The exchange rate is unavailable, so price filters cannot be applied right now' });
    }

    const where = [];
    const params = [];
    const add = (sql, value) => { params.push(value); where.push(sql.replace('?', `$${params.length}`)); };

    const make = String(q.make || '').trim().slice(0, 60);
    const model = String(q.model || '').trim().slice(0, 60);
    const fuel = String(q.fuel || '').trim().toLowerCase().slice(0, 40);
    const transmission = String(q.transmission || '').trim().toLowerCase().slice(0, 40);
    const text = String(q.q || '').trim().toLowerCase().slice(0, 80);

    if (make) add('lower(make) = lower(?)', make);
    if (model) add('lower(model) = lower(?)', model);
    if (fuel) add('fuel = ?', fuel);
    if (transmission) add('transmission = ?', transmission);
    if (minYear !== null) add('year >= ?', minYear);
    if (maxYear !== null) add('year <= ?', maxYear);
    if (maxMileage !== null) add('mileage_km <= ?', maxMileage);
    // USD in, man-won out: 1 man = 10,000 KRW.
    if (minUsd !== null) add('price_man >= ?', Math.ceil((minUsd * fx.rate) / 10000));
    if (maxUsd !== null) add('price_man <= ?', Math.floor((maxUsd * fx.rate) / 10000));
    if (text) {
      params.push(`%${likeEscape(text)}%`);
      const like = `$${params.length}`;
      params.push(text);
      // Substring OR a close misspelling; the trigram index serves both.
      where.push(`(${SEARCH_TEXT} LIKE ${like} ESCAPE '\\' OR $${params.length} <% ${SEARCH_TEXT})`);
    }

    if (q.cursor) {
      const c = decodeCursor(q.cursor);
      if (!c) return res.status(400).json({ error: 'Invalid cursor' });
      params.push(c.v);
      const v = `$${params.length}::${sort.cast}`;
      params.push(c.id);
      const cmp = sort.dir === 'ASC' ? '>' : '<';
      where.push(`(${sort.expr}, id) ${cmp} (${v}, $${params.length})`);
    }

    const pageSize = limit ?? PAGE_DEFAULT;
    params.push(pageSize + 1);
    // One interpolation for the whole ordering: CI parses every SQL literal with
    // the real PostgreSQL grammar (.github/scripts/check-sql.js), which stands in
    // `1` for each ${...}, and "ORDER BY 1 1, id 1" is not SQL. "ORDER BY 1" is.
    const orderBy = `${sort.expr} ${sort.dir}, id ${sort.dir}`;
    const { rows } = await pool.query(
      `SELECT ${LIST_COLUMNS}, ${sort.select} AS cursor_value
         FROM encar_listings
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY ${orderBy}
        LIMIT $${params.length}`,
      params
    );

    const more = rows.length > pageSize;
    const page = more ? rows.slice(0, pageSize) : rows;
    const prefix = PHOTO_PREFIX();
    const last = page[page.length - 1];
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      available: true,
      items: page.map((r) => present(r, fx, prefix)),
      next_cursor: more && last ? encodeCursor(last.cursor_value, last.id) : null,
      fx: fx ? { krw_per_usd: fx.rate, fetched_at: fx.fetched_at, stale: fx.stale } : null,
    });
  } catch (err) {
    log.error('korea list error', { error: err.message });
    res.status(500).json({ error: 'Could not load Korean listings' });
  }
});

// GET /imports/korea/facets — makes with counts; with ?make=, that make's models,
// fuels and year range. Counted once per ten minutes, not once per visitor.
const facetCache = new Map(); // key -> { at, value }
const FACET_TTL_MS = 10 * 60 * 1000;

router.get('/facets', async (req, res) => {
  try {
    if (!(await loadFlags(pool)).catalog_public) return unavailable(res);
    const make = String(req.query.make || '').trim().slice(0, 60);
    const key = make.toLowerCase();

    const hit = facetCache.get(key);
    if (hit && Date.now() - hit.at < FACET_TTL_MS) {
      res.set('Cache-Control', 'public, max-age=600');
      return res.json(hit.value);
    }

    let value;
    if (!make) {
      const { rows } = await pool.query(
        `SELECT make, COUNT(*)::int AS count FROM encar_listings GROUP BY make ORDER BY count DESC, make ASC`
      );
      const total = rows.reduce((n, r) => n + r.count, 0);
      value = { available: true, total, makes: rows };
    } else {
      const [models, fuels, range] = await Promise.all([
        pool.query(
          `SELECT model, COUNT(*)::int AS count FROM encar_listings
            WHERE lower(make) = lower($1) GROUP BY model ORDER BY count DESC, model ASC`, [make]),
        pool.query(
          `SELECT fuel, COUNT(*)::int AS count FROM encar_listings
            WHERE lower(make) = lower($1) AND fuel IS NOT NULL GROUP BY fuel ORDER BY count DESC`, [make]),
        pool.query(
          `SELECT MIN(year)::int AS min_year, MAX(year)::int AS max_year, MIN(price_man)::int AS min_price_man,
                  MAX(price_man)::int AS max_price_man, COUNT(*)::int AS total
             FROM encar_listings WHERE lower(make) = lower($1)`, [make]),
      ]);
      value = { available: true, make, total: range.rows[0].total, models: models.rows, fuels: fuels.rows, ranges: range.rows[0] };
    }
    if (facetCache.size > 500) facetCache.clear(); // bounded: a hostile client cannot grow it
    facetCache.set(key, { at: Date.now(), value });
    res.set('Cache-Control', 'public, max-age=600');
    res.json(value);
  } catch (err) {
    log.error('korea facets error', { error: err.message });
    res.status(500).json({ error: 'Could not load filters' });
  }
});

// GET /imports/korea/:id — one car, with every photo. The inspection report and
// the insurance record join this response once their shapes are confirmed
// against real provider data (Phase 0 spike); until then they are not served.
router.get('/:id', async (req, res) => {
  try {
    if (!(await loadFlags(pool)).catalog_public) return unavailable(res);
    const id = String(req.params.id || '');
    if (!/^[A-Za-z0-9:_-]{1,40}$/.test(id)) return res.status(404).json({ error: 'Listing not found' });

    const { rows } = await pool.query(
      `SELECT ${LIST_COLUMNS}, photos, power_ps, seats, category
         FROM encar_listings WHERE id = $1`, [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'This car is no longer available' });

    const fx = await krwPerUsd();
    const prefix = PHOTO_PREFIX();
    const row = rows[0];
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      available: true,
      ...present(row, fx, prefix),
      power_ps: row.power_ps,
      seats: row.seats,
      category: row.category,
      photos: (row.photos || []).map((p) => photoUrl(p, prefix)),
      // Honest about what is not yet known: no landed-cost figure is shown until
      // the exporter's cost sheet exists (plan E7); the request form gets a quote.
      estimate: null,
      source_note: 'Listing data comes from the Korean market. Price shown is the Korean asking price, not the cost in Kigali.',
      fx: fx ? { krw_per_usd: fx.rate, fetched_at: fx.fetched_at, stale: fx.stale } : null,
    });
  } catch (err) {
    log.error('korea detail error', { error: err.message });
    res.status(500).json({ error: 'Could not load this car' });
  }
});

module.exports = router;
module.exports._facetCache = facetCache;
