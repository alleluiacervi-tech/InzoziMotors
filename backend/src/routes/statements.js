// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/statements/revenue?month=YYYY-MM   — monthly revenue statement PDF
// GET /admin/statements/business?from=&to=      — business report PDF (any
//                                                 window; ?days=7 is "weekly")
//
// On demand only: rendered per request, never stored, never sent anywhere.
// Each download is written to admin_audit_log like any other export.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { log } = require('../lib/log');
const { recordAdminAction } = require('../lib/admin-audit');
const { parseRange, parseMonth, within, kigaliToday, TZ } = require('../lib/insights-range');
const { renderRevenueStatement, renderBusinessReport } = require('../lib/documents/admin-statements');
const { compute } = require('./insights');

const router = express.Router();
router.use(requireAdmin);

async function actorName(userId) {
  const { rows } = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
  return rows[0]?.name || 'an administrator';
}

function sendPdf(res, buffer, filename) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': String(buffer.length),
    'Cache-Control': 'no-store',
  });
  res.send(buffer);
}

/** Paid fees and live subscriptions in an inclusive Kigali window, oldest first. */
async function ledger(from, to) {
  const { rows } = await pool.query(`
    SELECT * FROM (
      SELECT to_char(COALESCE(f.collected_at, f.created_at) AT TIME ZONE '${TZ}', 'DD Mon YYYY') AS collected_at,
             COALESCE(f.collected_at, f.created_at) AS sort_at,
             f.fee_type AS line, f.method, f.amount::bigint AS amount, i.center, f.reference
        FROM platform_fees f
        LEFT JOIN inspections i ON i.id = f.inspection_id
       WHERE f.status = 'paid' AND f.currency = 'RWF' AND ${within('COALESCE(f.collected_at, f.created_at)', 1, 2)}
      UNION ALL
      SELECT to_char(r.created_at AT TIME ZONE '${TZ}', 'DD Mon YYYY'), r.created_at,
             'rental_subscription', r.method, r.amount_rwf::bigint, NULL, r.reference
        FROM rental_subscriptions r
       WHERE r.voided_at IS NULL AND ${within('r.created_at', 1, 2)}
    ) x ORDER BY sort_at`, [from, to]);
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

router.get('/revenue', async (req, res) => {
  const month = req.query.month || kigaliToday().slice(0, 7);
  let range;
  try {
    range = parseMonth(month);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
  if (range.from > kigaliToday()) return res.status(400).json({ error: 'That month has not started yet' });

  try {
    const [rows, previousRows, nonRwf, generatedBy] = await Promise.all([
      ledger(range.from, range.to),
      ledger(parseMonth(range.previous.from.slice(0, 7)).from, range.previous.to),
      pool.query(`SELECT COUNT(*)::int AS n FROM platform_fees
                   WHERE status = 'paid' AND currency <> 'RWF' AND ${within('COALESCE(collected_at, created_at)', 1, 2)}`, [range.from, range.to]),
      actorName(req.user.id),
    ]);
    const buffer = await renderRevenueStatement({
      month, range, generated_by: generatedBy, ledger: rows,
      previous_total: previousRows.reduce((n, r) => n + r.amount, 0),
      excluded_non_rwf: nonRwf.rows[0].n,
    });
    const total = rows.reduce((n, r) => n + r.amount, 0);
    await recordAdminAction(pool, {
      actorId: req.user.id,
      action: 'report.statement_downloaded',
      targetType: 'report',
      targetId: `revenue-${month}`,
      summary: `Downloaded the ${month} revenue statement (${rows.length} entr${rows.length === 1 ? 'y' : 'ies'})`,
      metadata: { statement: 'revenue', month, entries: rows.length, total_rwf: total },
    });
    sendPdf(res, buffer, `sawa-revenue-statement-${month}.pdf`);
  } catch (err) {
    log.error('revenue statement error', { month, error: err.message });
    res.status(500).json({ error: 'Statement unavailable' });
  }
});

router.get('/business', async (req, res) => {
  let range;
  try {
    range = parseRange({ days: 7, ...req.query });
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
  try {
    const [overview, funnels, quality, centers, generatedBy] = await Promise.all([
      compute.overview(range), compute.funnels(range), compute.quality(range), compute.centers(range), actorName(req.user.id),
    ]);
    const buffer = await renderBusinessReport({ range, generated_by: generatedBy, overview, funnels, quality, centers });
    await recordAdminAction(pool, {
      actorId: req.user.id,
      action: 'report.statement_downloaded',
      targetType: 'report',
      targetId: `business-${range.from}-${range.to}`,
      summary: `Downloaded the business report for ${range.from} to ${range.to}`,
      metadata: { statement: 'business', from: range.from, to: range.to },
    });
    sendPdf(res, buffer, `sawa-business-report-${range.from}-to-${range.to}.pdf`);
  } catch (err) {
    log.error('business report error', { error: err.message });
    res.status(500).json({ error: 'Report unavailable' });
  }
});

module.exports = router;
