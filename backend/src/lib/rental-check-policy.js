// The Sawa Rental Check: what a rental car must show before it is listed.
//
// A renter's question is not a buyer's. A buyer needs the 150-point inspection
// (inspection-policy.js) to judge what a car is worth before paying millions; a
// renter needs to know the car is legal, safe and as pictured for the next few
// days. So rentals get ten points, checked in about twenty minutes at the
// provider's yard, and the check is repeated every year or whenever a document
// runs out.
//
//   documents      Sawa sees the originals and records the expiry dates. We
//                  do NOT claim to have checked them against any registry or
//                  insurer — Sawa has no such access (CLAUDE.md, Vehicle record).
//   safety         A failure keeps the car off the catalogue until fixed.
//   as_advertised  A failure is shown on the listing, not blocking.
//
// This module is the only authority for the list, its wording and pass/fail.
// Like inspection-policy.js it throws at require-time if the list is malformed,
// so a bad edit is a failed boot, not a wrong badge.

const RENTAL_CHECK_VERSION = 'sawa-rental-10-v1';
const RENTAL_CHECK_VALID_MONTHS = 12;
const VERDICTS = new Set(['pass', 'fail']);

const GROUPS = [
  { id: 'documents', name: 'Documents', blocking: true },
  { id: 'safety', name: 'Safety', blocking: true },
  { id: 'as_advertised', name: 'As advertised', blocking: false },
];

const item = (id, group, label, hint) => ({ id, group, label, hint });

const ITEMS = [
  item('d1', 'documents', 'Registration card matches the car and the provider',
    'Plate and chassis number on the card match the car; the card is in the provider\'s name or they hold the owner\'s written authority to rent it.'),
  item('d2', 'documents', 'Insurance covers rental use',
    'Certificate seen, cover includes hire or rental use, and the expiry date is recorded below.'),
  item('d3', 'documents', 'Technical control is current',
    'Contrôle technique certificate seen and the expiry date is recorded below.'),
  item('s1', 'safety', 'Tyres, spare wheel, jack and wrench',
    'Tread and sidewalls safe on all four tyres; a usable spare, jack and wheel wrench are in the car.'),
  item('s2', 'safety', 'Brakes and handbrake',
    'Straight, firm stop on a short road test; the handbrake holds on a slope.'),
  item('s3', 'safety', 'Lights, indicators, horn and wipers',
    'Headlights (both beams), brake lights, indicators, horn and front wipers all work.'),
  item('s4', 'safety', 'A working seatbelt at every seat',
    'Every seat the listing counts has a belt that latches and retracts.'),
  item('s5', 'safety', 'Starts cleanly with no warning lights',
    'Starts first time, no warning lights stay on, and the odometer reading is recorded below.'),
  item('a1', 'as_advertised', 'Air conditioning, windows and locks',
    'AC blows cold, windows and central locking work; if listed as safari-ready, 4x4 engages.'),
  item('a2', 'as_advertised', 'Photos show this car, damage recorded',
    'The listing photos are of this car, and existing scratches or dents are photographed or noted.'),
];

const GROUP_BY_ID = new Map(GROUPS.map((g) => [g.id, g]));
const ITEM_BY_ID = new Map(ITEMS.map((entry) => [entry.id, entry]));

// Fail loudly on a malformed edit.
if (ITEMS.length !== 10) throw new Error(`Rental check must have 10 items, has ${ITEMS.length}`);
if (ITEM_BY_ID.size !== ITEMS.length) throw new Error('Rental check item ids must be unique');
for (const entry of ITEMS) {
  if (!GROUP_BY_ID.has(entry.group)) throw new Error(`Rental check item ${entry.id} has unknown group ${entry.group}`);
}

const isBlocking = (entry) => GROUP_BY_ID.get(entry.group).blocking;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Validates and scores one check as staff submit it.
 *
 * input: {
 *   results: { [itemId]: { verdict: 'pass'|'fail', note?: string } },
 *   insurance_expires_on: 'YYYY-MM-DD',
 *   technical_control_expires_on: 'YYYY-MM-DD',
 *   odometer_km: integer,
 * }
 * today: 'YYYY-MM-DD' (Kigali), injected so the rule is testable.
 *
 * Returns { errors: string[] } or the normalised check with its outcome.
 */
function evaluateRentalCheck(input, today) {
  const errors = [];
  const raw = input?.results;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { errors: ['results must give a verdict for each of the 10 points'] };
  }
  const unknown = Object.keys(raw).filter((id) => !ITEM_BY_ID.has(id));
  if (unknown.length) errors.push(`Unknown check items: ${unknown.join(', ')}`);

  const results = {};
  for (const entry of ITEMS) {
    const given = raw[entry.id];
    const verdict = given?.verdict;
    if (!VERDICTS.has(verdict)) {
      errors.push(`${entry.label}: choose pass or fail`);
      continue;
    }
    const note = typeof given.note === 'string' ? given.note.trim().slice(0, 500) : '';
    // A fail without a reason is useless to the provider who has to fix it and,
    // for the as-advertised points, to the renter who is shown it.
    if (verdict === 'fail' && note.length < 3) errors.push(`${entry.label}: say what failed`);
    results[entry.id] = note ? { verdict, note } : { verdict };
  }

  const insurance = input.insurance_expires_on;
  const technical = input.technical_control_expires_on;
  if (!validDate(insurance)) errors.push('Record the insurance expiry date (YYYY-MM-DD)');
  if (!validDate(technical)) errors.push('Record the technical control expiry date (YYYY-MM-DD)');
  const odometer = Number(input.odometer_km);
  if (!Number.isInteger(odometer) || odometer < 0 || odometer > 2_000_000) {
    errors.push('Record the odometer reading in whole kilometres');
  }

  // The dates and the verdicts must tell the same story: a "pass" on a document
  // that has already run out would list a car on paper Sawa itself recorded as
  // expired.
  if (validDate(insurance) && insurance < today && results.d2?.verdict === 'pass') {
    errors.push('Insurance has expired; it cannot pass');
  }
  if (validDate(technical) && technical < today && results.d3?.verdict === 'pass') {
    errors.push('Technical control has expired; it cannot pass');
  }
  if (errors.length) return { errors };

  const failedBlocking = ITEMS.filter((entry) => isBlocking(entry) && results[entry.id].verdict === 'fail');
  const passedCount = ITEMS.filter((entry) => results[entry.id].verdict === 'pass').length;
  return {
    errors: [],
    version: RENTAL_CHECK_VERSION,
    results,
    passed: failedBlocking.length === 0,
    passed_count: passedCount,
    failed_blocking: failedBlocking.map((entry) => ({ id: entry.id, label: entry.label, note: results[entry.id].note })),
    insurance_expires_on: insurance,
    technical_control_expires_on: technical,
    odometer_km: odometer,
  };
}

/** The as-advertised points a renter is told about: non-blocking fails only.
 *  Blocking fails never reach a renter, because such a car is not listed. */
function disclosures(results) {
  if (!results || typeof results !== 'object') return [];
  return ITEMS
    .filter((entry) => !isBlocking(entry) && results[entry.id]?.verdict === 'fail')
    .map((entry) => ({ id: entry.id, label: entry.label, note: results[entry.id].note || null }));
}

function publicDefinition() {
  return {
    version: RENTAL_CHECK_VERSION,
    item_count: ITEMS.length,
    valid_months: RENTAL_CHECK_VALID_MONTHS,
    verdicts: [...VERDICTS],
    groups: GROUPS,
    items: ITEMS.map((entry) => ({ ...entry, blocking: isBlocking(entry) })),
  };
}

module.exports = {
  RENTAL_CHECK_VERSION,
  RENTAL_CHECK_VALID_MONTHS,
  GROUPS,
  ITEMS,
  ITEM_BY_ID,
  evaluateRentalCheck,
  disclosures,
  publicDefinition,
};
