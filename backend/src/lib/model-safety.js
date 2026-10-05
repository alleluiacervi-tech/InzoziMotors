// ─────────────────────────────────────────────────────────────────────────────
// Safety data for a MODEL, from NHTSA's free public APIs (no key, no contract):
//
//   recalls      api.nhtsa.gov/recalls/recallsByVehicle
//   complaints   api.nhtsa.gov/complaints/complaintsByVehicle
//   ratings      api.nhtsa.gov/SafetyRatings (US NCAP crash-test stars)
//   coverage     vpic GetModelsForMakeYear + the recall/complaint model lists
//
// What it is and is not, and the clients repeat it word for word:
//   - It describes the make + model + year, never the individual car. A recall
//     issued for the 2016 RAV4 does not say this RAV4 was affected, or repaired.
//   - It covers models sold in the United States. Many of Rwanda's cars are
//     Japanese-market models (Fielder, Harrier, Vitz) that NHTSA has never
//     heard of. Those come back `not_covered` and the clients show nothing
//     rather than "0 recalls", which would read as a clean bill of health.
//
// Matching is deliberately strict. "Land Cruiser Prado" is not the "Land
// Cruiser"; borrowing another model's recalls would be worse than showing none.
// Only drivetrain/powertrain words are dropped ("RAV4 Hybrid" → "RAV4").
//
// Cached per model-year for a week in model_safety_cache (migration 0057), so a
// listing page costs NHTSA nothing after the first view. When NHTSA is down, a
// stale answer is served, and with none at all the result is `unavailable`.
// Never throws.
// ─────────────────────────────────────────────────────────────────────────────
const { log } = require('./log');

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 6000;
const FIRST_YEAR = 1990;
const MAX_RECALLS = 25;
const MAX_TEXT = 600;
const MAX_RATED_VARIANTS = 4;

// Words that name a drivetrain or powertrain, not a different vehicle.
const SOFT_SUFFIX = new Set(['hybrid', 'phev', 'ev', 'awd', '4wd', '2wd', 'fwd', 'rwd', '4x4', '4x2', 'plugin', 'plug']);

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const clip = (s, max = MAX_TEXT) => {
  const text = String(s || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

let fetchJson = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json' } });
  // NHTSA answers "nothing found" with a 400 and an ordinary empty result
  // body. That is an answer, not an outage.
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    if (Array.isArray(body?.results) || Array.isArray(body?.Results)) return body;
  }
  if (!res.ok) throw new Error(`NHTSA ${res.status}`);
  return res.json();
};

/**
 * The NHTSA model name our model corresponds to, or null.
 * Exact (ignoring case, spaces and punctuation) first; then our model with its
 * trailing drivetrain words removed. Never a prefix or a "contains".
 */
function matchModel(ours, candidates) {
  const target = norm(ours);
  if (!target) return null;
  const byKey = new Map();
  for (const name of candidates) {
    const key = norm(name);
    if (key && !byKey.has(key)) byKey.set(key, name);
  }
  if (byKey.has(target)) return byKey.get(target);
  const parts = words(ours);
  while (parts.length > 1 && SOFT_SUFFIX.has(parts[parts.length - 1])) {
    parts.pop();
    const key = parts.join('');
    if (byKey.has(key)) return byKey.get(key);
  }
  return null;
}

/** NHTSA writes recall dates as DD/MM/YYYY. */
function isoDate(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || ''));
  if (!m) return null;
  const [, a, b, y] = m;
  const day = Number(a);
  const month = Number(b);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${b}-${a}`;
}

function summariseComplaints(results) {
  const counts = new Map();
  let crashes = 0;
  let fires = 0;
  let injuries = 0;
  let deaths = 0;
  for (const row of results) {
    if (row.crash) crashes += 1;
    if (row.fire) fires += 1;
    injuries += Number(row.numberOfInjuries) || 0;
    deaths += Number(row.numberOfDeaths) || 0;
    for (const raw of String(row.components || '').split(',')) {
      const component = raw.trim();
      if (component) counts.set(component, (counts.get(component) || 0) + 1);
    }
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([component, count]) => ({ component, count }));
  return { total: results.length, top_components: top, crashes, fires, injuries, deaths };
}

async function ratingFor(year, make, model) {
  const enc = encodeURIComponent;
  const variants = await fetchJson(
    `https://api.nhtsa.gov/SafetyRatings/modelyear/${year}/make/${enc(make)}/model/${enc(model)}`
  );
  const list = (variants?.Results || []).slice(0, MAX_RATED_VARIANTS);
  const rated = [];
  for (const variant of list) {
    const detail = await fetchJson(`https://api.nhtsa.gov/SafetyRatings/VehicleId/${variant.VehicleId}`);
    const stars = Number(detail?.Results?.[0]?.OverallRating);
    if (Number.isInteger(stars) && stars >= 1 && stars <= 5) {
      rated.push({ description: clip(variant.VehicleDescription, 120), overall: stars });
    }
  }
  if (!rated.length) return null;
  const stars = rated.map((r) => r.overall);
  return { min: Math.min(...stars), max: Math.max(...stars), variants: rated };
}

/** One live lookup. Throws on a network failure, so the caller can fall back. */
async function fetchFromNhtsa(make, model, year) {
  const enc = encodeURIComponent;
  const [vpic, recallModels, complaintModels] = await Promise.all([
    fetchJson(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${enc(make)}/modelyear/${year}?format=json`),
    fetchJson(`https://api.nhtsa.gov/products/vehicle/models?modelYear=${year}&make=${enc(make)}&issueType=r`),
    fetchJson(`https://api.nhtsa.gov/products/vehicle/models?modelYear=${year}&make=${enc(make)}&issueType=c`),
  ]);
  const soldModels = (vpic?.Results || []).map((r) => r.Model_Name).filter(Boolean);
  const recallIndex = (recallModels?.results || []).map((r) => r.model).filter(Boolean);
  const complaintIndex = (complaintModels?.results || []).map((r) => r.model).filter(Boolean);

  const matched = matchModel(model, [...soldModels, ...recallIndex, ...complaintIndex]);
  if (!matched) return { status: 'not_covered' };
  // Each dataset spells models its own way ("Land Cruiser" / "LAND CRUISER").
  const recallName = matchModel(model, recallIndex);
  const complaintName = matchModel(model, complaintIndex);

  const query = (name) => `make=${enc(make)}&model=${enc(name)}&modelYear=${year}`;
  const [recalls, complaints, rating] = await Promise.all([
    fetchJson(`https://api.nhtsa.gov/recalls/recallsByVehicle?${query(recallName || matched)}`),
    fetchJson(`https://api.nhtsa.gov/complaints/complaintsByVehicle?${query(complaintName || matched)}`),
    // Ratings are a nicety: a failure here must not cost the recalls.
    ratingFor(year, make, matched).catch(() => null),
  ]);

  // NHTSA's own index says whether a model HAS recalls/complaints that year.
  // When it lists the model but the query returns nothing, the two disagree
  // (2015 Mercedes C-Class, probed Oct 2026), and "0 recalls" would be false.
  // That is reported as unknown, which the clients do not show at all.
  const recallList = recalls?.results || [];
  const complaintList = complaints?.results || [];
  const recallsKnown = !(recallName && recallList.length === 0);
  const complaintsKnown = !(complaintName && complaintList.length === 0);

  const recallRows = recallList
    .map((r) => ({
      campaign: clip(r.NHTSACampaignNumber, 20),
      reported_on: isoDate(r.ReportReceivedDate),
      component: clip(r.Component, 160),
      summary: clip(r.Summary),
      consequence: clip(r.Consequence),
      remedy: clip(r.Remedy),
    }))
    .sort((a, b) => String(b.reported_on || '').localeCompare(String(a.reported_on || '')));

  return {
    status: 'covered',
    source: 'NHTSA (United States)',
    matched_model: matched,
    recalls_known: recallsKnown,
    recall_count: recallsKnown ? recallRows.length : null,
    recalls: recallsKnown ? recallRows.slice(0, MAX_RECALLS) : [],
    complaints: complaintsKnown ? summariseComplaints(complaintList) : null,
    rating,
  };
}

const inFlight = new Map();

/**
 * Safety data for make + model + year. `db` is a pool or client.
 * Returns { status: 'covered' | 'not_covered' | 'unavailable', ... , fetched_at, stale? }.
 */
async function modelSafety(db, { make, model, year }) {
  const y = Number(year);
  const makeKey = norm(make);
  const modelKey = norm(model);
  if (!makeKey || !modelKey || !Number.isInteger(y) || y < FIRST_YEAR || y > new Date().getFullYear() + 1) {
    return { status: 'not_covered' };
  }

  let cached = null;
  try {
    const { rows } = await db.query(
      'SELECT payload, fetched_at FROM model_safety_cache WHERE make_key = $1 AND model_key = $2 AND year = $3',
      [makeKey, modelKey, y]
    );
    cached = rows[0] || null;
  } catch (err) {
    log.warn('model safety cache read failed', { error: err.message });
  }
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < TTL_MS) {
    return { ...cached.payload, fetched_at: cached.fetched_at };
  }

  // Two viewers of the same new listing share one set of NHTSA calls.
  const flightKey = `${makeKey}|${modelKey}|${y}`;
  if (!inFlight.has(flightKey)) {
    inFlight.set(flightKey, fetchFromNhtsa(String(make).trim(), String(model).trim(), y)
      .finally(() => inFlight.delete(flightKey)));
  }

  try {
    const payload = await inFlight.get(flightKey);
    const { rows } = await db.query(
      `INSERT INTO model_safety_cache (make_key, model_key, year, payload, fetched_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (make_key, model_key, year) DO UPDATE SET payload = EXCLUDED.payload, fetched_at = NOW()
       RETURNING fetched_at`,
      [makeKey, modelKey, y, JSON.stringify(payload)]
    ).catch((err) => {
      log.warn('model safety cache write failed', { error: err.message });
      return { rows: [{ fetched_at: new Date() }] };
    });
    return { ...payload, fetched_at: rows[0].fetched_at };
  } catch (err) {
    log.warn('model safety lookup failed', { make, model, year: y, error: err.message });
    if (cached) return { ...cached.payload, fetched_at: cached.fetched_at, stale: true };
    return { status: 'unavailable' };
  }
}

module.exports = {
  modelSafety,
  matchModel,
  isoDate,
  summariseComplaints,
  // Test seam.
  __setFetcher(fn) { fetchJson = fn; inFlight.clear(); },
};
