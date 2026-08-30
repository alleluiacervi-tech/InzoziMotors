// ─────────────────────────────────────────────────────────────────────────────
// Vehicle brands.
//
// The list used to be a 20-item array inside a mobile screen, duplicated into a
// second screen, which meant two things: adding a brand needed an App Store
// release, and the list was missing every Chinese marque while the catalogue
// already held three of them. A seller with a BYD picked the nearest wrong
// answer — and one did, which is why a BYD Qin Plus sits in the catalogue
// recorded as a Hyundai.
//
// ── Resolution, not just listing ─────────────────────────────────────────────
// The valuable function here is `resolveMake`. "Mercedes", "Mercedes-Benz",
// "benz" and "MERCEDES BENZ" are four spellings of one company, and a make
// filter that treats them as four brands splits one seller's stock four ways
// and makes each bucket look empty. Aliases collapse them.
//
// ── Logos are data, never bundled ────────────────────────────────────────────
// No brand mark is committed to this repo. They are third-party trademarks, and
// bundling fifty of them into an app binary means shipping somebody else's
// assets to two stores. `logo_url` points at whatever an operator uploaded, and
// every client renders a lettermark when it is null — so the interface is whole
// before a single logo exists.
// ─────────────────────────────────────────────────────────────────────────────
const pool = require('../db');
const { log } = require('./log');

// Combining accents, so Citroën and Citroen are the same brand and Škoda and
// Skoda are the same brand.
const ACCENTS = /[̀-ͯ]/g;

/** Lower-case, punctuation-free, hyphen-joined. The join key. */
function slugify(name) {
  return String(name || '')
    .normalize('NFD').replace(ACCENTS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** What a comparison should be done on: unaccented, lower-cased, single-spaced. */
const normalise = (value) => String(value || '')
  .normalize('NFD').replace(ACCENTS, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

// Brands change on the order of months and this is read on catalogue pages, so
// a per-request query would be pure waste. Short enough that an operator adding
// a brand sees it in the app within a coffee break.
const ALL_MAKES = `SELECT id, name, slug, aliases, logo_url, display_order, active
     FROM vehicle_makes
    ORDER BY display_order, name`;

const ACTIVE_MAKES = `SELECT id, name, slug, aliases, logo_url, display_order, active
     FROM vehicle_makes
    WHERE active
    ORDER BY display_order, name`;

let cache = { at: 0, rows: null };
const TTL_MS = 5 * 60 * 1000;

/** Every active brand, in display order. Never throws — a failed read returns
 *  the last good list, or an empty one, and every caller treats an empty list
 *  as "no chips to show" rather than as an error. */
async function loadMakes({ force = false, includeInactive = false } = {}) {
  if (!force && !includeInactive && cache.rows && Date.now() - cache.at < TTL_MS) return cache.rows;
  try {
    // Two whole statements rather than one with an interpolated WHERE. The
    // difference is not style: CI parses every SQL literal in this repo with
    // the real PostgreSQL grammar, and it can only do that for a string that is
    // a complete statement on its own.
    const { rows } = await pool.query(includeInactive ? ALL_MAKES : ACTIVE_MAKES);
    if (!includeInactive) cache = { at: Date.now(), rows };
    return rows;
  } catch (err) {
    log.error('vehicle makes load failed', { error: err.message });
    return cache.rows || [];
  }
}

function invalidateMakes() { cache = { at: 0, rows: null }; }

/**
 * The canonical brand for a spelling somebody typed, or null.
 *
 * Exact name first, then alias, then slug — in that order, so a brand whose
 * NAME is another brand's alias can never be shadowed by it. Nothing here
 * guesses: an unrecognised brand returns null rather than the closest match,
 * because silently rewriting a seller's "Foton" to "Ford" is worse than
 * leaving it alone.
 */
function resolveMake(makes, spelling) {
  const wanted = normalise(spelling);
  if (!wanted) return null;
  return makes.find((m) => normalise(m.name) === wanted)
    || makes.find((m) => (m.aliases || []).some((a) => normalise(a) === wanted))
    || makes.find((m) => m.slug === slugify(spelling))
    || null;
}

/**
 * Brands named in a piece of free text — for catching a listing whose recorded
 * make disagrees with its own description.
 *
 * Word-boundary matched, so "MG" does not fire on "amgs" and "Mini" does not
 * fire on "minimum". Longest names are tested first so "Land Rover" wins over
 * a hypothetical "Rover". Returns canonical rows, de-duplicated.
 */
function makesMentionedIn(makes, text) {
  const haystack = normalise(text);
  if (!haystack) return [];
  const found = new Map();
  const candidates = [];
  for (const make of makes) {
    candidates.push([normalise(make.name), make]);
    for (const alias of make.aliases || []) candidates.push([normalise(alias), make]);
  }
  candidates.sort((a, b) => b[0].length - a[0].length);
  for (const [needle, make] of candidates) {
    // A one-character brand would match somewhere in almost any sentence.
    if (needle.length < 2) continue;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack)) {
      found.set(make.slug, make);
    }
  }
  return [...found.values()];
}

module.exports = {
  slugify, normalise, loadMakes, invalidateMakes, resolveMake, makesMentionedIn,
};
