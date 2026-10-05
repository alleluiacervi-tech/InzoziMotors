// ─────────────────────────────────────────────────────────────────────────────
// Odometer readings Sawa itself recorded, and what they say together.
//
// A reading here is what an inspector saw on the dashboard and typed in when
// completing an inspection (inspections.vehicle_mileage). It is never the
// seller's declared figure: a listing's own mileage is a claim, a reading is a
// witnessed fact, and the whole point is to compare the two.
//
// Readings join across listings and owners on the normalised VIN key, but only
// for an identifier confident enough to join (lib/vin.js): two unrelated cars
// merged into one history would put another vehicle's numbers on this one.
//
// A drop is reported as a fact, not an accusation. A replaced instrument
// cluster or a mistyped digit explains some of them; the job is to make a
// person ask, and to let the buyer see both numbers.
// ─────────────────────────────────────────────────────────────────────────────
const { describeVin } = require('./vin');

const MAX_KM = 2_000_000;
// Below this, a difference between the listing and the dashboard is rounding.
const DECLARED_TOLERANCE_KM = 1000;
const DECLARED_TOLERANCE_SHARE = 0.05;

/** A reading an inspector may record: a whole number of km, or null. */
function parseOdometer(value) {
  if (value === undefined || value === null || value === '') return { ok: true, km: null };
  const km = typeof value === 'number' ? value : Number(String(value).replace(/[\s,]/g, ''));
  if (!Number.isInteger(km) || km < 0 || km > MAX_KM) return { ok: false, km: null };
  return { ok: true, km };
}

/**
 * Every completed inspection's reading for this car, and for the same vehicle
 * under earlier listings or owners when its VIN is good enough to join on.
 * Oldest first: [{ inspection_id, on, km, this_listing }].
 */
async function odometerReadings(db, { carId = null, vin = null } = {}) {
  const identity = describeVin(vin);
  const vinKey = identity.confident ? identity.key : null;
  if (!carId && !vinKey) return [];
  const { rows } = await db.query(
    `SELECT i.id, i.completed_at, i.vehicle_mileage, i.car_id
       FROM inspections i
       LEFT JOIN cars c ON c.id = i.car_id
      WHERE i.status = 'complete'
        AND i.completed_at IS NOT NULL
        AND i.vehicle_mileage IS NOT NULL
        AND (i.car_id = $1::uuid
             OR ($2::text IS NOT NULL AND (i.vehicle_vin_key = $2 OR c.vin_key = $2)))
      ORDER BY i.completed_at ASC, i.id ASC`,
    [carId, vinKey]
  );
  return rows.map((row) => ({
    inspection_id: row.id,
    on: row.completed_at,
    km: Number(row.vehicle_mileage),
    this_listing: Boolean(carId && row.car_id === carId),
  }));
}

/**
 * What the readings say together. `consistent` is null with fewer than two,
 * because one reading cannot contradict anything.
 * A drop is a reading below the highest one recorded before it.
 */
function assessReadings(readings) {
  const drops = [];
  let highest = null;
  for (const reading of readings) {
    if (highest && reading.km < highest.km) {
      drops.push({
        earlier_on: highest.on, earlier_km: highest.km,
        later_on: reading.on, later_km: reading.km,
        later_inspection_id: reading.inspection_id,
      });
    }
    if (!highest || reading.km >= highest.km) highest = reading;
  }
  return {
    count: readings.length,
    consistent: readings.length < 2 ? null : drops.length === 0,
    drops,
  };
}

/** The listing's declared mileage against the latest reading, when they differ
 *  by more than rounding. Null when they agree or either is missing. */
function declaredMismatch(declaredKm, latest) {
  const declared = Number(declaredKm);
  if (!latest || !Number.isInteger(declared) || declared < 0) return null;
  const gap = Math.abs(declared - latest.km);
  const allowed = Math.max(DECLARED_TOLERANCE_KM, Math.round(latest.km * DECLARED_TOLERANCE_SHARE));
  if (gap <= allowed) return null;
  return { declared_km: declared, read_km: latest.km, read_on: latest.on };
}

const day = (value) => new Date(value).toISOString().slice(0, 10);
const km = (value) => `${Number(value).toLocaleString('en-US')} km`;

/** Plain sentences for staff (publication warnings, review notes). */
function odometerWarnings(assessment, mismatch) {
  const out = [];
  for (const drop of assessment.drops) {
    out.push(
      `Odometer went down: Sawa recorded ${km(drop.earlier_km)} on ${day(drop.earlier_on)}, `
      + `then ${km(drop.later_km)} on ${day(drop.later_on)}. Ask the seller why (replaced cluster? typo?) `
      + 'and say so in the description: buyers see both readings.'
    );
  }
  if (mismatch) {
    out.push(
      `The listing says ${km(mismatch.declared_km)}, but the inspector read ${km(mismatch.read_km)} `
      + `on ${day(mismatch.read_on)}. Correct the listing's mileage.`
    );
  }
  return out;
}

module.exports = {
  parseOdometer,
  odometerReadings,
  assessReadings,
  declaredMismatch,
  odometerWarnings,
  MAX_KM,
};
