const express = require('express');
const { log } = require('../lib/log');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth, requireAdmin, verifyLiveSession } = require('../middleware/auth');
const { requireUuid, paginate } = require('../middleware/validate');
const { withTransaction } = require('../lib/tx');
const { matchSavedSearches, notifyPriceDrop } = require('../lib/alerts');
const { recordAdminAction } = require('../lib/admin-audit');
const {
  MARKETPLACE_TERMS_VERSION,
  DIRECT_DEAL_NOTICE,
  contactAvailability,
  ensureMarketplaceAcknowledgement,
} = require('../lib/marketplace');
const {
  CHECKLIST_VERSION,
  PUBLISH_THRESHOLD,
  evaluateChecklist,
} = require('../lib/inspection-policy');
const { publicationReadiness } = require('../lib/publication-readiness');

const router = express.Router();

// SQL-level fail-closed filter for public paths. publicationReadiness
// additionally recomputes the checklist in JavaScript before a state change;
// this predicate prevents a stale or obviously inconsistent row from leaking
// through catalogue, contact, save, history or messaging reads.
function validInspectionExists(carAlias = 'c') {
  return `EXISTS (
    SELECT 1
      FROM inspections evidence
      JOIN submissions evidence_submission ON evidence_submission.id = evidence.submission_id
     WHERE evidence.car_id = ${carAlias}.id
       AND evidence_submission.seller_id = ${carAlias}.seller_id
       AND lower(evidence_submission.make) = lower(${carAlias}.make)
       AND lower(evidence_submission.model) = lower(${carAlias}.model)
       AND evidence_submission.year = ${carAlias}.year
       AND evidence.status = 'complete'
       AND evidence.checklist_version = '${CHECKLIST_VERSION}'
       AND evidence.passed = TRUE
       AND evidence.score >= ${PUBLISH_THRESHOLD}
       AND jsonb_array_length(COALESCE(evidence.critical_failures, '[]'::jsonb)) = 0
  )`;
}

// ─── What a stranger may read ─────────────────────────────────────────────────
// The public browse and detail routes used to `SELECT c.*`, which meant every
// column the cars table would ever grow was published the moment it was added.
// Three of them should never have left the building:
//
//   review_notes       the admin's own words. On an ID revocation the server
//                      appends "Seller identity approval was revoked; review is
//                      required before republication." to this column — and
//                      then served it to anyone who asked for /cars.
//   approved_by        the internal user id of the admin who published.
//   registration_plate the plate itself. This platform burns a badge over the
//                      plate in every published photograph; shipping the string
//                      in the JSON undid that work in the same response.
//
// Allow-list, never deny-list: a column added to `cars` tomorrow is private
// until someone puts it here on purpose. `archive_reason` and `vin_key` are
// omitted for the same reason — internal, and nothing renders them.
const PUBLIC_CAR_COLUMNS = [
  'id', 'seller_id', 'title', 'make', 'model', 'year', 'mileage',
  'fuel_type', 'transmission', 'body_type', 'color', 'price', 'currency',
  'location', 'drive_side', 'images', 'inspected', 'inspection_score',
  'status', 'views', 'saves', 'listed_at', 'sold_at', 'created_at',
  'featured_until', 'condition_grade',
];

// The feed does not render a description or a VIN, and shipping them cost
// roughly half the payload on a 20-car page. The detail route adds them back.
const PUBLIC_CAR_DETAIL_COLUMNS = [...PUBLIC_CAR_COLUMNS, 'description', 'vin'];

// Columns the DETAIL route selects but strips before answering anyone who is
// not the car's own seller or an admin. The admin listing editor reads
// review_notes from this route, so they cannot simply be dropped — they have to
// be gated the same way the seller's phone number already is, further down.
const INTERNAL_CAR_COLUMNS = [
  'review_notes', 'archive_reason', 'archived_at', 'approved_at', 'approved_by',
  'registration_plate', 'vin_key',
];

/** `c.id, c.title, …` for a SELECT list. */
const publicCarSelect = (alias, columns = PUBLIC_CAR_COLUMNS) =>
  columns.map((col) => `${alias}.${col}`).join(', ');

// The statuses that occupy one of a seller's marketplace slots. `paused` counts
// on purpose: a paused car is still that seller's listing, held back for a few
// days, and exempting it would make any cap trivially avoidable. `sold` and
// `archived` do not — the slot is genuinely free again.
const OCCUPIES_A_SLOT = ['live', 'paused'];

// Why a car is in the banner. 'sponsored' is the only one the buyer is told
// about, and it is the only one that carries money.
const FEATURE_KINDS = ['editorial', 'hot_deal', 'sponsored'];

// ─── Market intelligence ──────────────────────────────────────────────────────
// The app used to fabricate "below market %" / "listed N days ago" from a
// hardcoded table; the server is the only honest source of these numbers.
// Two LATERAL passes per row — never an N+1 round trip. Exact make+model within
// ±2 years first; if that pool is thin, fall back to make+body_type within ±3.
// Fewer than 3 comparables is noise, not a market: market_avg stays NULL.
const MIN_COMPARABLES = 3;

// lower(...) = lower(...) rather than ILIKE. Neither side ever held a wildcard,
// so this was always case-insensitive equality — but expressed as ILIKE, which
// no btree index can serve, so every enriched row triggered a sequential scan
// of the whole cars table. Matches the functional indexes in migration 0003.
const MARKET_LATERALS = `
       LEFT JOIN LATERAL (
         SELECT AVG(x.price)::int AS avg_price, COUNT(*)::int AS n
         FROM cars x
         WHERE x.id <> c.id AND x.status IN ('live', 'sold') AND x.price > 0
           AND lower(x.make) = lower(c.make) AND lower(x.model) = lower(c.model)
           AND x.year BETWEEN c.year - 2 AND c.year + 2
       ) mk ON TRUE
       LEFT JOIN LATERAL (
         SELECT AVG(x.price)::int AS avg_price, COUNT(*)::int AS n
         FROM cars x
         WHERE x.id <> c.id AND x.status IN ('live', 'sold') AND x.price > 0
           AND lower(x.make) = lower(c.make) AND lower(x.body_type) = lower(c.body_type)
           AND x.year BETWEEN c.year - 3 AND c.year + 3
       ) bt ON TRUE
       LEFT JOIN LATERAL (
         SELECT CASE WHEN mk.n >= ${MIN_COMPARABLES} THEN mk.avg_price
                     WHEN bt.n >= ${MIN_COMPARABLES} THEN bt.avg_price END AS market_avg,
                CASE WHEN mk.n >= ${MIN_COMPARABLES} THEN mk.n
                     WHEN bt.n >= ${MIN_COMPARABLES} THEN bt.n ELSE 0 END AS comparables
       ) mkt ON TRUE`;

// below_market is clamped at 0 so the app can render it unconditionally;
// market_diff keeps its sign (negative = under market).
const MARKET_COLUMNS = `
              mkt.market_avg, mkt.comparables,
              GREATEST(0, COALESCE(mkt.market_avg, c.price) - c.price) AS below_market,
              CASE WHEN mkt.market_avg IS NOT NULL AND mkt.market_avg > 0
                   THEN ROUND(((c.price - mkt.market_avg)::numeric / mkt.market_avg) * 100)::int
              END AS market_diff,
              CASE WHEN c.listed_at IS NOT NULL
                   THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - c.listed_at)) / 86400)::int
              END AS listed_days`;

// GET /cars — browse with optional filters
router.get('/', async (req, res) => {
  const { q, make, model, min_price, max_price, min_year, max_year,
          fuel_type, transmission, body_type, drive_side, location, status,
          sort = 'listed_at', order = 'desc', limit = 20, offset = 0 } = req.query;

  // Public browse is live listings only. No caller — admin included — can
  // widen it through this route (the admin dashboard has /admin/listings for
  // that), so the status param is deliberately ignored rather than whitelisted.
  const conditions = [`status = 'live'`];
  const params = [];

  if (make)          { params.push(make);          conditions.push(`make ILIKE $${params.length}`); }
  if (model)         { params.push(`%${model}%`);  conditions.push(`model ILIKE $${params.length}`); }
  if (min_price)     { params.push(min_price);     conditions.push(`price >= $${params.length}`); }
  if (max_price)     { params.push(max_price);     conditions.push(`price <= $${params.length}`); }
  if (min_year)      { params.push(min_year);      conditions.push(`year >= $${params.length}`); }
  if (max_year)      { params.push(max_year);      conditions.push(`year <= $${params.length}`); }
  if (fuel_type)     { params.push(fuel_type);     conditions.push(`fuel_type = $${params.length}`); }
  if (transmission)  { params.push(transmission);  conditions.push(`transmission = $${params.length}`); }
  if (body_type)     { params.push(body_type);     conditions.push(`body_type = $${params.length}`); }
  if (drive_side)    { params.push(drive_side);    conditions.push(`drive_side = $${params.length}`); }
  // Free text, and matched loosely on purpose. Sellers type this themselves, so
  // the column holds "Kicukiro", "Kicukiro, Kigali" and "kicukiro" for the same
  // place. Equality would filter most of them out and look like empty stock.
  if (location)      { params.push(`%${location}%`); conditions.push(`location ILIKE $${params.length}`); }

  // Free-text box in the app. Every term must match somewhere across the
  // vehicle's identifying fields, so "toyota suv" narrows instead of widening.
  // ILIKE over a handful of columns is right at this catalogue size; swap for
  // a tsvector index when the inventory outgrows a few thousand rows.
  if (q && String(q).trim()) {
    String(q).trim().split(/\s+/).slice(0, 6).forEach((term) => {
      params.push(`%${term}%`);
      conditions.push(
        `(title ILIKE $${params.length} OR make ILIKE $${params.length}
          OR model ILIKE $${params.length} OR body_type ILIKE $${params.length})`
      );
    });
  }

  const safeSort = ['listed_at', 'price', 'mileage', 'year', 'views'].includes(sort) ? sort : 'listed_at';
  const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

  const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);
  params.push(safeLimit, safeOffset);

  try {
    // Paginate first, enrich second: the market laterals then run for one page
    // of cars, not the whole table. Ordering is repeated outside the CTE
    // because a join makes no promise about preserving row order.
    const { rows } = await pool.query(
       `WITH page AS (
         SELECT c.*
         FROM cars c
         JOIN users eligible_seller ON eligible_seller.id = c.seller_id
         WHERE ${conditions.join(' AND ')}
           AND eligible_seller.role = 'seller'
           AND eligible_seller.id_verified = 'approved'
           AND eligible_seller.account_status = 'active'
           AND eligible_seller.deleted_at IS NULL
           AND (COALESCE(eligible_seller.seller_type, 'individual') <> 'showroom' OR eligible_seller.business_verified = TRUE)
           AND ${validInspectionExists('c')}
         ORDER BY (c.featured_until IS NOT NULL AND c.featured_until > NOW()) DESC,
                  c.${safeSort} ${safeOrder}
         LIMIT $${params.length - 1} OFFSET $${params.length}
       )
       SELECT ${publicCarSelect('c')},
              u.name AS seller_name, u.trust_score AS seller_trust,
              u.id_verified AS seller_id_verified,
              u.business_verified AS seller_business_verified,
              (SELECT COUNT(*)::int FROM saved_cars sc WHERE sc.car_id = c.id) AS saves_count,
${MARKET_COLUMNS}
       FROM page c
       JOIN users u ON u.id = c.seller_id
${MARKET_LATERALS}
       ORDER BY (c.featured_until IS NOT NULL AND c.featured_until > NOW()) DESC,
                c.${safeSort} ${safeOrder}`,
      params
    );
    res.json(rows);
  } catch (err) {
    log.error('cars list error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /cars/featured — the home-screen banner.
//
// Public, unauthenticated, and deliberately narrow: id, photo, price, the
// disclosure, and nothing else a card needs to render. It reuses the same
// eligibility predicate as the browse list, so a car that is sold, paused,
// demoted by a failed re-inspection, or whose seller's identity was revoked
// leaves the banner the moment it leaves the marketplace — by falling out of a
// WHERE clause, with no job to run and nothing to remember.
router.get('/featured', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 6, 1), 12);
  try {
    const { rows } = await pool.query(
      `SELECT f.id AS placement_id, f.kind, f.slot, f.headline, f.ends_at,
              ${publicCarSelect('c')},
              u.name AS seller_name
         FROM featured_placements f
         JOIN cars c ON c.id = f.car_id
         JOIN users u ON u.id = c.seller_id
        WHERE f.cancelled_at IS NULL
          AND f.starts_at <= NOW() AND f.ends_at > NOW()
          AND c.status = 'live'
          AND u.role = 'seller' AND u.id_verified = 'approved'
          AND u.account_status = 'active' AND u.deleted_at IS NULL
          AND (COALESCE(u.seller_type, 'individual') <> 'showroom' OR u.business_verified = TRUE)
          AND ${validInspectionExists('c')}
        ORDER BY f.slot ASC, f.created_at DESC
        LIMIT $1`,
      [limit]
    );
    res.json(rows.map((row) => ({
      ...row,
      // Computed here rather than left to three clients to each decide. A paid
      // placement is disclosed as paid, in the payload, so no surface can
      // render it as an editorial pick by forgetting to check the kind.
      sponsored: row.kind === 'sponsored',
      label: row.kind === 'sponsored' ? 'Sponsored'
           : row.kind === 'hot_deal' ? 'Hot deal'
           : 'Featured',
    })));
  } catch (err) {
    log.error('featured feed error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /cars/:id/readiness — admin: why is (or isn't) this listing publishable?
//
// The same verdict the approve/publish transactions enforce, offered BEFORE
// the attempt instead of only inside a 409. The dashboard used to be able to
// say no more than "inspection, seller approval and gallery are required" —
// three categories, regardless of which one was actually wrong — so the only
// way to learn the real reason was to try the action and read the error.
// Publication stays exactly as gated as it was; the reasoning is just no
// longer a secret from the person doing the work.
// GET /cars/:id/history — vehicle history card (buyers + public).
// Facts derive from real data where it exists (inspection checklist, price
// history, verified seller); anything unknown is labelled unknown, not faked.
router.get('/:id/history', requireUuid('id'), async (req, res) => {
  try {
    const carRes = await pool.query(
      `SELECT c.vin, c.make, c.model, c.year, c.mileage, c.drive_side,
              c.fuel_type, c.created_at, c.listed_at, c.inspection_score, c.inspected,
              u.name AS seller_name, u.completed_sales AS seller_sales,
              u.id_verified AS seller_id_verified
       FROM cars c
       JOIN users u ON u.id = c.seller_id
       WHERE c.id = $1 AND c.status = 'live'
         AND u.role = 'seller' AND u.id_verified = 'approved'
         AND u.account_status = 'active' AND u.deleted_at IS NULL
         AND (COALESCE(u.seller_type, 'individual') <> 'showroom' OR u.business_verified = TRUE)
         AND ${validInspectionExists('c')}`,
      [req.params.id]
    );
    if (!carRes.rows.length) return res.status(404).json({ error: 'Car not found' });
    const car = carRes.rows[0];

    const inspRes = await pool.query(
      `SELECT i.checklist_results, i.score, i.completed_at FROM inspections i
       JOIN submissions s ON s.id = i.submission_id
       JOIN cars c ON c.id = i.car_id
       WHERE i.car_id = $1 AND i.status = 'complete' AND i.passed = TRUE
         AND i.checklist_version = $2 AND s.seller_id = c.seller_id
         AND lower(s.make) = lower(c.make) AND lower(s.model) = lower(c.model) AND s.year = c.year
       ORDER BY completed_at DESC LIMIT 1`,
      [req.params.id, CHECKLIST_VERSION]
    );
    if (!inspRes.rowCount) return res.status(404).json({ error: 'Vehicle history not found' });
    const checklist = inspRes.rows[0].checklist_results;
    const evaluated = evaluateChecklist(checklist);
    if (!evaluated.valid || !evaluated.passed || evaluated.score !== Number(inspRes.rows[0].score)) {
      return res.status(404).json({ error: 'Vehicle history not found' });
    }
    const docVerdict = (itemId) => checklist[itemId] || 'unknown';

    res.json({
      vin: car.vin || null,
      vin_verified: docVerdict('d06') === 'pass',
      make: car.make, model: car.model, year: car.year,
      drive_side: car.drive_side,
      import_origin: car.drive_side === 'RHD' ? 'Japan (typical for RHD)' : 'Unknown',
      mileage: car.mileage,
      mileage_verified: docVerdict('i07') === 'pass' && docVerdict('d21') !== 'fail',
      rra_duty_paid: docVerdict('d14'),
      registration: docVerdict('d01'),
      service_history: docVerdict('d20'),
      insurance_valid: docVerdict('d18'),
      inspection_score: car.inspection_score,
      inspected_at: inspRes.rows[0].completed_at,
      seller: {
        name: car.seller_name,
        id_verified: car.seller_id_verified === 'approved',
        completed_sales: car.seller_sales,
      },
      accident_history: 'No insurance-partner data yet',
    });
  } catch (err) {
    log.error('history error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Best-effort identity for otherwise-public routes: sets req.user when a valid
// token is present, and simply carries on when one is not. Used where the
// RESPONSE differs for a signed-in caller but the route itself stays public.
async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      const live = await verifyLiveSession(payload);
      if (live.ok) req.user = payload;
    } catch { /* invalid, revoked or unavailable optional identity is anonymous */ }
  }
  next();
}

// POST /cars/:id/contact — disclose an opted-in seller contact to an
// authenticated buyer and record the disclosure. The public catalogue never
// carries phone numbers, and an acknowledgement is required once per policy
// version before any direct channel is revealed.
router.post('/:id/contact', requireAuth, requireUuid('id'), async (req, res) => {
  const channel = String(req.body.channel || 'in_app');
  if (!['phone', 'whatsapp', 'in_app'].includes(channel)) {
    return res.status(400).json({ error: 'channel must be phone, whatsapp, or in_app' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.seller_id, c.status,
              u.phone, u.whatsapp_phone, u.phone_visible, u.whatsapp_visible,
              u.role, u.id_verified, u.account_status, u.deleted_at,
              u.seller_type, u.business_verified,
              buyer.marketplace_terms_accepted_at,
              buyer.marketplace_terms_version,
              ${validInspectionExists('c')} AS has_valid_inspection
       FROM cars c
       JOIN users u ON u.id = c.seller_id
       JOIN users buyer ON buyer.id = $2
       WHERE c.id = $1`,
      [req.params.id, req.user.id]
    );
    if (!rows.length || ((!rows[0].has_valid_inspection || rows[0].status !== 'live')
        && req.user.role !== 'admin' && rows[0].seller_id !== req.user.id)) {
      return res.status(404).json({ error: 'Live listing not found' });
    }
    const car = rows[0];
    const isInsider = req.user.role === 'admin' || car.seller_id === req.user.id;
    if (!isInsider) {
      const blocked = await pool.query(
        `SELECT 1 FROM blocked_users
         WHERE (user_id = $1 AND blocked_id = $2)
            OR (user_id = $2 AND blocked_id = $1)
         LIMIT 1`,
        [req.user.id, car.seller_id]
      );
      if (blocked.rowCount) return res.status(403).json({ error: 'Contact is unavailable for these accounts' });
      await ensureMarketplaceAcknowledgement(pool, {
        id: req.user.id,
        marketplace_terms_accepted_at: car.marketplace_terms_accepted_at,
        marketplace_terms_version: car.marketplace_terms_version,
      }, req.body.acknowledge === true);
    }

    const available = contactAvailability(car);
    if (!isInsider && channel !== 'in_app' && !available[channel]) {
      return res.status(409).json({
        error: `The seller has not made ${channel === 'whatsapp' ? 'WhatsApp' : 'phone'} contact available. Use in-app chat instead.`,
        code: 'CONTACT_NOT_AVAILABLE',
        available,
      });
    }

    if (!isInsider) {
      await pool.query(
        `INSERT INTO listing_contact_events (car_id, buyer_id, seller_id, channel)
         VALUES ($1, $2, $3, $4)`,
        [car.id, req.user.id, car.seller_id, channel]
      );
    }

    res.json({
      channel,
      available,
      contact: channel === 'phone' ? car.phone : channel === 'whatsapp' ? car.whatsapp_phone : null,
      seller_id: car.seller_id,
      notice: DIRECT_DEAL_NOTICE,
      terms_version: MARKETPLACE_TERMS_VERSION,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, code: err.code, notice: err.notice });
    }
    log.error('seller contact disclosure error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /cars/:id
// Public, because the catalogue is the indexable part of the product — but the
// seller contact details are NOT part of the catalogue. Availability is public;
// the value itself is released only by POST /:id/contact after authentication,
// consent and the current direct-deal acknowledgement.
router.get('/:id', requireUuid('id'), optionalAuth, async (req, res) => {
  try {
    // price_history is ordered oldest-first, so element 0 is the original
    // listing price. A car with no recorded changes returns [] — nothing is
    // synthesised; the app renders an empty history rather than a fake one.
    const { rows } = await pool.query(
      `SELECT ${publicCarSelect('c', [...PUBLIC_CAR_DETAIL_COLUMNS, ...INTERNAL_CAR_COLUMNS])},
              u.name AS seller_name, u.phone AS seller_phone,
              u.whatsapp_phone AS seller_whatsapp,
              u.phone_visible AS seller_phone_visible,
              u.whatsapp_visible AS seller_whatsapp_visible,
              u.account_status AS seller_account_status,
              u.deleted_at AS seller_deleted_at,
              u.trust_score AS seller_trust,
              u.response_rate AS seller_response_rate, u.completed_sales AS seller_sales,
              u.id_verified AS seller_id_verified,
              u.role AS seller_role,
              u.seller_type AS seller_type,
              u.business_verified AS seller_business_verified,
              (SELECT COUNT(*)::int FROM saved_cars sc WHERE sc.car_id = c.id) AS saves_count,
              ${validInspectionExists('c')} AS has_valid_inspection,
              COALESCE((SELECT json_agg(json_build_object('price', ph.price, 'at', ph.changed_at) ORDER BY ph.changed_at)
                        FROM price_history ph WHERE ph.car_id = c.id), '[]') AS price_history,
${MARKET_COLUMNS}
       FROM cars c
       JOIN users u ON u.id = c.seller_id
${MARKET_LATERALS}
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Car not found' });
    const car = rows[0];

    // Statuses a car reaches only by having been published. Anything else
    // (under_review, scheduled, inspecting, archived) describes a car that was
    // never on the marketplace, so it is not public — 404, not 403, because the
    // existence of the row is itself the thing not to confirm.
    const PUBLICLY_VISIBLE = ['live', 'sold'];
    const isInsider =
      req.user && (req.user.role === 'admin' || req.user.id === car.seller_id);
    const sellerEligible = car.seller_role === 'seller' && car.seller_id_verified === 'approved' &&
      car.seller_account_status === 'active' && !car.seller_deleted_at &&
      (car.seller_type !== 'showroom' || car.seller_business_verified === true);
    if (!sellerEligible && !isInsider) {
      return res.status(404).json({ error: 'Car not found' });
    }
    if ((!PUBLICLY_VISIBLE.includes(car.status) || !car.has_valid_inspection) && !isInsider) {
      return res.status(404).json({ error: 'Car not found' });
    }

    const available = contactAvailability({
      phone: car.seller_phone,
      whatsapp_phone: car.seller_whatsapp,
      phone_visible: car.seller_phone_visible,
      whatsapp_visible: car.seller_whatsapp_visible,
      id_verified: car.seller_id_verified,
      role: car.seller_role,
      seller_type: car.seller_type,
      business_verified: car.seller_business_verified,
      account_status: car.seller_account_status,
      deleted_at: car.seller_deleted_at,
    });
    if (!isInsider) {
      car.seller_phone = null;
      car.seller_whatsapp = null;
      // The admin's own notes, the plate string, and the internal audit
      // columns. An admin or the car's own seller keeps them — the listing
      // editor reads review_notes from this route — and nobody else ever
      // sees them. Deleting rather than nulling keeps them off the wire
      // entirely, so their absence is not itself a signal.
      for (const column of INTERNAL_CAR_COLUMNS) delete car[column];
    }
    car.seller_contact_available = available;
    car.direct_deal_notice = DIRECT_DEAL_NOTICE;
    car.marketplace_terms_version = MARKETPLACE_TERMS_VERSION;
    delete car.seller_phone_visible;
    delete car.seller_whatsapp_visible;
    delete car.seller_account_status;
    delete car.seller_deleted_at;

    // Fire-and-forget, but never unhandled: a DB blip here must not become an
    // unhandled rejection that takes the process down under --unhandled-rejections.
    pool.query('UPDATE cars SET views = views + 1 WHERE id = $1', [req.params.id])
      .catch((err) => log.error('view counter', { error: err.message }));

    res.json(car);
  } catch (err) {
    log.error('car detail error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /cars/save/:id  (toggle save)
//
// cars.saves is a cached counter that every read path already ignores in favour
// of a live COUNT(*) over saved_cars — see saves_count in the queries above, and
// mapCar in the mobile app. It was maintained by a read, then a write, then a
// second write, none of them in a transaction: two taps racing produced a count
// that disagreed with the table, permanently.
//
// The whole toggle is now one statement pair inside a transaction, and the
// counter is DERIVED from the table rather than incremented, so it cannot drift
// from the thing it is meant to summarise even if a write is lost.
router.post('/save/:id', requireAuth, requireUuid('id'), async (req, res) => {
  const { id: car_id } = req.params;
  const user_id = req.user.id;
  try {
    const result = await withTransaction(async (client) => {
      const existing = await client.query(
        'SELECT 1 FROM saved_cars WHERE user_id = $1 AND car_id = $2 FOR UPDATE',
        [user_id, car_id]
      );
      let saved = false;
      if (existing.rowCount) {
        await client.query(
          'DELETE FROM saved_cars WHERE user_id = $1 AND car_id = $2',
          [user_id, car_id]
        );
      } else {
        const eligible = await client.query(
          `SELECT 1 FROM cars c JOIN users u ON u.id = c.seller_id
           WHERE c.id = $1 AND c.status = 'live'
             AND u.role = 'seller' AND u.id_verified = 'approved'
             AND u.account_status = 'active' AND u.deleted_at IS NULL
             AND (COALESCE(u.seller_type, 'individual') <> 'showroom' OR u.business_verified = TRUE)
             AND ${validInspectionExists('c')}`,
          [car_id]
        );
        if (!eligible.rowCount) {
          const error = new Error('Live listing not found');
          error.status = 404;
          throw error;
        }
        await client.query(
          'INSERT INTO saved_cars (user_id, car_id) VALUES ($1, $2)',
          [user_id, car_id]
        );
        saved = true;
      }
      await client.query(
        `UPDATE cars SET saves = (SELECT COUNT(*) FROM saved_cars WHERE car_id = $1)
         WHERE id = $1`,
        [car_id]
      );
      return { saved };
    });
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    // A car_id that does not exist violates the foreign key — a client error.
    if (err.code === '23503') {
      return res.status(404).json({ error: 'Car not found' });
    }
    log.error('toggle save error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /cars/saved/list
router.get('/saved/list', requireAuth, paginate(), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS seller_name, u.trust_score AS seller_trust
       FROM saved_cars sc
       JOIN cars c ON c.id = sc.car_id
       JOIN users u ON u.id = c.seller_id
       WHERE sc.user_id = $1 AND c.status = 'live'
         AND u.role = 'seller' AND u.id_verified = 'approved'
         AND u.account_status = 'active' AND u.deleted_at IS NULL
         AND (COALESCE(u.seller_type, 'individual') <> 'showroom' OR u.business_verified = TRUE)
         AND ${validInspectionExists('c')}
       ORDER BY sc.saved_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, req.pagination.limit, req.pagination.offset]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Admin-only routes ────────────────────────────────────────────────────────

// POST /cars — admin creates a reviewable listing. Creation never publishes:
// inspection completion and an explicit admin publish are separate auditable
// decisions, so a partially entered car cannot leak into the public catalogue.
router.post('/', requireAdmin, async (req, res) => {
  const { seller_id, title, make, model, year, mileage, fuel_type, transmission,
          body_type, color, price, location, drive_side, vin, description, images,
          submission_id } = req.body;
  // year, mileage and price are NOT NULL in the schema but were not checked
  // here, so omitting one produced a 500 from the constraint violation rather
  // than telling the caller which field was missing.
  const missing = Object.entries({ seller_id, title, make, model, year, mileage, price })
    .filter(([, v]) => v === undefined || v === null || v === '')
    .map(([k]) => k);
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
  }
  for (const [field, value] of [['year', year], ['mileage', mileage], ['price', price]]) {
    if (!Number.isFinite(Number(value)) || Number(value) < 0) {
      return res.status(400).json({ error: `${field} must be a non-negative number` });
    }
  }
  try {
    // ID is checked in person at the inspection center; admin marks the seller
    // approved there. A listing cannot go live for an unverified seller.
    const sellerRes = await pool.query(
      'SELECT role, id_verified, account_status, deleted_at, seller_type, business_verified FROM users WHERE id = $1',
      [seller_id]
    );
    if (!sellerRes.rows.length) return res.status(404).json({ error: 'Seller not found' });
    if (sellerRes.rows[0].role !== 'seller') {
      return res.status(400).json({ error: 'The listing owner must have a seller account' });
    }
    if (sellerRes.rows[0].id_verified !== 'approved') {
      return res.status(400).json({
        error: "Seller is not ID-verified yet. Verify them at the center (Users → approve) before publishing.",
      });
    }
    if (sellerRes.rows[0].account_status !== 'active' || sellerRes.rows[0].deleted_at) {
      return res.status(400).json({ error: 'Seller account is not active' });
    }
    if (sellerRes.rows[0].seller_type === 'showroom' && sellerRes.rows[0].business_verified !== true) {
      return res.status(400).json({ error: 'Showroom business verification is required' });
    }
    const car = await withTransaction(async (client) => {
      let inspectionEvidence = null;
      if (submission_id) {
        const submission = await client.query(
          'SELECT seller_id, make, model, year FROM submissions WHERE id = $1 FOR UPDATE', [submission_id]
        );
        if (!submission.rowCount) { const e = new Error('Submission not found'); e.status = 404; throw e; }
        if (submission.rows[0].seller_id !== seller_id) {
          const e = new Error('Submission belongs to a different seller'); e.status = 409; throw e;
        }
        if (String(submission.rows[0].make).toLowerCase() !== String(make).toLowerCase()
            || String(submission.rows[0].model).toLowerCase() !== String(model).toLowerCase()
            || Number(submission.rows[0].year) !== Number(year)) {
          const e = new Error('Listing make, model and year must match the inspected submission'); e.status = 409; throw e;
        }
        const inspection = await client.query(
          `SELECT id, score, checklist_results, checklist_version, passed
             FROM inspections
            WHERE submission_id = $1 AND status = 'complete'
            ORDER BY completed_at DESC NULLS LAST, id DESC LIMIT 1`,
          [submission_id]
        );
        if (!inspection.rowCount) {
          const e = new Error('Complete the submission inspection before creating its listing'); e.status = 409; throw e;
        }
        inspectionEvidence = inspection.rows[0];
        const evaluated = evaluateChecklist(inspectionEvidence.checklist_results);
        if (inspectionEvidence.checklist_version !== CHECKLIST_VERSION || !inspectionEvidence.passed
            || !evaluated.valid || !evaluated.passed || evaluated.score !== Number(inspectionEvidence.score)) {
          const e = new Error('The submission does not have a valid, passing 150-point inspection'); e.status = 409; throw e;
        }
      }
      const { rows } = await client.query(
        `INSERT INTO cars
           (seller_id, title, make, model, year, mileage, fuel_type, transmission,
            body_type, color, price, location, drive_side, vin, description, images,
            inspected, inspection_score, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,FALSE,NULL,'under_review')
         RETURNING *`,
        [seller_id, title, make, model, year, mileage, fuel_type, transmission,
         body_type, color, price, location, drive_side, vin, description, images || []]
      );
      const created = rows[0];
      await client.query(
        'INSERT INTO price_history (car_id, price, changed_by) VALUES ($1, $2, $3)',
        [created.id, created.price, req.user.id]
      );
      if (submission_id) {
        await client.query(
          "UPDATE submissions SET car_id = $1, status = 'inspected' WHERE id = $2",
          [created.id, submission_id]
        );
        await client.query(
          'UPDATE inspections SET car_id = $1 WHERE id = $2',
          [created.id, inspectionEvidence.id]
        );
        await client.query(
          'UPDATE cars SET inspected = TRUE, inspection_score = $2 WHERE id = $1',
          [created.id, Number(inspectionEvidence.score)]
        );
      }
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'listing.created', targetType: 'listing', targetId: created.id,
        summary: `${created.title} created for review`, metadata: { seller_id, submission_id: submission_id || null },
      });
      return (await client.query('SELECT * FROM cars WHERE id = $1', [created.id])).rows[0];
    });
    res.status(201).json({
      ...car,
      next_step: 'Upload a truthful gallery, complete the inspection, then publish from Listings.',
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('create car error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /cars/:id/status  (admin changes status)
// GET /cars/seller/mine — seller's own listings with engagement stats
router.get('/seller/mine', requireAuth, paginate(), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*)::int FROM saved_cars sc WHERE sc.car_id = c.id) AS saves_count,
              (SELECT COUNT(*)::int FROM conversations cv WHERE cv.car_id = c.id) AS inquiries_count
       FROM cars c
       WHERE c.seller_id = $1
       ORDER BY c.listed_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [req.user.id, req.pagination.limit, req.pagination.offset]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /cars/valuation/estimate?make=&year=&mileage= — market-based estimate
router.get('/valuation/estimate', async (req, res) => {
  const { make, year, mileage } = req.query;
  if (!make || !year) return res.status(400).json({ error: 'make and year are required' });
  const y = parseInt(year);
  if (!Number.isFinite(y)) return res.status(400).json({ error: 'year must be a number' });
  try {
    const { rows } = await pool.query(
      `SELECT AVG(price)::int AS avg_price, COUNT(*)::int AS comparables,
              MIN(price)::int AS low_seen, MAX(price)::int AS high_seen
       FROM cars
       WHERE make ILIKE $1 AND year BETWEEN $2 AND $3
         AND status IN ('live', 'sold') AND price > 0`,
      [make, y - 2, y + 2]
    );
    const { avg_price, comparables, low_seen, high_seen } = rows[0];
    if (!comparables || !avg_price) {
      return res.json({ comparables: 0, message: 'Not enough market data for this make/year yet' });
    }
    // Light mileage adjustment: ±5% per 20k km away from 60k reference
    const km = parseInt(mileage) || 60000;
    const adj = Math.max(0.7, Math.min(1.15, 1 - ((km - 60000) / 20000) * 0.05));
    const mid = Math.round(avg_price * adj);
    res.json({
      comparables,
      low: Math.round(mid * 0.92),
      high: Math.round(mid * 1.08),
      market_avg: avg_price,
      range_seen: { low: low_seen, high: high_seen },
    });
  } catch (err) {
    log.error('valuation error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /cars/:id — admin edits listing fields; price changes are recorded
// PATCH /cars/:id/vehicle-identity — correct what the vehicle IS.
//
// Make, model and year are not listing copy. They are the identity the
// inspection evidence is bound to: publicationReadiness refuses to publish a
// car whose make, model or year differs from the submission that was inspected,
// which is what stops one car's 150-point pass being used to publish a
// different car.
//
// The forms let an admin retype those three on the listing alone, so any edit
// at all — fixing "Volkswagon", adding a trim level, changing a capital —
// silently broke the binding and produced "Listing make, model and year must
// match the inspected submission" with no way forward. The information needed
// to fix it was not on the screen, and neither was the fix.
//
// Two changes make that unreachable. The listing forms no longer let those
// three be typed; they are shown, sourced from the evidence. And a genuine
// correction — the submission itself has the typo — comes here, where the
// listing and the submission are updated in ONE transaction. They move together
// or not at all, so they cannot diverge, and the invariant holds by
// construction rather than by an administrator remembering it.
//
// This is a correction, not a re-identification. Changing a Corolla into an
// S-Class would be fraud; it is recorded with a reason and an actor for exactly
// that reason, and readiness is re-checked before it commits.
router.patch('/:id/vehicle-identity', requireAdmin, requireUuid('id'), async (req, res) => {
  const make = String(req.body?.make || '').trim().replace(/\s+/g, ' ');
  const model = String(req.body?.model || '').trim().replace(/\s+/g, ' ');
  const year = parseInt(req.body?.year, 10);
  const reason = String(req.body?.reason || '').trim();

  if (!make || make.length > 60) return res.status(400).json({ error: 'Give the make', field: 'make' });
  if (!model || model.length > 60) return res.status(400).json({ error: 'Give the model', field: 'model' });
  if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) {
    return res.status(400).json({ error: 'Give a valid model year', field: 'year' });
  }
  if (reason.length < 4) {
    return res.status(400).json({
      error: 'Say what is being corrected — it is recorded against the vehicle.',
      field: 'reason',
    });
  }

  try {
    const result = await withTransaction(async (client) => {
      const before = await client.query('SELECT * FROM cars WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (!before.rowCount) { const e = new Error('Listing not found'); e.status = 404; throw e; }
      const car = before.rows[0];

      // Every submission whose evidence is bound to this car. Normally one; the
      // loop is because `submissions.car_id` is the link and nothing guarantees
      // a single row, and leaving one behind would recreate the mismatch.
      const bound = await client.query(
        `SELECT s.id FROM submissions s
          WHERE s.car_id = $1
             OR s.id IN (SELECT i.submission_id FROM inspections i
                          WHERE i.car_id = $1 AND i.submission_id IS NOT NULL)
          FOR UPDATE`,
        [req.params.id]
      );

      await client.query(
        'UPDATE cars SET make = $1, model = $2, year = $3 WHERE id = $4',
        [make, model, year, req.params.id]
      );
      for (const row of bound.rows) {
        await client.query(
          'UPDATE submissions SET make = $1, model = $2, year = $3 WHERE id = $4',
          [make, model, year, row.id]
        );
      }

      // The point of doing both in one transaction is that this now passes. If
      // it does not, something else is wrong and the correction is not the
      // thing to force through — so it rolls back rather than leaving a live
      // listing that cannot be republished.
      const readiness = await publicationReadiness(client, req.params.id);
      if (['approved', 'live'].includes(car.status) && !readiness?.ready) {
        const e = new Error(`This correction would leave the listing unpublishable. Missing: ${readiness?.missing.join(', ')}`);
        e.status = 409; e.code = 'LISTING_NOT_READY'; e.readiness = readiness; throw e;
      }

      await recordAdminAction(client, {
        actorId: req.user.id, action: 'listing.vehicle_identity_corrected',
        targetType: 'listing', targetId: req.params.id,
        summary: `${car.year} ${car.make} ${car.model} → ${year} ${make} ${model}`,
        metadata: {
          from: { make: car.make, model: car.model, year: car.year },
          to: { make, model, year },
          submissions_updated: bound.rows.map((r) => r.id),
          reason,
        },
      });

      const { rows } = await client.query('SELECT * FROM cars WHERE id = $1', [req.params.id]);
      return { car: rows[0], readiness, submissions: bound.rowCount };
    });
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code, readiness: err.readiness });
    log.error('vehicle identity correction failed', { error: err.message, id: req.params.id });
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  // make, model and year are NOT here, deliberately. They are the identity the
  // inspection evidence is bound to, not listing copy, and editing them on the
  // car alone is what produced "Listing make, model and year must match the
  // inspected submission" — a refusal an administrator could not act on,
  // because the fix was in a record the form never showed. Corrections go to
  // PATCH /cars/:id/vehicle-identity, which updates the listing and its
  // submission in one transaction so the two cannot diverge.
  const EDITABLE = [
    'seller_id', 'title', 'mileage', 'fuel_type',
    'transmission', 'body_type', 'color', 'price', 'location', 'drive_side',
    'vin', 'description', 'images', 'review_notes',
  ];
  const IDENTITY = ['make', 'model', 'year'];
  const attemptedIdentity = IDENTITY.filter((field) => req.body[field] !== undefined);
  if (attemptedIdentity.length) {
    return res.status(400).json({
      error: 'Make, model and year describe what the vehicle IS, and the inspection evidence '
           + 'is bound to them. Use "Correct vehicle details" so the listing and its inspected '
           + 'submission are changed together.',
      code: 'USE_VEHICLE_IDENTITY_ROUTE',
      fields: attemptedIdentity,
    });
  }
  const updates = [];
  const params = [];
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) {
      params.push(req.body[field]);
      updates.push(`${field} = $${params.length}`);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No editable fields provided' });
  for (const field of ['price', 'mileage', 'year']) {
    if (req.body[field] !== undefined && (!Number.isFinite(Number(req.body[field])) || Number(req.body[field]) < 0)) {
      return res.status(400).json({ error: `${field} must be a non-negative number` });
    }
  }
  try {
    const result = await withTransaction(async (client) => {
      const before = await client.query('SELECT * FROM cars WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (!before.rowCount) { const error = new Error('Car not found'); error.status = 404; throw error; }

      if (req.body.seller_id !== undefined) {
        const seller = await client.query(
          `SELECT 1 FROM users WHERE id = $1 AND role = 'seller' AND id_verified = 'approved'
           AND account_status = 'active' AND deleted_at IS NULL
           AND (COALESCE(seller_type, 'individual') <> 'showroom' OR business_verified = TRUE)`, [req.body.seller_id]
        );
        if (!seller.rowCount) {
          const error = new Error('New seller must be active and identity-verified'); error.status = 400; throw error;
        }
      }

      const updateParams = [...params, req.params.id];
      const { rows } = await client.query(
        `UPDATE cars SET ${updates.join(', ')} WHERE id = $${updateParams.length} RETURNING *`,
        updateParams
      );
      let readiness = null;
      if (['approved', 'live'].includes(rows[0].status)) {
        readiness = await publicationReadiness(client, req.params.id);
        if (!readiness?.ready) {
          const error = new Error(`This edit would invalidate a public listing. Missing: ${readiness?.missing.join(', ') || 'requirements'}`);
          error.status = 409; error.code = 'LISTING_NOT_READY'; error.readiness = readiness; throw error;
        }
      }
      if (req.body.price !== undefined && Number(req.body.price) !== Number(before.rows[0].price)) {
        await client.query(
          'INSERT INTO price_history (car_id, price, changed_by) VALUES ($1, $2, $3)',
          [req.params.id, Number(req.body.price), req.user.id]
        );
      }
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'listing.updated', targetType: 'listing', targetId: req.params.id,
        summary: `${rows[0].title} listing details updated`,
        metadata: { changed_fields: updates.map((u) => u.split(' = ')[0]), readiness },
      });
      return { car: rows[0], oldPrice: Number(before.rows[0].price) };
    });
    if (req.body.price !== undefined && Number(req.body.price) !== result.oldPrice) {
      notifyPriceDrop(req.params.id, result.oldPrice, Number(req.body.price), result.car.title);
    }
    res.json(result.car);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code, readiness: err.readiness });
    log.error('edit car error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /cars/:id/price — seller changes the price of their own live listing.
// No status regression; price history + price-drop alerts fire like admin edits.
router.patch('/:id/price', requireAuth, requireUuid('id'), async (req, res) => {
  const price = Number(req.body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: 'price must be a positive number' });
  }
  try {
    const before = await pool.query(
      "SELECT price FROM cars WHERE id = $1 AND seller_id = $2 AND status = 'live'",
      [req.params.id, req.user.id]
    );
    if (!before.rows.length) {
      return res.status(404).json({ error: 'Live listing not found for this seller' });
    }
    const oldPrice = Number(before.rows[0].price);

    const { rows } = await pool.query(
      'UPDATE cars SET price = $1 WHERE id = $2 RETURNING *',
      [price, req.params.id]
    );
    if (price !== oldPrice) {
      await pool.query(
        'INSERT INTO price_history (car_id, price, changed_by) VALUES ($1, $2, $3)',
        [req.params.id, price, req.user.id]
      );
      notifyPriceDrop(req.params.id, oldPrice, price, rows[0].title);
    }
    res.json(rows[0]);
  } catch (err) {
    log.error('seller price edit error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /cars/:id/feature — editorial merchandising only. There is no paid
// boost product and no fee is created from this action.
router.patch('/:id/feature', requireAdmin, requireUuid('id'), async (req, res) => {
  // kind is what separates "we chose this" from "they paid for this". It is
  // not optional in spirit, but it defaults to editorial so the old
  // single-argument call still means exactly what it always meant.
  const kind = String(req.body.kind || 'editorial');
  if (!FEATURE_KINDS.includes(kind)) {
    return res.status(400).json({
      error: `kind must be one of ${FEATURE_KINDS.join(', ')}`, code: 'INVALID_FEATURE_KIND',
    });
  }
  const days = Math.min(Math.max(parseInt(req.body.days) || 7, 1), 30);
  const slot = Math.min(Math.max(parseInt(req.body.slot) || 100, 1), 999);
  const headline = String(req.body.headline || '').trim().slice(0, 120) || null;
  const startsAt = req.body.starts_at ? new Date(req.body.starts_at) : new Date();
  if (Number.isNaN(startsAt.getTime())) {
    return res.status(400).json({ error: 'starts_at is not a date' });
  }

  // Money is meaningful only on a paid placement, and a paid placement with no
  // amount is a favour nobody wrote down. The schema refuses both; refuse them
  // here too, so the operator gets a sentence rather than a constraint name.
  let amount = null;
  if (kind === 'sponsored') {
    amount = Number(req.body.amount_rwf);
    if (!Number.isInteger(amount) || amount < 0) {
      return res.status(400).json({
        error: 'A sponsored placement needs the agreed amount in whole RWF. '
             + 'It is recorded here, not collected — take the money as you always do.',
        code: 'SPONSORSHIP_AMOUNT_REQUIRED',
      });
    }
  } else if (req.body.amount_rwf != null) {
    return res.status(400).json({
      error: 'Only a sponsored placement carries an amount. An editorial pick is not sold.',
      code: 'AMOUNT_ON_UNPAID_PLACEMENT',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Locked, because the overlap check below is a read followed by a write and
    // two operators featuring the same car would otherwise both pass it.
    const car = await client.query(
      "SELECT id, title, status FROM cars WHERE id = $1 FOR UPDATE", [req.params.id]);
    if (!car.rows.length || car.rows[0].status !== 'live') {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Live listing not found' });
    }

    // A car in two banner slots at once is always a mistake. Enforced here
    // rather than by a partial unique index because the predicate needs NOW(),
    // which Postgres will not accept in one — see migration 0033.
    const clash = await client.query(
      `SELECT id, kind, ends_at FROM featured_placements
        WHERE car_id = $1 AND cancelled_at IS NULL
          AND ends_at > NOW() AND starts_at < $2::timestamptz`,
      [req.params.id, new Date(startsAt.getTime() + days * 86400000).toISOString()]
    );
    if (clash.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `${car.rows[0].title} already has a ${clash.rows[0].kind} placement running to `
             + `${String(clash.rows[0].ends_at).slice(0, 10)}. Cancel it before booking another.`,
        code: 'FEATURE_PLACEMENT_EXISTS',
        placement_id: clash.rows[0].id,
      });
    }

    const endsAt = new Date(startsAt.getTime() + days * 86400000);
    const { rows } = await client.query(
      `INSERT INTO featured_placements
         (car_id, kind, slot, starts_at, ends_at, headline, amount_rwf, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.params.id, kind, slot, startsAt.toISOString(), endsAt.toISOString(),
       headline, amount, req.user.id]
    );

    // featured_until is kept in step so the browse ORDER BY, the admin listings
    // badge and every existing reader carry on working untouched.
    await client.query(
      'UPDATE cars SET featured_until = GREATEST(COALESCE(featured_until, $2), $2) WHERE id = $1',
      [req.params.id, endsAt.toISOString()]
    );

    await recordAdminAction(client, {
      actorId: req.user.id, action: 'listing.featured', targetType: 'listing', targetId: req.params.id,
      summary: `${car.rows[0].title} featured (${kind}) in slot ${slot} for ${days} days`,
      metadata: { kind, slot, days, amount_rwf: amount, headline },
    });
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    log.error('feature car error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  } finally { client.release(); }
});

// DELETE /cars/feature/:placementId — pull a car out of the banner.
//
// A reason is required for the same reason a listing rejection needs one: a
// paid placement that vanishes without explanation is a conversation with a
// customer that nobody can reconstruct.
router.delete('/feature/:placementId', requireAdmin, requireUuid('placementId'), async (req, res) => {
  const reason = String(req.body?.reason || '').trim().slice(0, 500);
  if (reason.length < 3) {
    return res.status(400).json({ error: 'Say why this placement is ending.', code: 'REASON_REQUIRED' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE featured_placements
          SET cancelled_at = NOW(), cancelled_by = $2, cancel_reason = $3
        WHERE id = $1 AND cancelled_at IS NULL
        RETURNING *`,
      [req.params.placementId, req.user.id, reason]
    );
    if (!rows.length) return res.status(404).json({ error: 'Placement not found, or already ended' });
    await recordAdminAction(pool, {
      actorId: req.user.id, action: 'listing.feature_cancelled', targetType: 'listing',
      targetId: rows[0].car_id, summary: `Ended a ${rows[0].kind} placement`, metadata: { reason },
    });
    res.json(rows[0]);
  } catch (err) {
    log.error('cancel placement error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/readiness', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const readiness = await publicationReadiness(pool, req.params.id);
    if (!readiness) return res.status(404).json({ error: 'Listing not found' });
    res.json(readiness);
  } catch (err) {
    log.error('listing readiness error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/status', requireAdmin, requireUuid('id'), async (req, res) => {
  const status = req.body.status === 'removed' ? 'archived' : String(req.body.status || '');
  const reason = String(req.body.reason || '').trim().slice(0, 1000);
  const transitions = {
    draft: ['under_review', 'rejected', 'archived'],
    under_review: ['approved', 'rejected', 'archived'],
    scheduled: ['under_review', 'rejected', 'archived'],
    inspecting: ['under_review', 'rejected', 'archived'],
    approved: ['live', 'under_review', 'rejected', 'archived'],
    live: ['paused', 'sold', 'under_review', 'archived'],
    paused: ['live', 'sold', 'under_review', 'archived'],
    sold: ['archived'],
    rejected: ['under_review', 'archived'],
    archived: ['under_review'],
  };
  if (!Object.values(transitions).some((targets) => targets.includes(status))) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  if (['rejected', 'archived'].includes(status) && !reason) {
    return res.status(400).json({ error: `A reason is required when a listing is ${status}` });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT status, seller_id FROM cars WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!current.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Car not found' }); }
    const previousStatus = current.rows[0].status;
    if (status !== previousStatus && !(transitions[previousStatus] || []).includes(status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `A ${previousStatus} listing cannot move directly to ${status}.`,
        code: 'INVALID_LISTING_TRANSITION',
        allowed_transitions: transitions[previousStatus] || [],
      });
    }
    let readiness = null;
    if (status === 'approved' || status === 'live') {
      readiness = await publicationReadiness(client, req.params.id);
      if (!readiness?.ready) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Listing cannot be ${status === 'live' ? 'published' : 'approved'} yet. Missing: ${readiness?.missing.join(', ') || 'requirements'}.`,
          code: 'LISTING_NOT_READY',
          readiness,
        });
      }
    }

    // ── The seller's marketplace cap ────────────────────────────────────────
    // Publication only, and only on the transition INTO an occupied slot. Two
    // deliberate choices:
    //
    //  · Not at submission. Refusing a submission turns away a car we have not
    //    inspected yet, and the inspection is what this business sells. Take
    //    the car, inspect it, take the fee; refuse only the publish.
    //  · Not inherited by other edits. An operator fixing the price or the
    //    location of an over-cap seller's car must not be blocked — that is
    //    exactly the moment they need to work on it.
    //
    // Counted inside the transaction, on a row already locked FOR UPDATE, so
    // two admins publishing the same seller's cars at once cannot both pass.
    if (OCCUPIES_A_SLOT.includes(status) && !OCCUPIES_A_SLOT.includes(previousStatus)) {
      const cap = await client.query(
        `SELECT u.max_active_listings AS cap, u.name,
                (SELECT COUNT(*)::int FROM cars c
                  WHERE c.seller_id = u.id AND c.status = ANY($2::text[]) AND c.id <> $1) AS occupied
           FROM cars parent JOIN users u ON u.id = parent.seller_id
          WHERE parent.id = $1`,
        [req.params.id, OCCUPIES_A_SLOT]
      );
      const { cap: limit, occupied, name } = cap.rows[0] || {};
      if (Number.isInteger(limit) && occupied >= limit) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `${name || 'This seller'} already has ${occupied} of ${limit} listings on the marketplace. `
               + `Raise their limit, or pause or sell one before publishing another.`,
          code: 'SELLER_LISTING_CAP_REACHED',
          cap: { limit, occupied, seller: name || null },
        });
      }
    }
    const { rows } = await client.query(
      `UPDATE cars SET status = $1,
         sold_at = CASE WHEN $1 = 'sold' THEN NOW() WHEN $1 <> 'sold' THEN NULL ELSE sold_at END,
         listed_at = CASE WHEN $1 = 'live' THEN COALESCE(listed_at, NOW()) ELSE listed_at END,
         approved_at = CASE WHEN $1 IN ('approved','live') THEN COALESCE(approved_at, NOW()) ELSE approved_at END,
         approved_by = CASE WHEN $1 IN ('approved','live') THEN $3 ELSE approved_by END,
         archived_at = CASE WHEN $1 = 'archived' THEN NOW() ELSE NULL END,
         archive_reason = CASE WHEN $1 IN ('archived','rejected') THEN $4 ELSE NULL END,
         review_notes = CASE WHEN $1 = 'rejected' THEN $4 ELSE review_notes END
       WHERE id = $2 RETURNING *`,
      [status, req.params.id, req.user.id, reason || null]
    );
    await client.query(
      `UPDATE submissions SET status = CASE
         WHEN $1 = 'live' THEN 'live'
         WHEN $1 = 'rejected' THEN 'rejected'
         WHEN $1 = 'archived' THEN 'archived'
         ELSE status END,
         admin_notes = CASE WHEN $1 IN ('rejected','archived') THEN $3 ELSE admin_notes END,
         reviewed_at = CASE WHEN $1 IN ('approved','live','rejected') THEN NOW() ELSE reviewed_at END,
         reviewer_id = CASE WHEN $1 IN ('approved','live','rejected') THEN $4 ELSE reviewer_id END
       WHERE car_id = $2`,
      [status, req.params.id, reason || null, req.user.id]
    );
    await recordAdminAction(client, {
      actorId: req.user.id, action: 'listing.status_changed', targetType: 'listing', targetId: req.params.id,
      summary: `${rows[0].title} moved to ${status}`,
      metadata: { previous_status: current.rows[0].status, status, reason: reason || undefined, readiness },
    });
    await client.query('COMMIT');
    if (status === 'live' && current.rows[0].status !== 'live') {
      matchSavedSearches(rows[0]).catch(() => {});
    }
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    log.error('listing status error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Sellers can withdraw, restore or close their own listing. Restoring still
// passes the same publication gate as an administrator action.
router.patch('/:id/seller-status', requireAuth, requireUuid('id'), async (req, res) => {
  const status = String(req.body.status || '');
  if (!['live', 'paused', 'sold'].includes(status)) {
    return res.status(400).json({ error: 'status must be live, paused, or sold' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const current = await client.query(
        'SELECT * FROM cars WHERE id = $1 AND seller_id = $2 FOR UPDATE',
        [req.params.id, req.user.id]
      );
      if (!current.rowCount) { const e = new Error('Listing not found'); e.status = 404; throw e; }
      const allowed = current.rows[0].status === 'live'
        ? ['paused', 'sold']
        : current.rows[0].status === 'paused' ? ['live', 'sold'] : [];
      if (!allowed.includes(status)) {
        const e = new Error(`Cannot move a ${current.rows[0].status} listing to ${status}`); e.status = 409; throw e;
      }
      if (status === 'live') {
        const readiness = await publicationReadiness(client, req.params.id);
        if (!readiness?.ready) {
          const e = new Error(`Listing cannot be restored. Missing: ${readiness?.missing.join(', ') || 'requirements'}`);
          e.status = 409; e.code = 'LISTING_NOT_READY'; e.readiness = readiness; throw e;
        }
      }
      const { rows } = await client.query(
        `UPDATE cars SET status = $1,
           sold_at = CASE WHEN $1 = 'sold' THEN NOW() ELSE NULL END,
           listed_at = CASE WHEN $1 = 'live' THEN COALESCE(listed_at, NOW()) ELSE listed_at END
         WHERE id = $2 RETURNING *`,
        [status, req.params.id]
      );
      return rows[0];
    });
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code, readiness: err.readiness });
    log.error('seller listing status error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Removal is a reversible, auditable archive—not a destructive delete.
router.delete('/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const reason = String(req.body?.reason || '').trim().slice(0, 1000);
  if (!reason) return res.status(400).json({ error: 'A removal reason is required' });
  try {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE cars SET status = 'archived', archived_at = NOW(), archive_reason = $1
         WHERE id = $2 RETURNING *`,
        [reason, req.params.id]
      );
      if (!rows.length) { const e = new Error('Car not found'); e.status = 404; throw e; }
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'listing.archived', targetType: 'listing', targetId: req.params.id,
        summary: `${rows[0].title} archived`, metadata: { reason },
      });
      return rows[0];
    });
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
// Exported for backend/test/public-payload.test.js, which checks both lists
// against the real table: a name that is not a column, and a column that is in
// neither list, both fail. That second half is the point — adding a column to
// `cars` should force somebody to decide whether strangers may read it.
module.exports.PUBLIC_CAR_COLUMNS = PUBLIC_CAR_COLUMNS;
module.exports.PUBLIC_CAR_DETAIL_COLUMNS = PUBLIC_CAR_DETAIL_COLUMNS;
module.exports.INTERNAL_CAR_COLUMNS = INTERNAL_CAR_COLUMNS;
