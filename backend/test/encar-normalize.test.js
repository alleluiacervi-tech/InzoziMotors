// Provider listing → our row, and the ingest rules. Pure functions.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeItem, evaluate, validateRules, validateFlags, packPhotos, photoUrl, extractId, DEFAULT_RULES,
} = require('../src/lib/encar/normalize');

// Shaped like the provider's published CatalogItem example (lang=en).
const item = (over = {}) => ({
  Id: '39781121',
  Manufacturer: 'BMW',
  Model: '5-Series',
  Badge: '520d',
  FuelType: 'Diesel',
  Transmission: 'Automatic',
  Year: 202105,
  Price: 4890,
  Mileage: 38200,
  PowerPs: 245,
  Photos: [{ location: 'https://img.example.test/a/1.jpg' }, { location: 'https://img.example.test/a/2.jpg' }],
  ...over,
});

test('a provider item becomes our row', () => {
  const row = normalizeItem(item());
  assert.equal(row.id, '39781121');
  assert.equal(row.make, 'BMW');
  assert.equal(row.model, '5-Series');
  assert.equal(row.year, 2021);
  assert.equal(row.month, 5);
  assert.equal(row.price_man, 4890);
  assert.equal(row.mileage_km, 38200);
  assert.equal(row.fuel, 'diesel');
  assert.equal(row.transmission, 'automatic');
  assert.equal(row.photo_count, 2);
  assert.equal(row.is_duplicate, false);
});

test('the English companion wins when the response is in Korean', () => {
  const row = normalizeItem(item({ Manufacturer: '기아', ManufacturerEnglish: 'Kia', Model: '쏘렌토', ModelEnglish: 'Sorento', FuelType: '디젤', FuelTypeEnglish: 'diesel' }));
  assert.equal(row.make, 'Kia');
  assert.equal(row.model, 'Sorento');
  assert.equal(row.fuel, 'diesel');
});

test('a year without a month is kept as a year', () => {
  const row = normalizeItem(item({ Year: 2019 }));
  assert.equal(row.year, 2019);
  assert.equal(row.month, null);
});

test('unusable items are refused rather than guessed at', () => {
  assert.equal(normalizeItem(null), null);
  assert.equal(normalizeItem({}), null);
  assert.equal(normalizeItem(item({ Id: undefined })), null);
  assert.equal(normalizeItem(item({ Manufacturer: '' })), null);
  assert.equal(normalizeItem(item({ Price: undefined })), null);
  assert.equal(normalizeItem(item({ Year: undefined })), null);
});

test('no field carries a plate, a dealer or a contact', () => {
  const row = normalizeItem(item({ LicensePlate: '12가3456', DealerName: 'Kim Motors', Phone: '010-1234-5678', Description: 'call me' }));
  const text = JSON.stringify(row);
  assert.ok(!/12가3456|Kim Motors|010-1234|call me/.test(text));
});

test('photo addresses lose a common prefix and get it back', () => {
  const prefix = 'https://img.example.test/';
  const packed = packPhotos(item().Photos, prefix);
  assert.deepEqual(packed, ['a/1.jpg', 'a/2.jpg']);
  assert.equal(photoUrl(packed[0], prefix), 'https://img.example.test/a/1.jpg');
  // an address from somewhere else is stored whole and returned as is
  const odd = packPhotos([{ location: 'https://other.test/x.jpg' }], prefix);
  assert.deepEqual(odd, ['https://other.test/x.jpg']);
  assert.equal(photoUrl(odd[0], prefix), 'https://other.test/x.jpg');
  assert.equal(photoUrl(null, prefix), null);
});

test('photos given as plain strings, or as junk, are tolerated', () => {
  assert.deepEqual(packPhotos(['https://x/1.jpg', null, {}, { location: '' }, 5]), ['https://x/1.jpg']);
  assert.deepEqual(packPhotos(undefined), []);
});

test('the id is found whatever the event calls it', () => {
  assert.equal(extractId({ Id: 5 }), '5');
  assert.equal(extractId({ listing_id: '7' }), '7');
  assert.equal(extractId('9'), '9');
  assert.equal(extractId(12), '12');
  assert.equal(extractId({}), null);
  assert.equal(extractId(null), null);
});

test('the default rules keep an ordinary car', () => {
  assert.deepEqual(evaluate(normalizeItem(item()), DEFAULT_RULES), { keep: true });
});

test('each rule drops what it should', () => {
  const r = (over) => evaluate(normalizeItem(item(over)), DEFAULT_RULES);
  assert.equal(r({ IsDuplicate: true, DuplicateOf: 1 }).reason, 'duplicate');
  assert.equal(r({ Photos: [] }).reason, 'no_photos');
  assert.equal(r({ Price: 1 }).reason, 'price');
  assert.equal(r({ Price: 0 }).reason, 'price');
  assert.equal(r({ Price: 50 }).reason, 'price');
  assert.equal(evaluate(normalizeItem(item({ Price: 0 })), { min_price_man: 0, exclude_prices_man: [] }).reason, 'price', 'the table would refuse it');
  assert.equal(r({ Year: 197001 }).reason, 'year');
  assert.equal(r({ FuelType: 'LPG' }).reason, 'fuel');
  assert.equal(r({ FuelType: 'lpg-hybrid' }).reason, 'fuel');
  assert.equal(r({ FuelType: 'cng' }).reason, 'fuel');
  assert.equal(r({ FuelType: 'hydrogen' }).reason, 'fuel');
  assert.equal(r({ FuelType: 'diesel-hybrid' }).keep, true);
  assert.equal(r({ FuelType: 'electric' }).keep, true);
});

test('age and mileage ceilings apply only when set', () => {
  const row = normalizeItem(item({ Year: 201001, Mileage: 250000 }));
  const now = new Date('2026-10-01');
  assert.equal(evaluate(row, {}, now).keep, true);
  assert.equal(evaluate(row, { max_age_years: 10 }, now).reason, 'age');
  assert.equal(evaluate(row, { max_mileage_km: 200000 }, now).reason, 'mileage');
  assert.equal(evaluate(normalizeItem(item({ Mileage: undefined })), { max_mileage_km: 1 }, now).keep, true);
});

test('rules can be relaxed', () => {
  const dup = normalizeItem(item({ IsDuplicate: true }));
  assert.equal(evaluate(dup, { exclude_duplicates: false }).keep, true);
  const bare = normalizeItem(item({ Photos: [] }));
  assert.equal(evaluate(bare, { require_photos: false }).keep, true);
});

test('admin-edited rules are validated', () => {
  assert.deepEqual(validateRules(DEFAULT_RULES), []);
  assert.deepEqual(validateRules({}), []);
  assert.ok(validateRules(null).length);
  assert.ok(validateRules({ min_price_man: -1 }).length);
  assert.ok(validateRules({ row_ceiling: 'lots' }).length);
  assert.ok(validateRules({ exclude_prices_man: [1.5] }).length);
  assert.ok(validateRules({ exclude_fuel_tokens: [''] }).length);
  assert.ok(validateRules({ require_photos: 'yes' }).length);
  assert.deepEqual(validateRules({ max_age_years: null }), []);
});

test('the two switches accept only booleans and only known names', () => {
  assert.deepEqual(validateFlags({ sync_enabled: true, catalog_public: false }), []);
  assert.ok(validateFlags({ sync_enabled: 'yes', catalog_public: false }).length);
  assert.ok(validateFlags({ sync_enabled: true }).length, 'both must be present');
  assert.ok(validateFlags({ sync_enabled: true, catalog_public: true, extra: 1 }).length);
  assert.ok(validateFlags(null).length);
});
