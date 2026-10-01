// ─────────────────────────────────────────────────────────────────────────────
// The provider's daily export, read as a stream (plan A2).
//
// The file holds every car, so it is NEVER loaded whole: bytes come in as
// chunks, rows go out one at a time, and the caller works in batches of 1,000.
// Memory stays flat whether the file has 100k rows or a million.
//
// The export's columns were not published when this was written (the Phase 0
// spike prints them). So the header is matched by name, forgivingly — case,
// spaces, underscores and hyphens are ignored — onto the same field names the
// JSON catalogue uses, and a file that lacks the columns we cannot work without
// is REFUSED rather than half-read. Refusing is cheap: the catalogue pages
// remain the baseline, and the export is only an optimisation and a weekly
// cross-check.
// ─────────────────────────────────────────────────────────────────────────────
const { EncarError } = require('./client');

/** "Manufacturer English", "manufacturer_english", "ManufacturerEnglish" → one key. */
const headerKey = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** What each catalogue field may be called in the export, normalised by headerKey. */
const COLUMN_ALIASES = {
  Id: ['id', 'listingid', 'vehicleid', 'carid'],
  Manufacturer: ['manufacturer', 'make', 'brand'],
  ManufacturerEnglish: ['manufacturerenglish', 'makeenglish', 'brandenglish', 'manufactureren'],
  Model: ['model'],
  ModelEnglish: ['modelenglish', 'modelen'],
  Badge: ['badge', 'trim', 'grade'],
  BadgeEnglish: ['badgeenglish', 'trimenglish', 'badgeen'],
  FuelType: ['fueltype', 'fuel'],
  FuelTypeEnglish: ['fueltypeenglish', 'fuelenglish', 'fueltypeen'],
  Transmission: ['transmission', 'gearbox'],
  Color: ['color', 'colour'],
  Category: ['category', 'bodytype', 'body'],
  Year: ['year', 'yearmonth', 'modelyear', 'yyyymm'],
  Mileage: ['mileage', 'km', 'odometer'],
  Price: ['price', 'priceman', 'pricemanwon'],
  PowerPs: ['powerps', 'ps', 'power'],
  SeatCount: ['seatcount', 'seats'],
  Photos: ['photos', 'photourls', 'images', 'photo'],
  IsDuplicate: ['isduplicate', 'duplicate'],
};

// Without these a row cannot become a listing at all.
const REQUIRED = ['Id', 'Year', 'Price'];

/** Which export column feeds which catalogue field. Throws if the file is not one we can read. */
function mapHeader(header) {
  const byKey = new Map(header.map((h, i) => [headerKey(h), i]));
  const map = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      if (byKey.has(alias)) { map[field] = byKey.get(alias); break; }
    }
  }
  const missing = REQUIRED.filter((f) => map[f] === undefined);
  if (map.Manufacturer === undefined && map.ManufacturerEnglish === undefined) missing.push('Manufacturer');
  if (map.Model === undefined && map.ModelEnglish === undefined) missing.push('Model');
  if (missing.length) {
    throw new EncarError('bad_response', `The export has no column for: ${missing.join(', ')}`);
  }
  return map;
}

/** A photos cell is a JSON array, or addresses separated by | ; , or whitespace. */
function parsePhotos(cell) {
  const s = String(cell || '').trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      return Array.isArray(arr) ? arr : [];
    } catch { /* fall through to splitting */ }
  }
  return s.split(/[|;,\s]+/).filter((u) => /^(https?:)?\//i.test(u) || /^[\w./-]+$/.test(u));
}

const truthy = (v) => /^(1|true|yes|y)$/i.test(String(v || '').trim());

/** One CSV row (array of cells) → the object normalizeItem reads. */
function rowToItem(cells, map) {
  const item = {};
  for (const [field, index] of Object.entries(map)) {
    const cell = cells[index];
    if (cell === undefined || cell === '') continue;
    if (field === 'Photos') item.Photos = parsePhotos(cell);
    else if (field === 'IsDuplicate') item.IsDuplicate = truthy(cell);
    else item[field] = cell;
  }
  return item;
}

/**
 * Parses CSV text arriving in chunks. Handles quoted cells, doubled quotes,
 * newlines inside quotes, CRLF and a leading byte-order mark.
 * @param {AsyncIterable<Buffer|Uint8Array|string>} source
 * @yields {string[]} one row's cells
 */
async function* parseCsv(source) {
  const decoder = new TextDecoder('utf-8');
  let cell = '';
  let row = [];
  let quoted = false;
  let pendingQuote = false; // saw a quote while quoted: either an escape or the close
  let started = false;

  for await (const chunk of source) {
    let text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
    if (!started) { text = text.replace(/^﻿/, ''); started = text.length > 0 || started; }
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (pendingQuote) {
        pendingQuote = false;
        if (ch === '"') { cell += '"'; continue; } // "" inside quotes is one quote
        quoted = false;                           // the earlier quote closed the cell
      }
      if (quoted) {
        if (ch === '"') pendingQuote = true;
        else cell += ch;
        continue;
      }
      if (ch === '"' && cell === '') { quoted = true; continue; }
      if (ch === ',') { row.push(cell); cell = ''; continue; }
      if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i += 1;
        row.push(cell); cell = '';
        if (row.length > 1 || row[0] !== '') yield row;
        row = [];
        continue;
      }
      cell += ch;
    }
  }
  // A file without a trailing newline still has a last row.
  if (pendingQuote) quoted = false;
  if (cell !== '' || row.length) {
    row.push(cell);
    if (row.length > 1 || row[0] !== '') yield row;
  }
}

/**
 * The export, row by row, as catalogue-shaped items.
 * @param {AsyncIterable} source the response body
 */
async function* readExport(source) {
  let map = null;
  for await (const cells of parseCsv(source)) {
    if (!map) { map = mapHeader(cells); continue; }
    yield rowToItem(cells, map);
  }
  if (!map) throw new EncarError('bad_response', 'The export was empty');
}

module.exports = { parseCsv, readExport, mapHeader, rowToItem, parsePhotos, headerKey };
