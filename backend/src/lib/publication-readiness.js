// ─────────────────────────────────────────────────────────────────────────────
// Publication readiness — the single verdict on whether a listing may go public.
//
// Extracted from routes/cars.js so it can be READ as well as ENFORCED. The
// approve and publish transactions call it and refuse on its verdict; the
// readiness endpoint and the vehicle journey call it to explain that verdict
// before anyone attempts the action.
//
// It must never be reimplemented. A second copy would eventually disagree with
// this one, and the first symptom would be a dashboard cheerfully reporting
// "ready to publish" next to a button that returns 409 — after which nobody
// believes the dashboard again. One computation, several readers.
// ─────────────────────────────────────────────────────────────────────────────
const {
  CHECKLIST_VERSION,
  PUBLISH_THRESHOLD,
  evaluateChecklist,
} = require('./inspection-policy');
const { describeVin } = require('./vin');
const { loadMakes, resolveMake, makesMentionedIn } = require('./vehicle-makes');

// ─── Content quality ──────────────────────────────────────────────────────────
// Advisory, never blocking. A buyer cannot audit the 150-point rigour behind a
// listing, but they can absolutely read a broken description — and they will
// price the company's credibility from it. Production currently carries a
// 23,000,000 RWF listing whose public description begins "AI Mode conversation:
// who are the make of Dongfeng Aeolus E70 2022You said:", and VINs recorded as
// "", "N/A" and "Mhbu".
//
// These are warnings rather than `missing` on purpose. Refusing to publish a
// car over a short description would strand an operator at the counter with a
// customer in front of them; the precedent is the unrecorded inspection fee,
// which is a prominent banner and not a lock.
const PASTED_CHAT = /\b(AI Mode|You said:|ChatGPT said|as an AI|I'm sorry, (?:but )?I)/i;
const MIN_DESCRIPTION = 40;

function contentWarnings(car, makes = []) {
  const warnings = [];

  const description = String(car.description || '').trim();
  if (!description) {
    warnings.push('No description — buyers see an empty Overview.');
  } else if (description.length < MIN_DESCRIPTION) {
    warnings.push(`The description is ${description.length} characters. A buyer deciding on a car needs more than a line.`);
  } else if (PASTED_CHAT.test(description)) {
    warnings.push('The description looks like pasted chat or assistant output. Rewrite it in your own words before this goes public.');
  }

  // describeVin already knows that a Japanese import carries a chassis number
  // rather than an ISO VIN, and never calls that a defect. It has existed,
  // tested, since the vehicle-identity work, and was used in exactly one place.
  const vin = describeVin(car.vin);
  if (vin.kind === 'none') {
    warnings.push('No VIN or chassis number recorded — vehicle history cannot be matched to this car.');
  } else if (vin.kind === 'short') {
    warnings.push(`"${String(car.vin).trim()}" is too short to identify a vehicle. Record the full VIN or chassis number.`);
  }

  // "KIA Sorento 2024" against "2025 Volkswagen Bora" — the same catalogue,
  // two formats. A title that does not contain its own make is usually a
  // placeholder somebody meant to come back to.
  const title = String(car.title || '');
  const make = String(car.make || '').trim();
  if (make && !title.toLowerCase().includes(make.toLowerCase())) {
    warnings.push(`The title does not mention ${make}. Buyers search by make.`);
  }
  if (/\s{2,}/.test(title)) {
    warnings.push('The title has a double space — usually a missing make or model.');
  }

  // The listing's own words disagreeing with its own `make` column.
  //
  // This is not hypothetical. A BYD Qin Plus in the catalogue is recorded as a
  // Hyundai, in a banner slot, with a description whose first sentence says
  // "The 2023 BYD Qin Plus". It happened because the brand list a seller could
  // pick from had no Chinese marque on it at all, so the nearest wrong answer
  // was the only answer — and once recorded, the car is invisible to anybody
  // filtering for the brand it actually is.
  //
  // Advisory, never blocking: a description can legitimately name another brand
  // ("a better drive than the equivalent Toyota"), and this list is meant to be
  // read by a person deciding, not enforced by a gate.
  if (makes.length && (description || title)) {
    const recorded = resolveMake(makes, car.make);
    const named = makesMentionedIn(makes, `${title} ${description}`);
    const conflicting = named.filter((m) => !recorded || m.slug !== recorded.slug);
    if (conflicting.length && recorded) {
      warnings.push(
        `Recorded as ${recorded.name}, but the listing text says `
        + `${conflicting.map((m) => m.name).join(' and ')}. `
        + 'A car filed under the wrong brand cannot be found by anyone filtering for the right one.'
      );
    } else if (conflicting.length && car.make) {
      warnings.push(
        `"${String(car.make).trim()}" is not a brand on the list, and the listing text says `
        + `${conflicting.map((m) => m.name).join(' and ')}.`
      );
    }
  }

  return warnings;
}

async function publicationReadiness(client, carId) {
  const { rows } = await client.query(
    `SELECT c.id, c.title, c.make, c.model, c.year, c.price, c.seller_id,
            c.description, c.vin,
            u.role, u.id_verified, u.account_status, u.deleted_at,
            u.seller_type, u.business_verified,
            COALESCE(cardinality(c.images), 0)::int AS legacy_photo_count,
            (SELECT COUNT(*)::int FROM car_photos p WHERE p.car_id = c.id) AS structured_photo_count,
            evidence.id AS inspection_id, evidence.status AS inspection_status,
            evidence.score AS inspection_score, evidence.checklist_results,
            evidence.checklist_version, evidence.passed AS inspection_passed,
            evidence.critical_failures, evidence.evidence_seller_id,
            evidence.evidence_make, evidence.evidence_model, evidence.evidence_year
     FROM cars c JOIN users u ON u.id = c.seller_id
     LEFT JOIN LATERAL (
       SELECT i.id, i.status, i.score, i.checklist_results, i.checklist_version,
              i.passed, i.critical_failures, s.seller_id AS evidence_seller_id,
              s.make AS evidence_make, s.model AS evidence_model, s.year AS evidence_year
         FROM inspections i
         JOIN submissions s ON s.id = i.submission_id
        WHERE i.car_id = c.id AND i.status = 'complete'
        ORDER BY i.completed_at DESC NULLS LAST, i.id DESC
        LIMIT 1
     ) evidence ON TRUE
     WHERE c.id = $1`,
    [carId]
  );
  if (!rows.length) return null;
  const settings = await client.query(
    `SELECT key, value FROM platform_settings
     WHERE key IN ('inspection_required', 'listing_min_photos')`
  );
  const values = Object.fromEntries(settings.rows.map((row) => [row.key, row.value]));
  const inspectionRequired = values.inspection_required !== false;
  const minPhotos = Math.max(Number(values.listing_min_photos) || 1, 1);
  const car = rows[0];
  const photoCount = Math.max(car.legacy_photo_count, car.structured_photo_count);
  const missing = [];
  if (!String(car.title || '').trim()) missing.push('listing title');
  if (!String(car.make || '').trim() || !String(car.model || '').trim()) missing.push('vehicle make and model');
  if (!Number.isInteger(Number(car.year)) || Number(car.year) < 1900) missing.push('valid vehicle year');
  if (!Number.isFinite(Number(car.price)) || Number(car.price) <= 0) missing.push('positive listing price');
  if (car.role !== 'seller') missing.push('seller account role');
  if (car.id_verified !== 'approved') missing.push('seller identity approval');
  if (car.account_status !== 'active' || car.deleted_at) missing.push('active seller account');
  if (car.seller_type === 'showroom' && car.business_verified !== true) missing.push('showroom business approval');
  if (photoCount < minPhotos) missing.push(`${minPhotos} valid listing photo${minPhotos === 1 ? '' : 's'}`);
  let evaluated = null;
  if (inspectionRequired) {
    if (!car.inspection_id) {
      missing.push('completed 150-point vehicle inspection');
    } else {
      evaluated = evaluateChecklist(car.checklist_results);
      if (car.checklist_version !== CHECKLIST_VERSION) missing.push('current inspection checklist version');
      if (car.evidence_seller_id !== car.seller_id) missing.push('inspection linked to the current seller');
      if (String(car.evidence_make).toLowerCase() !== String(car.make).toLowerCase()
          || String(car.evidence_model).toLowerCase() !== String(car.model).toLowerCase()
          || Number(car.evidence_year) !== Number(car.year)) missing.push('inspection linked to this vehicle make, model and year');
      if (!evaluated.valid) missing.push('complete 150-point inspection checklist');
      if (evaluated.score !== Number(car.inspection_score)) missing.push('consistent inspection score');
      if (!car.inspection_passed || !evaluated.passed) missing.push(`passing inspection (${PUBLISH_THRESHOLD}/150 with no critical failures)`);
    }
  }
  return {
    ready: missing.length === 0,
    missing: [...new Set(missing)],
    // Things worth fixing that are not worth refusing over.
    warnings: contentWarnings(car, await loadMakes()),
    photo_count: photoCount,
    min_photos: minPhotos,
    inspection_required: inspectionRequired,
    inspection: car.inspection_id ? {
      id: car.inspection_id,
      version: car.checklist_version,
      score: Number(car.inspection_score),
      passed: Boolean(car.inspection_passed && evaluated?.passed),
      critical_failures: evaluated?.critical_failures || [],
    } : null,
  };
}

// contentWarnings is exported for its own tests. It is a pure function of a car
// row and the brand list — no database, no transaction — which is what makes the
// brand-mismatch rule cheap to pin down with real listing text.
module.exports = { publicationReadiness, contentWarnings };
