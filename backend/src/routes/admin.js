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
const { integrityFlags, integrityPriority } = require('../lib/inspection-integrity');
const {
  SETTING_KEY: DUTY_RATES_KEY,
  validateRates: validateDutyRates,
  invalidateDutyRates,
} = require('../lib/duty-rates');
const {
  SETTING_KEY: APP_RELEASE_KEY,
  validateRelease: validateAppRelease,
  invalidateAppRelease,
} = require('../lib/app-release');
const {
  SETTING_KEY: SERVICE_RATES_KEY,
  validateRates: validateServiceRates,
  invalidateServiceRates,
} = require('../lib/service-rates');
const {
  slugify, loadMakes, invalidateMakes,
} = require('../lib/vehicle-makes');
const { uploadBrandLogo, verifyImageContent, resolveUploadUrl } = require('../middleware/upload');
const {
  CLOSURE_REASONS, REASON_LABELS, RECOVERY_DAYS,
  purgeAccount, removeIdDocuments, CLOSED_ACCOUNTS, DUE_FOR_PURGE,
} = require('../lib/account-closure');
const { sendAccountDeleted } = require('../lib/mailer');

const router = express.Router();

// The public site the activation link points at — same origin lib/mailer.js uses.
const SITE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN || 'https://sawacars.com';

// GET /admin/action-center — one factual queue for the single Super Admin.
//
// This deliberately derives work from source-of-truth workflow tables instead
// of maintaining a second "tasks" table that can drift out of sync. Every item
// is actionable, carries a stable destination, and explains why it is urgent.
/** The floor below which a completed 150-point checklist is not credible.
 *  A missing or unreadable row falls back to the shipped default: a settings
 *  problem must not take the Action Center down with it. */
async function minInspectionMinutes() {
  try {
    const { rows } = await pool.query("SELECT value FROM platform_settings WHERE key='inspection_min_minutes'");
    const value = Number(rows[0]?.value);
    return Number.isFinite(value) && value >= 0 ? value : 20;
  } catch {
    return 20;
  }
}

router.get('/action-center', requireAdmin, async (req, res) => {
  try {
    // ⚠ This list is positional. Every name here binds to the query at the SAME
    // index below, and nothing checks that they agree — a query inserted in the
    // middle without moving its name silently hands one queue another queue's
    // rows. That has now happened twice in this file: once swapping the rental
    // and integrity queues, and once feeding the seller-cap queue a list of
    // suspect inspections. Add new queries at the END, and add the name at the
    // END, together.
    const [
      submissions, ids, inspections, reports, imports, importPayments,
      rentalInquiries, listingRisks, lapsingRentals, paidUnpublishedRentals,
      overCapSellers, suspectInspections, purgeDue,
    ] = await Promise.all([
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
      // Rental listing subscriptions that have run out or are about to.
      //
      // This backend has no scheduler, so nothing can email a warning on the
      // day. Surfacing the window here is the substitute: a lapse is visible
      // for a week before it happens and stays visible after, which is what
      // stops it being noticed only when a provider asks where their car went.
      pool.query(`SELECT rc.id, rc.title, sub.ends_on,
                    sub.ends_on < CURRENT_DATE AS lapsed,
                    CASE WHEN sub.ends_on < CURRENT_DATE
                         THEN EXTRACT(EPOCH FROM (NOW() - sub.ends_on::timestamptz)) / 3600
                         ELSE 0 END AS age_hours,
                    sub.ends_on::timestamptz AS occurred_at
                  FROM rental_cars rc
                  JOIN LATERAL (
                    SELECT * FROM rental_subscriptions s
                     WHERE s.rental_car_id = rc.id AND s.voided_at IS NULL
                     ORDER BY s.ends_on DESC LIMIT 1
                  ) sub ON TRUE
                  WHERE rc.status = 'active'
                    AND sub.ends_on <= CURRENT_DATE + 7
                  ORDER BY sub.ends_on ASC LIMIT 20`),
      // Paid for, and still not on the public feed.
      //
      // The lapsing queue above is scoped to rc.status = 'active', which is
      // right for what it does — a parked car's lapse is not urgent — but it
      // means this case appears nowhere at all. Recording a subscription does
      // not flip status, deliberately, so a car created without one begins in
      // 'maintenance' and STAYS there after it is paid for. The operator has
      // taken money for a listing nobody can see, and nothing tells them.
      pool.query(`SELECT rc.id, rc.title, rc.status, sub.amount_rwf, sub.ends_on,
                    EXTRACT(EPOCH FROM (NOW() - sub.created_at)) / 3600 AS age_hours,
                    sub.created_at AS occurred_at
                  FROM rental_cars rc
                  JOIN LATERAL (
                    SELECT * FROM rental_subscriptions s
                     WHERE s.rental_car_id = rc.id AND s.voided_at IS NULL
                       AND s.starts_on <= CURRENT_DATE AND s.ends_on >= CURRENT_DATE
                     ORDER BY s.ends_on DESC LIMIT 1
                  ) sub ON TRUE
                  WHERE rc.status <> 'active' AND rc.retired_at IS NULL
                  ORDER BY sub.created_at ASC LIMIT 20`),
      // Sellers holding more listings than their agreed cap.
      //
      // Lowering a cap deliberately does NOT unpublish anything — doing that
      // from a number field would delete a paying customer's shopfront in bulk.
      // So the over-cap state is real and has to be visible somewhere, or an
      // operator sets a cap of 20 on a showroom with 34 cars and never learns
      // that the number they typed is not the number in effect.
      pool.query(`SELECT u.id, u.name, u.max_active_listings AS cap,
                    COUNT(c.id)::int AS occupied,
                    COUNT(c.id)::int - u.max_active_listings AS over_by,
                    EXTRACT(EPOCH FROM (NOW() - u.listing_cap_set_at)) / 3600 AS age_hours,
                    u.listing_cap_set_at AS occurred_at
                  FROM users u
                  JOIN cars c ON c.seller_id = u.id AND c.status IN ('live','paused')
                  WHERE u.max_active_listings IS NOT NULL AND u.deleted_at IS NULL
                  GROUP BY u.id, u.name, u.max_active_listings, u.listing_cap_set_at
                  HAVING COUNT(c.id) > u.max_active_listings
                  ORDER BY (COUNT(c.id)::int - u.max_active_listings) DESC LIMIT 20`),
      // Completed inspections whose record does not look plausible.
      //
      // SQL narrows to CANDIDATES; lib/inspection-integrity.js still decides.
      // The first version fetched the hundred most recent and judged them all,
      // which quietly broke: this queue surfaces the OLDEST unreviewed work, so
      // an old suspect record fell outside the fetch window while being exactly
      // what the queue exists to show. Narrowing first lets the fetch be
      // ordered the same way the queue is.
      //
      // ⚠ The predicate below must stay a SUPERSET of every flag that is not
      // 'no_exceptions'. Both current ones are about the clock. Add a flag that
      // is not, and widen this or it will never be seen.
      pool.query(`SELECT i.id, i.started_at, i.completed_at, i.status, i.checklist_results,
                    i.score, i.kind, i.completed_at AS occurred_at,
                    EXTRACT(EPOCH FROM (NOW() - i.completed_at)) / 3600 AS age_hours,
                    u.name AS inspector_name,
                    COALESCE(c.title, s.make || ' ' || s.model,
                             i.vehicle_make || ' ' || i.vehicle_model) AS vehicle
                  FROM inspections i
                  LEFT JOIN users u ON u.id = i.inspector_id
                  LEFT JOIN cars c ON c.id = i.car_id
                  LEFT JOIN submissions s ON s.id = i.submission_id
                  WHERE i.status = 'complete'
                    AND i.completed_at > NOW() - INTERVAL '30 days'
                    AND (i.started_at IS NULL
                         OR (i.completed_at - i.started_at) < ($1 || ' minutes')::interval)
                  ORDER BY i.completed_at ASC LIMIT 40`,
                 [String(await minInspectionMinutes())]),
      // Closed accounts whose thirty days are up.
      //
      // A closure needs nobody's approval — Guideline 5.1.1(v) means it cannot
      // — so this is the only place the work shows up at all. Without it the
      // rows sit closed forever and the erasure the person was promised never
      // happens, which is the failure mode of "purge by a person, not a
      // scheduler". It nags here until somebody presses the button.
      pool.query(`SELECT id, closure_reason, purge_after AS occurred_at,
                    EXTRACT(EPOCH FROM (NOW() - purge_after)) / 3600 AS age_hours
                  FROM users
                  WHERE closed_at IS NOT NULL AND deleted_at IS NULL AND purge_after <= NOW()
                  ORDER BY purge_after ASC LIMIT 20`)
    ]);

    const minMinutes = await minInspectionMinutes();
    const suspect = suspectInspections.rows
      .map((row) => ({ row, flags: integrityFlags(row, { minMinutes }) }))
      // 'no_exceptions' alone is not a finding — a genuinely good car passes
      // everything. It only earns attention next to a clock that does not add up.
      .filter((entry) => entry.flags.some((flag) => flag.id !== 'no_exceptions'))
      .slice(0, 20);

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
      ...suspect.map(({ row, flags }) => item(row, {
        id: `inspection-integrity:${row.id}`, kind: 'Inspection',
        priority: integrityPriority(flags),
        title: `Review the record for ${row.vehicle || 'an inspected vehicle'}`,
        detail: `${flags.map((flag) => flag.label).join('. ')}${row.inspector_name ? ` — ${row.inspector_name}` : ''}`,
        href: `/inspections/${row.id}`,
      })),
      ...lapsingRentals.rows.map((r) => item(r, {
        id: `rental-subscription:${r.id}`, kind: 'Rental listing',
        priority: r.lapsed ? 'urgent' : 'routine',
        title: r.lapsed ? `${r.title} has left the catalogue` : `${r.title} lapses soon`,
        detail: r.lapsed
          ? 'The listing subscription has expired and the car is no longer public'
          : `The listing subscription runs out on ${String(r.ends_on).slice(0, 10)}`,
        href: '/rentals/fleet',
      })),
      // Money taken for a listing nobody can see. Attention rather than routine:
      // it is not an outage, but every day it sits there is a day the provider
      // paid for nothing, and the fix is a single click.
      ...paidUnpublishedRentals.rows.map((r) => item(r, {
        id: `rental-unpublished:${r.id}`, kind: 'Rental listing',
        priority: r.age_hours >= 24 ? 'urgent' : 'attention',
        title: `${r.title} is paid for but not published`,
        detail: `A subscription runs to ${String(r.ends_on).slice(0, 10)}, but the vehicle is set to `
          + `${r.status} so it is not on the public feed. Set it to Active to publish it.`,
        href: '/rentals/fleet',
      })),
      // Attention, not routine. Nothing is broken and no buyer is affected, so
      // it is not urgent — but it does not clear itself either: either the cap
      // moves up or some cars come down, and both are decisions. 'routine'
      // sorts to the bottom of the queue, which for an item that needs a human
      // to choose something is the same as not showing it.
      ...overCapSellers.rows.map((r) => item(r, {
        id: `seller-over-cap:${r.id}`, kind: 'Seller',
        priority: 'attention',
        title: `${r.name} is over their listing cap`,
        detail: `${r.occupied} live or paused against a cap of ${r.cap} — ${r.over_by} over. `
          + 'Nothing was unpublished; they cannot publish another until they are back under.',
        href: `/users?q=${encodeURIComponent(r.name || '')}`,
      })),
      // One item for the whole batch, not one per account. A name here would
      // be the wrong thing to print — these are people who asked to be erased —
      // and twenty rows saying "erase somebody" is a queue nobody reads.
      ...(purgeDue.rows.length ? [item(purgeDue.rows[0], {
        id: 'accounts-due-purge',
        kind: 'Account',
        priority: 'attention',
        title: `${purgeDue.rows.length} closed account${purgeDue.rows.length === 1 ? '' : 's'} ready to be erased`,
        detail: 'The thirty-day window has passed. Erasing is what these people were promised, and nothing does it automatically.',
        href: '/account-closures',
      })] : []),
      ...listingRisks.rows.map((r) => item(r, { id: `listing-risk:${r.id}`, kind: 'Listing', priority: r.age_hours >= 24 ? 'urgent' : 'attention', title: `Review ${r.title}`, detail: 'Approval, inspection or gallery requirement needs attention', href: `/listings/${r.id}/edit` })),
    ];
    const rank = { urgent: 0, attention: 1, routine: 2 };
    items.sort((a, b) => rank[a.priority] - rank[b.priority] || b.age_hours - a.age_hours);

    // ?kind=Inspection — one queue rather than the whole desk.
    //
    // The response is capped at 60 items, which is right for a triage view but
    // means a low-priority kind can be entirely invisible behind a backlog of
    // urgent ones. An operator who wants to work through just the identity
    // checks, or just the sellers over their cap, had no way to ask; their only
    // option was to scroll a mixed list and hope. Matched case-insensitively
    // because the kinds are display labels ('Rental listing'), not enum values.
    const kinds = String(req.query.kind || '')
      .split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    const visible = kinds.length
      ? items.filter((i) => kinds.includes(String(i.kind).toLowerCase()))
      : items;

    res.json({
      generated_at: new Date().toISOString(),
      // The summary always describes the WHOLE desk, filtered or not — an
      // operator narrowing to one kind must still see how much else is waiting,
      // or the filter becomes a way to hide work from yourself.
      summary: {
        total: items.length,
        urgent: items.filter((i) => i.priority === 'urgent').length,
        attention: items.filter((i) => i.priority === 'attention').length,
        routine: items.filter((i) => i.priority === 'routine').length,
      },
      kinds: [...new Set(items.map((i) => i.kind))].sort(),
      filtered_kinds: kinds.length ? kinds : null,
      matching: visible.length,
      items: visible.slice(0, 60),
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
// The one view where an admin decision is the next thing that has to happen.
// A car in 'under_review' is waiting to be approved; a car in 'approved' is
// waiting to be published. Both are stalled on us, and neither was visible on
// the page's old default of 'live' — which is how a vehicle that had passed its
// inspection at 150/150 could sit for a day looking, to the operator, as though
// it had never been submitted at all.
const NEEDS_ACTION_STATUSES = ['under_review', 'approved'];

router.get('/listings', requireAdmin, paginate({ defaultLimit: 50, maxLimit: 200 }), async (req, res) => {
  const { status = 'live', make } = req.query;
  const needsAction = status === 'needs_action';
  if (!needsAction && !ALLOWED_STATUSES.has(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const conditions = [needsAction ? `c.status = ANY($1)` : `c.status = $1`];
  const params = [needsAction ? NEEDS_ACTION_STATUSES : status];

  // Search has to happen HERE, not in the browser.
  //
  // The dashboard filtered the fetched page, which is fine until the page is a
  // window onto something larger. This view is ordered oldest-first, so with a
  // backlog past the page limit the NEWEST vehicle — the one just worked on, the
  // one being looked for — is precisely the one off the end. Typing its name
  // then returned nothing, which is indistinguishable from the car not existing.
  const query = String(req.query.q || '').trim();
  if (query) {
    params.push(`%${query}%`);
    const like = `$${params.length}`;
    conditions.push(`(
      c.title ILIKE ${like} OR c.make ILIKE ${like} OR c.model ILIKE ${like}
      OR COALESCE(c.vin, '') ILIKE ${like} OR COALESCE(c.location, '') ILIKE ${like}
      OR u.name ILIKE ${like} OR c.id::text ILIKE ${like}
    )`);
  }
  // A queue reads oldest-first — the car that has waited longest is the one to
  // deal with — while a browse reads newest-first. The whole clause is the
  // interpolated value rather than just the direction keyword, so the CI SQL
  // grammar step (which substitutes an unknown fragment with a bare `1`) sees
  // the valid `ORDER BY 1` instead of `ORDER BY c.created_at 1`.
  const listingOrder = needsAction ? 'c.created_at ASC' : 'c.created_at DESC';

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
       ORDER BY ${listingOrder}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    // Total for the same predicate, minus the page window. Sent as a header so
    // the response body stays the array every existing caller expects.
    const totalParams = params.slice(0, params.length - 2);
    const { rows: totals } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM cars c JOIN users u ON u.id = c.seller_id
        WHERE ${conditions.join(' AND ')}`,
      totalParams
    );
    res.set('X-Total-Count', String(totals[0].total));
    res.set('Access-Control-Expose-Headers', 'X-Total-Count');
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
              id_verification_method, id_verification_note, id_verification_ref,
              id_verified_at,
              (SELECT v.name FROM users v WHERE v.id = users.id_verified_by) AS id_verified_by_name,
              max_active_listings, listing_cap_note, listing_cap_set_at,
              -- What the cap is measured against, so the directory can show
              -- "3 of 5" rather than a limit with no context, and so an
              -- operator can see they are about to set one below the count.
              (SELECT COUNT(*)::int FROM cars c
                WHERE c.seller_id = users.id AND c.status IN ('live','paused')) AS active_listings,
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

// PUT /admin/users/:id/listing-cap — how many cars this seller may hold live.
//
// A dedicated route rather than another field on PATCH /users/:id, because a
// cap is a commercial term somebody agreed to: it needs an author and a date,
// and the schema refuses a cap without one. Send `max_active_listings: null`
// to remove the cap entirely.
//
// This never unpublishes anything. Lowering a cap below a showroom's current
// count would otherwise delete a paying customer's shopfront in bulk, from a
// number field — so instead the response says how far over they are, the
// Action Center carries it, and their NEXT publish is the one that is refused.
router.put('/users/:id/listing-cap', requireAdmin, requireUuid('id'), async (req, res) => {
  const raw = req.body.max_active_listings;
  const note = String(req.body.note || '').trim().slice(0, 500);

  let cap = null;
  if (raw !== null && raw !== undefined && raw !== '') {
    cap = Number(raw);
    if (!Number.isInteger(cap) || cap < 1) {
      return res.status(400).json({
        // A 0 cap is a suspension wearing a quota's clothes, and there is
        // already a control for that which says so where people can see it.
        error: 'A cap must be a whole number of 1 or more. To stop a seller publishing at all, suspend the account instead.',
        code: 'INVALID_LISTING_CAP',
      });
    }
    if (cap > 10000) return res.status(400).json({ error: 'That cap is not a limit.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const before = await client.query(
      `SELECT id, name, role, max_active_listings,
              (SELECT COUNT(*)::int FROM cars c
                WHERE c.seller_id = users.id AND c.status IN ('live','paused')) AS occupied
         FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [req.params.id]
    );
    if (!before.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'User not found' }); }
    const seller = before.rows[0];
    if (seller.role !== 'seller') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Only a seller can have a listing cap.',
        code: 'NOT_A_SELLER',
      });
    }

    const { rows } = await client.query(
      // Every $2 is cast: when the value is NULL, Postgres has no other clue
      // what type the column comparison in these CASE arms should be, and
      // refuses the statement rather than guessing.
      `UPDATE users SET max_active_listings = $2::int,
              listing_cap_note   = CASE WHEN $2::int IS NULL THEN NULL ELSE NULLIF($3, '') END,
              listing_cap_set_at = CASE WHEN $2::int IS NULL THEN NULL ELSE NOW() END,
              listing_cap_set_by = CASE WHEN $2::int IS NULL THEN NULL ELSE $4::uuid END
        WHERE id = $1
        RETURNING id, name, max_active_listings, listing_cap_note, listing_cap_set_at`,
      [req.params.id, cap, note, req.user.id]
    );

    await recordAdminAction(client, {
      actorId: req.user.id,
      action: 'user.listing_cap_set',
      targetType: 'user',
      targetId: req.params.id,
      summary: cap === null
        ? `Removed the listing cap on ${seller.name}`
        : `Set ${seller.name}'s listing cap to ${cap}`,
      metadata: { previous: seller.max_active_listings, cap, occupied: seller.occupied, note: note || undefined },
    });
    await client.query('COMMIT');

    const overBy = Number.isInteger(cap) ? Math.max(0, seller.occupied - cap) : 0;
    res.json({
      ...rows[0],
      occupied: seller.occupied,
      // Said plainly rather than left for the operator to work out, because the
      // number they just typed did NOT take anything down and they need to know
      // that before they go looking for the cars they think they removed.
      over_by: overBy,
      warning: overBy > 0
        ? `${seller.name} has ${seller.occupied} listings live, which is ${overBy} over this cap. `
        + 'Nothing has been unpublished — they simply cannot publish another until they are back under.'
        : null,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    log.error('listing cap error', { error: err.message });
    res.status(500).json({ error: 'Could not set the listing cap' });
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
    // A CLOSED account is not this control's business, in either direction.
    //
    // Suspending one is meaningless — it is already signed out everywhere and
    // off the marketplace. Restoring one is worse: this route would set
    // account_status='active' while closed_at and purge_after stayed set, so
    // the person would appear to have their account back and then be silently
    // erased on the next purge sweep. Reopening is theirs to do, from the app,
    // with their own password — which is the whole point of the window.
    if (user.rows[0].account_status === 'closed') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'This person closed their own account. Only they can reopen it, by signing in with their password before it is erased.',
        code: 'ACCOUNT_CLOSED',
      });
    }
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
    // When the email did not go out, hand the admin the link so they can pass
    // it on themselves. Without this a failed invite is an unrecoverable dead
    // end: the account exists, cannot be logged into, and the only way in is a
    // one-use token that lived solely in an email nobody received.
    //
    // Returned ONLY on failure. The link is a credential, and putting it in a
    // successful response would leave it in browser memory and proxy logs for
    // every account ever created, for no benefit.
    res.status(201).json({
      ...result.user,
      invitation_sent: delivered,
      ...(delivered ? {} : { activation_url: `${SITE_ORIGIN}/activate?token=${encodeURIComponent(result.token)}` }),
    });
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

// GET /admin/inspectors — how each inspector's work actually looks.
//
// You do not prevent a rubber-stamped checklist with form design; you make it
// observable and then a human has a conversation. This is that screen: volume,
// median time on the clock, and how often the answer is "everything passed".
//
// Median rather than mean on purpose — one abandoned-and-restarted inspection
// sitting open for six hours would drag an average into meaninglessness and
// hide exactly the pattern this exists to show.
router.get('/inspectors', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.inspector_id, u.name, u.email,
              COUNT(*)::int AS completed,
              PERCENTILE_CONT(0.5) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (i.completed_at - i.started_at)) / 60
              ) AS median_minutes,
              MIN(EXTRACT(EPOCH FROM (i.completed_at - i.started_at)) / 60) AS fastest_minutes,
              AVG(i.score)::numeric(6,2) AS mean_score,
              COUNT(*) FILTER (WHERE i.passed)::int AS passed,
              COUNT(*) FILTER (
                WHERE jsonb_array_length(COALESCE(i.critical_failures, '[]'::jsonb)) > 0
              )::int AS with_critical_failures
         FROM inspections i
         LEFT JOIN users u ON u.id = i.inspector_id
        WHERE i.status = 'complete' AND i.started_at IS NOT NULL AND i.inspector_id IS NOT NULL
        GROUP BY i.inspector_id, u.name, u.email
        ORDER BY COUNT(*) DESC`
    );
    res.json(rows.map((row) => ({
      inspector_id: row.inspector_id,
      name: row.name,
      email: row.email,
      completed: row.completed,
      median_minutes: row.median_minutes === null ? null : Math.round(Number(row.median_minutes) * 10) / 10,
      fastest_minutes: row.fastest_minutes === null ? null : Math.round(Number(row.fastest_minutes) * 10) / 10,
      mean_score: row.mean_score === null ? null : Number(row.mean_score),
      // Deliberately a rate rather than a verdict. A high pass rate is what a
      // careful inspector working on good cars produces, and also what someone
      // who is not looking produces. The number invites the question; it does
      // not answer it.
      pass_rate: row.completed ? Math.round((row.passed / row.completed) * 100) : null,
      critical_failure_rate: row.completed
        ? Math.round((row.with_critical_failures / row.completed) * 100) : null,
    })));
  } catch (err) {
    log.error('inspector stats error', { error: err.message });
    res.status(500).json({ error: 'Could not load inspector statistics' });
  }
});

// GET /admin/mail-status — is outbound email actually configured?
//
// Every sender in lib/mailer.js is fire-and-forget so that a mail outage can
// never break a signup. The cost of that choice is that an UNCONFIGURED server
// is indistinguishable from a working one: registration returns 201, no email
// is sent, and nothing anywhere complains. Production ran that way without it
// being noticed, which is what this route exists to prevent.
//
// Reports configuration only. No credential is read, returned or logged; the
// from-address is the visible From header on every message we send, not a
// secret.
router.get('/mail-status', requireAdmin, (_req, res) => {
  const provider = process.env.RESEND_API_KEY ? 'resend'
    : process.env.SMTP_HOST ? 'smtp'
    : null;
  res.json({
    configured: mailEnabled(),
    provider,
    from: process.env.MAIL_FROM || 'Sawa Cars <no-reply@sawacars.com>',
    // Named so the dashboard can say which one to set rather than "configure email".
    detail: provider === 'resend' ? 'Sending through the Resend API.'
      : provider === 'smtp' ? `Sending over SMTP via ${process.env.SMTP_HOST}.`
      : 'No email is being sent. Registration, password reset and account invitations are all silently doing nothing. Set RESEND_API_KEY or SMTP_HOST on the API service.',
  });
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
    // A floor for review, not a target. Zero would disable the signal entirely,
    // which is a choice an operator is allowed to make explicitly.
    inspection_min_minutes: (value) => Number.isInteger(value) && value >= 0 && value <= 480,
    // The first setting that is an object rather than an integer. A form of
    // twenty numbers cannot be corrected from "Invalid value for
    // import_duty_rates", so this one reports which field is wrong.
    [DUTY_RATES_KEY]: (value) => validateDutyRates(value).length === 0,
    // Same shape, and the same reason: a form of two version numbers per
    // platform cannot be corrected from "Invalid value for app_release".
    [APP_RELEASE_KEY]: (value) => validateAppRelease(value).length === 0,
    // Three flat RWF amounts — still names which one is wrong rather than a
    // generic "invalid value" for a form with three fields.
    [SERVICE_RATES_KEY]: (value) => validateServiceRates(value).length === 0,
  };
  if (!validators[key]) return res.status(400).json({ error: 'This setting is not editable' });
  if (!validators[key](req.body.value)) {
    if (key === DUTY_RATES_KEY) {
      const problems = validateDutyRates(req.body.value);
      return res.status(400).json({ error: problems[0], code: 'INVALID_DUTY_RATES', problems });
    }
    if (key === APP_RELEASE_KEY) {
      const problems = validateAppRelease(req.body.value);
      return res.status(400).json({ error: problems[0], code: 'INVALID_APP_RELEASE', problems });
    }
    if (key === SERVICE_RATES_KEY) {
      const problems = validateServiceRates(req.body.value);
      return res.status(400).json({ error: problems[0], code: 'INVALID_SERVICE_RATES', problems });
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
    if (key === APP_RELEASE_KEY) invalidateAppRelease();
    if (key === SERVICE_RATES_KEY) invalidateServiceRates();
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

// GET /admin/revenue — what the business actually earned, by month.
//
// Five monetizable lines were built and none of them had a place an operator
// could see all of them together. platform_fees carries the walk-in
// inspection fee and report resale (fee_type='inspection'|'report' — the
// other fee_types this table's CHECK constraint still allows, 'commission',
// 'certification' and 'featured', have no live write path and so never
// appear here). Rental listing subscriptions live in their own table
// (rental_subscriptions.amount_rwf, always RWF, no currency column), so this
// combines both rather than pretending one query covers the business.
//
// Only 'paid' fees and non-voided subscriptions count — a due fee or a
// voided subscription was never actually collected. This is fee revenue,
// distinct from the GMV disclaimer on GET /admin/analytics: a walk-in
// inspection fee is money Sawa itself received, not a vehicle's sale price.
router.get('/revenue', requireAdmin, async (_req, res) => {
  try {
    const [fees, subscriptions] = await Promise.all([
      pool.query(
        `SELECT fee_type,
                TO_CHAR(DATE_TRUNC('month', COALESCE(collected_at, created_at)), 'YYYY-MM') AS month,
                currency, SUM(amount)::bigint AS total, COUNT(*)::int AS count
         FROM platform_fees
         WHERE status = 'paid'
         GROUP BY fee_type, month, currency
         ORDER BY month DESC, fee_type`
      ),
      pool.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
                SUM(amount_rwf)::bigint AS total, COUNT(*)::int AS count
         FROM rental_subscriptions
         WHERE voided_at IS NULL
         GROUP BY month
         ORDER BY month DESC`
      ),
    ]);

    // One combined by-type total so the console can render a single ranked
    // list rather than two disconnected tables. Subscriptions are always RWF.
    const byType = {};
    for (const row of fees.rows) {
      const key = `${row.fee_type}:${row.currency}`;
      byType[key] = byType[key] || { type: row.fee_type, currency: row.currency, total: 0, count: 0 };
      byType[key].total += Number(row.total);
      byType[key].count += row.count;
    }
    for (const row of subscriptions.rows) {
      const key = 'rental_subscription:RWF';
      byType[key] = byType[key] || { type: 'rental_subscription', currency: 'RWF', total: 0, count: 0 };
      byType[key].total += Number(row.total);
      byType[key].count += row.count;
    }

    res.json({
      fees: fees.rows,
      rental_subscriptions: subscriptions.rows,
      totals_by_type: Object.values(byType).sort((a, b) => b.total - a.total),
    });
  } catch (err) {
    log.error('admin revenue error', { error: err.message });
    res.status(500).json({ error: 'Revenue unavailable' });
  }
});


// ─── Brands ──────────────────────────────────────────────────────────────────
//
// The seller-facing brand list used to be a 20-item array inside a mobile
// screen, so widening it needed an App Store release — and it contained no
// Chinese marque while the catalogue already held Dongfeng, BYD and Denza.
// These routes are how that list is maintained without a release.
//
// Logos are uploaded, never bundled: they are third-party trademarks, and a
// binary carrying sixty of them is a binary shipping somebody else's assets to
// two app stores. Every client falls back to a lettermark, so a brand with no
// logo looks deliberate rather than broken.

// GET /admin/makes — everything, inactive included. The public route serves
// only active brands; an operator has to be able to see what they switched off.
router.get('/makes', requireAdmin, async (_req, res) => {
  try {
    const makes = await loadMakes({ includeInactive: true });
    const { rows } = await pool.query(
      `SELECT make, COUNT(*)::int AS n FROM cars WHERE make IS NOT NULL GROUP BY make`
    );
    // How many listings each brand actually carries, so an operator can see at
    // a glance which brands are worth a logo — and can spot a brand with stock
    // that is not on the list at all.
    const counts = new Map(rows.map((r) => [String(r.make || '').toLowerCase(), r.n]));
    const matched = new Set();
    const withCounts = makes.map((m) => {
      const keys = [m.name, ...(m.aliases || [])].map((k) => String(k).toLowerCase());
      let listings = 0;
      for (const key of keys) {
        if (counts.has(key)) { listings += counts.get(key); matched.add(key); }
      }
      return { ...m, listings };
    });
    const unrecognised = rows
      .filter((r) => !matched.has(String(r.make || '').toLowerCase()))
      .map((r) => ({ make: r.make, listings: r.n }));
    res.json({ makes: withCounts, unrecognised });
  } catch (err) {
    log.error('admin makes list error', { error: err.message });
    res.status(500).json({ error: 'Could not load brands' });
  }
});

// POST /admin/makes — add a brand.
router.post('/makes', requireAdmin, async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 1 || name.length > 60) {
    return res.status(400).json({ error: 'A brand needs a name of 1 to 60 characters.' });
  }
  const slug = slugify(name);
  if (!slug) return res.status(400).json({ error: 'That name has no letters or digits in it.' });
  const aliases = Array.isArray(req.body.aliases)
    ? [...new Set(req.body.aliases.map((a) => String(a).trim().toLowerCase()).filter(Boolean))].slice(0, 12)
    : [];
  const order = Number.isInteger(req.body.display_order) ? req.body.display_order : 500;
  if (order < 0 || order > 9999) return res.status(400).json({ error: 'Display order must be between 0 and 9999.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO vehicle_makes (name, slug, aliases, display_order)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (slug) DO NOTHING
       RETURNING *`,
      [name, slug, aliases, order]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `${name} is already on the list.`, code: 'MAKE_EXISTS' });
    }
    await recordAdminAction(client, {
      actorId: req.user.id, action: 'make.created', targetType: 'vehicle_make', targetId: rows[0].id,
      summary: `Added the brand ${name}`, metadata: { slug, aliases },
    });
    await client.query('COMMIT');
    invalidateMakes();
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    // The unique index on lower(name) catches "BMW" against an existing "bmw",
    // which slugify would not have collided on its own.
    if (err.code === '23505') {
      return res.status(409).json({ error: `${name} is already on the list.`, code: 'MAKE_EXISTS' });
    }
    log.error('admin make create error', { error: err.message });
    res.status(500).json({ error: 'Could not add the brand' });
  } finally { client.release(); }
});

// PATCH /admin/makes/:id — logo, aliases, ordering, and whether it is offered.
//
// Deactivating never touches a listing. A car recorded as a brand somebody
// switched off keeps its make, keeps its title and stays live; the brand simply
// stops being offered to the NEXT seller. Rewriting live listings from a toggle
// on a settings screen is not something a settings screen should be able to do.
router.patch('/makes/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const sets = [];
  const params = [req.params.id];
  const push = (sql, value) => { params.push(value); sets.push(`${sql} = $${params.length}`); };

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (name.length < 1 || name.length > 60) return res.status(400).json({ error: 'A brand needs a name of 1 to 60 characters.' });
    push('name', name);
  }
  if (req.body.aliases !== undefined) {
    if (!Array.isArray(req.body.aliases)) return res.status(400).json({ error: 'Aliases must be a list.' });
    push('aliases', [...new Set(req.body.aliases.map((a) => String(a).trim().toLowerCase()).filter(Boolean))].slice(0, 12));
  }
  if (req.body.display_order !== undefined) {
    const order = Number(req.body.display_order);
    if (!Number.isInteger(order) || order < 0 || order > 9999) {
      return res.status(400).json({ error: 'Display order must be a whole number between 0 and 9999.' });
    }
    push('display_order', order);
  }
  if (req.body.active !== undefined) {
    if (typeof req.body.active !== 'boolean') return res.status(400).json({ error: 'Active must be true or false.' });
    push('active', req.body.active);
  }
  // Clearing a logo is `null`, which is different from not sending the field.
  if (req.body.logo_url !== undefined) {
    const url = req.body.logo_url === null ? null : String(req.body.logo_url).trim();
    if (url && !/^https?:\/\//.test(url)) return res.status(400).json({ error: 'A logo URL must start with http:// or https://' });
    push('logo_url', url || null);
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to change.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const before = await client.query('SELECT * FROM vehicle_makes WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!before.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Brand not found' }); }
    const { rows } = await client.query(
      `UPDATE vehicle_makes SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      params
    );
    await recordAdminAction(client, {
      actorId: req.user.id, action: 'make.updated', targetType: 'vehicle_make', targetId: req.params.id,
      summary: `Updated the brand ${rows[0].name}`,
      metadata: { changed: Object.keys(req.body), previous: before.rows[0], current: rows[0] },
    });
    await client.query('COMMIT');
    invalidateMakes();
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Another brand already uses that name.', code: 'MAKE_EXISTS' });
    log.error('admin make update error', { error: err.message });
    res.status(500).json({ error: 'Could not update the brand' });
  } finally { client.release(); }
});

// POST /admin/makes/:makeId/logo — upload the mark itself.
//
// Same pipeline every other image goes through: multer writes it, the bytes are
// read to confirm it really is an image (the extension and content type are
// both attacker-controlled), then Cloudinary if configured and the persistent
// volume otherwise. `resolveUploadUrl` is what keeps a Docker-internal hostname
// out of the stored URL — a bug that shipped once and needed migration 0021.
router.post('/makes/:makeId/logo', requireAdmin, requireUuid('makeId'),
  uploadBrandLogo.single('logo'), verifyImageContent, async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No logo was uploaded.' });
    try {
      const url = await resolveUploadUrl(req, req.file);
      const { rows } = await pool.query(
        'UPDATE vehicle_makes SET logo_url=$2, updated_at=NOW() WHERE id=$1 RETURNING *',
        [req.params.makeId, url]
      );
      if (!rows.length) return res.status(404).json({ error: 'Brand not found' });
      await recordAdminAction(pool, {
        actorId: req.user.id, action: 'make.logo_set', targetType: 'vehicle_make', targetId: req.params.makeId,
        summary: `Set the ${rows[0].name} logo`, metadata: { logo_url: url },
      });
      invalidateMakes();
      res.json(rows[0]);
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
      log.error('admin make logo error', { error: err.message });
      res.status(500).json({ error: 'Could not save the logo' });
    }
  });


// ─── Account closures ────────────────────────────────────────────────────────
//
// The queue an operator watches, and the button that finishes the job. There is
// deliberately no approve or deny here.
//
// The obvious design — the person asks to leave, an operator confirms — is an
// App Store rejection risk: Guideline 5.1.1(v) requires deletion to be
// initiated AND completed from inside the app, and a request parked until
// somebody in the office gets to it is not that. So a closure has already
// happened by the time it appears on this page. What the business wanted from
// an approval step was VISIBILITY — who left, and why — and that is what this
// gives, without standing between a person and their own account.

// GET /admin/account-closures — who closed, why, and who is due to be erased.
router.get('/account-closures', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(CLOSED_ACCOUNTS);
    // Counted over everything closed, not just this page: "why are people
    // leaving" is the question the reason vocabulary exists to answer, and it
    // is worthless if it only describes the most recent two hundred.
    const tally = await pool.query(
      `SELECT closure_reason, COUNT(*)::int AS n
         FROM users
        WHERE closure_reason IS NOT NULL
        GROUP BY closure_reason
        ORDER BY n DESC`
    );
    res.json({
      closures: rows.map((row) => ({ ...row, reason_label: REASON_LABELS.get(row.closure_reason) || row.closure_reason })),
      reasons: CLOSURE_REASONS,
      recovery_days: RECOVERY_DAYS,
      // Includes accounts already purged, whose reason survives on purpose —
      // it carries no personal data and it is the whole history of why people
      // left. See lib/account-closure.js.
      tally: tally.rows.map((row) => ({ ...row, label: REASON_LABELS.get(row.closure_reason) || row.closure_reason })),
      due_for_purge: rows.filter((row) => row.due_for_purge).length,
    });
  } catch (err) {
    log.error('account closures list error', { error: err.message });
    res.status(500).json({ error: 'Could not load account closures' });
  }
});

// POST /admin/account-closures/purge — erase everything past its thirty days.
//
// A person presses this rather than a scheduler running it. This backend has no
// job runner, on purpose (0009 wrote that down), and a handful of rows a month
// does not justify inventing one. The Action Center nags once anything is due.
//
// It never chooses WHICH accounts: the predicate does. An operator cannot purge
// somebody early by picking them off a list, and cannot skip somebody either.
router.post('/account-closures/purge', requireAdmin, async (req, res) => {
  try {
    const due = await pool.query(DUE_FOR_PURGE);
    if (!due.rows.length) return res.json({ purged: 0, accounts: [] });

    const purged = [];
    // One transaction per account, not one for all of them. A single bad row
    // must not roll back the erasure of the others, and each of these is an
    // independent legal obligation rather than part of one atomic operation.
    for (const candidate of due.rows) {
      try {
        const result = await require('../lib/tx').withTransaction(async (client) => {
          const done = await purgeAccount(client, candidate.id);
          if (!done) return null;
          await recordAdminAction(client, {
            actorId: req.user.id,
            action: 'account.purged',
            targetType: 'user',
            targetId: candidate.id,
            summary: `Erased a closed account after its ${RECOVERY_DAYS}-day window`,
            // Deliberately no name and no email: this log is permanent, and
            // writing the identity into it would undo the erasure it records.
            metadata: { closure_reason: candidate.closure_reason, closed_at: candidate.closed_at },
          });
          return done;
        });
        if (!result) continue;
        // After the commit, never inside it — there is no undelete for a file.
        removeIdDocuments(result.files);
        sendAccountDeleted(result.email, 'there');
        purged.push({ id: result.id });
      } catch (err) {
        log.error('account purge failed', { user: candidate.id, error: err.message });
      }
    }
    res.json({ purged: purged.length, attempted: due.rows.length });
  } catch (err) {
    log.error('account purge sweep error', { error: err.message });
    res.status(500).json({ error: 'Could not purge closed accounts' });
  }
});

module.exports = router;
