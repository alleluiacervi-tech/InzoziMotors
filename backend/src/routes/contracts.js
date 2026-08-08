const express = require('express');
const fs = require('fs');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const {
  buildPrefill, generateContract, getContractForDownload, latestForHandover,
  markSigned, supersedeContract, ContractError,
} = require('../lib/contract/service');

const router = express.Router();

// Admin-only, all of it. A sale contract carries both parties' full names, ID
// numbers, addresses and the price — it is at least as sensitive as the KYC
// scans, which is why nothing here is reachable by a buyer or seller, the PDF
// never becomes a static file (server.js blocks /uploads/contracts), and the
// download route streams it behind requireAdmin.

function fail(res, err, where) {
  if (err instanceof ContractError) {
    const body = { error: err.message };
    if (err.code) body.code = err.code;
    if (err.errors) body.errors = err.errors;
    if (err.contract) body.contract = err.contract;
    if (err.contract_number) body.contract_number = err.contract_number;
    return res.status(err.status).json(body);
  }
  log.error(`${where} error`, { error: err.message, stack: err.stack });
  return res.status(500).json({ error: 'Server error' });
}

// GET /contracts/handover/:id/prefill — everything known, plus what is missing.
router.get('/handover/:id/prefill', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    res.json(await buildPrefill(req.params.id));
  } catch (err) { fail(res, err, 'contract prefill'); }
});

// POST /contracts/handover/:id — validate, allocate a number, render, save.
// Refuses when a live contract already exists: replacing one is an explicit
// supersede, never a silent regeneration.
router.post('/handover/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const contract = await generateContract({
      handoverId: req.params.id,
      adminId: req.user.id,
      body: req.body || {},
    });
    res.status(201).json(contract);
  } catch (err) { fail(res, err, 'contract generate'); }
});

// GET /contracts/handover/:id — the current contract's metadata, if any.
router.get('/handover/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const contract = await latestForHandover(req.params.id);
    if (!contract) return res.status(404).json({ error: 'No contract for this handover yet' });
    res.json(contract);
  } catch (err) { fail(res, err, 'contract lookup'); }
});

// GET /contracts/:id/file — stream the stored PDF. Re-downloadable any number
// of times; never regenerates, so a signed copy can always be retrieved exactly
// as it was signed.
router.get('/:id/file', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const c = await getContractForDownload(req.params.id);
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${c.contract_number}.pdf"`);
    // Never let a proxy or browser cache a document with two people's ID numbers.
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // The stored hash is the integrity record; expose it for spot-checking.
    if (c.file_sha256) res.setHeader('X-Contract-SHA256', c.file_sha256);

    const stream = fs.createReadStream(c.absolutePath);
    stream.on('error', (err) => {
      log.error('contract stream error', { id: c.id, error: err.message });
      if (!res.headersSent) res.status(500).json({ error: 'Could not read the contract file' });
      else res.destroy();
    });
    stream.pipe(res);
  } catch (err) { fail(res, err, 'contract download'); }
});

// PATCH /contracts/:id/signed — record that the paper copy is signed. After
// this the contract is immutable; only a supersede can replace it.
router.patch('/:id/signed', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    res.json(await markSigned(req.params.id));
  } catch (err) { fail(res, err, 'contract sign'); }
});

// POST /contracts/:id/supersede — retire a contract so a corrected one can be
// generated. Requires a reason; the old number, row and file are all kept.
router.post('/:id/supersede', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const out = await supersedeContract({
      contractId: req.params.id,
      adminId: req.user.id,
      reason: req.body?.reason,
    });
    res.json(out);
  } catch (err) { fail(res, err, 'contract supersede'); }
});

// GET /contracts — the register. Every number ever issued, in order, including
// superseded and void rows, so the series can be audited for holes.
router.get('/', requireAdmin, async (req, res) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.contract_number, c.status, c.page_count, c.generated_at,
              c.issued_at, c.signed_at, c.draft_watermark, c.void_reason,
              c.handover_id, h.booking_id,
              c.snapshot->'vehicle'->>'make'  AS make,
              c.snapshot->'vehicle'->>'model' AS model,
              c.snapshot->'vehicle'->>'year'  AS year,
              c.snapshot->'seller'->>'legal_name' AS seller_name,
              c.snapshot->'buyer'->>'legal_name'  AS buyer_name,
              admin.name AS generated_by_name
         FROM contracts c
         JOIN handovers h ON h.id = c.handover_id
         LEFT JOIN users admin ON admin.id = c.generated_by
        ORDER BY c.contract_number DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(rows);
  } catch (err) { fail(res, err, 'contract register'); }
});

module.exports = router;
