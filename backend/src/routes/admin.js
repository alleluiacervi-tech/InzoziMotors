const express = require('express');
const crypto = require('crypto');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { requireUuid, paginate } = require('../middleware/validate');
const { recordAdminAction } = require('../lib/admin-audit');
const { sendShowroomInvite } = require('../lib/mailer');

const router = express.Router();

// GET /admin/action-center — one factual queue for the single Super Admin.
//
// This deliberately derives work from source-of-truth workflow tables instead
// of maintaining a second "tasks" table that can drift out of sync. Every item
// is actionable, carries a stable destination, and explains why it is urgent.
router.get('/action-center', requireAdmin, async (_req, res) => {
  try {
    const [submissions, ids, handovers, inspections, disputes, reports, imports, payments, contracts] = await Promise.all([
      pool.query(`SELECT id, make, model, submitted_at AS occurred_at,
                    EXTRACT(EPOCH FROM (NOW() - submitted_at)) / 3600 AS age_hours
                  FROM submissions
                  WHERE status IN ('under_review','pending')
                  ORDER BY submitted_at ASC LIMIT 20`),
      pool.query(`SELECT id, name, COALESCE(id_submitted_at, created_at) AS occurred_at,
                    EXTRACT(EPOCH FROM (NOW() - COALESCE(id_submitted_at, created_at))) / 3600 AS age_hours
                  FROM users WHERE id_verified = 'pending'
                  ORDER BY COALESCE(id_submitted_at, created_at) ASC LIMIT 20`),
      pool.query(`SELECT h.id, h.booking_id, h.booked_at AS occurred_at,
                    EXTRACT(EPOCH FROM (NOW() - h.booked_at)) / 3600 AS age_hours,
                    c.title AS car_title
                  FROM handovers h LEFT JOIN cars c ON c.id = h.car_id
                  WHERE h.status = 'pending'
                  ORDER BY h.booked_at ASC LIMIT 20`),
      pool.query(`SELECT i.id, i.scheduled_at AS occurred_at, c.title AS car_title,
                    CASE WHEN i.scheduled_at IS NULL THEN 0
                         ELSE EXTRACT(EPOCH FROM (NOW() - i.scheduled_at)) / 3600 END AS age_hours
                  FROM inspections i LEFT JOIN cars c ON c.id = i.car_id
                  WHERE i.status IN ('scheduled','in_progress')
                    AND (i.status = 'in_progress' OR i.scheduled_at <= NOW() + INTERVAL '24 hours')
                  ORDER BY i.scheduled_at ASC NULLS LAST LIMIT 20`),
      pool.query(`SELECT d.id, d.created_at AS occurred_at, d.reason,
                    EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 3600 AS age_hours
                  FROM disputes d WHERE d.status = 'open'
                  ORDER BY d.created_at ASC LIMIT 20`),
      pool.query(`SELECT r.id, r.created_at AS occurred_at, r.reason,
                    EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600 AS age_hours
                  FROM message_reports r WHERE r.status = 'open'
                  ORDER BY r.created_at ASC LIMIT 20`),
      pool.query(`SELECT id, order_ref, status, updated_at AS occurred_at,
                    EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 AS age_hours
                  FROM import_orders
                  WHERE status NOT IN ('completed','cancelled')
                    AND (status IN ('enquiry','deposit_due','balance_due') OR updated_at < NOW() - INTERVAL '72 hours')
                  ORDER BY updated_at ASC LIMIT 20`),
      pool.query(`SELECT p.id, p.import_order_id, p.milestone, p.submitted_at AS occurred_at,
                    EXTRACT(EPOCH FROM (NOW() - p.submitted_at)) / 3600 AS age_hours,
                    o.order_ref
                  FROM import_payments p JOIN import_orders o ON o.id = p.import_order_id
                  WHERE p.status IN ('submitted','reviewed')
                  ORDER BY p.submitted_at ASC NULLS LAST LIMIT 20`),
      pool.query(`SELECT c.id, c.handover_id, c.contract_number, c.status,
                    c.generated_at AS occurred_at,
                    EXTRACT(EPOCH FROM (NOW() - c.generated_at)) / 3600 AS age_hours
                  FROM contracts c WHERE c.status IN ('draft','issued')
                  ORDER BY c.generated_at ASC LIMIT 20`),
    ]);

    const item = (row, data) => ({
      id: data.id,
      kind: data.kind,
      priority: data.priority,
      title: data.title,
      detail: data.detail,
      href: data.href,
      occurred_at: row.occurred_at,
      age_hours: Math.max(0, Math.round(Number(row.age_hours) || 0)),
    });
    const agedPriority = (row, urgentHours, attentionHours = 0) =>
      Number(row.age_hours) >= urgentHours ? 'urgent'
        : Number(row.age_hours) >= attentionHours ? 'attention' : 'routine';

    const items = [
      ...submissions.rows.map((r) => item(r, { id: `submission:${r.id}`, kind: 'Submission', priority: agedPriority(r, 24, 8), title: `Review ${r.make} ${r.model}`, detail: 'Seller submission is awaiting a decision', href: '/submissions' })),
      ...ids.rows.map((r) => item(r, { id: `identity:${r.id}`, kind: 'Identity', priority: agedPriority(r, 24, 8), title: `Verify ${r.name}`, detail: 'Identity documents are waiting for review', href: '/users' })),
      ...handovers.rows.map((r) => item(r, { id: `handover:${r.id}`, kind: 'Handover', priority: agedPriority(r, 24, 4), title: `Confirm ${r.booking_id}`, detail: r.car_title || 'Vehicle handover is awaiting confirmation', href: '/handovers' })),
      ...inspections.rows.map((r) => item(r, { id: `inspection:${r.id}`, kind: 'Inspection', priority: Number(r.age_hours) > 0 ? 'urgent' : 'attention', title: Number(r.age_hours) > 0 ? 'Inspection is due' : 'Inspection within 24 hours', detail: r.car_title || 'Scheduled vehicle inspection', href: '/inspections' })),
      ...disputes.rows.map((r) => item(r, { id: `dispute:${r.id}`, kind: 'Dispute', priority: 'urgent', title: 'Resolve open dispute', detail: r.reason, href: '/disputes' })),
      ...reports.rows.map((r) => item(r, { id: `report:${r.id}`, kind: 'Safety', priority: agedPriority(r, 12, 0), title: 'Review reported conversation', detail: r.reason, href: '/reports' })),
      ...imports.rows.map((r) => item(r, { id: `import:${r.id}`, kind: 'Import', priority: Number(r.age_hours) >= 72 ? 'urgent' : agedPriority(r, 24, 0), title: `${r.order_ref} needs attention`, detail: r.status === 'enquiry' ? 'New import enquiry needs a quotation' : r.status.replaceAll('_', ' '), href: `/imports/${r.id}` })),
      ...payments.rows.map((r) => item(r, { id: `payment:${r.id}`, kind: 'Payment', priority: agedPriority(r, 8, 0), title: `Verify payment for ${r.order_ref}`, detail: `${r.milestone.replaceAll('_', ' ')} proof submitted`, href: `/imports/${r.import_order_id}` })),
      ...contracts.rows.map((r) => item(r, { id: `contract:${r.id}`, kind: 'Contract', priority: agedPriority(r, 48, 12), title: `${r.contract_number} is ${r.status}`, detail: r.status === 'draft' ? 'Complete and issue the contract' : 'Collect and record signatures', href: '/contracts' })),
    ];
    const rank = { urgent: 0, attention: 1, routine: 2 };
    items.sort((a, b) => rank[a.priority] - rank[b.priority] || b.age_hours - a.age_hours);

    res.json({
      generated_at: new Date().toISOString(),
      summary: {
        total: items.length,
        urgent: items.filter((i) => i.priority === 'urgent').length,
        attention: items.filter((i) => i.priority === 'attention').length,
        routine: items.filter((i) => i.priority === 'routine').length,
      },
      items: items.slice(0, 60),
    });
  } catch (err) {
    log.error('action center error', { error: err.message });
    res.status(500).json({ error: 'Could not load the action center' });
  }
});

// GET /admin/stats — dashboard overview numbers
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [
      listingsRes, submissionsRes, handoversRes,
      idQueueRes, soldRes, gmvRes, feesRes,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM cars WHERE status = 'live'"),
      pool.query("SELECT COUNT(*) FROM submissions WHERE status IN ('under_review','pending')"),
      pool.query("SELECT COUNT(*) FROM handovers WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) FROM users WHERE id_verified = 'pending'"),
      pool.query("SELECT COUNT(*) FROM cars WHERE status = 'sold'"),
      // GROUP BY currency, not a bare SUM. Migration 0006 makes mixed rows
      // possible — historical amounts stay USD until scripts/convert-to-rwf.js
      // runs — and SUM across currencies produces a figure that is not money in
      // any of them. A dashboard tile is exactly where that would be believed.
      pool.query(`SELECT currency, COALESCE(SUM(price), 0) AS total
                  FROM cars WHERE status = 'sold' GROUP BY currency`),
      pool.query(`SELECT currency,
                    COALESCE(SUM(amount) FILTER (WHERE status IN ('due','paid')), 0) AS earned,
                    COALESCE(SUM(amount) FILTER (WHERE status = 'due'), 0) AS due
                  FROM platform_fees GROUP BY currency`),
    ]);

    // Report the dominant currency's figures in the flat fields the dashboard
    // already reads, and hand over the full breakdown alongside so a mixed
    // database is visible rather than averaged into nonsense. RWF wins when
    // present because it is the currency the business now operates in.
    const pickCurrency = (rows) => {
      const set = rows.map((r) => r.currency);
      return set.includes('RWF') ? 'RWF' : set[0] || 'RWF';
    };
    const gmvCurrency = pickCurrency(gmvRes.rows);
    const feeCurrency = pickCurrency(feesRes.rows);
    const gmvRow = gmvRes.rows.find((r) => r.currency === gmvCurrency);
    const feeRow = feesRes.rows.find((r) => r.currency === feeCurrency);

    res.json({
      liveListings:          parseInt(listingsRes.rows[0].count),
      pendingSubmissions:    parseInt(submissionsRes.rows[0].count),
      pendingHandovers:      parseInt(handoversRes.rows[0].count),
      pendingIdVerifications: parseInt(idQueueRes.rows[0].count),
      totalSold:             parseInt(soldRes.rows[0].count),
      // GMV = value of cars sold; totalRevenue = Sawa's actual earnings.
      // Each is expressed in the currency named beside it — never converted.
      totalGMV:              parseInt(gmvRow?.total || 0),
      gmvCurrency,
      totalRevenue:          parseInt(feeRow?.earned || 0),
      feesOutstanding:       parseInt(feeRow?.due || 0),
      feeCurrency,
      // Present so the dashboard can say "and 4 more in USD" instead of
      // pretending a single figure is the whole truth.
      gmvByCurrency:  gmvRes.rows.map((r) => ({ currency: r.currency, total: parseInt(r.total) })),
      feesByCurrency: feesRes.rows.map((r) => ({
        currency: r.currency, earned: parseInt(r.earned), due: parseInt(r.due),
      })),
    });
  } catch (err) {
    log.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/analytics — charts data
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const [makesRes, pipelineRes, centersRes, monthlyRes, healthRes, feesRes] = await Promise.all([
      pool.query(`
        SELECT make, COUNT(*) AS count
        FROM cars WHERE status NOT IN ('archived','under_review')
        GROUP BY make ORDER BY count DESC LIMIT 8
      `),
      pool.query(`
        SELECT status, COUNT(*) AS count
        FROM submissions GROUP BY status ORDER BY count DESC
      `),
      pool.query(`
        SELECT center,
               COUNT(*) AS scheduled,
               COUNT(*) FILTER (WHERE status = 'complete') AS completed
        FROM inspections GROUP BY center
      `),
      // Grouped by currency as well as month — a bar chart is the last place a
      // mixed-currency sum should be plotted, because the shape of the chart
      // would encode the exchange rate rather than the business.
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('month', sold_at), 'YYYY-MM') AS month,
               currency,
               COUNT(*) AS total_sold,
               COALESCE(SUM(price), 0) AS total_value
        FROM cars WHERE status = 'sold'
          AND sold_at > NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', sold_at), currency
        ORDER BY DATE_TRUNC('month', sold_at) ASC
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('under_review','pending'))::int AS awaiting_review,
          COUNT(*) FILTER (WHERE status IN ('under_review','pending') AND submitted_at < NOW() - INTERVAL '24 hours')::int AS overdue_reviews,
          COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
          COUNT(*) FILTER (WHERE status IN ('live','sold'))::int AS reached_market,
          COUNT(*)::int AS total_submissions,
          COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at)) / 3600)
            FILTER (WHERE reviewed_at IS NOT NULL)), 0)::int AS avg_review_hours
        FROM submissions
      `),
      pool.query(`
        SELECT currency,
          COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::bigint AS paid,
          COALESCE(SUM(amount) FILTER (WHERE status = 'due'), 0)::bigint AS due,
          COUNT(*) FILTER (WHERE status = 'due')::int AS due_count
        FROM platform_fees GROUP BY currency
      `),
    ]);

    // The chart plots one currency. Collapse to the dominant one and say which,
    // rather than adding francs to dollars to make a taller bar.
    const monthCurrencies = [...new Set(monthlyRes.rows.map((r) => r.currency))];
    const salesCurrency = monthCurrencies.includes('RWF') ? 'RWF' : monthCurrencies[0] || 'RWF';

    res.json({
      topMakes:       makesRes.rows,
      pipelineFunnel: pipelineRes.rows,
      centers:        centersRes.rows,
      monthlySales:   monthlyRes.rows.filter((r) => r.currency === salesCurrency),
      salesCurrency,
      // Every currency present, so a mixed database is legible instead of hidden.
      monthlySalesByCurrency: monthlyRes.rows,
      health: healthRes.rows[0],
      feesByCurrency: feesRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/listings — all cars with any status (admin-only browse)
const ALLOWED_STATUSES = new Set([
  'under_review', 'scheduled', 'inspecting', 'live', 'reserved', 'sold', 'archived',
]);
router.get('/listings', requireAdmin, paginate({ defaultLimit: 50, maxLimit: 200 }), async (req, res) => {
  const { status = 'live', make } = req.query;
  if (!ALLOWED_STATUSES.has(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const conditions = [`c.status = $1`];
  const params = [status];

  if (make) { params.push(make); conditions.push(`c.make ILIKE $${params.length}`); }

  // Was parseInt(limit) with no clamp: ?limit=abc reached Postgres as NaN and
  // came back a 500, and a negative offset was passed through verbatim.
  params.push(req.pagination.limit, req.pagination.offset);
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS seller_name
       FROM cars c
       JOIN users u ON u.id = c.seller_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY c.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/users?q= — search users by name/email/phone
router.get('/users', requireAdmin, async (req, res) => {
  const { q = '', limit = 25 } = req.query;
  const safeLimit = Math.min(Math.max(parseInt(limit) || 25, 1), 100);
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, role, id_verified, seller_type,
              business_name, admin_created, must_change_password, trust_score,
              completed_sales, created_at
       FROM users
       WHERE name ILIKE $1 OR email ILIKE $1 OR COALESCE(phone, '') ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [`%${q}%`, safeLimit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /admin/showrooms — commercial seller accounts are created and verified
// by Sawa, never self-selected at public registration. The recipient receives
// a one-use setup link; admins and email logs never contain a password.
router.post('/showrooms', requireAdmin, async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 120);
  const businessName = String(req.body.business_name || '').trim().slice(0, 160);
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim().slice(0, 40) || null;
  if (!name || !businessName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Contact name, showroom name and a valid email are required' });
  }
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  try {
    const result = await require('../lib/tx').withTransaction(async (client) => {
      const exists = await client.query('SELECT id FROM users WHERE email=$1', [email]);
      if (exists.rows.length) return { conflict: true };
      const { rows } = await client.query(
        `INSERT INTO users
          (name,email,phone,role,id_verified,seller_type,business_name,admin_created,
           must_change_password,invite_token_hash,invite_expires_at,invited_by)
         VALUES ($1,$2,$3,'seller','approved','showroom',$4,TRUE,TRUE,$5,NOW()+INTERVAL '48 hours',$6)
         RETURNING id,name,email,phone,role,id_verified,seller_type,business_name,created_at`,
        [name, email, phone, businessName, tokenHash, req.user.id]
      );
      await recordAdminAction(client, { actorId: req.user.id, action: 'showroom.invite', targetType: 'user', targetId: rows[0].id, summary: `Created verified showroom account for ${businessName}`, metadata: { email } });
      return { user: rows[0] };
    });
    if (result.conflict) return res.status(409).json({ error: 'An account already uses this email' });
    const delivered = await sendShowroomInvite(email, name, businessName, token);
    res.status(201).json({ ...result.user, invitation_sent: delivered });
  } catch (err) {
    log.error('showroom invite error', { error: err.message });
    res.status(500).json({ error: 'Could not create showroom account' });
  }
});

// GET /admin/search?q= — one command-bar search across the records an operator
// most often needs to jump between. Results are intentionally small and carry
// their destination so the client cannot invent routing rules per entity.
router.get('/search', requireAdmin, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });
  const needle = `%${q}%`;
  try {
    const [users, cars, submissions, rentals] = await Promise.all([
      pool.query(`SELECT id, name, email FROM users
                  WHERE name ILIKE $1 OR email ILIKE $1 OR COALESCE(phone,'') ILIKE $1
                  ORDER BY created_at DESC LIMIT 5`, [needle]),
      pool.query(`SELECT id, title, status FROM cars
                  WHERE title ILIKE $1 OR make ILIKE $1 OR model ILIKE $1
                  ORDER BY created_at DESC LIMIT 5`, [needle]),
      pool.query(`SELECT s.id, s.status, s.make, s.model, u.name AS seller_name
                  FROM submissions s JOIN users u ON u.id=s.seller_id
                  WHERE s.make ILIKE $1 OR s.model ILIKE $1 OR u.name ILIKE $1
                  ORDER BY s.created_at DESC LIMIT 5`, [needle]),
      pool.query(`SELECT rb.id, rb.booking_ref, u.name AS customer_name, rb.status
                  FROM rental_bookings rb JOIN users u ON u.id=rb.renter_id
                  WHERE rb.booking_ref ILIKE $1 OR u.name ILIKE $1 OR u.email ILIKE $1
                  ORDER BY rb.booked_at DESC LIMIT 5`, [needle]),
    ]);
    res.json({ results: [
      ...users.rows.map((r) => ({ kind: 'User', id: r.id, title: r.name, detail: r.email, href: `/users?q=${encodeURIComponent(r.email)}` })),
      ...cars.rows.map((r) => ({ kind: 'Listing', id: r.id, title: r.title, detail: r.status, href: `/listings/${r.id}/edit` })),
      ...submissions.rows.map((r) => ({ kind: 'Submission', id: r.id, title: `${r.make} ${r.model}`, detail: `${r.seller_name} · ${r.status}`, href: '/submissions' })),
      ...rentals.rows.map((r) => ({ kind: 'Rental', id: r.id, title: r.booking_ref, detail: `${r.customer_name} · ${r.status}`, href: '/rentals' })),
    ] });
  } catch (err) {
    log.error('admin search error', { error: err.message });
    res.status(500).json({ error: 'Search unavailable' });
  }
});

// GET /admin/activity — a factual cross-workflow timeline assembled from the
// records themselves. This gives operators context without introducing an
// eventually-consistent event store for actions the database already records.
router.get('/activity', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM (
        SELECT 'Admin action' AS kind, a.summary AS title,
               CONCAT(COALESCE(u.name, 'Former admin'), ' · ', REPLACE(a.action, '.', ' ')) AS detail,
               a.created_at AS happened_at, '/activity' AS href
        FROM admin_audit_log a LEFT JOIN users u ON u.id = a.actor_id
        UNION ALL
        SELECT 'Submission' AS kind, CONCAT(make, ' ', model) AS title,
               status AS detail, created_at AS happened_at, '/submissions' AS href
        FROM submissions
        UNION ALL
        SELECT 'Inspection', CONCAT('Inspection · ', center), status,
               scheduled_at, '/inspections'
        FROM inspections
        UNION ALL
        SELECT 'Handover', booking_id, status, booked_at, '/handovers'
        FROM handovers
        UNION ALL
        SELECT 'Fee', CONCAT(fee_type, ' · RWF ', amount::text), status,
               created_at, '/fees'
        FROM platform_fees WHERE currency = 'RWF'
      ) activity
      WHERE happened_at IS NOT NULL
      ORDER BY happened_at DESC LIMIT 20
    `);
    res.json(rows);
  } catch (err) {
    log.error('admin activity error', { error: err.message });
    res.status(500).json({ error: 'Activity unavailable' });
  }
});

// GET /admin/audit-log — durable operator history with bounded filters.
router.get('/audit-log', requireAdmin, paginate({ defaultLimit: 50, maxLimit: 100 }), async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 120);
  const targetType = String(req.query.type || '').trim().slice(0, 50);
  const params = [];
  const where = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(a.summary ILIKE $${params.length} OR u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR COALESCE(a.target_id, '') ILIKE $${params.length})`);
  }
  if (targetType) {
    params.push(targetType);
    where.push(`a.target_type = $${params.length}`);
  }
  params.push(req.pagination.limit, req.pagination.offset);
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.action, a.target_type, a.target_id, a.summary,
              a.metadata, a.created_at, u.name AS actor_name, u.email AS actor_email
       FROM admin_audit_log a LEFT JOIN users u ON u.id = a.actor_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(rows);
  } catch (err) {
    log.error('admin audit list error', { error: err.message });
    res.status(500).json({ error: 'Audit history unavailable' });
  }
});

// ─── Fees ledger — the platform_fees table finally gets a read side ──────────

// GET /admin/fees?status=due|paid|waived — commission/certification/featured rows
router.get('/fees', requireAdmin, async (req, res) => {
  const { status } = req.query;
  const params = [];
  let where = '';
  if (status) {
    if (!['due', 'paid', 'waived'].includes(status)) {
      return res.status(400).json({ error: 'status must be due, paid, or waived' });
    }
    params.push(status);
    where = 'WHERE f.status = $1';
  }
  try {
    const { rows } = await pool.query(
      `SELECT f.*,
              -- LEFT: a rental fee has no seller (the fleet is the house's
              -- own) and must not vanish from the money book because of it.
              COALESCE(u.name, CASE WHEN f.fee_type = 'rental' THEN 'Sawa fleet' END) AS seller_name,
              h.booking_id, c.title AS car_title,
              rb.booking_ref AS rental_ref
       FROM platform_fees f
       LEFT JOIN users u ON u.id = f.seller_id
       LEFT JOIN handovers h ON h.id = f.handover_id
       LEFT JOIN cars c ON c.id = h.car_id
       LEFT JOIN rental_bookings rb ON rb.id = f.booking_id
       ${where}
       ORDER BY f.created_at DESC`,
      params
    );
    // Totals are per status AND per currency. Adding a USD fee to an RWF fee
    // produces a number that is not money in any currency, and 0006 makes mixed
    // rows possible for the first time (historical fees stay USD until
    // scripts/convert-to-rwf.js is run with an agreed rate). Summing blind here
    // would have understated the outstanding balance by ~1300x per legacy row.
    //
    // `totals` keeps its old shape — { due: n, paid: n } — so existing callers
    // keep working, but it now only counts the DEFAULT currency, and
    // totalsByCurrency carries the full picture. currencies[] lets a client tell
    // "one currency, render a single figure" from "mixed, render both".
    const totalsByCurrency = {};
    for (const r of rows) {
      const cur = r.currency || 'RWF';
      totalsByCurrency[cur] = totalsByCurrency[cur] || {};
      totalsByCurrency[cur][r.status] = (totalsByCurrency[cur][r.status] || 0) + Number(r.amount);
    }
    const currencies = Object.keys(totalsByCurrency).sort();
    const primary = currencies.includes('RWF') ? 'RWF' : currencies[0];
    res.json({
      fees: rows,
      totals: totalsByCurrency[primary] || {},
      totalsByCurrency,
      currencies,
    });
  } catch (err) {
    log.error('fees list error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /admin/fees/:id — mark a fee paid (collected at the center) or waived
router.patch('/fees/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const { status } = req.body;
  if (!['paid', 'waived', 'due'].includes(status)) {
    return res.status(400).json({ error: 'status must be paid, waived, or due' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'UPDATE platform_fees SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Fee not found' }); }
    await recordAdminAction(client, {
      actorId: req.user.id, action: 'fee.status_changed', targetType: 'fee', targetId: req.params.id,
      summary: `Fee marked ${status}`, metadata: { status, amount: rows[0].amount, currency: rows[0].currency },
    });
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
