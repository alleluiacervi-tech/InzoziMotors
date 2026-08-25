const express = require('express');
const bcrypt = require('bcryptjs');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { requireUuid, paginate } = require('../middleware/validate');
const { recordAdminAction } = require('../lib/admin-audit');
const { sendAccountInvite, sendResetCode, mailEnabled } = require('../lib/mailer');
const { ACCOUNT_KINDS, createInvitedAccount } = require('../lib/accounts');
const { CHECKLIST_VERSION, PUBLISH_THRESHOLD } = require('../lib/inspection-policy');
const {
  SETTING_KEY: DUTY_RATES_KEY,
  validateRates: validateDutyRates,
  invalidateDutyRates,
} = require('../lib/duty-rates');

const router = express.Router();

// GET /admin/action-center — one factual queue for the single Super Admin.
//
// This deliberately derives work from source-of-truth workflow tables instead
// of maintaining a second "tasks" table that can drift out of sync. Every item
// is actionable, carries a stable destination, and explains why it is urgent.
router.get('/action-center', requireAdmin, async (_req, res) => {
  try {
    const [submissions, ids, inspections, reports, imports, importPayments, rentalInquiries, listingRisks] = await Promise.all([
      pool.query(`SELECT id, make, model, submitted_at AS occurred_at,
                    EXTRACT(EPOCH FROM (NOW() - submitted_at)) / 3600 AS age_hours
                  FROM submissions
                  WHERE status IN ('under_review','pending')
                  ORDER BY submitted_at ASC LIMIT 20`),
      pool.query(`SELECT id, name, COALESCE(id_submitted_at, created_at) AS occurred_at,
                    EXTRACT(EPOCH FROM (NOW() - COALESCE(id_submitted_at, created_at))) / 3600 AS age_hours
                  FROM users WHERE id_verified = 'pending'
                  ORDER BY COALESCE(id_submitted_at, created_at) ASC LIMIT 20`),
      pool.query(`SELECT i.id, i.scheduled_at AS occurred_at, c.title AS car_title,
                    CASE WHEN i.scheduled_at IS NULL THEN 0
                         ELSE EXTRACT(EPOCH FROM (NOW() - i.scheduled_at)) / 3600 END AS age_hours
                  FROM inspections i LEFT JOIN cars c ON c.id = i.car_id
                  WHERE i.status IN ('scheduled','in_progress')
                    AND (i.status = 'in_progress' OR i.scheduled_at <= NOW() + INTERVAL '24 hours')
                  ORDER BY i.scheduled_at ASC NULLS LAST LIMIT 20`),
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
      pool.query(`SELECT ri.id, ri.inquiry_ref, ri.created_at AS occurred_at,
                    EXTRACT(EPOCH FROM (NOW() - ri.created_at)) / 3600 AS age_hours,
                    rc.title AS car_title
                  FROM rental_inquiries ri JOIN rental_cars rc ON rc.id = ri.rental_car_id
                  WHERE ri.status = 'new'
                  ORDER BY ri.created_at ASC LIMIT 20`),
      pool.query(`SELECT c.id, c.title, c.created_at AS occurred_at,
                    EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600 AS age_hours
                  FROM cars c JOIN users u ON u.id = c.seller_id
                  WHERE c.status IN ('under_review','approved')
                     OR (c.status = 'live' AND (
                       u.id_verified <> 'approved' OR u.account_status <> 'active'
                       OR NOT EXISTS (
                         SELECT 1 FROM inspections i JOIN submissions s ON s.id=i.submission_id
                         WHERE i.car_id=c.id AND s.seller_id=c.seller_id
                           AND lower(s.make)=lower(c.make) AND lower(s.model)=lower(c.model) AND s.year=c.year
                           AND i.status='complete' AND i.checklist_version='${CHECKLIST_VERSION}'
                           AND i.passed=TRUE AND i.score >= ${PUBLISH_THRESHOLD}
                           AND jsonb_array_length(COALESCE(i.critical_failures, '[]'::jsonb))=0
                       )
                       OR (COALESCE(cardinality(c.images),0) = 0
                           AND NOT EXISTS (SELECT 1 FROM car_photos p WHERE p.car_id=c.id))))
                  ORDER BY c.created_at ASC LIMIT 20`),
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
      ...submissions.rows.map((r) => item(r, { id: `submission:${r.id}`, kind: 'Submission', priority: agedPriority(r, 24, 8), title: `Review ${r.make} ${r.model}`, detail: 'Seller submission is awaiting a decision', href: `/submissions?focus=${r.id}` })),
      ...ids.rows.map((r) => item(r, { id: `identity:${r.id}`, kind: 'Identity', priority: agedPriority(r, 24, 8), title: `Verify ${r.name}`, detail: 'Identity documents are waiting for review', href: `/users?tab=verification&focus=${r.id}` })),
      ...inspections.rows.map((r) => item(r, { id: `inspection:${r.id}`, kind: 'Inspection', priority: Number(r.age_hours) > 0 ? 'urgent' : 'attention', title: Number(r.age_hours) > 0 ? 'Inspection is due' : 'Inspection within 24 hours', detail: r.car_title || 'Scheduled vehicle inspection', href: `/inspections?focus=${r.id}` })),
      ...reports.rows.map((r) => item(r, { id: `report:${r.id}`, kind: 'Safety', priority: agedPriority(r, 12, 0), title: 'Review reported conversation', detail: r.reason, href: `/reports?focus=${r.id}` })),
      ...imports.rows.map((r) => item(r, { id: `import:${r.id}`, kind: 'Import', priority: Number(r.age_hours) >= 72 ? 'urgent' : agedPriority(r, 24, 0), title: `${r.order_ref} needs attention`, detail: r.status === 'enquiry' ? 'New import enquiry needs a quotation' : r.status.replaceAll('_', ' '), href: `/imports/${r.id}` })),
      ...importPayments.rows.map((r) => item(r, { id: `import-payment:${r.id}`, kind: 'Import', priority: agedPriority(r, 8, 0), title: `Review offline record for ${r.order_ref}`, detail: `${r.milestone.replaceAll('_', ' ')} evidence submitted`, href: `/imports/${r.import_order_id}` })),
      ...rentalInquiries.rows.map((r) => item(r, { id: `rental-inquiry:${r.id}`, kind: 'Rental inquiry', priority: agedPriority(r, 24, 4), title: `Follow up ${r.inquiry_ref}`, detail: r.car_title, href: `/rentals/inquiries?focus=${r.id}` })),
      ...listingRisks.rows.map((r) => item(r, { id: `listing-risk:${r.id}`, kind: 'Listing', priority: r.age_hours >= 24 ? 'urgent' : 'attention', title: `Review ${r.title}`, detail: 'Approval, inspection or gallery requirement needs attention', href: `/listings/${r.id}/edit` })),
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
      listingsRes, submissionsRes, inquiriesRes,
      idQueueRes, soldRes, gmvRes, feesRes,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM cars WHERE status = 'live'"),
      pool.query("SELECT COUNT(*) FROM submissions WHERE status IN ('under_review','pending')"),
      pool.query("SELECT COUNT(*) FROM rental_inquiries WHERE status = 'new'"),
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
      pendingInquiries:      parseInt(inquiriesRes.rows[0].count),
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
  'draft', 'under_review', 'scheduled', 'inspecting', 'approved', 'live',
  'paused', 'sold', 'rejected', 'archived',
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
      `SELECT c.*, u.name AS seller_name, u.id_verified AS seller_id_verified,
              u.account_status AS seller_account_status,
              COALESCE(cardinality(c.images), 0)::int AS image_count,
              (SELECT COUNT(*)::int FROM car_photos p WHERE p.car_id = c.id) AS structured_photo_count,
              EXISTS (
                SELECT 1 FROM inspections i JOIN submissions s ON s.id = i.submission_id
                WHERE i.car_id = c.id AND s.seller_id = c.seller_id
                  AND lower(s.make) = lower(c.make) AND lower(s.model) = lower(c.model) AND s.year = c.year
                  AND i.status = 'complete' AND i.checklist_version = '${CHECKLIST_VERSION}'
                  AND i.passed = TRUE AND i.score >= ${PUBLISH_THRESHOLD}
                  AND jsonb_array_length(COALESCE(i.critical_failures, '[]'::jsonb)) = 0
              ) AS has_completed_inspection
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
      `SELECT id, name, email, phone, whatsapp_phone, phone_visible,
              whatsapp_visible, contact_consent_at, role, id_verified, seller_type,
              business_name, business_verified, admin_created, must_change_password, account_status,
              suspended_at, suspension_reason, trust_score,
              completed_sales, created_at
       FROM users
       WHERE name ILIKE $1 OR email ILIKE $1 OR COALESCE(phone, '') ILIKE $1
          OR COALESCE(whatsapp_phone, '') ILIKE $1 OR COALESCE(business_name, '') ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [`%${q}%`, safeLimit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /admin/users/:id — correct ordinary account data and buyer/seller role.
// Admin promotion is deliberately not an HTTP dashboard operation: allowing any
// signed-in administrator to mint more administrators is an avoidable takeover
// path. It is handled through the controlled deployment/database process.
router.patch('/users/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Use your own profile settings to change your account.' });
  const allowed = [
    'name', 'phone', 'whatsapp_phone', 'phone_visible', 'whatsapp_visible',
    'business_name', 'business_verified', 'seller_type', 'role',
  ];
  const fields = allowed.filter((field) => req.body[field] !== undefined);
  if (!fields.length) return res.status(400).json({ error: 'No editable account fields provided' });

  const booleanFields = new Set(['phone_visible', 'whatsapp_visible', 'business_verified']);
  const values = {};
  for (const field of fields) {
    if (booleanFields.has(field)) {
      if (typeof req.body[field] !== 'boolean') return res.status(400).json({ error: `${field} must be true or false` });
      values[field] = req.body[field];
    } else {
      values[field] = req.body[field] == null ? null : String(req.body[field]).trim();
    }
  }
  if (values.name !== undefined && (!values.name || values.name.length > 120)) return res.status(400).json({ error: 'name must be between 1 and 120 characters' });
  if (values.phone !== undefined && values.phone && values.phone.length > 40) return res.status(400).json({ error: 'phone is too long' });
  if (values.whatsapp_phone !== undefined && values.whatsapp_phone && values.whatsapp_phone.length > 40) return res.status(400).json({ error: 'whatsapp_phone is too long' });
  if (values.business_name !== undefined && values.business_name && values.business_name.length > 160) return res.status(400).json({ error: 'business_name is too long' });
  if (values.seller_type !== undefined && values.seller_type && !['individual', 'showroom'].includes(values.seller_type)) return res.status(400).json({ error: 'seller_type must be individual or showroom' });
  if (values.role !== undefined && !['buyer', 'seller'].includes(values.role)) return res.status(400).json({ error: 'role must be buyer or seller' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const before = await client.query(
      `SELECT role,id_verified,account_status,deleted_at,seller_type,business_verified,
              phone,whatsapp_phone,phone_visible,whatsapp_visible
       FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`,
      [req.params.id]
    );
    if (!before.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Active user not found' }); }
    if (before.rows[0].role === 'admin') { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Administrator accounts cannot be changed here' }); }
    const profile = before.rows[0];
    const finalRole = values.role !== undefined ? values.role : profile.role;
    const finalSellerType = values.seller_type !== undefined ? values.seller_type : profile.seller_type;
    const finalBusinessVerified = values.business_verified !== undefined ? values.business_verified : profile.business_verified;
    const finalPhone = values.phone !== undefined ? values.phone : profile.phone;
    const finalWhatsapp = values.whatsapp_phone !== undefined ? values.whatsapp_phone : profile.whatsapp_phone;
    const finalPhoneVisible = values.phone_visible !== undefined ? values.phone_visible : profile.phone_visible;
    const finalWhatsappVisible = values.whatsapp_visible !== undefined ? values.whatsapp_visible : profile.whatsapp_visible;
    if (values.phone_visible === true || values.whatsapp_visible === true) {
      const eligible = finalRole === 'seller' && profile.id_verified === 'approved' &&
        profile.account_status === 'active' && !profile.deleted_at &&
        (finalSellerType !== 'showroom' || finalBusinessVerified === true);
      if (!eligible) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Public contact requires an active, verified seller account' }); }
      if (finalPhoneVisible && !finalPhone) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Add a phone number before making it visible' }); }
      if (finalWhatsappVisible && !finalWhatsapp) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Add a WhatsApp number before making it visible' }); }
    }
    const params = fields.map((field) => values[field]);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    if (values.phone_visible === true || values.whatsapp_visible === true) assignments.push('contact_consent_at = NOW()');
    params.push(req.params.id);
    const { rows } = await client.query(
      `UPDATE users SET ${assignments.join(', ')} WHERE id=$${params.length}
       RETURNING id,name,email,phone,whatsapp_phone,phone_visible,whatsapp_visible,
                 contact_consent_at,role,id_verified,seller_type,business_name,
                 business_verified,account_status,created_at`, params
    );
    if (values.role !== undefined && values.role !== before.rows[0].role) {
      await client.query('UPDATE users SET token_version=token_version+1 WHERE id=$1', [req.params.id]);
    }
    const remainsEligible = finalRole === 'seller' && profile.id_verified === 'approved' &&
      profile.account_status === 'active' && !profile.deleted_at &&
      (finalSellerType !== 'showroom' || finalBusinessVerified === true);
    let affectedListings = 0;
    let affectedRentals = 0;
    if (!remainsEligible) {
      await client.query('UPDATE users SET phone_visible=FALSE, whatsapp_visible=FALSE WHERE id=$1', [req.params.id]);
      affectedListings = (await client.query(
        `UPDATE cars SET status='under_review',
           review_notes=CONCAT_WS(E'\n', NULLIF(review_notes, ''), 'Seller eligibility changed; admin review is required before republication.')
         WHERE seller_id=$1 AND status IN ('live','approved','paused')`, [req.params.id]
      )).rowCount;
      affectedRentals = (await client.query(
        "UPDATE rental_cars SET status='maintenance' WHERE provider_id=$1 AND status='active'", [req.params.id]
      )).rowCount;
    }
    await recordAdminAction(client, { actorId: req.user.id, action: 'user.updated', targetType: 'user', targetId: req.params.id,
      summary: `Updated account details for ${rows[0].email}`, metadata: { fields, affected_listings: affectedListings, affected_rentals: affectedRentals } });
    await client.query('COMMIT');
    const response = await pool.query(
      `SELECT id,name,email,phone,whatsapp_phone,phone_visible,whatsapp_visible,
              contact_consent_at,role,id_verified,seller_type,business_name,
              business_verified,account_status,created_at FROM users WHERE id=$1`,
      [req.params.id]
    );
    res.json(response.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    log.error('admin user update error', { error: err.message });
    res.status(500).json({ error: 'Could not update user' });
  } finally { client.release(); }
});

// POST /admin/users/:id/password-reset — initiate, never set or reveal a password.
router.post('/users/:id/password-reset', requireAdmin, requireUuid('id'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT id,email,name,role FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE', [req.params.id]);
    if (!user.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Active user not found' }); }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 12);
    await client.query('UPDATE password_resets SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [req.params.id]);
    await client.query("INSERT INTO password_resets (user_id, code_hash, expires_at) VALUES ($1,$2,NOW()+INTERVAL '30 minutes')", [req.params.id, codeHash]);
    await client.query('UPDATE users SET token_version=token_version+1 WHERE id=$1', [req.params.id]);
    await recordAdminAction(client, { actorId: req.user.id, action: 'user.password_reset_initiated', targetType: 'user', targetId: req.params.id,
      summary: `Password reset initiated for ${user.rows[0].email}`, metadata: { delivery: mailEnabled() ? 'email' : 'not_configured' } });
    await client.query('COMMIT');
    const delivered = await sendResetCode(user.rows[0].email, code);
    res.json({ success: true, delivery: delivered ? 'email_sent' : 'email_not_configured' });
  } catch (err) {
    await client.query('ROLLBACK');
    log.error('admin password reset error', { error: err.message });
    res.status(500).json({ error: 'Could not initiate password reset' });
  } finally { client.release(); }
});

// PATCH /admin/users/:id/access — reversible suspension with immediate logout.
router.patch('/users/:id/access', requireAdmin, requireUuid('id'), async (req, res) => {
  const action = String(req.body.action || '');
  const reason = String(req.body.reason || '').trim().slice(0, 500);
  if (!['suspend', 'restore'].includes(action)) return res.status(400).json({ error: 'action must be suspend or restore' });
  if (action === 'suspend' && !reason) return res.status(400).json({ error: 'A suspension reason is required' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot suspend your own account' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT email,role,account_status FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE', [req.params.id]);
    if (!user.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Active user not found' }); }
    if (user.rows[0].role === 'admin') { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Administrator accounts cannot be suspended here' }); }
    const status = action === 'suspend' ? 'suspended' : 'active';
    const { rows } = await client.query(
      `UPDATE users SET account_status=$1, suspended_at=${action === 'suspend' ? 'NOW()' : 'NULL'},
       suspension_reason=$2, token_version=token_version+1 WHERE id=$3
       RETURNING id,name,email,role,account_status,suspended_at,suspension_reason`,
      [status, action === 'suspend' ? reason : null, req.params.id]
    );
    let affectedListings = 0;
    let affectedRentals = 0;
    if (action === 'suspend') {
      await client.query('UPDATE users SET phone_visible=FALSE, whatsapp_visible=FALSE WHERE id=$1', [req.params.id]);
      affectedListings = (await client.query(
        "UPDATE cars SET status='paused' WHERE seller_id=$1 AND status='live'", [req.params.id]
      )).rowCount;
      affectedRentals = (await client.query(
        "UPDATE rental_cars SET status='maintenance' WHERE provider_id=$1 AND status='active'", [req.params.id]
      )).rowCount;
    }
    await recordAdminAction(client, { actorId: req.user.id, action: action === 'suspend' ? 'user.suspended' : 'user.restored', targetType: 'user', targetId: req.params.id,
      summary: `${action === 'suspend' ? 'Suspended' : 'Restored'} account ${user.rows[0].email}`, metadata: {
        previous_status: user.rows[0].account_status, reason: action === 'suspend' ? reason : undefined,
        affected_listings: affectedListings, affected_rentals: affectedRentals,
      } });
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    log.error('admin user access error', { error: err.message });
    res.status(500).json({ error: 'Could not update account access' });
  } finally { client.release(); }
});

// Admin-created accounts are never self-selected at public registration, and
// the recipient always sets their own password from a one-use link — admins and
// email logs never contain one. The account kinds and the invite itself live in
// lib/accounts.js, shared with the walk-in inspection booking flow.
function readAccountBody(req) {
  const name = String(req.body.name || '').trim().slice(0, 120);
  const businessName = String(req.body.business_name || '').trim().slice(0, 160) || null;
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim().slice(0, 40) || null;
  return { name, businessName, email, phone };
}

// POST /admin/accounts — create any kind of account and send the invite.
router.post('/accounts', requireAdmin, async (req, res) => {
  const accountType = String(req.body.account_type || '');
  const kind = ACCOUNT_KINDS[accountType];
  if (!kind) {
    return res.status(400).json({ error: `account_type must be one of: ${Object.keys(ACCOUNT_KINDS).join(', ')}` });
  }
  const { name, businessName, email, phone } = readAccountBody(req);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'A contact name and a valid email address are required' });
  }
  if (kind.needsBusiness && !businessName) {
    return res.status(400).json({ error: 'A showroom account needs its business name' });
  }
  try {
    const result = await require('../lib/tx').withTransaction((client) => createInvitedAccount(client, {
      accountType, name, email, phone, businessName, invitedBy: req.user.id,
    }));
    if (result.conflict) return res.status(409).json({ error: 'An account already uses this email' });
    const delivered = await sendAccountInvite(email, name, {
      accountType, businessName, token: result.token,
    });
    res.status(201).json({ ...result.user, invitation_sent: delivered });
  } catch (err) {
    log.error('account invite error', { error: err.message, accountType });
    res.status(500).json({ error: 'Could not create the account' });
  }
});

// POST /admin/showrooms — the original route, kept because invite emails and
// shipped clients point at it. Delegates to the generalised path above.
router.post('/showrooms', requireAdmin, async (req, res) => {
  const { name, businessName, email, phone } = readAccountBody(req);
  if (!name || !businessName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Contact name, showroom name and a valid email are required' });
  }
  try {
    const result = await require('../lib/tx').withTransaction((client) => createInvitedAccount(client, {
      accountType: 'showroom', name, email, phone, businessName, invitedBy: req.user.id,
    }));
    if (result.conflict) return res.status(409).json({ error: 'An account already uses this email' });
    const delivered = await sendAccountInvite(email, name, {
      accountType: 'showroom', businessName, token: result.token,
    });
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
                  ORDER BY s.submitted_at DESC LIMIT 5`, [needle]),
      pool.query(`SELECT ri.id, ri.inquiry_ref, u.name AS customer_name, ri.status
                  FROM rental_inquiries ri JOIN users u ON u.id=ri.renter_id
                  WHERE ri.inquiry_ref ILIKE $1 OR u.name ILIKE $1 OR u.email ILIKE $1
                  ORDER BY ri.created_at DESC LIMIT 5`, [needle]),
    ]);
    res.json({ results: [
      ...users.rows.map((r) => ({ kind: 'User', id: r.id, title: r.name, detail: r.email, href: `/users?q=${encodeURIComponent(r.email)}` })),
      ...cars.rows.map((r) => ({ kind: 'Listing', id: r.id, title: r.title, detail: r.status, href: `/listings/${r.id}/edit` })),
      ...submissions.rows.map((r) => ({ kind: 'Submission', id: r.id, title: `${r.make} ${r.model}`, detail: `${r.seller_name} · ${r.status}`, href: '/submissions' })),
      ...rentals.rows.map((r) => ({ kind: 'Rental inquiry', id: r.id, title: r.inquiry_ref, detail: `${r.customer_name} · ${r.status}`, href: '/rentals/inquiries' })),
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
               status AS detail, submitted_at AS happened_at, '/submissions' AS href
        FROM submissions
        UNION ALL
        SELECT 'Inspection', CONCAT('Inspection · ', center), status,
               scheduled_at, '/inspections'
        FROM inspections
        UNION ALL
        SELECT 'Rental inquiry', inquiry_ref, status, created_at, '/rentals/inquiries'
        FROM rental_inquiries
        UNION ALL
        SELECT 'Buyer contact', CONCAT('Contact · ', channel),
               CONCAT('Listing ', car_id::text), created_at, '/activity'
        FROM listing_contact_events
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

// GET/PATCH /admin/settings — operational controls with immutable policy rails.
// Payments, guarantees and marketplace mode are intentionally read-only; an
// administrator cannot turn regulated functionality back on with one click.
router.get('/settings', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT key, value, description, editable, updated_at, updated_by
       FROM platform_settings ORDER BY key`
    );
    res.json(rows);
  } catch (err) {
    log.error('admin settings error', { error: err.message });
    res.status(500).json({ error: 'Settings unavailable' });
  }
});

router.patch('/settings/:key', requireAdmin, async (req, res) => {
  const key = String(req.params.key || '');
  const validators = {
    listing_min_photos: (value) => Number.isInteger(value) && value >= 1 && value <= 10,
    listing_recommended_photos: (value) => Number.isInteger(value) && value >= 1 && value <= 20,
    // The first setting that is an object rather than an integer. A form of
    // twenty numbers cannot be corrected from "Invalid value for
    // import_duty_rates", so this one reports which field is wrong.
    [DUTY_RATES_KEY]: (value) => validateDutyRates(value).length === 0,
  };
  if (!validators[key]) return res.status(400).json({ error: 'This setting is not editable' });
  if (!validators[key](req.body.value)) {
    if (key === DUTY_RATES_KEY) {
      const problems = validateDutyRates(req.body.value);
      return res.status(400).json({ error: problems[0], code: 'INVALID_DUTY_RATES', problems });
    }
    return res.status(400).json({ error: `Invalid value for ${key}` });
  }
  try {
    const result = await require('../lib/tx').withTransaction(async (client) => {
      const before = await client.query('SELECT * FROM platform_settings WHERE key=$1 FOR UPDATE', [key]);
      if (!before.rowCount || !before.rows[0].editable) {
        const error = new Error('This setting is locked'); error.status = 403; throw error;
      }
      if (key === 'listing_recommended_photos') {
        const min = await client.query("SELECT value FROM platform_settings WHERE key='listing_min_photos'");
        if (Number(req.body.value) < Number(min.rows[0]?.value || 1)) {
          const error = new Error('Recommended photos cannot be lower than the publishing minimum'); error.status = 400; throw error;
        }
      }
      if (key === 'listing_min_photos') {
        const recommended = await client.query("SELECT value FROM platform_settings WHERE key='listing_recommended_photos'");
        if (Number(req.body.value) > Number(recommended.rows[0]?.value || 6)) {
          const error = new Error('Publishing minimum cannot exceed the recommended gallery size'); error.status = 400; throw error;
        }
      }
      const { rows } = await client.query(
        `UPDATE platform_settings SET value=$1::jsonb, updated_at=NOW(), updated_by=$2
         WHERE key=$3 RETURNING *`,
        [JSON.stringify(req.body.value), req.user.id, key]
      );
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'setting.updated', targetType: 'platform_setting', targetId: key,
        summary: `${key.replaceAll('_', ' ')} updated`,
        metadata: { previous: before.rows[0].value, current: req.body.value },
      });
      return rows[0];
    });
    // Otherwise the public calculator keeps serving the old rates for up to the
    // cache TTL, and the operator reasonably concludes their edit did not save.
    if (key === DUTY_RATES_KEY) invalidateDutyRates();
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('admin setting update error', { error: err.message });
    res.status(500).json({ error: 'Could not update setting' });
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

// Old fee rows are evidence only. The no-payment policy forbids turning them
// into a current collection workflow from the dashboard.
router.patch('/fees/:id', requireAdmin, requireUuid('id'), (_req, res) => {
  res.status(410).json({
    error: 'The platform fee workflow is retired. Historical records are read-only.',
    code: 'PLATFORM_FEES_RETIRED',
  });
});

module.exports = router;
