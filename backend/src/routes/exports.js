// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/exports            — the datasets an operator can download
// GET /admin/exports/:dataset   — one dataset as CSV for a Kigali date window
//
// Every export is written to admin_audit_log (who, what, which window, how
// many rows) before the file is sent, so a download of business data is as
// visible in Activity as any other admin action.
//
// PII rule, the same one listing_contact_events was built around: an export
// never carries a phone number, an email address, an ID document or a
// free-text message. People appear by their Sawa id and role only; anyone who
// needs to reach a person does it from inside the console, where the access
// is logged per record. Contact analytics never include the buyer at all.
//
// Money columns are RWF whole francs straight from the database, never
// converted. Timestamps are Kigali local time, and each header says so.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { log } = require('../lib/log');
const { recordAdminAction } = require('../lib/admin-audit');
const { toCsv } = require('../lib/csv');
const { parseRange, within, TZ } = require('../lib/insights-range');

const router = express.Router();
router.use(requireAdmin);

/** Hard ceiling on one file. A year of Sawa's busiest table is far below it. */
const MAX_ROWS = 50_000;

const at = (col) => `to_char(${col} AT TIME ZONE '${TZ}', 'YYYY-MM-DD HH24:MI')`;
const day = (col) => `to_char(${col}, 'YYYY-MM-DD')`;

// Each dataset: its window column, the SQL ($1 = from, $2 = to) and the
// columns in file order. `num` marks a column written as a number.
const DATASETS = {
  submissions: {
    label: 'Submissions',
    description: 'Every vehicle submitted for review in the window, with its review outcome and timing.',
    windowed_by: 'submitted',
    sql: `
      SELECT s.id, ${at('s.submitted_at')} AS submitted_at, s.status, s.purpose,
             s.make, s.model, s.year, s.mileage, s.asking_price, s.currency,
             s.inspection_center, ${at('s.reviewed_at')} AS reviewed_at,
             CASE WHEN s.reviewed_at IS NOT NULL
                  THEN ROUND(EXTRACT(EPOCH FROM (s.reviewed_at - s.submitted_at)) / 3600, 1) END AS hours_to_review,
             s.car_id, s.seller_id
        FROM submissions s
       WHERE ${within('s.submitted_at', 1, 2)}
       ORDER BY s.submitted_at`,
    columns: [
      ['id', 'Submission id'], ['submitted_at', 'Submitted (Kigali)'], ['status', 'Status'], ['purpose', 'Purpose'],
      ['make', 'Make'], ['model', 'Model'], ['year', 'Year', true], ['mileage', 'Mileage (km)', true],
      ['asking_price', 'Asking price', true], ['currency', 'Currency'], ['inspection_center', 'Inspection center'],
      ['reviewed_at', 'Reviewed (Kigali)'], ['hours_to_review', 'Hours to review', true],
      ['car_id', 'Listing id'], ['seller_id', 'Seller id'],
    ],
  },
  inspections: {
    label: 'Inspections',
    description: 'Inspections booked for or completed in the window, with score, result and center.',
    windowed_by: 'scheduled or completed',
    sql: `
      SELECT i.id, i.kind, i.center, ${day('i.scheduled_on')} AS scheduled_on, ${at('i.completed_at')} AS completed_at,
             i.status, i.checklist_version, i.score, CASE WHEN i.status = 'complete' THEN i.passed END AS passed,
             jsonb_array_length(COALESCE(i.critical_failures, '[]'::jsonb)) AS critical_failures,
             COALESCE(c.make, s.make, i.vehicle_make) AS make,
             COALESCE(c.model, s.model, i.vehicle_model) AS model,
             COALESCE(c.year, s.year, i.vehicle_year) AS year,
             insp.name AS inspector, i.submission_id, i.car_id
        FROM inspections i
        LEFT JOIN submissions s ON s.id = i.submission_id
        LEFT JOIN cars c ON c.id = i.car_id
        LEFT JOIN users insp ON insp.id = i.inspector_id
       WHERE (i.scheduled_on BETWEEN $1::date AND $2::date)
          OR (i.completed_at IS NOT NULL AND ${within('i.completed_at', 1, 2)})
       ORDER BY COALESCE(i.completed_at, i.scheduled_on::timestamptz)`,
    columns: [
      ['id', 'Inspection id'], ['kind', 'Kind'], ['center', 'Center'], ['scheduled_on', 'Scheduled on'],
      ['completed_at', 'Completed (Kigali)'], ['status', 'Status'], ['checklist_version', 'Checklist'],
      ['score', 'Score (of 150)', true], ['passed', 'Passed'], ['critical_failures', 'Critical failures', true],
      ['make', 'Make'], ['model', 'Model'], ['year', 'Year', true], ['inspector', 'Inspector'],
      ['submission_id', 'Submission id'], ['car_id', 'Listing id'],
    ],
  },
  listings: {
    label: 'Listings published',
    description: 'Listings published in the window, with price, status, days live and buyer interest.',
    windowed_by: 'published',
    sql: `
      SELECT c.id, c.title, c.make, c.model, c.year, c.body_type, c.price, c.currency, c.status,
             ${at('c.listed_at')} AS listed_at, ${at('c.sold_at')} AS sold_at,
             FLOOR(EXTRACT(EPOCH FROM (COALESCE(c.sold_at, NOW()) - c.listed_at)) / 86400)::int AS days_live,
             c.views,
             (SELECT COUNT(*) FROM saved_cars sc WHERE sc.car_id = c.id)::int AS saves,
             (SELECT COUNT(*) FROM listing_contact_events e WHERE e.car_id = c.id)::int AS contact_requests
        FROM cars c
       WHERE c.listed_at IS NOT NULL AND ${within('c.listed_at', 1, 2)}
       ORDER BY c.listed_at`,
    columns: [
      ['id', 'Listing id'], ['title', 'Title'], ['make', 'Make'], ['model', 'Model'], ['year', 'Year', true],
      ['body_type', 'Body'], ['price', 'Price', true], ['currency', 'Currency'], ['status', 'Status'],
      ['listed_at', 'Published (Kigali)'], ['sold_at', 'Marked sold (Kigali)'], ['days_live', 'Days live', true],
      ['views', 'Views', true], ['saves', 'Saves', true], ['contact_requests', 'Contact requests', true],
    ],
  },
  revenue: {
    label: 'Revenue collected',
    description: 'Every fee and rental subscription Sawa collected in the window. Waived and voided entries are excluded.',
    windowed_by: 'collected',
    sql: `
      SELECT * FROM (
        SELECT ${at('COALESCE(f.collected_at, f.created_at)')} AS collected_at,
               COALESCE(f.collected_at, f.created_at) AS sort_at,
               'fee' AS source, f.fee_type AS line, f.method, f.amount, f.currency,
               i.center, f.reference, rec.name AS recorded_by, f.id
          FROM platform_fees f
          LEFT JOIN inspections i ON i.id = f.inspection_id
          LEFT JOIN users rec ON rec.id = f.recorded_by
         WHERE f.status = 'paid' AND ${within('COALESCE(f.collected_at, f.created_at)', 1, 2)}
        UNION ALL
        SELECT ${at('r.created_at')}, r.created_at, 'subscription', 'rental_subscription', r.method, r.amount_rwf, 'RWF',
               NULL, r.reference, rec.name, r.id
          FROM rental_subscriptions r
          LEFT JOIN users rec ON rec.id = r.recorded_by
         WHERE r.voided_at IS NULL AND ${within('r.created_at', 1, 2)}
      ) x ORDER BY sort_at`,
    columns: [
      ['collected_at', 'Collected (Kigali)'], ['source', 'Source'], ['line', 'Line'], ['method', 'Method'],
      ['amount', 'Amount', true], ['currency', 'Currency'], ['center', 'Center'], ['reference', 'Reference'],
      ['recorded_by', 'Recorded by'], ['id', 'Entry id'],
    ],
  },
  contacts: {
    label: 'Contact requests',
    description: 'Seller contact details disclosed to signed-in buyers, by listing and channel. No buyer identity and no number.',
    windowed_by: 'requested',
    sql: `
      SELECT ${at('e.created_at')} AS created_at, e.channel, e.car_id, c.title, c.make, c.model
        FROM listing_contact_events e
        LEFT JOIN cars c ON c.id = e.car_id
       WHERE ${within('e.created_at', 1, 2)}
       ORDER BY e.created_at`,
    columns: [
      ['created_at', 'Requested (Kigali)'], ['channel', 'Channel'], ['car_id', 'Listing id'],
      ['title', 'Listing'], ['make', 'Make'], ['model', 'Model'],
    ],
  },
  users: {
    label: 'New accounts',
    description: 'Accounts created in the window, with role and verification state. No names, emails or phone numbers.',
    windowed_by: 'created',
    sql: `
      SELECT u.id, ${at('u.created_at')} AS created_at, u.role, u.seller_type, u.account_status,
             u.id_verified, u.business_verified, ${at('u.id_verified_at')} AS id_verified_at,
             (u.deleted_at IS NOT NULL OR u.closed_at IS NOT NULL) AS closed
        FROM users u
       WHERE ${within('u.created_at', 1, 2)}
       ORDER BY u.created_at`,
    columns: [
      ['id', 'User id'], ['created_at', 'Created (Kigali)'], ['role', 'Role'], ['seller_type', 'Seller type'],
      ['account_status', 'Account status'], ['id_verified', 'ID check'], ['business_verified', 'Business verified'],
      ['id_verified_at', 'ID checked (Kigali)'], ['closed', 'Closed'],
    ],
  },
  imports: {
    label: 'Import orders',
    description: 'Import enquiries opened in the window and how far each has gone: quote, agreement, verified payments.',
    windowed_by: 'opened',
    sql: `
      SELECT o.order_ref, ${at('o.created_at')} AS created_at, o.status, o.origin_country, o.make, o.model, o.year,
             o.quoted_total_rwf, ${at('o.agreement_accepted_at')} AS agreement_accepted_at,
             (SELECT ${at('MAX(p.verified_at)')} FROM import_payments p WHERE p.import_order_id = o.id AND p.milestone = 'initial_50' AND p.status = 'verified') AS deposit_verified_at,
             (SELECT ${at('MAX(p.verified_at)')} FROM import_payments p WHERE p.import_order_id = o.id AND p.milestone = 'final_50' AND p.status = 'verified') AS balance_verified_at,
             ${at('o.updated_at')} AS updated_at
        FROM import_orders o
       WHERE ${within('o.created_at', 1, 2)}
       ORDER BY o.created_at`,
    columns: [
      ['order_ref', 'Order'], ['created_at', 'Opened (Kigali)'], ['status', 'Status'], ['origin_country', 'Origin'],
      ['make', 'Make'], ['model', 'Model'], ['year', 'Year', true], ['quoted_total_rwf', 'Quoted total (RWF)', true],
      ['agreement_accepted_at', 'Agreement accepted (Kigali)'], ['deposit_verified_at', 'First 50% verified (Kigali)'],
      ['balance_verified_at', 'Final 50% verified (Kigali)'], ['updated_at', 'Last update (Kigali)'],
    ],
  },
  rental_inquiries: {
    label: 'Rental inquiries',
    description: 'Availability inquiries received in the window and their outcome. The renter’s message is not included.',
    windowed_by: 'received',
    sql: `
      SELECT q.inquiry_ref, ${at('q.created_at')} AS created_at, q.status, ${day('q.start_date')} AS start_date, q.days,
             q.preferred_channel, rc.id AS rental_car_id,
             TRIM(CONCAT_WS(' ', rc.year::text, rc.make, rc.model)) AS vehicle,
             ${at('q.closed_at')} AS closed_at
        FROM rental_inquiries q
        LEFT JOIN rental_cars rc ON rc.id = q.rental_car_id
       WHERE ${within('q.created_at', 1, 2)}
       ORDER BY q.created_at`,
    columns: [
      ['inquiry_ref', 'Inquiry'], ['created_at', 'Received (Kigali)'], ['status', 'Status'], ['start_date', 'Wanted from'],
      ['days', 'Days', true], ['preferred_channel', 'Preferred channel'], ['rental_car_id', 'Rental vehicle id'],
      ['vehicle', 'Vehicle'], ['closed_at', 'Closed (Kigali)'],
    ],
  },
};

const describe = (key) => {
  const d = DATASETS[key];
  return { key, label: d.label, description: d.description, windowed_by: d.windowed_by, columns: d.columns.map(([, h]) => h) };
};

router.get('/', (_req, res) => {
  res.json({ datasets: Object.keys(DATASETS).map(describe), max_rows: MAX_ROWS });
});

router.get('/:dataset', async (req, res) => {
  const key = String(req.params.dataset).replace(/\.csv$/i, '');
  const dataset = Object.prototype.hasOwnProperty.call(DATASETS, key) ? DATASETS[key] : null;
  if (!dataset) return res.status(404).json({ error: 'Unknown dataset' });

  let range;
  try {
    range = parseRange(req.query);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  try {
    const { rows } = await pool.query(`${dataset.sql} LIMIT ${MAX_ROWS + 1}`, [range.from, range.to]);
    if (rows.length > MAX_ROWS) {
      return res.status(422).json({ error: `More than ${MAX_ROWS.toLocaleString('en-GB')} rows. Choose a shorter window.` });
    }
    const columns = dataset.columns.map(([k, header, isNum]) => ({ key: k, header, isNum }));
    const shaped = rows.map((row) => {
      const out = { ...row };
      for (const c of columns) if (c.isNum && out[c.key] != null) out[c.key] = Number(out[c.key]);
      return out;
    });

    await recordAdminAction(pool, {
      actorId: req.user.id,
      action: 'report.exported',
      targetType: 'report',
      targetId: key,
      summary: `Exported ${dataset.label.toLowerCase()} (${range.from} to ${range.to}, ${rows.length} row${rows.length === 1 ? '' : 's'})`,
      metadata: { dataset: key, from: range.from, to: range.to, rows: rows.length, format: 'csv' },
    });

    const filename = `sawa-${key.replace(/_/g, '-')}-${range.from}-to-${range.to}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Row-Count': String(rows.length),
    });
    res.send(toCsv(columns, shaped));
  } catch (err) {
    log.error('admin export error', { dataset: key, error: err.message });
    res.status(500).json({ error: 'Export unavailable' });
  }
});

module.exports = router;
module.exports._internal = { DATASETS };
