// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/insights/* — the business view of the admin console.
//
// Everything here is READ-ONLY and derived from the source-of-truth tables;
// nothing is cached in a second table that could drift. Every endpoint takes
// the same window (?from=&to= Kigali dates, or ?days=N) and, where a number
// can be compared, returns the previous period of the same length beside it.
//
// Definitions are fixed here, once, so every screen agrees:
//
//   revenue     money Sawa actually collected: platform_fees with
//               status='paid' dated by collected_at (else created_at), plus
//               rental subscriptions not voided, dated by created_at. The
//               same rule as GET /admin/revenue. Never a vehicle's price.
//   published   a car whose listed_at falls in the window.
//   funnels     COHORTS: of the things that started in the window, how many
//               reached each later stage (by today). A stage is "reached"
//               when any later stage is, so a funnel can never exceed 100%
//               and never grow between steps — the flaw that let the old
//               Action Center print "164% of drafts reach approval" from two
//               snapshot counts.
//
// Privacy: contact analytics count events by channel and day. No buyer
// identity and no phone number leaves this module — listing_contact_events
// never stored a number, and these queries never select buyer_id.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { log } = require('../lib/log');
const { ALL_ITEMS, PUBLISH_THRESHOLD, SCORE_MAX } = require('../lib/inspection-policy');
const { parseRange, within, kigaliDay, kigaliToday, TZ } = require('../lib/insights-range');
const { BUDGET_EDGES_RWF, budgetBands } = require('../lib/insights-bands');

const router = express.Router();
router.use(requireAdmin);

const num = (v) => (v == null ? 0 : Number(v));
const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null);

function handle(fn, label) {
  return async (req, res) => {
    let range;
    try {
      range = parseRange(req.query);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
    try {
      res.json(await fn(range, req));
    } catch (err) {
      log.error(`insights ${label} error`, { error: err.message });
      res.status(500).json({ error: 'Insights unavailable' });
    }
  };
}

// ─── Overview ────────────────────────────────────────────────────────────────

/** Every windowed count in one round trip. $1 = from, $2 = to. */
const WINDOW_COUNTS = `
  SELECT
    (SELECT COUNT(*) FROM submissions WHERE ${within('submitted_at', 1, 2)})::int AS submissions,
    (SELECT COUNT(*) FROM submissions WHERE reviewed_at IS NOT NULL AND ${within('reviewed_at', 1, 2)})::int AS reviewed,
    (SELECT COUNT(*) FROM submissions WHERE reviewed_at IS NOT NULL AND ${within('reviewed_at', 1, 2)}
       AND reviewed_at - submitted_at <= INTERVAL '24 hours')::int AS reviewed_in_sla,
    (SELECT COUNT(*) FROM inspections WHERE status = 'complete' AND ${within('completed_at', 1, 2)})::int AS inspections_completed,
    (SELECT COUNT(*) FROM inspections WHERE status = 'complete' AND passed AND ${within('completed_at', 1, 2)})::int AS inspections_passed,
    (SELECT COUNT(*) FROM cars WHERE listed_at IS NOT NULL AND ${within('listed_at', 1, 2)})::int AS published,
    (SELECT COUNT(*) FROM cars WHERE sold_at IS NOT NULL AND ${within('sold_at', 1, 2)})::int AS marked_sold,
    (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.listed_at - s.submitted_at)) / 86400)
       FROM cars c JOIN submissions s ON s.car_id = c.id
      WHERE c.listed_at IS NOT NULL AND c.listed_at >= s.submitted_at AND ${within('c.listed_at', 1, 2)}) AS median_days_to_live,
    (SELECT COUNT(*) FROM users WHERE role = 'buyer' AND ${within('created_at', 1, 2)})::int AS new_buyers,
    (SELECT COUNT(*) FROM users WHERE role = 'seller' AND ${within('created_at', 1, 2)})::int AS new_sellers,
    (SELECT COUNT(*) FROM saved_cars WHERE ${within('saved_at', 1, 2)})::int AS saves,
    (SELECT COUNT(*) FROM listing_contact_events WHERE ${within('created_at', 1, 2)})::int AS contacts,
    (SELECT COUNT(*) FROM rental_inquiries WHERE ${within('created_at', 1, 2)})::int AS rental_inquiries,
    (SELECT COUNT(*) FROM import_orders WHERE ${within('created_at', 1, 2)})::int AS import_enquiries,
    (SELECT COALESCE(SUM(amount), 0) FROM platform_fees
      WHERE status = 'paid' AND currency = 'RWF' AND ${within('COALESCE(collected_at, created_at)', 1, 2)})::bigint AS fees_rwf,
    (SELECT COALESCE(SUM(amount_rwf), 0) FROM rental_subscriptions
      WHERE voided_at IS NULL AND ${within('created_at', 1, 2)})::bigint AS subscriptions_rwf`;

function shapeKpis(row) {
  return {
    submissions: num(row.submissions),
    reviewed: num(row.reviewed),
    review_sla_rate: pct(num(row.reviewed_in_sla), num(row.reviewed)),
    inspections_completed: num(row.inspections_completed),
    pass_rate: pct(num(row.inspections_passed), num(row.inspections_completed)),
    published: num(row.published),
    marked_sold: num(row.marked_sold),
    median_days_to_live: row.median_days_to_live == null ? null : Math.round(Number(row.median_days_to_live) * 10) / 10,
    new_buyers: num(row.new_buyers),
    new_sellers: num(row.new_sellers),
    saves: num(row.saves),
    contacts: num(row.contacts),
    rental_inquiries: num(row.rental_inquiries),
    import_enquiries: num(row.import_enquiries),
    revenue_rwf: num(row.fees_rwf) + num(row.subscriptions_rwf),
  };
}

async function overview(range) {
  const { from, to, previous } = range;
  const [current, prior, snapshot, series, channels, money] = await Promise.all([
    pool.query(WINDOW_COUNTS, [from, to]),
    pool.query(WINDOW_COUNTS, [previous.from, previous.to]),
    pool.query(`
      SELECT
        (SELECT COUNT(*) FROM cars WHERE status = 'live')::int AS live_inventory,
        (SELECT COUNT(*) FROM submissions WHERE status IN ('under_review','pending'))::int AS awaiting_review,
        (SELECT COUNT(*) FROM submissions WHERE status IN ('under_review','pending')
           AND submitted_at < NOW() - INTERVAL '24 hours')::int AS reviews_breached,
        (SELECT COUNT(*) FROM users WHERE id_verified = 'pending')::int AS identity_queue,
        (SELECT COUNT(*) FROM message_reports WHERE status = 'open')::int AS open_reports`),
    // One row per Kigali day of the CURRENT window and one per day of the
    // previous window, aligned by index so a chart can draw both.
    pool.query(`
      WITH days AS (
        SELECT d::date AS day, 'current' AS period, ROW_NUMBER() OVER (ORDER BY d) - 1 AS idx
          FROM generate_series($1::date, $2::date, INTERVAL '1 day') d
        UNION ALL
        SELECT d::date, 'previous', ROW_NUMBER() OVER (ORDER BY d) - 1
          FROM generate_series($3::date, $4::date, INTERVAL '1 day') d
      )
      SELECT days.day, days.period, days.idx,
        (SELECT COUNT(*) FROM submissions WHERE ${kigaliDay('submitted_at')} = days.day)::int AS submissions,
        (SELECT COUNT(*) FROM cars WHERE listed_at IS NOT NULL AND ${kigaliDay('listed_at')} = days.day)::int AS published,
        (SELECT COUNT(*) FROM listing_contact_events WHERE ${kigaliDay('created_at')} = days.day)::int AS contacts,
        (SELECT COUNT(*) FROM saved_cars WHERE ${kigaliDay('saved_at')} = days.day)::int AS saves,
        (SELECT COUNT(*) FROM users WHERE ${kigaliDay('created_at')} = days.day)::int AS new_users,
        ((SELECT COALESCE(SUM(amount), 0) FROM platform_fees
           WHERE status = 'paid' AND currency = 'RWF' AND ${kigaliDay('COALESCE(collected_at, created_at)')} = days.day)
         + (SELECT COALESCE(SUM(amount_rwf), 0) FROM rental_subscriptions
           WHERE voided_at IS NULL AND ${kigaliDay('created_at')} = days.day))::bigint AS revenue_rwf
      FROM days ORDER BY days.period, days.day`, [from, to, previous.from, previous.to]),
    pool.query(`
      SELECT channel,
             COUNT(*) FILTER (WHERE ${within('created_at', 1, 2)})::int AS current,
             COUNT(*) FILTER (WHERE ${within('created_at', 3, 4)})::int AS previous
        FROM listing_contact_events GROUP BY channel`, [from, to, previous.from, previous.to]),
    pool.query(`
      SELECT 'fee' AS source, f.fee_type AS line, COALESCE(f.method, 'unrecorded') AS method,
             COALESCE(i.center, '—') AS center, SUM(f.amount)::bigint AS total, COUNT(*)::int AS count
        FROM platform_fees f LEFT JOIN inspections i ON i.id = f.inspection_id
       WHERE f.status = 'paid' AND f.currency = 'RWF' AND ${within('COALESCE(f.collected_at, f.created_at)', 1, 2)}
       GROUP BY f.fee_type, method, center
      UNION ALL
      SELECT 'subscription', 'rental_subscription', COALESCE(method, 'unrecorded'), '—',
             SUM(amount_rwf)::bigint, COUNT(*)::int
        FROM rental_subscriptions
       WHERE voided_at IS NULL AND ${within('created_at', 1, 2)}
       GROUP BY method`, [from, to]),
  ]);

  const shape = (period) => series.rows.filter((r) => r.period === period).map((r) => ({
    date: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10),
    submissions: r.submissions, published: r.published, contacts: r.contacts,
    saves: r.saves, new_users: r.new_users, revenue_rwf: num(r.revenue_rwf),
  }));

  const sumBy = (key) => {
    const out = {};
    for (const r of money.rows) out[r[key]] = (out[r[key]] || 0) + num(r.total);
    return Object.entries(out).map(([k, total]) => ({ key: k, total })).sort((a, b) => b.total - a.total);
  };

  return {
    range,
    timezone: TZ,
    kpis: { current: shapeKpis(current.rows[0]), previous: shapeKpis(prior.rows[0]) },
    snapshot: snapshot.rows[0],
    series: { current: shape('current'), previous: shape('previous') },
    contacts_by_channel: ['whatsapp', 'phone', 'in_app'].map((channel) => {
      const row = channels.rows.find((r) => r.channel === channel);
      return { channel, current: row ? row.current : 0, previous: row ? row.previous : 0 };
    }),
    money: { by_line: sumBy('line'), by_method: sumBy('method'), by_center: sumBy('center').filter((r) => r.key !== '—') },
  };
}

router.get('/', handle(overview, 'overview'));

// ─── Funnels (cohorts) ───────────────────────────────────────────────────────

const IMPORT_ORDER = [
  'enquiry', 'quoted', 'agreement_pending', 'deposit_due', 'deposit_review', 'ordered',
  'inspected_abroad', 'shipping_booked', 'in_transit', 'arrived', 'kigali_inspection',
  'balance_due', 'balance_review', 'customs_clearance', 'ready_for_handover', 'completed',
];

function funnelSteps(labels, counts, medians = {}) {
  const top = counts[0] || 0;
  return labels.map(([key, label], i) => ({
    key, label, count: counts[i] || 0,
    of_start: pct(counts[i] || 0, top),
    from_previous: i === 0 ? null : pct(counts[i] || 0, counts[i - 1] || 0),
    median_days: medians[key] ?? null,
  }));
}

async function funnels(range) {
  const { from, to } = range;
  const [seller, imports, buyers] = await Promise.all([
    // Each submission's furthest stage, as an index; "reached k" = index >= k.
    pool.query(`
      WITH cohort AS (
        SELECT s.id, s.submitted_at, s.reviewed_at, s.status,
               c.listed_at, c.sold_at,
               insp.completed_at, insp.passed, insp.status AS insp_status,
               GREATEST(
                 0,
                 CASE WHEN s.reviewed_at IS NOT NULL OR s.status NOT IN ('under_review','pending') THEN 1 ELSE 0 END,
                 CASE WHEN insp.id IS NOT NULL OR s.status IN ('scheduled','inspecting','inspected','live') THEN 2 ELSE 0 END,
                 CASE WHEN insp.status = 'complete' OR s.status IN ('inspected','live') THEN 3 ELSE 0 END,
                 CASE WHEN (insp.status = 'complete' AND insp.passed) OR s.status = 'live' OR c.listed_at IS NOT NULL THEN 4 ELSE 0 END,
                 CASE WHEN c.listed_at IS NOT NULL OR s.status = 'live' THEN 5 ELSE 0 END,
                 CASE WHEN c.sold_at IS NOT NULL THEN 6 ELSE 0 END
               ) AS reached
          FROM submissions s
          LEFT JOIN cars c ON c.id = s.car_id
          LEFT JOIN LATERAL (
            SELECT id, status, passed, completed_at FROM inspections
             WHERE submission_id = s.id ORDER BY completed_at DESC NULLS LAST LIMIT 1
          ) insp ON TRUE
         WHERE ${within('s.submitted_at', 1, 2)}
      )
      SELECT
        COUNT(*)::int AS s0,
        COUNT(*) FILTER (WHERE reached >= 1)::int AS s1,
        COUNT(*) FILTER (WHERE reached >= 2)::int AS s2,
        COUNT(*) FILTER (WHERE reached >= 3)::int AS s3,
        COUNT(*) FILTER (WHERE reached >= 4)::int AS s4,
        COUNT(*) FILTER (WHERE reached >= 5)::int AS s5,
        COUNT(*) FILTER (WHERE reached >= 6)::int AS s6,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (reviewed_at - submitted_at)) / 86400)
          FILTER (WHERE reviewed_at >= submitted_at) AS med_reviewed,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - submitted_at)) / 86400)
          FILTER (WHERE completed_at >= submitted_at) AS med_inspected,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (listed_at - submitted_at)) / 86400)
          FILTER (WHERE listed_at >= submitted_at) AS med_published,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (sold_at - listed_at)) / 86400)
          FILTER (WHERE sold_at >= listed_at) AS med_sold
      FROM cohort`, [from, to]),
    // An import order's furthest point is the highest status it ever held,
    // read from its event history, so a cancelled order still counts for how
    // far it got. Current status covers orders with no events.
    pool.query(`
      WITH cohort AS (
        SELECT o.id, o.status, o.agreement_accepted_at,
               ARRAY(SELECT e.to_status FROM import_order_events e WHERE e.import_order_id = o.id AND e.to_status IS NOT NULL) AS seen,
               EXISTS (SELECT 1 FROM import_payments p WHERE p.import_order_id = o.id AND p.milestone = 'initial_50' AND p.status = 'verified') AS deposit_verified
          FROM import_orders o WHERE ${within('o.created_at', 1, 2)}
      )
      SELECT id, status, agreement_accepted_at, seen, deposit_verified FROM cohort`, [from, to]),
    pool.query(`
      SELECT
        COUNT(*)::int AS signed_up,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM saved_cars sc WHERE sc.user_id = u.id)
                            OR EXISTS (SELECT 1 FROM listing_contact_events e WHERE e.buyer_id = u.id))::int AS engaged,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM listing_contact_events e WHERE e.buyer_id = u.id))::int AS contacted
      FROM users u WHERE u.role = 'buyer' AND ${within('u.created_at', 1, 2)}`, [from, to]),
  ]);

  const s = seller.rows[0];
  const round1 = (v) => (v == null ? null : Math.round(Number(v) * 10) / 10);
  const sellerFunnel = funnelSteps(
    [['submitted', 'Submitted'], ['reviewed', 'Reviewed'], ['booked', 'Inspection booked'],
      ['inspected', 'Inspected'], ['passed', 'Passed'], ['published', 'Published'], ['sold', 'Marked sold']],
    [s.s0, s.s1, s.s2, s.s3, s.s4, s.s5, s.s6],
    { reviewed: round1(s.med_reviewed), inspected: round1(s.med_inspected), published: round1(s.med_published), sold: round1(s.med_sold) },
  );

  const idx = (st) => IMPORT_ORDER.indexOf(st);
  const importReached = imports.rows.map((o) => {
    const statuses = [o.status, ...(o.seen || [])].filter((st) => idx(st) >= 0);
    const furthest = Math.max(0, ...statuses.map(idx));
    return {
      quoted: furthest >= idx('quoted'),
      agreed: Boolean(o.agreement_accepted_at) || furthest >= idx('deposit_due'),
      deposit: Boolean(o.deposit_verified) || furthest >= idx('ordered'),
      shipped: furthest >= idx('in_transit'),
      delivered: furthest >= idx('completed'),
    };
  });
  const countImport = (k) => importReached.filter((o) => o[k]).length;
  // Enforce monotonic steps: an order counts for a step only if it also
  // counts for every step before it.
  const importCounts = [imports.rows.length];
  for (const key of ['quoted', 'agreed', 'deposit', 'shipped', 'delivered']) {
    importCounts.push(Math.min(importCounts[importCounts.length - 1], countImport(key)));
  }

  const b = buyers.rows[0];
  return {
    range,
    seller: { steps: sellerFunnel, rejected: s.rejected },
    imports: {
      steps: funnelSteps(
        [['enquiry', 'Enquiry'], ['quoted', 'Quoted'], ['agreed', 'Agreement accepted'],
          ['deposit', 'First 50% verified'], ['shipped', 'Shipped'], ['delivered', 'Delivered']],
        importCounts,
      ),
    },
    buyers: {
      steps: funnelSteps(
        [['signed_up', 'Signed up'], ['engaged', 'Saved or contacted'], ['contacted', 'Contacted a seller']],
        [b.signed_up, b.engaged, b.contacted],
      ),
    },
  };
}

router.get('/funnels', handle(funnels, 'funnels'));

// ─── Inventory (a snapshot of live stock) ────────────────────────────────────

async function inventory(range) {
  const [total, makes, bodies, bands, ages, stale, drops, dom, soldValue] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS n FROM cars WHERE status = 'live'`),
    pool.query(`SELECT make AS key, COUNT(*)::int AS count FROM cars WHERE status = 'live' GROUP BY make ORDER BY count DESC, make LIMIT 12`),
    pool.query(`SELECT COALESCE(NULLIF(body_type, ''), 'Unspecified') AS key, COUNT(*)::int AS count FROM cars WHERE status = 'live' GROUP BY 1 ORDER BY count DESC`),
    pool.query(`
      SELECT width_bucket(price - 1, $1::int[]) AS bucket, COUNT(*)::int AS count
        FROM cars WHERE status = 'live' AND price IS NOT NULL AND currency = 'RWF' GROUP BY bucket ORDER BY bucket`, [BUDGET_EDGES_RWF]),
    pool.query(`
      SELECT CASE
               WHEN listed_at IS NULL THEN 'unknown'
               WHEN NOW() - listed_at <= INTERVAL '7 days' THEN '0-7'
               WHEN NOW() - listed_at <= INTERVAL '30 days' THEN '8-30'
               WHEN NOW() - listed_at <= INTERVAL '60 days' THEN '31-60'
               WHEN NOW() - listed_at <= INTERVAL '90 days' THEN '61-90'
               ELSE '90+' END AS key,
             COUNT(*)::int AS count
        FROM cars WHERE status = 'live' GROUP BY 1`),
    // Live for more than 14 days with no save and no contact request in the
    // last 14: the listings a price review would most help.
    pool.query(`
      SELECT c.id, c.title, c.price, c.views, c.listed_at,
             FLOOR(EXTRACT(EPOCH FROM (NOW() - c.listed_at)) / 86400)::int AS days_live
        FROM cars c
       WHERE c.status = 'live' AND c.listed_at < NOW() - INTERVAL '14 days'
         AND NOT EXISTS (SELECT 1 FROM listing_contact_events e WHERE e.car_id = c.id AND e.created_at >= NOW() - INTERVAL '14 days')
         AND NOT EXISTS (SELECT 1 FROM saved_cars sc WHERE sc.car_id = c.id AND sc.saved_at >= NOW() - INTERVAL '14 days')
       ORDER BY c.listed_at ASC LIMIT 25`),
    pool.query(`
      SELECT COUNT(DISTINCT ph.car_id)::int AS cars_with_drop
        FROM price_history ph
       WHERE ${within('ph.changed_at', 1, 2)}
         AND ph.price < (SELECT p2.price FROM price_history p2 WHERE p2.car_id = ph.car_id AND p2.changed_at < ph.changed_at
                          ORDER BY p2.changed_at DESC LIMIT 1)`, [range.from, range.to]),
    pool.query(`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (sold_at - listed_at)) / 86400) AS median_days
        FROM cars WHERE sold_at IS NOT NULL AND listed_at IS NOT NULL AND sold_at >= listed_at AND ${within('sold_at', 1, 2)}`,
      [range.from, range.to]),
    // Asking prices of listings the SELLER marked sold. Not a sale price, not
    // verified, and never Sawa revenue — Sawa is not a party to the deal. The
    // console labels it exactly that way.
    pool.query(`
      SELECT COALESCE(SUM(price), 0)::bigint AS total FROM cars
       WHERE sold_at IS NOT NULL AND currency = 'RWF' AND ${within('sold_at', 1, 2)}`, [range.from, range.to]),
  ]);

  const AGE_ORDER = ['0-7', '8-30', '31-60', '61-90', '90+', 'unknown'];

  return {
    range,
    live_total: total.rows[0].n,
    by_make: makes.rows,
    by_body: bodies.rows,
    // width_bucket over (price - 1) puts a price on an edge in the lower band:
    // bands are (edge, next edge], the public homepage's rule.
    by_price: budgetBands().map((band, i) => ({ ...band, count: bands.rows.find((r) => r.bucket === i)?.count || 0 })),
    by_age: AGE_ORDER.map((key) => ({ key, count: ages.rows.find((r) => r.key === key)?.count || 0 })).filter((r) => r.key !== 'unknown' || r.count),
    stale: stale.rows,
    price_drops: drops.rows[0].cars_with_drop,
    median_days_on_market: dom.rows[0].median_days == null ? null : Math.round(Number(dom.rows[0].median_days)),
    sold_asking_value_rwf: num(soldValue.rows[0].total),
  };
}

router.get('/inventory', handle(inventory, 'inventory'));

// ─── Quality ─────────────────────────────────────────────────────────────────

const ITEM = new Map(ALL_ITEMS.map((it) => [it.id, it]));

async function quality(range) {
  const { from, to } = range;
  const [dist, items, inspectors, rejections] = await Promise.all([
    pool.query(`
      SELECT COUNT(*)::int AS completed,
             COUNT(*) FILTER (WHERE passed)::int AS passed,
             COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(critical_failures, '[]'::jsonb)) > 0)::int AS with_critical,
             ROUND(AVG(score))::int AS avg_score,
             COUNT(*) FILTER (WHERE score < $3)::int AS b_fail,
             COUNT(*) FILTER (WHERE score >= $3 AND score < 120)::int AS b_105,
             COUNT(*) FILTER (WHERE score >= 120 AND score < 135)::int AS b_120,
             COUNT(*) FILTER (WHERE score >= 135)::int AS b_135
        FROM inspections WHERE status = 'complete' AND score IS NOT NULL AND ${within('completed_at', 1, 2)}`,
      [from, to, PUBLISH_THRESHOLD]),
    pool.query(`
      SELECT kv.key AS item_id,
             COUNT(*) FILTER (WHERE kv.value = 'fail')::int AS fails,
             COUNT(*) FILTER (WHERE kv.value = 'flag')::int AS flags
        FROM inspections i, jsonb_each_text(COALESCE(i.checklist_results, '{}'::jsonb)) kv
       WHERE i.status = 'complete' AND ${within('i.completed_at', 1, 2)} AND kv.value IN ('fail','flag')
       GROUP BY kv.key ORDER BY fails DESC, flags DESC LIMIT 12`, [from, to]),
    pool.query(`
      SELECT i.inspector_id, COALESCE(u.name, 'Unassigned') AS name, COUNT(*)::int AS completed,
             ROUND(AVG(i.score))::int AS avg_score,
             ROUND(STDDEV_POP(i.score)::numeric, 1) AS score_spread,
             COUNT(*) FILTER (WHERE i.passed)::int AS passed
        FROM inspections i LEFT JOIN users u ON u.id = i.inspector_id
       WHERE i.status = 'complete' AND i.score IS NOT NULL AND ${within('i.completed_at', 1, 2)}
       GROUP BY i.inspector_id, u.name ORDER BY completed DESC LIMIT 20`, [from, to]),
    pool.query(`
      SELECT COUNT(*)::int AS rejected FROM submissions
       WHERE status = 'rejected' AND reviewed_at IS NOT NULL AND ${within('reviewed_at', 1, 2)}`, [from, to]),
  ]);

  const d = dist.rows[0];
  return {
    range,
    completed: d.completed,
    pass_rate: pct(d.passed, d.completed),
    with_critical: d.with_critical,
    avg_score: d.avg_score,
    score_max: SCORE_MAX,
    publish_threshold: PUBLISH_THRESHOLD,
    distribution: [
      { key: 'below', label: `Below ${PUBLISH_THRESHOLD}`, count: d.b_fail },
      { key: '105', label: `${PUBLISH_THRESHOLD}–119`, count: d.b_105 },
      { key: '120', label: '120–134', count: d.b_120 },
      { key: '135', label: '135–150', count: d.b_135 },
    ],
    top_issues: items.rows.map((r) => {
      const it = ITEM.get(r.item_id);
      return { item_id: r.item_id, label: it?.label || r.item_id, category: it?.category_name || null, critical: Boolean(it?.critical), fails: r.fails, flags: r.flags };
    }),
    inspectors: inspectors.rows.map((r) => ({ ...r, score_spread: r.score_spread == null ? null : Number(r.score_spread), pass_rate: pct(r.passed, r.completed) })),
    submissions_rejected: rejections.rows[0].rejected,
  };
}

router.get('/quality', handle(quality, 'quality'));

// ─── Centers ─────────────────────────────────────────────────────────────────

/** Mon–Sat days in the window: the days a center can take bookings. */
function workingDays(from, to) {
  let n = 0;
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) {
    if (new Date(t).getUTCDay() !== 0) n += 1;
  }
  return n;
}

async function centers(range) {
  const { from, to } = range;
  const today = kigaliToday();
  const [rows, registry] = await Promise.all([
    // Fees are summed per inspection BEFORE the join: an inspection can carry
    // more than one fee, and joining raw fee rows would count it twice.
    pool.query(`
      WITH fees AS (
        SELECT inspection_id, SUM(amount)::bigint AS revenue_rwf
          FROM platform_fees
         WHERE inspection_id IS NOT NULL AND status = 'paid' AND currency = 'RWF'
           AND ${within('COALESCE(collected_at, created_at)', 1, 2)}
         GROUP BY inspection_id
      )
      SELECT lower(i.center) AS key, MIN(i.center) AS center,
             COUNT(*) FILTER (WHERE i.status = 'complete' AND ${within('i.completed_at', 1, 2)})::int AS completed,
             COUNT(*) FILTER (WHERE i.status = 'complete' AND i.passed AND ${within('i.completed_at', 1, 2)})::int AS passed,
             ROUND(AVG(i.score) FILTER (WHERE i.status = 'complete' AND ${within('i.completed_at', 1, 2)}))::int AS avg_score,
             COUNT(*) FILTER (WHERE i.status = 'scheduled' AND i.scheduled_on >= $1::date AND i.scheduled_on <= $2::date
                                AND i.scheduled_on < $3::date)::int AS no_shows,
             COUNT(*) FILTER (WHERE i.status IN ('scheduled','in_progress') AND i.scheduled_on >= $3::date)::int AS upcoming,
             COALESCE(SUM(f.revenue_rwf), 0)::bigint AS revenue_rwf
        FROM inspections i
        LEFT JOIN fees f ON f.inspection_id = i.id
       WHERE i.center IS NOT NULL
       GROUP BY lower(i.center)`, [from, to, today]),
    pool.query(`SELECT id, name, area, daily_capacity, active FROM inspection_centers ORDER BY name`),
  ]);
  const days = workingDays(from, to);
  const byKey = new Map(rows.rows.map((r) => [r.key, r]));
  const names = new Set([...registry.rows.map((c) => c.name.toLowerCase()), ...rows.rows.map((r) => r.key)]);
  const list = [...names].map((key) => {
    const r = byKey.get(key) || {};
    const reg = registry.rows.find((c) => c.name.toLowerCase() === key);
    const capacity = reg?.daily_capacity ? reg.daily_capacity * days : null;
    return {
      center: reg?.name || r.center,
      area: reg?.area || null,
      active: reg ? reg.active : null,
      completed: r.completed || 0,
      pass_rate: pct(r.passed || 0, r.completed || 0),
      avg_score: r.avg_score ?? null,
      no_shows: r.no_shows || 0,
      upcoming: r.upcoming || 0,
      revenue_rwf: num(r.revenue_rwf),
      capacity,
      utilisation: capacity ? pct(r.completed || 0, capacity) : null,
    };
  }).filter((c) => c.center).sort((a, b) => b.completed - a.completed);
  return { range, working_days: days, centers: list };
}

router.get('/centers', handle(centers, 'centers'));

module.exports = router;
module.exports.compute = { overview, funnels, inventory, quality, centers };
module.exports._internal = { workingDays, funnelSteps };
