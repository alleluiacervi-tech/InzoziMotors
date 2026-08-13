const { renderabilityError } = require('./fonts');

// The gate between "admin pressed Generate" and a PDF existing.
//
// A contract with a blank field is worse than no contract: it looks complete,
// gets signed, and only fails when someone tries to rely on it. So every field
// the document prints as a fact is required here, by name, and the endpoint
// returns the whole list at once rather than one error at a time — an admin
// standing at a handover desk should learn everything that is missing in one
// round trip, not five.

// field -> label shown to the admin. Order matters: it is the order the form
// and the error list use.
const REQUIRED = [
  ['seller.legal_name',      'Seller — full legal name'],
  ['seller.id_number',       'Seller — national ID or passport number'],
  ['seller.id_type',         'Seller — identity document type'],
  ['seller.phone',           'Seller — telephone'],
  ['seller.address_line',    'Seller — address'],
  ['seller.district',        'Seller — district'],

  ['buyer.legal_name',       'Buyer — full legal name'],
  ['buyer.id_number',        'Buyer — national ID or passport number'],
  ['buyer.id_type',          'Buyer — identity document type'],
  ['buyer.phone',            'Buyer — telephone'],
  ['buyer.address_line',     'Buyer — address'],
  ['buyer.district',         'Buyer — district'],

  ['vehicle.make',           'Vehicle — make'],
  ['vehicle.model',          'Vehicle — model'],
  ['vehicle.year',           'Vehicle — year of manufacture'],
  ['vehicle.vin',            'Vehicle — chassis / VIN'],
  ['vehicle.plate',          'Vehicle — registration plate'],
  ['vehicle.mileage_km',     'Vehicle — odometer reading'],
  ['vehicle.condition',      'Vehicle — declared condition'],

  ['terms.currency',         'Sale terms — currency'],
  ['terms.price_minor',      'Sale terms — agreed price'],
  ['terms.payment_method',   'Sale terms — payment method'],
  ['terms.handover_on',      'Sale terms — handover date'],
  ['terms.handover_center',  'Sale terms — handover centre'],

  ['sawa.officer_name',      'Sawa Cars — name of authorised officer'],
  ['sawa.officer_id',        'Sawa Cars — staff ID of authorised officer'],
];

// Free text that a party supplies and the PDF prints verbatim — every one of
// these goes through the glyph/script gate.
const PARTY_TEXT = [
  ['seller.legal_name',   'Seller — full legal name'],
  ['seller.address_line', 'Seller — address'],
  ['seller.district',     'Seller — district'],
  ['seller.sector',       'Seller — sector'],
  ['seller.cell',         'Seller — cell'],
  ['buyer.legal_name',    'Buyer — full legal name'],
  ['buyer.address_line',  'Buyer — address'],
  ['buyer.district',      'Buyer — district'],
  ['buyer.sector',        'Buyer — sector'],
  ['buyer.cell',          'Buyer — cell'],
  ['vehicle.condition',   'Vehicle — declared condition'],
  ['vehicle.plate',       'Vehicle — registration plate'],
  ['terms.payment_method','Sale terms — payment method'],
  ['sawa.officer_name',   'Sawa Cars — name of authorised officer'],
];

// Long values are allowed — the layout wraps them — but a value long enough to
// be a paste accident should not silently become a three-page contract.
const MAX_LEN = {
  'seller.legal_name': 120, 'buyer.legal_name': 120,
  'seller.address_line': 240, 'buyer.address_line': 240,
  'vehicle.condition': 900, 'terms.payment_method': 120,
  'sawa.officer_name': 120, 'vehicle.plate': 24,
  'seller.id_number': 40, 'buyer.id_number': 40,
};

const ID_TYPES = ['national_id', 'passport', 'driving_licence'];

function get(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function isBlank(v) {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

/**
 * @returns {{ok: true} | {ok: false, errors: Array<{field, label, problem}>}}
 */
function validateContractData(data) {
  const errors = [];
  const add = (field, label, problem) => errors.push({ field, label, problem });

  for (const [field, label] of REQUIRED) {
    if (isBlank(get(data, field))) add(field, label, 'is required');
  }

  // Types and ranges. Each check guards against a value that would print as
  // nonsense rather than fail loudly.
  const year = Number(get(data, 'vehicle.year'));
  if (!isBlank(get(data, 'vehicle.year'))) {
    const nextYear = new Date().getUTCFullYear() + 1;
    if (!Number.isInteger(year) || year < 1950 || year > nextYear) {
      add('vehicle.year', 'Vehicle — year of manufacture', `must be a year between 1950 and ${nextYear}`);
    }
  }

  const mileage = Number(get(data, 'vehicle.mileage_km'));
  if (!isBlank(get(data, 'vehicle.mileage_km')) && (!Number.isInteger(mileage) || mileage < 0 || mileage > 2_000_000)) {
    add('vehicle.mileage_km', 'Vehicle — odometer reading', 'must be a whole number of kilometres');
  }

  const price = Number(get(data, 'terms.price_minor'));
  if (!isBlank(get(data, 'terms.price_minor')) && (!Number.isFinite(price) || price <= 0)) {
    add('terms.price_minor', 'Sale terms — agreed price', 'must be greater than zero');
  }

  const deposit = get(data, 'terms.deposit_minor');
  if (!isBlank(deposit)) {
    const d = Number(deposit);
    if (!Number.isFinite(d) || d < 0) {
      add('terms.deposit_minor', 'Sale terms — deposit', 'must be zero or more');
    } else if (Number.isFinite(price) && d > price) {
      add('terms.deposit_minor', 'Sale terms — deposit', 'cannot be more than the agreed price');
    }
  }

  const currency = get(data, 'terms.currency');
  if (!isBlank(currency) && currency !== 'RWF') {
    add('terms.currency', 'Sale terms — currency', 'must be RWF');
  }

  for (const side of ['seller', 'buyer']) {
    const t = get(data, `${side}.id_type`);
    if (!isBlank(t) && !ID_TYPES.includes(t)) {
      add(`${side}.id_type`, `${side === 'seller' ? 'Seller' : 'Buyer'} — identity document type`,
        `must be one of ${ID_TYPES.join(', ')}`);
    }
  }

  // Dates must parse, and a balance cannot fall due before the sale is agreed.
  const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v)) && !Number.isNaN(Date.parse(v));
  const handoverOn = get(data, 'terms.handover_on');
  if (!isBlank(handoverOn) && !isDate(handoverOn)) {
    add('terms.handover_on', 'Sale terms — handover date', 'must be a date (YYYY-MM-DD)');
  }
  const balanceDue = get(data, 'terms.balance_due_on');
  if (!isBlank(balanceDue)) {
    if (!isDate(balanceDue)) {
      add('terms.balance_due_on', 'Sale terms — balance due date', 'must be a date (YYYY-MM-DD)');
    } else if (isDate(handoverOn) && Date.parse(balanceDue) < Date.parse(handoverOn)) {
      // Not fatal in law, but almost always a typo — and a contract that says
      // the balance was due before handover is a dispute waiting to happen.
      add('terms.balance_due_on', 'Sale terms — balance due date', 'falls before the handover date');
    }
  }

  // An expired identity document cannot be cited as proof of identity.
  for (const side of ['seller', 'buyer']) {
    const exp = get(data, `${side}.id_expiry`);
    if (!isBlank(exp)) {
      if (!isDate(exp)) {
        add(`${side}.id_expiry`, `${side === 'seller' ? 'Seller' : 'Buyer'} — document expiry`, 'must be a date (YYYY-MM-DD)');
      } else if (Date.parse(exp) < Date.now()) {
        add(`${side}.id_expiry`, `${side === 'seller' ? 'Seller' : 'Buyer'} — document expiry`,
          'has passed — an expired document cannot identify a party');
      }
    }
  }

  for (const [field, label] of Object.entries(MAX_LEN).map(([f]) => [f, (REQUIRED.concat(PARTY_TEXT).find(([r]) => r === f) || [f, f])[1]])) {
    const v = get(data, field);
    if (typeof v === 'string' && v.trim().length > MAX_LEN[field]) {
      add(field, label, `is longer than ${MAX_LEN[field]} characters`);
    }
  }

  // The renderability gate — see lib/contract/fonts.js for why this is not
  // optional. Only run it on fields that are actually present.
  for (const [field, label] of PARTY_TEXT) {
    const v = get(data, field);
    if (isBlank(v)) continue;
    const problem = renderabilityError(v);
    if (problem) add(field, label, problem);
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

module.exports = { validateContractData, REQUIRED, ID_TYPES };
