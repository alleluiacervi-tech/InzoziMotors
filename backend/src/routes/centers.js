const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { log } = require('../lib/log');
const pool = require('../db');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Inspection centers.
//
// This table had NO routes and NO admin surface at all, yet
// routes/submissions.js enforces booking capacity against `daily_capacity` on
// every scheduling request. Adding a center, changing its capacity, or closing
// one for a public holiday therefore meant a hand-written UPDATE against the
// production database — routine operations work gated behind the riskiest
// possible tool.
//
// ── The name-matching hazard ─────────────────────────────────────────────────
// submissions.js resolves a center by NAME, not by id:
//
//     SELECT id, daily_capacity FROM inspection_centers
//     WHERE active = TRUE AND name ILIKE $1
//
// and inspections.center stores that same free text. So renaming a center
// silently orphans every inspection already booked against the old name: the
// capacity lookup stops matching, `centerCapacityError` returns null, and the
// daily cap quietly stops being enforced for that center.
//
// Renaming is therefore NOT a cosmetic edit, and this router refuses it while
// any live inspection still references the old name — with a message that says
// how many. Fixing the schema to key on id is the right long-term answer; that
// is a data migration over existing inspections and does not belong in the same
// change as the missing CRUD.
// ─────────────────────────────────────────────────────────────────────────────

/** Statuses that mean "this booking still counts against capacity". Kept in step
 *  with the same list in submissions.js. */
const LIVE_INSPECTION_STATUSES = ['scheduled', 'in_progress'];

/** The id is a slug, used in URLs and in the mobile app's center picker. */
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function validate({ name, area, address, daily_capacity }, { partial = false } = {}) {
  const errors = [];
  if (!partial || name !== undefined) {
    if (!name || !String(name).trim()) errors.push('name is required');
    else if (String(name).trim().length > 120) errors.push('name is too long');
  }
  if (!partial || daily_capacity !== undefined) {
    const n = Number(daily_capacity);
    if (!Number.isInteger(n) || n < 0 || n > 200) {
      errors.push('daily_capacity must be a whole number between 0 and 200');
    }
  }
  for (const [field, value] of [['area', area], ['address', address]]) {
    if (value !== undefined && value !== null && String(value).length > 200) {
      errors.push(`${field} is too long`);
    }
  }
  return errors;
}

/** How many bookings still point at this center name. */
async function liveInspectionCount(name) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM inspections
     WHERE lower(center) = lower($1) AND status = ANY($2::text[])`,
    [name, LIVE_INSPECTION_STATUSES]
  );
  return rows[0].n;
}

// GET /centers — every center, with today's load against its cap.
//
// The load figure is the point of the page: "capacity 8" means nothing without
// "6 booked today". Counted the same way submissions.js counts it, so the number
// here is the number that will actually gate the next booking.
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.area, c.address, c.daily_capacity, c.active,
              COALESCE(t.booked_today, 0)::int  AS booked_today,
              COALESCE(u.upcoming, 0)::int      AS upcoming,
              COALESCE(a.all_time, 0)::int      AS all_time
       FROM inspection_centers c
       LEFT JOIN (
         SELECT lower(center) AS k, COUNT(*) AS booked_today FROM inspections
         WHERE scheduled_on = CURRENT_DATE AND status = ANY($1::text[])
         GROUP BY lower(center)
       ) t ON t.k = lower(c.name)
       LEFT JOIN (
         SELECT lower(center) AS k, COUNT(*) AS upcoming FROM inspections
         WHERE scheduled_on >= CURRENT_DATE AND status = ANY($1::text[])
         GROUP BY lower(center)
       ) u ON u.k = lower(c.name)
       LEFT JOIN (
         SELECT lower(center) AS k, COUNT(*) AS all_time FROM inspections
         GROUP BY lower(center)
       ) a ON a.k = lower(c.name)
       ORDER BY c.active DESC, c.name ASC`,
      [LIVE_INSPECTION_STATUSES]
    );
    res.json(rows);
  } catch (err) {
    log.error('centers list error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /centers — add a center.
router.post('/', requireAdmin, async (req, res) => {
  const { name, area, address, daily_capacity = 8, active = true } = req.body || {};
  const errors = validate({ name, area, address, daily_capacity });
  if (errors.length) return res.status(422).json({ error: errors[0], errors });

  const id = slugify(req.body.id || name);
  if (!id) return res.status(422).json({ error: 'Could not derive an id from that name' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO inspection_centers (id, name, area, address, daily_capacity, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, String(name).trim(), area || null, address || null, Number(daily_capacity), Boolean(active)]
    );
    log.info('center created', { id, by: req.user.id });
    res.status(201).json(rows[0]);
  } catch (err) {
    // 23505 is unique_violation: the slug collided with an existing center.
    // Reported as a conflict rather than a 500, because it is a normal thing for
    // an operator to do by accident ("Kicukiro Center" twice).
    if (err.code === '23505') {
      return res.status(409).json({
        code: 'CENTER_EXISTS',
        error: `A center with the id "${id}" already exists. Use a different name, or edit that one.`,
      });
    }
    log.error('center create error', { error: err.message, code: err.code });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /centers/:id — edit capacity, address, active, or (carefully) the name.
router.patch('/:id', requireAdmin, async (req, res) => {
  const { name, area, address, daily_capacity, active } = req.body || {};
  const errors = validate({ name, area, address, daily_capacity }, { partial: true });
  if (errors.length) return res.status(422).json({ error: errors[0], errors });

  try {
    const cur = await pool.query('SELECT * FROM inspection_centers WHERE id = $1', [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Center not found' });
    const center = cur.rows[0];

    // Renaming detaches existing bookings from their capacity rule — see the
    // header. Refused while any booking still points at the old name, rather
    // than accepted with the cap silently no longer applying.
    if (name !== undefined && String(name).trim() !== center.name) {
      const n = await liveInspectionCount(center.name);
      if (n > 0) {
        return res.status(409).json({
          code: 'CENTER_RENAME_BLOCKED',
          error:
            `${n} scheduled inspection${n === 1 ? '' : 's'} still reference "${center.name}" by name. ` +
            `Renaming now would stop the daily capacity limit applying to ${n === 1 ? 'it' : 'them'}. ` +
            `Complete or move ${n === 1 ? 'that booking' : 'those bookings'} first, or create a new center and deactivate this one.`,
          live_inspections: n,
        });
      }
    }

    const next = {
      name: name !== undefined ? String(name).trim() : center.name,
      area: area !== undefined ? (area || null) : center.area,
      address: address !== undefined ? (address || null) : center.address,
      daily_capacity: daily_capacity !== undefined ? Number(daily_capacity) : center.daily_capacity,
      active: active !== undefined ? Boolean(active) : center.active,
    };

    const { rows } = await pool.query(
      `UPDATE inspection_centers
       SET name = $2, area = $3, address = $4, daily_capacity = $5, active = $6
       WHERE id = $1 RETURNING *`,
      [req.params.id, next.name, next.area, next.address, next.daily_capacity, next.active]
    );
    log.info('center updated', { id: req.params.id, by: req.user.id });
    res.json(rows[0]);
  } catch (err) {
    log.error('center update error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /centers/:id — deactivate, not delete.
//
// A hard delete would orphan the history: inspections.center is free text, so
// the rows survive pointing at a center that no longer exists, and the
// inspection report an owner downloads next year would name a place with no
// record. Deactivating keeps the history and takes the center out of the
// scheduling picker, which is what "close a center" actually means.
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE inspection_centers SET active = FALSE WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Center not found' });
    const pending = await liveInspectionCount(rows[0].name);
    log.info('center deactivated', { id: req.params.id, by: req.user.id, pending });
    res.json({
      ...rows[0],
      // Deactivating with bookings outstanding is legitimate — a center closing
      // next month still has to work through this month — but the operator
      // should know they exist.
      pending_inspections: pending,
    });
  } catch (err) {
    log.error('center deactivate error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
