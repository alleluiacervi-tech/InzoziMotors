const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const { withTransaction } = require('../lib/tx');
const { recordAdminAction } = require('../lib/admin-audit');
const { log } = require('../lib/log');
const { uploadImportDocs, verifyImportDocument } = require('../middleware/upload');
const { notifyUser } = require('../lib/notify');
const { sendImportUpdate } = require('../lib/mailer');
const { UPLOAD_DIR } = require('../lib/storage');
const { issueImportPack, issueImportReceipt } = require('../lib/documents/import-documents');
const { documentForSubject, downloadableDocument, DocumentError } = require('../lib/documents/service');
const { rendersEnabled, fetchRender, slug: renderSlug } = require('../lib/vehicle-renders');
const { findCandidates } = require('../lib/commons-images');
const { storage } = require('../lib/storage');
const { publicApiOrigin } = require('../lib/public-origin');

const router = express.Router();

const ORIGINS = new Set(['China', 'South Korea', 'United Arab Emirates', 'Japan', 'Europe', 'Other']);
const STATUS_TRANSITIONS = {
  enquiry: ['quoted', 'cancelled'],
  quoted: ['agreement_pending', 'cancelled'],
  agreement_pending: ['deposit_due', 'cancelled'],
  deposit_due: ['deposit_review', 'cancelled'],
  deposit_review: ['ordered', 'deposit_due', 'cancelled'],
  ordered: ['inspected_abroad', 'shipping_booked', 'cancelled'],
  inspected_abroad: ['shipping_booked', 'cancelled'],
  shipping_booked: ['in_transit', 'cancelled'],
  in_transit: ['arrived'],
  arrived: ['kigali_inspection', 'customs_clearance'],
  kigali_inspection: ['balance_due', 'cancelled'],
  balance_due: ['balance_review'],
  balance_review: ['customs_clearance', 'balance_due'],
  customs_clearance: ['ready_for_handover'],
  ready_for_handover: ['completed'],
  completed: [], cancelled: [],
};

function clean(value, max = 200) {
  return String(value || '').trim().slice(0, max);
}

function orderRef() {
  return `IMP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function fullOrder(client, id, user) {
  const admin = user.role === 'admin';
  const { rows } = await client.query(
    `SELECT o.*, u.name AS buyer_name, u.email AS buyer_email, u.phone AS buyer_phone
       FROM import_orders o JOIN users u ON u.id=o.buyer_id
      WHERE o.id=$1 AND ($2::boolean OR o.buyer_id=$3)`, [id, admin, user.id]
  );
  if (!rows.length) return null;
  const [payments, documents, generatedDocuments, events, agreements, shipment] = await Promise.all([
    client.query(`SELECT * FROM import_payments WHERE import_order_id=$1 ORDER BY created_at`, [id]),
    client.query(`SELECT * FROM import_documents WHERE import_order_id=$1 AND ($2::boolean OR customer_visible) ORDER BY created_at`, [id, admin]),
    client.query(`SELECT id,document_number,kind,subject_type,subject_id,title,version,status,file_sha256,file_size,page_count,issued_at
                    FROM generated_documents
                   WHERE status='issued' AND owner_user_id=$2
                     AND ((subject_type='import_order' AND subject_id=$1)
                       OR (subject_type='import_payment' AND subject_id IN
                         (SELECT id FROM import_payments WHERE import_order_id=$1)))
                   ORDER BY generated_at DESC`, [id, rows[0].buyer_id]),
    client.query(`SELECT * FROM import_order_events WHERE import_order_id=$1 AND ($2::boolean OR customer_visible) ORDER BY created_at`, [id, admin]),
    client.query(`SELECT id,version,terms_snapshot,issued_at,accepted_at FROM import_agreements WHERE import_order_id=$1 AND superseded_at IS NULL ORDER BY version DESC`, [id]),
    client.query(`SELECT * FROM import_shipments WHERE import_order_id=$1`, [id]),
  ]);
  const order = { ...rows[0], payments: payments.rows, documents: documents.rows, generated_documents: generatedDocuments.rows, events: events.rows, agreements: agreements.rows, shipment: shipment.rows[0] || null };
  if (!admin) {
    // Sawa's own operating detail, never the buyer's business: what they were
    // quoted, not what it cost Sawa to deliver, and not the desk's own notes
    // on the order. `internal_notes` was already spread here unguarded before
    // actual_cost_rwf existed — closing both in the same place rather than
    // shipping the new columns into the same hole.
    delete order.internal_notes;
    delete order.actual_cost_rwf;
    delete order.cost_note;
    delete order.cost_recorded_at;
    delete order.cost_recorded_by;
  }
  return order;
}

function documentFailure(res, error) {
  if (!(error instanceof DocumentError)) log.error('import document error', { error: error.message });
  res.status(error.status || 500).json({ error: error instanceof DocumentError ? error.message : 'Could not prepare the document' });
}

async function streamGenerated(res, req, document) {
  const ready = await downloadableDocument(document);
  const disposition = req.query.download === '0' ? 'inline' : 'attachment';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${ready.filename}"`);
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Document-Number', ready.document_number);
  res.setHeader('X-Document-SHA256', ready.file_sha256);
  if (ready.file_size) res.setHeader('Content-Length', String(ready.file_size));
  const stream = fs.createReadStream(ready.absolutePath);
  stream.on('error', () => res.headersSent ? res.destroy() : res.status(500).json({ error: 'Could not read the document' }));
  stream.pipe(res);
}

// Buyer creates an enquiry. This is deliberately payment-free: finance only
// becomes due after an admin issues a versioned quotation and agreement.
router.post('/', requireAuth, async (req, res) => {
  const origin = clean(req.body.origin_country, 80);
  const make = clean(req.body.make, 80);
  const model = clean(req.body.model, 80);
  const year = req.body.year ? Number(req.body.year) : null;
  if (!ORIGINS.has(origin) || !make || !model || (year && (year < 1980 || year > new Date().getFullYear() + 1))) {
    return res.status(400).json({ error: 'A supported origin, make, model and valid year are required' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const ref = orderRef();
      const { rows } = await client.query(
        `INSERT INTO import_orders
          (order_ref,buyer_id,origin_country,make,model,year,supplier_reference,specification,customer_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [ref, req.user.id, origin, make, model, year,
          clean(req.body.supplier_reference, 500) || null,
          req.body.specification && typeof req.body.specification === 'object' ? req.body.specification : {},
          clean(req.body.customer_notes, 2000) || null]
      );
      await client.query(
        `INSERT INTO import_order_events (import_order_id,actor_id,event_type,to_status,summary)
         VALUES ($1,$2,'enquiry_created','enquiry','Import request received')`, [rows[0].id, req.user.id]
      );
      return rows[0];
    });
    res.status(201).json(result);
  } catch (err) {
    log.error('create import enquiry error', { error: err.message });
    res.status(500).json({ error: 'Could not create import request' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    // Named columns, not `*`: internal_notes and (since migration 0039)
    // actual_cost_rwf/cost_note/cost_recorded_at/cost_recorded_by are Sawa's
    // own operating detail, not the buyer's business — see fullOrder()'s
    // strip list, which this route bypasses by not going through fullOrder.
    const { rows } = await pool.query(
      `SELECT id, order_ref, buyer_id, assigned_admin_id, status, origin_country, make, model, year,
              vin, supplier_reference, specification, exchange_rate, quote_expires_at, delivery_estimate,
              customer_notes, agreement_accepted_at, created_at, updated_at,
              COALESCE(quoted_total_rwf,0)::bigint AS quoted_total_rwf
       FROM import_orders WHERE buyer_id=$1 ORDER BY created_at DESC`, [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Could not load import orders' }); }
});

// Browsing starts at the brand, not at a flat list of vehicles: somebody
// importing a car knows they want a Hyundai long before they know which
// Hyundai. This returns every marque with how many models sit under it, so the
// brand grid can be drawn in one request and no brand is a dead end.
router.get('/catalog/makes', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT make,
              origin_country,
              COUNT(*)::int                                        AS model_count,
              COUNT(typical_fob_usd)::int                          AS priced_count,
              ARRAY_AGG(DISTINCT body_type ORDER BY body_type)     AS body_types
         FROM global_import_catalog
        WHERE active = TRUE
        GROUP BY make, origin_country
        ORDER BY make ASC`
    );
    res.json({ items: rows, count: rows.length });
  } catch (err) {
    log.error('catalog makes load error', { error: err.message });
    res.status(500).json({ error: 'Could not load import brands' });
  }
});

router.get('/catalog', async (req, res) => {
  const q = clean(req.query.q || req.query.query, 80);
  const make = clean(req.query.make, 80);
  const origin = clean(req.query.origin || req.query.origin_country, 80);
  const bodyType = clean(req.query.body_type, 50);
  // 250, not 100. The cap exists to stop an unbounded scan, but a buyer who
  // taps a brand is asking for that brand's whole range -- Toyota alone is 23
  // models -- and a silently truncated model list is the same failure as an
  // incomplete catalogue. The largest marque must fit in one page.
  const limit = Math.min(Math.max(Number(req.query.limit) || 250, 1), 250);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const params = [];
  const conditions = ['active = TRUE'];

  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const idx = params.length;
    conditions.push(`(lower(make) LIKE $${idx} OR lower(model) LIKE $${idx} OR lower(COALESCE(trim, '')) LIKE $${idx} OR lower(body_type) LIKE $${idx} OR lower(origin_country) LIKE $${idx} OR EXISTS (SELECT 1 FROM unnest(fuel_types) f WHERE lower(f) LIKE $${idx}))`);
  }

  if (make) {
    params.push(make.toLowerCase());
    conditions.push(`lower(make) = $${params.length}`);
  }

  if (origin) {
    params.push(origin.toLowerCase());
    conditions.push(`lower(origin_country) = $${params.length}`);
  }

  if (bodyType) {
    params.push(bodyType.toLowerCase());
    conditions.push(`lower(body_type) = $${params.length}`);
  }

  const fuel = clean(req.query.fuel || req.query.fuel_type, 30);
  if (fuel) {
    params.push(fuel.toLowerCase());
    conditions.push(`EXISTS (SELECT 1 FROM unnest(fuel_types) f WHERE lower(f) = $${params.length})`);
  }

  params.push(limit);
  params.push(offset);

  try {
    const { rows } = await pool.query(
      `SELECT id, make, model, body_type, fuel_types, condition, trim,
              engine_cc, transmission, drive_side, origin_country, origin_port,
              typical_fob_usd, typical_freight_usd, estimated_transit_days,
              images, render_url, highlights, description, display_order,
              image_credit_author, image_credit_license, image_credit_license_url, image_credit_source_url
         FROM global_import_catalog
        WHERE ${conditions.join(' AND ')}
        ORDER BY display_order ASC, make ASC, model ASC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ items: rows, count: rows.length });
  } catch (err) {
    log.error('catalog load error', { error: err.message });
    res.status(500).json({ error: 'Could not load global import catalog' });
  }
});

router.get('/catalog/:id', requireUuid('id'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, make, model, body_type, fuel_types, condition, trim,
              engine_cc, transmission, drive_side, origin_country, origin_port,
              typical_fob_usd, typical_freight_usd, estimated_transit_days,
              images, render_url, highlights, description, display_order,
              image_credit_author, image_credit_license, image_credit_license_url, image_credit_source_url
         FROM global_import_catalog
        WHERE id = $1 AND active = TRUE`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Vehicle model not found in global catalog' });
    res.json(rows[0]);
  } catch (err) {
    log.error('catalog detail load error', { error: err.message });
    res.status(500).json({ error: 'Could not load global vehicle details' });
  }
});

// GET /escrow-guarantee is gone, deliberately.
//
// It advertised an "Inzozi Motors Vehicle Import Escrow" account at named
// Rwandan banks, a "Regulated Tripartite Custody Escrow", and a "zero-risk
// handover ... full remedy or escrow refund". Sawa is not a party to any deal
// and holds no funds -- see the top of CLAUDE.md and the retired-features list
// -- so the endpoint described an arrangement that does not exist, while
// naming real banks and the word "regulated" next to a guarantee somebody
// could be expected to honour. Import payment milestones remain what they
// always were: the buyer pays the exporter, and an admin reviews the uploaded
// transfer proof.

// Resolve studio renders for catalogue models.
//
// Deliberately a button an admin presses rather than something that runs on a
// timer or on read. It costs one upstream request per model and the answer
// changes about as often as a manufacturer launches a car, so re-asking on a
// schedule would spend the licence on re-confirming what we already know.
//
// Safe to run repeatedly: it only asks about rows that have never been asked
// or that failed for a transient reason, so a run interrupted halfway is
// resumed by running it again rather than started over.
router.post('/admin/catalog/resolve-renders', requireAdmin, async (req, res) => {
  if (!rendersEnabled()) {
    return res.status(503).json({
      error: 'Vehicle renders are not configured',
      detail: 'Set VEHICLE_RENDER_CUSTOMER to a commercial key. Without one the '
            + 'library returns watermarked demo images, so this stays switched off.',
    });
  }

  // Bounded per call. 233 sequential upstream requests would hold an admin
  // request open for minutes and time out behind the proxy; the admin runs it
  // again to continue, and the status column makes that resumable.
  const limit = Math.min(Math.max(Number(req.body?.limit) || 60, 1), 120);
  const retryFailures = req.body?.retry_failures !== false;
  const statuses = retryFailures
    ? ['pending', 'unreachable', 'timeout']
    : ['pending'];

  try {
    const { rows } = await pool.query(
      `SELECT id, make, model
         FROM global_import_catalog
        WHERE active = TRUE AND render_status = ANY($1)
        ORDER BY make, display_order
        LIMIT $2`,
      [statuses, limit]
    );

    const counts = { found: 0, no_match: 0, unreachable: 0, timeout: 0 };
    const origin = publicApiOrigin(req);

    for (const row of rows) {
      const result = await fetchRender(row.make, row.model);
      let url = null;
      let status = result.status;

      if (status === 'found') {
        // Store OUR copy. The vendor URL carries the commercial key and this
        // catalogue is public, so the vendor URL must never reach a row.
        try {
          const ext = (result.contentType.split('/')[1] || 'webp').replace(/[^a-z0-9]/gi, '');
          const key = `renders/${renderSlug(row.make)}-${renderSlug(row.model)}.${ext}`;
          await storage.save(result.buffer, key);
          url = `${origin}${storage.url(key)}`;
        } catch (err) {
          // Storing failed, so there is no image to point at. Transient by
          // nature (a full disk, a permission), so it is retried rather than
          // recorded as the library not having the model.
          log.warn('could not store render', { make: row.make, model: row.model, error: err.message });
          status = 'unreachable';
        }
      }

      counts[status] = (counts[status] || 0) + 1;
      await pool.query(
        `UPDATE global_import_catalog
            SET render_url = $2, render_status = $3, render_checked_at = NOW(), updated_at = NOW()
          WHERE id = $1`,
        [row.id, url, status]
      );
    }

    const { rows: [tally] } = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE render_status = 'found')::int    AS resolved,
              COUNT(*) FILTER (WHERE render_status = 'pending')::int  AS remaining,
              COUNT(*)::int                                           AS total
         FROM global_import_catalog WHERE active = TRUE`
    );

    log.info('catalog renders resolved', { checked: rows.length, ...counts });
    res.json({ checked: rows.length, ...counts, ...tally });
  } catch (err) {
    log.error('catalog render resolve error', { error: err.message });
    res.status(500).json({ error: 'Could not resolve vehicle renders' });
  }
});

// ── The photo review queue ───────────────────────────────────────────────────
//
// Three routes, one shape: find candidates, list what needs a decision,
// record the decision. Nothing here writes to `images` except the approve
// route, and that only after a human looked at the specific picture.

// Find candidate photographs for models that have none yet.
//
// Bounded and resumable, the same shape as resolve-renders: Commons is a
// shared public service, not ours to hammer, so this runs in small batches
// with a short pause between requests rather than firing 233 at once. A run
// interrupted halfway is continued by calling it again -- it only asks about
// rows still at image_status='pending'.
router.post('/admin/catalog/find-images', requireAdmin, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.body?.limit) || 25, 1), 50);

  try {
    const { rows } = await pool.query(
      `SELECT id, make, model
         FROM global_import_catalog
        WHERE active = TRUE AND image_status = 'pending' AND cardinality(images) = 0
        ORDER BY make, display_order
        LIMIT $1`,
      [limit]
    );

    let withCandidates = 0;
    let withNone = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const candidates = await findCandidates(row.make, row.model, { limit: 3 });
      if (candidates.length) withCandidates += 1; else withNone += 1;

      await withTransaction(async (client) => {
        for (const c of candidates) {
          await client.query(
            `INSERT INTO catalog_image_candidates
               (catalog_id, source, image_url, thumb_url, page_url, title, author, license_name, license_url, width, height)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [row.id, c.source, c.image_url, c.thumb_url, c.page_url, c.title, c.author, c.license_name, c.license_url, c.width, c.height]
          );
        }
        // 'searched' whether or not anything was found: a model with zero
        // candidates still needs a human decision (skip, or upload one), and
        // must not be re-queried on every call after this one.
        await client.query(
          `UPDATE global_import_catalog SET image_status = 'searched', updated_at = NOW() WHERE id = $1`,
          [row.id]
        );
      });

      // A short, polite pause between requests -- Commons is a shared public
      // service the whole web relies on, not a dedicated resource of ours.
      if (i < rows.length - 1) await new Promise((r) => setTimeout(r, 350));
    }

    const { rows: [tally] } = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE image_status = 'searched')::int AS awaiting_review,
              COUNT(*) FILTER (WHERE image_status = 'pending')::int  AS not_yet_searched,
              COUNT(*) FILTER (WHERE image_status = 'approved')::int AS approved,
              COUNT(*) FILTER (WHERE image_status = 'skipped')::int  AS skipped,
              COUNT(*)::int                                          AS total
         FROM global_import_catalog WHERE active = TRUE`
    );

    log.info('catalog image search', { checked: rows.length, withCandidates, withNone });
    res.json({ checked: rows.length, with_candidates: withCandidates, with_none: withNone, ...tally });
  } catch (err) {
    log.error('catalog image search error', { error: err.message });
    res.status(500).json({ error: 'Could not search for catalogue photographs' });
  }
});

// The queue itself: every model awaiting a decision, each with its candidates.
router.get('/admin/catalog/image-queue', requireAdmin, async (req, res) => {
  try {
    const { rows: models } = await pool.query(
      `SELECT id, make, model, body_type, origin_country, image_status
         FROM global_import_catalog
        WHERE active = TRUE AND image_status = 'searched'
        ORDER BY make, display_order`
    );
    const ids = models.map((m) => m.id);
    const { rows: candidates } = ids.length
      ? await pool.query(
          `SELECT id, catalog_id, image_url, thumb_url, page_url, title, author, license_name, license_url
             FROM catalog_image_candidates
            WHERE catalog_id = ANY($1) AND status = 'pending'
            ORDER BY created_at ASC`,
          [ids]
        )
      : { rows: [] };

    const byModel = new Map(models.map((m) => [m.id, { ...m, candidates: [] }]));
    for (const c of candidates) byModel.get(c.catalog_id)?.candidates.push(c);

    const { rows: [tally] } = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE image_status = 'searched')::int AS awaiting_review,
              COUNT(*) FILTER (WHERE image_status = 'pending')::int  AS not_yet_searched,
              COUNT(*) FILTER (WHERE image_status = 'approved')::int AS approved,
              COUNT(*) FILTER (WHERE image_status = 'skipped')::int  AS skipped,
              COUNT(*)::int                                          AS total
         FROM global_import_catalog WHERE active = TRUE`
    );

    res.json({ items: [...byModel.values()], ...tally });
  } catch (err) {
    log.error('image queue load error', { error: err.message });
    res.status(500).json({ error: 'Could not load the photo review queue' });
  }
});

// A human confirms one candidate. This is the only place a Commons URL
// reaches `images` -- the one row a buyer's phone will ever request.
router.post('/admin/catalog/:id/approve-image', requireAdmin, requireUuid('id'), async (req, res) => {
  const candidateId = clean(req.body?.candidate_id, 100);
  if (!candidateId) return res.status(400).json({ error: 'candidate_id is required' });

  try {
    const result = await withTransaction(async (client) => {
      const { rows: [candidate] } = await client.query(
        `SELECT * FROM catalog_image_candidates WHERE id = $1 AND catalog_id = $2 AND status = 'pending' FOR UPDATE`,
        [candidateId, req.params.id]
      );
      if (!candidate) return null;

      const { rows: [updated] } = await client.query(
        `UPDATE global_import_catalog
            SET images = ARRAY[$2::text],
                image_status = 'approved',
                image_credit_author = $3,
                image_credit_license = $4,
                image_credit_license_url = $5,
                image_credit_source_url = $6,
                updated_at = NOW()
          WHERE id = $1
          RETURNING id, make, model, images, image_status, image_credit_author, image_credit_license, image_credit_license_url, image_credit_source_url`,
        [req.params.id, candidate.image_url, candidate.author, candidate.license_name, candidate.license_url, candidate.page_url]
      );

      await client.query(`UPDATE catalog_image_candidates SET status = 'approved' WHERE id = $1`, [candidateId]);
      await client.query(
        `UPDATE catalog_image_candidates SET status = 'rejected' WHERE catalog_id = $1 AND id != $2 AND status = 'pending'`,
        [req.params.id, candidateId]
      );

      return updated;
    });

    if (!result) return res.status(404).json({ error: 'That candidate is no longer available for this model' });
    res.json(result);
  } catch (err) {
    log.error('approve image error', { error: err.message });
    res.status(500).json({ error: 'Could not approve that photograph' });
  }
});

// No candidate was right (or none were found). Leaves the lettermark, which
// is already a finished-looking state -- an operator can still upload their
// own photo of the actual unit later, which always wins in the UI regardless
// of this status.
router.post('/admin/catalog/:id/skip-image', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const { rows: [updated] } = await pool.query(
      `UPDATE global_import_catalog SET image_status = 'skipped', updated_at = NOW()
        WHERE id = $1 AND active = TRUE
        RETURNING id, make, model, image_status`,
      [req.params.id]
    );
    if (!updated) return res.status(404).json({ error: 'Vehicle model not found in global catalog' });
    await pool.query(`UPDATE catalog_image_candidates SET status = 'rejected' WHERE catalog_id = $1 AND status = 'pending'`, [req.params.id]);
    res.json(updated);
  } catch (err) {
    log.error('skip image error', { error: err.message });
    res.status(500).json({ error: 'Could not update that model' });
  }
});

router.get('/admin/all', requireAdmin, async (req, res) => {
  const status = clean(req.query.status, 40);
  try {
    const params = [];
    const where = status ? (params.push(status), `WHERE o.status=$1`) : '';
    const { rows } = await pool.query(
      `SELECT o.*, u.name AS buyer_name, u.email AS buyer_email,
        COALESCE((SELECT SUM(amount_rwf) FROM import_payments p WHERE p.import_order_id=o.id AND p.status='verified'),0)::bigint AS paid_rwf
       FROM import_orders o JOIN users u ON u.id=o.buyer_id ${where}
       ORDER BY o.updated_at DESC LIMIT 200`, params
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Could not load import pipeline' }); }
});

router.get('/:id', requireAuth, requireUuid('id'), async (req, res) => {
  try {
    const order = await fullOrder(pool, req.params.id, req.user);
    if (!order) return res.status(404).json({ error: 'Import order not found' });
    res.json(order);
  } catch (err) { res.status(500).json({ error: 'Could not load import order' }); }
});

router.post('/:id/quote', requireAdmin, requireUuid('id'), async (req, res) => {
  const total = Number(req.body.quoted_total_rwf);
  if (!Number.isSafeInteger(total) || total < 100000) return res.status(400).json({ error: 'A valid total in RWF is required' });
  const lineItems = Array.isArray(req.body.line_items) ? req.body.line_items.map((item) => ({
    label: clean(item?.label, 180), amount_rwf: Number(item?.amount_rwf),
  })) : [];
  if (lineItems.some((item) => !item.label || !Number.isSafeInteger(item.amount_rwf) || item.amount_rwf < 0)) return res.status(400).json({ error: 'Every quotation line needs a label and exact RWF amount' });
  if (lineItems.length && lineItems.reduce((sum, item) => sum + item.amount_rwf, 0) !== total) return res.status(400).json({ error: 'Quotation lines must add up to the complete landed price' });
  try {
    const result = await withTransaction(async (client) => {
      const current = await client.query(`SELECT * FROM import_orders WHERE id=$1 FOR UPDATE`, [req.params.id]);
      if (!current.rows.length) return null;
      if (!['enquiry','quoted'].includes(current.rows[0].status)) throw Object.assign(new Error('Quote cannot be changed at this stage'), { status: 409 });
      const first = Math.floor(total / 2);
      const final = total - first;
      const { rows } = await client.query(
        `UPDATE import_orders SET quoted_total_rwf=$1,exchange_rate=$2,quote_expires_at=$3,
          delivery_estimate=$4,status='quoted',assigned_admin_id=$5,updated_at=NOW() WHERE id=$6 RETURNING *`,
        [total, req.body.exchange_rate || null, req.body.quote_expires_at || null,
          clean(req.body.delivery_estimate, 200) || null, req.user.id, req.params.id]
      );
      await client.query(`DELETE FROM import_payments WHERE import_order_id=$1 AND status='due'`, [req.params.id]);
      await client.query(
        `INSERT INTO import_payments (import_order_id,milestone,amount_rwf) VALUES ($1,'initial_50',$2),($1,'final_50',$3)`,
        [req.params.id, first, final]
      );
      await client.query(
        `INSERT INTO import_order_events (import_order_id,actor_id,event_type,from_status,to_status,summary,metadata)
         VALUES ($1,$2,'quote_issued',$3,'quoted','Quotation issued',jsonb_build_object('total_rwf',$4::bigint))`,
        [req.params.id, req.user.id, current.rows[0].status, total]
      );
      const version = await client.query(`SELECT COALESCE(MAX(version),0)+1 AS next FROM import_agreements WHERE import_order_id=$1`, [req.params.id]);
      await client.query(`UPDATE import_agreements SET superseded_at=NOW() WHERE import_order_id=$1 AND superseded_at IS NULL`, [req.params.id]);
      await client.query(
        `INSERT INTO import_agreements (import_order_id,version,terms_snapshot,issued_by)
         VALUES ($1,$2,$3,$4)`,
        [req.params.id, version.rows[0].next, {
          quoted_total_rwf: total,
          initial_payment_rwf: first,
          final_payment_rwf: final,
          exchange_rate: req.body.exchange_rate || null,
          quote_expires_at: req.body.quote_expires_at || null,
          delivery_estimate: clean(req.body.delivery_estimate, 200) || null,
          line_items: lineItems,
          terms: clean(req.body.terms, 10000) || '50% is due after agreement acceptance. The remaining 50% is due after arrival and Kigali inspection, before handover.',
        }, req.user.id]
      );
      return rows[0];
    });
    if (!result) return res.status(404).json({ error: 'Import order not found' });
    await recordAdminAction(pool, { actorId: req.user.id, action: 'import.quote', targetType: 'import_order', targetId: req.params.id, summary: `Issued import quotation ${result.order_ref}`, metadata: { total_rwf: total } });
    const buyer = await pool.query(`SELECT u.id,u.name,u.email FROM users u JOIN import_orders o ON o.buyer_id=u.id WHERE o.id=$1`, [req.params.id]);
    if (buyer.rows[0]) {
      await notifyUser(pool, { user_id: buyer.rows[0].id, type: 'import_update', title: 'Your import quotation is ready', body: `${result.order_ref}: review the agreement and 50/50 payment schedule.`, meta: { importOrderId: req.params.id } });
      sendImportUpdate(buyer.rows[0].email, buyer.rows[0].name, result.order_ref, 'Your import quotation is ready', 'Review the verified landed price and agreement before making the first 50% payment.');
    }
    res.json(result);
  } catch (err) { res.status(err.status || 500).json({ error: err.message || 'Could not issue quote' }); }
});

// PATCH /:id/cost — Sawa's own landed cost, kept apart from quoted_total_rwf.
//
// No status restriction, unlike the quote route: cost information arrives
// piecemeal across the whole pipeline (a deposit paid, shipping booked,
// duty finally assessed at customs), and an admin correcting an earlier
// estimate later is a normal part of that, not an error to void and
// re-record. The trail lives in import_order_events, not a reversal
// column — this is Sawa's own internal figure, never money collected from
// a counterparty, so there is no proof-of-payment to review or void.
router.patch('/:id/cost', requireAdmin, requireUuid('id'), async (req, res) => {
  const cost = Number(req.body.actual_cost_rwf);
  if (!Number.isSafeInteger(cost) || cost < 0) {
    return res.status(400).json({ error: 'Enter the actual cost in RWF, zero or more' });
  }
  const note = clean(req.body.note, 2000);
  try {
    const result = await withTransaction(async (client) => {
      const current = await client.query(`SELECT actual_cost_rwf FROM import_orders WHERE id=$1 FOR UPDATE`, [req.params.id]);
      if (!current.rows.length) return null;
      const { rows } = await client.query(
        `UPDATE import_orders
            SET actual_cost_rwf=$1, cost_note=$2, cost_recorded_at=NOW(), cost_recorded_by=$3, updated_at=NOW()
          WHERE id=$4 RETURNING *`,
        [cost, note || null, req.user.id, req.params.id]
      );
      // customer_visible=FALSE: this table defaults it TRUE, and Sawa's own
      // cost is never the buyer's business — see fullOrder()'s strip list.
      await client.query(
        `INSERT INTO import_order_events (import_order_id,actor_id,event_type,summary,metadata,customer_visible)
         VALUES ($1,$2,'cost_recorded','Actual cost recorded',jsonb_build_object('previous_rwf',$3::bigint,'current_rwf',$4::bigint),FALSE)`,
        [req.params.id, req.user.id, current.rows[0].actual_cost_rwf, cost]
      );
      return rows[0];
    });
    if (!result) return res.status(404).json({ error: 'Import order not found' });
    await recordAdminAction(pool, {
      actorId: req.user.id, action: 'import.cost_recorded', targetType: 'import_order', targetId: req.params.id,
      summary: `Recorded actual cost on ${result.order_ref}`,
      metadata: { actual_cost_rwf: cost, quoted_total_rwf: result.quoted_total_rwf },
    });
    res.json(result);
  } catch (err) { res.status(err.status || 500).json({ error: err.message || 'Could not record the cost' }); }
});

router.post('/:id/accept-agreement', requireAuth, requireUuid('id'), async (req, res) => {
  try {
    const result = await withTransaction(async (client) => {
      const order = await client.query(`SELECT * FROM import_orders WHERE id=$1 AND buyer_id=$2 FOR UPDATE`, [req.params.id, req.user.id]);
      if (!order.rows.length) return null;
      if (!['quoted','agreement_pending'].includes(order.rows[0].status)) throw Object.assign(new Error('This agreement is not awaiting acceptance'), { status: 409 });
      const agreement = await client.query(`SELECT * FROM import_agreements WHERE import_order_id=$1 AND superseded_at IS NULL AND accepted_at IS NULL ORDER BY version DESC LIMIT 1 FOR UPDATE`, [req.params.id]);
      if (!agreement.rows.length) throw Object.assign(new Error('No active agreement is available'), { status: 409 });
      await client.query(`UPDATE import_agreements SET accepted_by=$1,accepted_at=NOW(),acceptance_ip=$2 WHERE id=$3`, [req.user.id, req.ip, agreement.rows[0].id]);
      const updated = await client.query(`UPDATE import_orders SET status='deposit_due',agreement_accepted_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`, [req.params.id]);
      await client.query(`INSERT INTO import_order_events (import_order_id,actor_id,event_type,from_status,to_status,summary) VALUES ($1,$2,'agreement_accepted',$3,'deposit_due','Import agreement accepted; first 50% is now due')`, [req.params.id, req.user.id, order.rows[0].status]);
      return updated.rows[0];
    });
    if (!result) return res.status(404).json({ error: 'Import order not found' });
    res.json(result);
  } catch (err) { res.status(err.status || 500).json({ error: err.message || 'Could not accept agreement' }); }
});

router.post('/:id/payments/:paymentId/proof', requireAuth, requireUuid('id'), requireUuid('paymentId'), uploadImportDocs.single('proof'), verifyImportDocument, async (req, res) => {
  if (!req.file || !clean(req.body.bank_reference, 120)) return res.status(400).json({ error: 'Payment proof and bank reference are required' });
  try {
    const { rows } = await pool.query(
      `UPDATE import_payments p SET status='submitted',proof_url=$1,bank_reference=$2,submitted_at=NOW(),rejection_reason=NULL
       FROM import_orders o WHERE p.id=$3 AND p.import_order_id=o.id AND o.id=$4 AND o.buyer_id=$5 AND p.status IN ('due','rejected') RETURNING p.*`,
      [`imports/${req.params.id}/${req.file.filename}`, clean(req.body.bank_reference, 120), req.params.paymentId, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(409).json({ error: 'This payment is not awaiting proof' });
    await pool.query(`UPDATE import_orders SET status=CASE WHEN $1='initial_50' THEN 'deposit_review' ELSE 'balance_review' END,updated_at=NOW() WHERE id=$2`, [rows[0].milestone, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Could not submit payment proof' }); }
});

router.post('/:id/documents', requireAdmin, requireUuid('id'), uploadImportDocs.single('document'), verifyImportDocument, async (req, res) => {
  const kind = clean(req.body.kind, 60); const label = clean(req.body.label, 160);
  if (!req.file || !kind || !label) return res.status(400).json({ error: 'Document, kind and label are required' });
  try {
    const { rows } = await pool.query(`INSERT INTO import_documents (import_order_id,kind,label,file_url,customer_visible,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [req.params.id, kind, label, `imports/${req.params.id}/${req.file.filename}`, req.body.customer_visible === 'true' || req.body.customer_visible === true, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Could not attach document' }); }
});

router.get('/documents/:documentId/file', requireAuth, requireUuid('documentId'), async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT d.file_url,d.label,d.customer_visible,o.buyer_id FROM import_documents d JOIN import_orders o ON o.id=d.import_order_id WHERE d.id=$1`, [req.params.documentId]);
    if (!rows.length || (req.user.role !== 'admin' && (!rows[0].customer_visible || rows[0].buyer_id !== req.user.id))) return res.status(404).json({ error: 'Document not found' });
    res.set('Cache-Control', 'no-store, private'); res.set('Referrer-Policy', 'no-referrer');
    res.sendFile(path.join(UPLOAD_DIR, rows[0].file_url));
  } catch (err) { res.status(500).json({ error: 'Could not open document' }); }
});

// Generate the three documents which must agree before the buyer pays. They
// all use the same immutable agreement snapshot and version.
router.post('/:id/document-pack', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const documents = await issueImportPack(req.params.id, req.user.id);
    for (const document of documents) {
      await recordAdminAction(pool, {
        actorId:req.user.id, action:`document.${document.kind}.issued`, targetType:'import_order', targetId:req.params.id,
        summary:`Issued ${document.document_number}`, metadata:{ document_id:document.id,document_number:document.document_number,version:document.version,sha256:document.file_sha256 },
      });
    }
    res.json({ documents });
  } catch (error) { documentFailure(res,error); }
});

router.post('/:id/payments/:paymentId/receipt', requireAdmin, requireUuid('id'), requireUuid('paymentId'), async (req, res) => {
  try {
    const document=await issueImportReceipt(req.params.id,req.params.paymentId,req.user.id);
    await recordAdminAction(pool,{ actorId:req.user.id,action:'document.import_payment_receipt.issued',targetType:'import_payment',targetId:req.params.paymentId,summary:`Issued ${document.document_number}`,metadata:{ order_id:req.params.id,document_id:document.id,document_number:document.document_number,sha256:document.file_sha256 } });
    res.json(document);
  } catch(error){ documentFailure(res,error); }
});

const PACK_KINDS=new Set(['import_quotation','import_agreement','import_deposit_invoice']);
router.get('/:id/generated-documents/:kind/file', requireAuth, requireUuid('id'), async (req,res)=>{
  try{
    if(!PACK_KINDS.has(req.params.kind)) throw new DocumentError('Document not found',404);
    const order=await pool.query(`SELECT buyer_id FROM import_orders WHERE id=$1`,[req.params.id]);
    if(!order.rows.length || (req.user.role!=='admin' && order.rows[0].buyer_id!==req.user.id)) throw new DocumentError('Document not found',404);
    const document=await documentForSubject(req.params.kind,'import_order',req.params.id);
    await recordAdminAction(pool,{ actorId:req.user.id,action:`document.${req.params.kind}.downloaded`,targetType:'import_order',targetId:req.params.id,summary:`Downloaded ${document.document_number}`,metadata:{ document_id:document.id,document_number:document.document_number } });
    await streamGenerated(res,req,document);
  }catch(error){ documentFailure(res,error); }
});

router.get('/:id/payments/:paymentId/receipt/file', requireAuth, requireUuid('id'), requireUuid('paymentId'), async(req,res)=>{
  try{
    const access=await pool.query(`SELECT o.buyer_id FROM import_payments p JOIN import_orders o ON o.id=p.import_order_id WHERE p.id=$1 AND o.id=$2`,[req.params.paymentId,req.params.id]);
    if(!access.rows.length || (req.user.role!=='admin' && access.rows[0].buyer_id!==req.user.id)) throw new DocumentError('Receipt not found',404);
    const document=await documentForSubject('import_payment_receipt','import_payment',req.params.paymentId);
    await recordAdminAction(pool,{ actorId:req.user.id,action:'document.import_payment_receipt.downloaded',targetType:'import_payment',targetId:req.params.paymentId,summary:`Downloaded ${document.document_number}`,metadata:{ order_id:req.params.id,document_id:document.id,document_number:document.document_number } });
    await streamGenerated(res,req,document);
  }catch(error){ documentFailure(res,error); }
});

router.patch('/:id/shipment', requireAdmin, requireUuid('id'), async (req, res) => {
  const fields = ['supplier_name','supplier_country','carrier','booking_reference','bill_of_lading','vessel_or_flight','departure_port','arrival_port','departed_at','estimated_arrival','arrived_at','last_location'];
  const values = fields.map((f) => req.body[f] || null);
  try {
    const { rows } = await pool.query(`
      INSERT INTO import_shipments (
        import_order_id, supplier_name, supplier_country, carrier, booking_reference,
        bill_of_lading, vessel_or_flight, departure_port, arrival_port, departed_at,
        estimated_arrival, arrived_at, last_location, updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (import_order_id) DO UPDATE SET
        supplier_name=COALESCE(EXCLUDED.supplier_name,import_shipments.supplier_name),
        supplier_country=COALESCE(EXCLUDED.supplier_country,import_shipments.supplier_country),
        carrier=COALESCE(EXCLUDED.carrier,import_shipments.carrier),
        booking_reference=COALESCE(EXCLUDED.booking_reference,import_shipments.booking_reference),
        bill_of_lading=COALESCE(EXCLUDED.bill_of_lading,import_shipments.bill_of_lading),
        vessel_or_flight=COALESCE(EXCLUDED.vessel_or_flight,import_shipments.vessel_or_flight),
        departure_port=COALESCE(EXCLUDED.departure_port,import_shipments.departure_port),
        arrival_port=COALESCE(EXCLUDED.arrival_port,import_shipments.arrival_port),
        departed_at=COALESCE(EXCLUDED.departed_at,import_shipments.departed_at),
        estimated_arrival=COALESCE(EXCLUDED.estimated_arrival,import_shipments.estimated_arrival),
        arrived_at=COALESCE(EXCLUDED.arrived_at,import_shipments.arrived_at),
        last_location=COALESCE(EXCLUDED.last_location,import_shipments.last_location),
        updated_by=EXCLUDED.updated_by,
        updated_at=NOW()
      RETURNING *
    `, [req.params.id, ...values, req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Could not update shipment' }); }
});

router.patch('/:id/status', requireAdmin, requireUuid('id'), async (req, res) => {
  const next = clean(req.body.status, 40);
  try {
    const result = await withTransaction(async (client) => {
      const current = await client.query(`SELECT * FROM import_orders WHERE id=$1 FOR UPDATE`, [req.params.id]);
      if (!current.rows.length) return null;
      const from = current.rows[0].status;
      if (!(STATUS_TRANSITIONS[from] || []).includes(next)) throw Object.assign(new Error(`Cannot move an import from ${from} to ${next}`), { status: 409 });
      const { rows } = await client.query(`UPDATE import_orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *`, [next, req.params.id]);
      await client.query(
        `INSERT INTO import_order_events (import_order_id,actor_id,event_type,from_status,to_status,summary,customer_visible)
         VALUES ($1,$2,'status_changed',$3,$4,$5,$6)`,
        [req.params.id, req.user.id, from, next, clean(req.body.summary, 500) || `Order moved to ${next.replaceAll('_',' ')}`, req.body.customer_visible !== false]
      );
      return rows[0];
    });
    if (!result) return res.status(404).json({ error: 'Import order not found' });
    await recordAdminAction(pool, { actorId: req.user.id, action: 'import.status', targetType: 'import_order', targetId: req.params.id, summary: `Moved ${result.order_ref} to ${next}`, metadata: { status: next } });
    if (req.body.customer_visible !== false) {
      const buyer = await pool.query(`SELECT u.id,u.name,u.email FROM users u JOIN import_orders o ON o.buyer_id=u.id WHERE o.id=$1`, [req.params.id]);
      const detail = clean(req.body.summary, 500) || `Your vehicle import moved to ${next.replaceAll('_',' ')}.`;
      if (buyer.rows[0]) {
        await notifyUser(pool, { user_id: buyer.rows[0].id, type: 'import_update', title: 'Vehicle import updated', body: detail, meta: { importOrderId: req.params.id } });
        sendImportUpdate(buyer.rows[0].email, buyer.rows[0].name, result.order_ref, 'Vehicle import updated', detail);
      }
    }
    res.json(result);
  } catch (err) { res.status(err.status || 500).json({ error: err.message || 'Could not update import order' }); }
});

router.patch('/:id/payments/:paymentId', requireAdmin, requireUuid('id'), requireUuid('paymentId'), async (req, res) => {
  const status = clean(req.body.status, 20);
  if (!['reviewed','verified','rejected'].includes(status)) return res.status(400).json({ error: 'Payment may only be reviewed, verified or rejected' });
  if (status === 'rejected' && !clean(req.body.reason, 500)) return res.status(400).json({ error: 'A rejection reason is required' });
  try {
    const current = await pool.query(`SELECT * FROM import_payments WHERE id=$1 AND import_order_id=$2`, [req.params.paymentId, req.params.id]);
    if (!current.rows.length) return res.status(404).json({ error: 'Payment not found' });
    if (status === 'reviewed' && current.rows[0].status !== 'submitted') return res.status(409).json({ error: 'Only submitted proof can enter finance review' });
    // This installation has one super admin. Keep review and verification as
    // two explicit checkpoints, without making the workflow impossible by
    // requiring a second account that does not exist.
    if (status === 'verified' && current.rows[0].status !== 'reviewed') return res.status(409).json({ error: 'Complete finance review before final verification' });
    const { rows } = await pool.query(
      `UPDATE import_payments SET status=$1,
        reviewed_at=CASE WHEN $1='reviewed' THEN NOW() ELSE reviewed_at END,
        reviewed_by=CASE WHEN $1='reviewed' THEN $2 ELSE reviewed_by END,
        verified_at=CASE WHEN $1='verified' THEN NOW() ELSE NULL END,
        verified_by=CASE WHEN $1='verified' THEN $2 ELSE verified_by END,rejection_reason=$3
       WHERE id=$4 AND import_order_id=$5 RETURNING *`,
      [status, req.user.id, clean(req.body.reason, 500) || null, req.params.paymentId, req.params.id]
    );
    if (status === 'verified') {
      const next = rows[0].milestone === 'initial_50' ? 'ordered' : 'customs_clearance';
      await pool.query(`UPDATE import_orders SET status=$1,updated_at=NOW() WHERE id=$2`, [next, req.params.id]);
      const order = await pool.query(`SELECT buyer_id,order_ref FROM import_orders WHERE id=$1`, [req.params.id]);
      if (order.rows[0]) await notifyUser(pool, { user_id: order.rows[0].buyer_id, type: 'import_update', title: 'Import payment verified', body: `${order.rows[0].order_ref}: your ${rows[0].milestone === 'initial_50' ? 'first 50%' : 'final 50%'} payment is verified.`, meta: { importOrderId: req.params.id } });
    }
    await recordAdminAction(pool, { actorId: req.user.id, action: `import.payment.${status}`, targetType: 'import_payment', targetId: req.params.paymentId, summary: `${status} import payment`, metadata: { order_id: req.params.id } });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Could not review payment' }); }
});

module.exports = router;
