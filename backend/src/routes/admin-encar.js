const express = require('express');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { recordAdminAction } = require('../lib/admin-audit');
const { log } = require('../lib/log');
const store = require('../lib/encar/store');
const { createClient, EncarError } = require('../lib/encar/client');

// ─────────────────────────────────────────────────────────────────────────────
// /admin/encar — the operator's window onto the Korean-import mirror.
//
//   GET  /status                      what the worker has done, how big the table
//                                     is, how much of the provider's allowance is
//                                     used, and every setting that governs it
//   POST /listings/:id/refresh        ask the provider to re-collect one car
//                                     (100 a day on the Business plan) before a
//                                     quote, then drop our cached copies of it
//
// Settings themselves are edited through PATCH /admin/settings/:key like every
// other setting (validated and audit-logged there); this router only reads them.
// ─────────────────────────────────────────────────────────────────────────────
const router = express.Router();
router.use(requireAdmin);

const DAILY_REFRESH_LIMIT = Number(process.env.ENCAR_REFRESH_DAILY_LIMIT || 100);
const client = createClient({ ratePerMinute: Number(process.env.ENCAR_RATE_PER_MIN || 20) });

router.get('/status', async (_req, res) => {
  try {
    const [summary, flags, rules, costs, refreshed] = await Promise.all([
      store.statusSummary(pool),
      store.loadFlags(pool),
      store.loadRules(pool),
      store.loadSetting(pool, 'encar_cost_inputs'),
      pool.query(`SELECT COUNT(*)::int AS n FROM admin_audit_log
                   WHERE action = 'encar.refresh' AND created_at >= date_trunc('day', NOW())`),
    ]);
    const state = summary.state || {};
    const lastOk = state.last_success_at ? new Date(state.last_success_at).getTime() : null;
    res.json({
      // Booleans, never the values: the key and the photo host are secrets-adjacent.
      configured: { api_key: client.configured, photo_prefix: Boolean(process.env.ENCAR_PHOTO_PREFIX) },
      flags,
      rules,
      costs,
      state,
      listings: summary.listings,
      row_ceiling: rules.row_ceiling,
      size_bytes: summary.size_bytes,
      cache_rows: summary.cache_rows,
      recent_runs: summary.recent_runs,
      usage: { month: summary.month, days: summary.usage_days, monthly_bytes_allowance: 12_000_000_000 },
      refresh: { used_today: refreshed.rows[0].n, daily_limit: DAILY_REFRESH_LIMIT },
      // The same test the uptime check applies: a feed that has not succeeded for
      // an hour is stale. Only meaningful once the sync is switched on.
      stale: Boolean(flags.sync_enabled && (!lastOk || Date.now() - lastOk > 3_600_000)),
    });
  } catch (err) {
    log.error('encar status error', { error: err.message });
    res.status(500).json({ error: 'Could not load the Encar status' });
  }
});

router.post('/listings/:id/refresh', async (req, res) => {
  const id = String(req.params.id || '');
  if (!/^[A-Za-z0-9:_-]{1,40}$/.test(id)) return res.status(404).json({ error: 'Listing not found' });
  if (!client.configured) return res.status(503).json({ error: 'The Encar API key is not set on the server', code: 'NOT_CONFIGURED' });
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM admin_audit_log
        WHERE action = 'encar.refresh' AND created_at >= date_trunc('day', NOW())`
    );
    if (rows[0].n >= DAILY_REFRESH_LIMIT) {
      return res.status(429).json({ error: `The daily refresh allowance (${DAILY_REFRESH_LIMIT}) is used up`, code: 'REFRESH_LIMIT' });
    }
    await client.refresh(id);
    // The next reader gets the re-collected data rather than yesterday's copy.
    await pool.query('DELETE FROM encar_detail_cache WHERE id = $1', [id]);
    await recordAdminAction(pool, {
      actorId: req.user.id, action: 'encar.refresh', targetType: 'encar_listing', targetId: id,
      summary: `Asked the provider to refresh Korean listing ${id}`,
    });
    res.status(202).json({ ok: true, note: 'The provider re-collects the listing within about two hours.' });
  } catch (err) {
    if (err instanceof EncarError) {
      const status = { not_found: 404, removed: 404, plan: 403, rate_limited: 429 }[err.code] || 502;
      return res.status(status).json({ error: err.message, code: err.code.toUpperCase() });
    }
    log.error('encar refresh error', { error: err.message });
    res.status(500).json({ error: 'Could not refresh this listing' });
  }
});

module.exports = router;
