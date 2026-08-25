// ─────────────────────────────────────────────────────────────────────────────
// Where is this vehicle, and who is it waiting on?
//
// Two reads over one computation (src/lib/vehicle-journey.js): the rail for a
// single vehicle, and the board for everything in flight. Neither writes
// anything — the journey is derived from the workflow tables on every request,
// so there is no state here to fall out of step with the tables that gate
// publication.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const pool = require('../db');
const { log } = require('../lib/log');
const { requireAdmin } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const { publicationReadiness } = require('../lib/publication-readiness');
const { vehicleJourney, buildJourney, STAGE_KEYS, LABELS } = require('../lib/vehicle-journey');

const router = express.Router();
const SUBJECTS = new Set(['submission', 'inspection', 'car']);

// How many vehicles the board will draw. Rwanda's entire used-car market moves
// perhaps forty vehicles a day, so this is a runaway guard rather than a real
// limit — but the response says when it truncated instead of quietly lying
// about the size of the queue.
const BOARD_LIMIT = 300;

// GET /admin/journey/stages — the stage vocabulary, so the client renders the
// seven labels the server actually computes rather than its own copy.
router.get('/stages', requireAdmin, (_req, res) => {
  res.json({ stages: STAGE_KEYS.map((key, index) => ({ key, index: index + 1, label: LABELS[key] })) });
});

// GET /admin/journey/:subjectType/:id — the rail for one vehicle.
router.get('/:subjectType/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const { subjectType } = req.params;
  if (!SUBJECTS.has(subjectType)) {
    return res.status(400).json({ error: `Subject must be one of: ${[...SUBJECTS].join(', ')}` });
  }
  try {
    const journey = await vehicleJourney(pool, subjectType, req.params.id);
    if (!journey) return res.status(404).json({ error: 'Nothing found for that id' });
    if (journey.standalone) {
      // Deliberately not a 404: the inspection exists and the operator is
      // looking straight at it. It simply has no listing pipeline, and saying
      // so is more useful than pretending the record is missing.
      return res.status(409).json({
        error: 'A walk-in inspection is an independent report on a vehicle Sawa does not list. It has no publication pipeline.',
        code: 'STANDALONE_INSPECTION',
      });
    }
    res.json(journey);
  } catch (err) {
    log.error('vehicle journey error', { error: err.message, subjectType, id: req.params.id });
    res.status(500).json({ error: 'Could not work out where this vehicle is' });
  }
});

// GET /admin/journey — every vehicle in flight, ready to lay out in columns.
//
// "In flight" means a submission that has not been rejected, or a listing that
// is not yet finished with. A live listing is deliberately absent: it is the
// end of the journey, it is counted, and putting forty-seven of them in a
// column would bury the six that need someone today.
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const { rows: anchors } = await pool.query(
      `SELECT s.id AS submission_id,
              s.seller_id,
              i.id AS inspection_id,
              COALESCE(s.car_id, i.car_id) AS car_id
         FROM submissions s
         LEFT JOIN inspections i ON i.submission_id = s.id
         LEFT JOIN cars c ON c.id = COALESCE(s.car_id, i.car_id)
        WHERE s.status <> 'rejected'
          AND (c.id IS NULL OR c.status NOT IN ('live', 'sold', 'archived', 'rejected'))
        ORDER BY s.submitted_at ASC
        LIMIT $1`,
      [BOARD_LIMIT + 1]
    );
    const truncated = anchors.length > BOARD_LIMIT;
    const page = anchors.slice(0, BOARD_LIMIT);

    // Two queries for the whole board, then everything is assembled in memory.
    const ids = (key) => [...new Set(page.map((row) => row[key]).filter(Boolean))];
    const [sellers, submissions, inspections, cars] = await Promise.all([
      byId(`SELECT id, name, email, role, id_verified, id_submitted_at, account_status,
                   deleted_at, seller_type, business_verified
              FROM users WHERE id = ANY($1::uuid[])`, ids('seller_id')),
      byId('SELECT * FROM submissions WHERE id = ANY($1::uuid[])', ids('submission_id')),
      byId('SELECT * FROM inspections WHERE id = ANY($1::uuid[])', ids('inspection_id')),
      byId(`SELECT c.*, u.email AS seller_email FROM cars c
              LEFT JOIN users u ON u.id = c.seller_id
             WHERE c.id = ANY($1::uuid[])`, ids('car_id')),
    ]);

    // Readiness is the one thing that cannot be batched — it recomputes a
    // checklist per listing. Only vehicles that actually reached a listing pay
    // for it, which on a normal day is a handful.
    const readiness = new Map();
    for (const anchor of page) {
      if (!anchor.car_id) continue;
      readiness.set(anchor.car_id, await publicationReadiness(pool, anchor.car_id));
    }

    const journeys = page.map((anchor) => buildJourney({
      anchor,
      seller: sellers.get(anchor.seller_id) || null,
      submission: submissions.get(anchor.submission_id) || null,
      inspection: inspections.get(anchor.inspection_id) || null,
      car: cars.get(anchor.car_id) || null,
      readiness: anchor.car_id ? readiness.get(anchor.car_id) : null,
    }));

    // Waiting on us first, then oldest first. That ordering is the whole point:
    // read the board top to bottom and you are working the right thing next.
    const weight = { us: 0, seller: 1, clock: 2, none: 3 };
    journeys.sort((a, b) => (weight[a.actor] - weight[b.actor]) || ((b.age_hours || 0) - (a.age_hours || 0)));

    const { rows: live } = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE listed_at > NOW() - INTERVAL '7 days')::int AS this_week
         FROM cars WHERE status = 'live'`
    );

    res.json({
      generated_at: new Date().toISOString(),
      stages: STAGE_KEYS.map((key, index) => ({ key, index: index + 1, label: LABELS[key] })),
      summary: {
        in_flight: journeys.length,
        waiting_on_us: journeys.filter((j) => j.actor === 'us').length,
        waiting_on_seller: journeys.filter((j) => j.actor === 'seller').length,
        blocked: journeys.filter((j) => j.blocked).length,
        live: live[0].total,
        published_this_week: live[0].this_week,
      },
      truncated,
      vehicles: journeys,
    });
  } catch (err) {
    log.error('journey board error', { error: err.message });
    res.status(500).json({ error: 'Could not load the pipeline' });
  }
});

async function byId(sql, ids) {
  const map = new Map();
  if (!ids.length) return map;
  const { rows } = await pool.query(sql, [ids]);
  rows.forEach((row) => map.set(row.id, row));
  return map;
}

module.exports = router;
