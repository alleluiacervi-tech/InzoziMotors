const express = require('express');
const crypto = require('crypto');
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
  const [payments, documents, events, agreements, shipment] = await Promise.all([
    client.query(`SELECT * FROM import_payments WHERE import_order_id=$1 ORDER BY created_at`, [id]),
    client.query(`SELECT * FROM import_documents WHERE import_order_id=$1 AND ($2::boolean OR customer_visible) ORDER BY created_at`, [id, admin]),
    client.query(`SELECT * FROM import_order_events WHERE import_order_id=$1 AND ($2::boolean OR customer_visible) ORDER BY created_at`, [id, admin]),
    client.query(`SELECT id,version,terms_snapshot,issued_at,accepted_at FROM import_agreements WHERE import_order_id=$1 AND superseded_at IS NULL ORDER BY version DESC`, [id]),
    client.query(`SELECT * FROM import_shipments WHERE import_order_id=$1`, [id]),
  ]);
  return { ...rows[0], payments: payments.rows, documents: documents.rows, events: events.rows, agreements: agreements.rows, shipment: shipment.rows[0] || null };
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
    const { rows } = await pool.query(
      `SELECT *, COALESCE(quoted_total_rwf,0)::bigint AS quoted_total_rwf
       FROM import_orders WHERE buyer_id=$1 ORDER BY created_at DESC`, [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Could not load import orders' }); }
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
          line_items: Array.isArray(req.body.line_items) ? req.body.line_items : [],
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
    if (status === 'verified' && (current.rows[0].status !== 'reviewed' || current.rows[0].reviewed_by === req.user.id)) return res.status(409).json({ error: 'A different admin must complete the second approval' });
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
