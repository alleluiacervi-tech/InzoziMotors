// ─────────────────────────────────────────────────────────────────────────────
// Everything Sawa has ever recorded about one vehicle.
//
// This is the asset the rest of the business is a channel for. Any classifieds
// site can list a car; what compounds is a condition record that accumulates
// across years and owners. A full-stack retailer structurally cannot build it —
// they only ever see the cars they are selling. Sawa sees cars it has no stake
// in, which is the company's whole premise expressed as a data structure.
//
// Joined on the normalised VIN key the database generates (migration 0027), so
// "JTD BZ29 3401 234567" and "jtdbz293401234567" are one vehicle.
//
// Admin-only for now. A buyer-facing version is a separate decision with real
// privacy weight — a previous owner did not agree to have their car's history
// published — and it should not arrive by accident through this route.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const pool = require('../db');
const { log } = require('../lib/log');
const { requireAdmin } = require('../middleware/auth');
const { describeVin } = require('../lib/vin');
const { elapsedMinutes } = require('../lib/inspection-integrity');
const { PUBLISH_THRESHOLD } = require('../lib/inspection-policy');

const router = express.Router();

// GET /admin/vehicles/history?vin=…
router.get('/history', requireAdmin, async (req, res) => {
  const identity = describeVin(req.query.vin);

  // A short or absent identifier must not be used to join. Two unrelated cars
  // merged into one history is worse than no history at all: it would put
  // another vehicle's faults on this one's record.
  if (!identity.confident) {
    return res.status(400).json({
      error: identity.note,
      code: 'VIN_NOT_USABLE',
      vin: identity,
    });
  }

  try {
    const [inspections, listings] = await Promise.all([
      pool.query(
        `SELECT i.id, i.kind, i.status, i.score, i.passed, i.critical_failures,
                i.center, i.scheduled_on, i.started_at, i.completed_at,
                i.vehicle_make, i.vehicle_model, i.vehicle_year, i.vehicle_mileage,
                inspector.name AS inspector_name,
                COALESCE(s.make, i.vehicle_make)   AS make,
                COALESCE(s.model, i.vehicle_model) AS model,
                COALESCE(s.year, i.vehicle_year)   AS year,
                c.id AS car_id, c.title AS car_title, c.status AS car_status
           FROM inspections i
           LEFT JOIN submissions s ON s.id = i.submission_id
           LEFT JOIN cars c ON c.id = i.car_id
           LEFT JOIN users inspector ON inspector.id = i.inspector_id
          WHERE i.vehicle_vin_key = $1
             OR c.vin_key = $1
          ORDER BY COALESCE(i.completed_at, i.scheduled_on::timestamptz) ASC NULLS LAST`,
        [identity.key]
      ),
      pool.query(
        `SELECT id, title, make, model, year, mileage, price, status, listed_at, sold_at
           FROM cars WHERE vin_key = $1 ORDER BY created_at ASC`,
        [identity.key]
      ),
    ]);

    const timeline = inspections.rows.map((row) => ({
      inspection_id: row.id,
      kind: row.kind,
      status: row.status,
      // The mileage recorded at each inspection is the single most useful thing
      // in a history: a reading that goes DOWN is odometer tampering, and it is
      // invisible to anyone who only ever sees the car once.
      mileage: row.vehicle_mileage,
      score: row.score === null ? null : Number(row.score),
      passed: row.passed,
      critical_failures: Array.isArray(row.critical_failures) ? row.critical_failures.length : 0,
      center: row.center,
      inspector_name: row.inspector_name,
      on: row.completed_at || row.scheduled_on,
      elapsed_minutes: elapsedMinutes(row),
      vehicle: [row.year, row.make, row.model].filter(Boolean).join(' ') || null,
      car_id: row.car_id,
      car_status: row.car_status,
    }));

    const scored = timeline.filter((entry) => entry.score !== null);
    const readings = timeline.map((entry) => entry.mileage).filter((m) => Number.isInteger(m));

    res.json({
      vin: identity,
      inspections: timeline,
      listings: listings.rows,
      summary: {
        inspections: timeline.length,
        first_seen: timeline.length ? timeline[0].on : null,
        last_seen: timeline.length ? timeline[timeline.length - 1].on : null,
        best_score: scored.length ? Math.max(...scored.map((e) => e.score)) : null,
        latest_score: scored.length ? scored[scored.length - 1].score : null,
        passing_threshold: PUBLISH_THRESHOLD,
        // Reported as a fact, not an accusation. A lower later reading has
        // innocent explanations — a replaced cluster, a mistyped digit — and it
        // is exactly the thing a human should be told to go and ask about.
        odometer_inconsistent: readings.length > 1
          && readings.some((value, index) => index > 0 && value < readings[index - 1]),
      },
    });
  } catch (err) {
    log.error('vehicle history error', { error: err.message });
    res.status(500).json({ error: 'Could not load the vehicle history' });
  }
});

module.exports = router;
