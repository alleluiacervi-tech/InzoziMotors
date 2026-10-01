// ─────────────────────────────────────────────────────────────────────────────
// Turning a provider listing into a row we keep — or a reason we do not.
//
// Pure functions, no I/O: the tests feed them fixtures and the sync feeds them
// pages. Two jobs:
//
//   normalizeItem(raw)      provider CatalogItem → our row shape (or null if it
//                           is not a usable listing at all)
//   evaluate(row, rules)    the ingest rules (plan A4): should we keep it?
//
// Requests are made with lang=en, so the main fields are already English and
// the *English companions are absent. Without lang=en the main fields are
// Korean and the companions hold the English, so the companion is preferred
// when it exists: either way the result is English.
//
// Prices stay in the provider's unit (man-won: 1 = 10,000 KRW). Converting is
// presentation, done once at the edge from a live rate — never stored here.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_RULES = Object.freeze({
  exclude_duplicates: true,
  require_photos: true,
  min_price_man: 100,
  exclude_prices_man: [0, 1],
  exclude_fuel_tokens: ['lpg', 'cng', 'hydrogen'],
  max_age_years: null,
  max_mileage_km: null,
  row_ceiling: 250000,
});

const text = (v, max = 120) => {
  const s = v == null ? '' : String(v).trim();
  return s ? s.slice(0, max) : null;
};
const int = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};
// An optional figure that does not fit its column is a bad value, not a bad
// listing: it becomes "unknown" (null) so the car is kept. Columns: SMALLINT is
// 32767, INTEGER 2147483647 (migration 0052); a real odometer never nears it.
const SMALLINT_MAX = 32767;
const INT_MAX = 2147483647;
const bounded = (n, max) => (n != null && n >= 0 && n <= max ? n : null);
const first = (...values) => values.find((v) => v !== undefined && v !== null && v !== '');

/** Provider ids are strings; bare numeric for Encar. Tolerant of the field's name. */
function extractId(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw).trim() || null;
  const id = first(raw.Id, raw.id, raw.listing_id, raw.ListingId, raw.listingId);
  return id == null ? null : String(id).trim() || null;
}

/**
 * Photo addresses are stored without their host: every car repeats the same
 * ~40 characters, times twenty photos, times 150k cars. `prefix` is the common
 * start (ENCAR_PHOTO_PREFIX); an address that does not start with it is stored
 * whole, so nothing is ever lost or guessed.
 */
function packPhotos(photos, prefix = '') {
  if (!Array.isArray(photos)) return [];
  const out = [];
  for (const p of photos) {
    const url = typeof p === 'string' ? p : p?.location;
    if (typeof url !== 'string' || !url) continue;
    out.push(prefix && url.startsWith(prefix) ? url.slice(prefix.length) : url);
  }
  return out;
}

/** The inverse: a stored value back into an address a browser can load. */
function photoUrl(stored, prefix = '') {
  if (!stored) return null;
  return /^https?:\/\//i.test(stored) ? stored : `${prefix}${stored}`;
}

function normalizeItem(raw, { photoPrefix = '' } = {}) {
  const id = extractId(raw);
  if (!id || typeof raw !== 'object') return null;

  const make = text(first(raw.ManufacturerEnglish, raw.Manufacturer, raw.make));
  const model = text(first(raw.ModelEnglish, raw.Model, raw.model));
  const yyyymm = int(first(raw.Year, raw.year));
  const price = int(first(raw.Price, raw.price));
  if (!make || !model || !yyyymm || price == null) return null;

  const year = yyyymm > 9999 ? Math.floor(yyyymm / 100) : yyyymm;
  const month = yyyymm > 9999 ? yyyymm % 100 : null;
  const photos = packPhotos(raw.Photos ?? raw.photos, photoPrefix);

  return {
    id,
    make,
    model,
    badge: text(first(raw.BadgeEnglish, raw.Badge, raw.badge)),
    fuel: text(first(raw.FuelTypeEnglish, raw.FuelType, raw.fuel), 40)?.toLowerCase() || null,
    transmission: text(first(raw.Transmission, raw.transmission), 40)?.toLowerCase() || null,
    color: text(first(raw.Color, raw.color), 40)?.toLowerCase() || null,
    category: text(first(raw.Category, raw.category), 40)?.toLowerCase() || null,
    year,
    month: month >= 1 && month <= 12 ? month : null,
    mileage_km: bounded(int(first(raw.Mileage, raw.mileage)), INT_MAX),
    price_man: price,
    power_ps: bounded(int(first(raw.PowerPs, raw.power_ps)), SMALLINT_MAX),
    seats: bounded(int(first(raw.SeatCount, raw.seats)), SMALLINT_MAX),
    photo_count: photos.length,
    photos,
    is_duplicate: raw.IsDuplicate === true,
  };
}

/**
 * @returns {{ keep: true } | { keep: false, reason: string }}
 * `now` is injectable so the age rule is testable.
 */
function evaluate(row, rulesIn = {}, now = new Date()) {
  const rules = { ...DEFAULT_RULES, ...rulesIn };
  if (rules.exclude_duplicates && row.is_duplicate) return { keep: false, reason: 'duplicate' };
  if (rules.require_photos && row.photo_count === 0) return { keep: false, reason: 'no_photos' };
  // Not rules, constraints: the table refuses these (CHECK in migration 0052), and
  // one bad row must never fail a whole page.
  if (row.price_man <= 0 || row.price_man > INT_MAX) return { keep: false, reason: 'price' };
  if (row.year < 1980 || row.year > 2100) return { keep: false, reason: 'year' };
  if (row.price_man < rules.min_price_man || (rules.exclude_prices_man || []).includes(row.price_man)) {
    return { keep: false, reason: 'price' };
  }
  const fuel = row.fuel || '';
  if ((rules.exclude_fuel_tokens || []).some((t) => fuel.includes(String(t).toLowerCase()))) {
    return { keep: false, reason: 'fuel' };
  }
  if (rules.max_age_years != null && now.getFullYear() - row.year > rules.max_age_years) {
    return { keep: false, reason: 'age' };
  }
  if (rules.max_mileage_km != null && row.mileage_km != null && row.mileage_km > rules.max_mileage_km) {
    return { keep: false, reason: 'mileage' };
  }
  return { keep: true };
}

/** Problems with an admin-edited rules object; empty means valid. */
function validateRules(value) {
  const problems = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['Rules must be an object'];
  for (const k of ['exclude_duplicates', 'require_photos']) {
    if (value[k] !== undefined && typeof value[k] !== 'boolean') problems.push(`${k} must be true or false`);
  }
  for (const k of ['min_price_man', 'row_ceiling']) {
    if (value[k] !== undefined && (!Number.isInteger(value[k]) || value[k] < 0)) problems.push(`${k} must be a whole number, zero or more`);
  }
  for (const k of ['max_age_years', 'max_mileage_km']) {
    if (value[k] != null && (!Number.isInteger(value[k]) || value[k] < 0)) problems.push(`${k} must be a whole number or empty`);
  }
  for (const k of ['exclude_prices_man', 'exclude_fuel_tokens']) {
    if (value[k] !== undefined && !Array.isArray(value[k])) problems.push(`${k} must be a list`);
  }
  if (Array.isArray(value.exclude_prices_man) && value.exclude_prices_man.some((n) => !Number.isInteger(n))) {
    problems.push('exclude_prices_man must hold whole numbers');
  }
  if (Array.isArray(value.exclude_fuel_tokens) && value.exclude_fuel_tokens.some((t) => typeof t !== 'string' || !t)) {
    problems.push('exclude_fuel_tokens must hold words');
  }
  return problems;
}

/** The two switches (platform_settings.encar_flags). Booleans only, nothing else. */
function validateFlags(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['Flags must be an object'];
  const problems = [];
  for (const k of ['sync_enabled', 'catalog_public']) {
    if (typeof value[k] !== 'boolean') problems.push(`${k} must be true or false`);
  }
  for (const k of Object.keys(value)) {
    if (!['sync_enabled', 'catalog_public'].includes(k)) problems.push(`${k} is not a known flag`);
  }
  return problems;
}

module.exports = { DEFAULT_RULES, normalizeItem, evaluate, validateRules, validateFlags, extractId, packPhotos, photoUrl };
