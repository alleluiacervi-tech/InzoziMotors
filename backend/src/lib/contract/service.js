const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const pool = require('../../db');
const { log } = require('../log');
const { renderContractPDF } = require('./render');
const { validateContractData } = require('./validate');
const { toDateOnly, currencyInfo, formatLongDate } = require('./format');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads');
const CONTRACT_DIR = path.join(UPLOAD_DIR, 'contracts');

// Watermark every page until a lawyer has signed the clauses off. Opt-out is
// explicit and deliberate: the flag must be the string 'false'.
const DRAFT_MODE = process.env.CONTRACT_DRAFT_MODE !== 'false';

const COMPANY = {
  legal_name: process.env.COMPANY_LEGAL_NAME || 'Sawa Cars Ltd',
  tin: process.env.COMPANY_TIN || null,
  address: process.env.COMPANY_ADDRESS || 'Nyarutarama, Kigali, Rwanda',
  website: process.env.COMPANY_WEBSITE || 'sawacars.com',
  phone: process.env.COMPANY_PHONE || null,
};

const LIVE_STATUSES = ['draft', 'issued', 'signed'];

class ContractError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

// ─── prefill ─────────────────────────────────────────────────────────────────

const PREFILL_SQL = `
  SELECT h.id, h.booking_id, h.status, h.center, h.handover_on, h.handover_date,
         h.handover_time, h.contact_phone, h.agreed_price, h.currency, h.price_minor,
         h.deposit_minor, h.payment_method, h.balance_due_on, h.agreed_at, h.booked_at,
         c.id AS car_id, c.make, c.model, c.year, c.vin, c.registration_plate,
         c.mileage, c.fuel_type, c.transmission, c.color, c.body_type, c.drive_side,
         c.condition_grade, c.inspected, c.inspection_score, c.title AS car_title,
         s.id AS seller_id, s.name AS seller_name, s.name_on_document AS seller_doc_name,
         s.email AS seller_email, s.phone AS seller_phone,
         s.national_id_number AS seller_id_number, s.id_document_type AS seller_id_type,
         s.id_document_expiry AS seller_id_expiry, s.address_line AS seller_address,
         s.district AS seller_district, s.sector AS seller_sector, s.cell AS seller_cell,
         s.id_verified AS seller_verified,
         b.id AS buyer_id, b.name AS buyer_name, b.name_on_document AS buyer_doc_name,
         b.email AS buyer_email, b.phone AS buyer_phone,
         b.national_id_number AS buyer_id_number, b.id_document_type AS buyer_id_type,
         b.id_document_expiry AS buyer_id_expiry, b.address_line AS buyer_address,
         b.district AS buyer_district, b.sector AS buyer_sector, b.cell AS buyer_cell,
         ins.completed_at AS inspected_at,
         ctr.address AS center_address
    FROM handovers h
    LEFT JOIN cars  c ON c.id = h.car_id
    JOIN users s ON s.id = h.seller_id
    JOIN users b ON b.id = h.buyer_id
    LEFT JOIN LATERAL (
      SELECT completed_at FROM inspections
       WHERE car_id = h.car_id AND status = 'complete'
       ORDER BY completed_at DESC LIMIT 1
    ) ins ON TRUE
    LEFT JOIN inspection_centers ctr ON ctr.name = h.center
   WHERE h.id = $1`;

function inspectionSummary(row) {
  if (!row.inspected || row.inspection_score == null) return 'Not inspected';
  const when = toDateOnly(row.inspected_at);
  const grade = row.condition_grade ? ` · Grade ${row.condition_grade}` : '';
  return `${row.inspection_score} / 150${grade}${when ? ` · ${when}` : ''}`;
}

/**
 * Everything the contract can be pre-filled with, plus what is still missing.
 * The admin form renders straight off this.
 */
async function buildPrefill(handoverId) {
  const { rows } = await pool.query(PREFILL_SQL, [handoverId]);
  if (!rows.length) throw new ContractError('Handover not found', 404);
  const r = rows[0];

  if (!r.car_id) {
    throw new ContractError(
      'This handover’s listing has been removed, so the vehicle can no longer be identified. A contract cannot be generated.',
      409
    );
  }

  const cur = r.currency || 'RWF';
  // agreed_price is a legacy USD integer copied from the listing at booking.
  // Offer it only as a hint when the real figure has not been captured yet, and
  // never silently convert it — a contract must not cite a guessed FX rate.
  const priceMinor = r.price_minor != null ? Number(r.price_minor) : null;

  const data = {
    handover: {
      id: r.id, booking_id: r.booking_id, status: r.status,
      agreed_at: r.agreed_at, booked_at: r.booked_at,
    },
    seller: {
      user_id: r.seller_id,
      legal_name: r.seller_doc_name || r.seller_name || '',
      display_name: r.seller_name,
      id_number: r.seller_id_number || '',
      id_type: r.seller_id_type || '',
      id_expiry: toDateOnly(r.seller_id_expiry) || '',
      phone: r.seller_phone || '',
      email: r.seller_email,
      address_line: r.seller_address || '',
      district: r.seller_district || '',
      sector: r.seller_sector || '',
      cell: r.seller_cell || '',
      id_verified: r.seller_verified,
    },
    buyer: {
      user_id: r.buyer_id,
      legal_name: r.buyer_doc_name || r.buyer_name || '',
      display_name: r.buyer_name,
      id_number: r.buyer_id_number || '',
      id_type: r.buyer_id_type || '',
      id_expiry: toDateOnly(r.buyer_id_expiry) || '',
      phone: r.buyer_phone || r.contact_phone || '',
      email: r.buyer_email,
      address_line: r.buyer_address || '',
      district: r.buyer_district || '',
      sector: r.buyer_sector || '',
      cell: r.buyer_cell || '',
    },
    vehicle: {
      car_id: r.car_id,
      make: r.make || '', model: r.model || '', year: r.year || '',
      vin: r.vin || '',
      plate: r.registration_plate || '',
      mileage_km: r.mileage != null ? r.mileage : '',
      fuel: r.fuel_type || '', transmission: r.transmission || '',
      colour: r.color || '', body_type: r.body_type || '',
      drive_side: r.drive_side || '',
      condition_grade: r.condition_grade || '',
      condition: '',
      inspection_summary: inspectionSummary(r),
    },
    terms: {
      currency: cur,
      price_minor: priceMinor,
      deposit_minor: r.deposit_minor != null ? Number(r.deposit_minor) : null,
      payment_method: r.payment_method || '',
      handover_on: toDateOnly(r.handover_on) || '',
      handover_time: r.handover_time || '',
      handover_center: r.center || '',
      handover_center_address: r.center_address || null,
      balance_due_on: toDateOnly(r.balance_due_on) || '',
      legacy_usd_price_hint: r.agreed_price != null ? Number(r.agreed_price) : null,
    },
    sawa: { officer_name: '', officer_id: '' },
    company: COMPANY,
  };

  const validation = validateContractData(data);
  const existing = await pool.query(
    `SELECT id, contract_number, status, generated_at, page_count
       FROM contracts WHERE handover_id = $1 ORDER BY generated_at DESC`,
    [handoverId]
  );

  return {
    data,
    missing: validation.ok ? [] : validation.errors,
    can_generate: ['confirmed', 'complete'].includes(r.status),
    status_reason: ['confirmed', 'complete'].includes(r.status)
      ? null
      : `A contract can only be generated once the deal is agreed. This handover is “${r.status}”.`,
    contracts: existing.rows,
    live_contract: existing.rows.find((c) => LIVE_STATUSES.includes(c.status)) || null,
    draft_mode: DRAFT_MODE,
  };
}

// ─── numbering ───────────────────────────────────────────────────────────────

/**
 * Next contract number for `year`, gap-free.
 *
 * A Postgres SEQUENCE cannot do this: nextval is non-transactional, so a
 * rollback burns the number permanently. Incrementing a locked counter row
 * inside the caller's transaction ties the number to the row that will use it —
 * either both commit or neither does. Concurrent callers serialise on the lock.
 *
 * Must be called with a transaction client, never the pool.
 */
async function allocateNumber(client, year) {
  await client.query(
    `INSERT INTO contract_counters (year, last_number) VALUES ($1, 0)
     ON CONFLICT (year) DO NOTHING`,
    [year]
  );
  const { rows } = await client.query(
    `UPDATE contract_counters SET last_number = last_number + 1
      WHERE year = $1
      RETURNING last_number`,
    [year]
  );
  const n = rows[0].last_number;
  return `SAWA-${year}-${String(n).padStart(5, '0')}`;
}

// ─── generation ──────────────────────────────────────────────────────────────

function normaliseInput(prefill, body) {
  // Start from the prefill so a field the admin never touched keeps its DB
  // value, then let the submitted values win.
  const d = prefill.data;
  const merged = {
    seller: { ...d.seller, ...(body.seller || {}) },
    buyer: { ...d.buyer, ...(body.buyer || {}) },
    vehicle: { ...d.vehicle, ...(body.vehicle || {}) },
    terms: { ...d.terms, ...(body.terms || {}) },
    sawa: { ...d.sawa, ...(body.sawa || {}) },
    handover: d.handover,
    company: COMPANY,
  };
  // Trim every string once, here, so validation and rendering see the same value.
  for (const group of ['seller', 'buyer', 'vehicle', 'terms', 'sawa']) {
    for (const [k, v] of Object.entries(merged[group])) {
      if (typeof v === 'string') merged[group][k] = v.trim();
    }
  }
  if (merged.terms.price_minor != null && merged.terms.price_minor !== '') {
    merged.terms.price_minor = Number(merged.terms.price_minor);
  }
  if (merged.terms.deposit_minor === '' || merged.terms.deposit_minor == null) {
    merged.terms.deposit_minor = 0;
  } else {
    merged.terms.deposit_minor = Number(merged.terms.deposit_minor);
  }
  if (merged.vehicle.mileage_km !== '' && merged.vehicle.mileage_km != null) {
    merged.vehicle.mileage_km = Number(merged.vehicle.mileage_km);
  }
  if (merged.vehicle.year !== '' && merged.vehicle.year != null) {
    merged.vehicle.year = Number(merged.vehicle.year);
  }
  return merged;
}

async function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Write the PDF so a reader can never observe a partial file: stream to a temp
 * name in the same directory, fsync, then atomically rename into place.
 */
async function writeAtomic(destPath, buffer) {
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  const tmp = `${destPath}.${process.pid}.${Date.now()}.tmp`;
  const fh = await fsp.open(tmp, 'w');
  try {
    await fh.writeFile(buffer);
    await fh.sync();
  } finally {
    await fh.close();
  }
  await fsp.rename(tmp, destPath);
}

/**
 * Generate a contract for a handover.
 *
 * Three phases, so a failed render can never leave a hole in the number series:
 *   1. allocate  — one transaction: take the number, insert the row as 'draft'
 *                  with the snapshot. Committed before any rendering.
 *   2. render    — outside the transaction; may fail.
 *   3. finalise  — attach file path + hash, flip to 'issued'.
 * A failure in (2) leaves a retryable 'draft' holding its number.
 */
async function generateContract({ handoverId, adminId, body }) {
  const prefill = await buildPrefill(handoverId);

  if (!prefill.can_generate) throw new ContractError(prefill.status_reason, 409);

  if (prefill.live_contract) {
    throw new ContractError(
      `Contract ${prefill.live_contract.contract_number} already exists for this handover `
      + `(${prefill.live_contract.status}). Supersede it explicitly if it must be replaced.`,
      409,
      { code: 'CONTRACT_EXISTS', contract: prefill.live_contract }
    );
  }

  const data = normaliseInput(prefill, body || {});
  const validation = validateContractData(data);
  if (!validation.ok) {
    throw new ContractError('The contract is missing required information.', 422,
      { code: 'VALIDATION_FAILED', errors: validation.errors });
  }

  const cur = currencyInfo(data.terms.currency);
  const balance = Math.max(0, Number(data.terms.price_minor) - Number(data.terms.deposit_minor || 0));

  const issuedOn = new Date();
  const year = issuedOn.getUTCFullYear();

  // ── phase 1: allocate ──
  const client = await pool.connect();
  let contractId, contractNumber;
  try {
    await client.query('BEGIN');
    contractNumber = await allocateNumber(client, year);
    const snapshot = {
      contract_number: contractNumber,
      issued_on: toDateOnly(issuedOn),
      company: COMPANY,
      seller: data.seller,
      buyer: data.buyer,
      vehicle: data.vehicle,
      terms: {
        ...data.terms,
        balance_minor: balance,
        minor_per_major: cur.minorPerMajor,
        // Long form, so the header band and the Sale Terms row state the same
        // date the same way.
        handover_display: [
          data.terms.handover_on ? formatLongDate(data.terms.handover_on) : null,
          data.terms.handover_time || null,
        ].filter(Boolean).join(' · ') || '—',
        return_days: 7,
        transfer_days: 30,
      },
      sawa: data.sawa,
      handover: { id: handoverId, booking_id: prefill.data.handover.booking_id },
      generated_at: issuedOn.toISOString(),
    };
    const ins = await client.query(
      `INSERT INTO contracts (contract_number, handover_id, status, snapshot,
                              draft_watermark, generated_by)
       VALUES ($1, $2, 'draft', $3::jsonb, $4, $5)
       RETURNING id`,
      [contractNumber, handoverId, JSON.stringify(snapshot), DRAFT_MODE, adminId]
    );
    contractId = ins.rows[0].id;

    // Write the negotiated terms back onto the handover: the contract form is
    // where the real figures are finally captured, and commission is computed
    // from them at completion.
    await client.query(
      `UPDATE handovers
          SET currency = $2, price_minor = $3, deposit_minor = $4,
              payment_method = $5, balance_due_on = $6,
              agreed_at = COALESCE(agreed_at, NOW())
        WHERE id = $1`,
      [handoverId, data.terms.currency, data.terms.price_minor,
        data.terms.deposit_minor || 0, data.terms.payment_method,
        data.terms.balance_due_on || null]
    );
    // Durable identity/vehicle facts, so the next contract pre-fills itself.
    await persistLearnedFields(client, data);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    // A unique-violation on the live-contract index means a concurrent request
    // won the race; report it as the same conflict the pre-check reports.
    if (err.code === '23505') {
      throw new ContractError('A contract for this handover was just created by someone else.', 409,
        { code: 'CONTRACT_EXISTS' });
    }
    throw err;
  }
  client.release();

  // ── phase 2: render ──
  let pdf;
  try {
    const { rows } = await pool.query('SELECT snapshot FROM contracts WHERE id = $1', [contractId]);
    pdf = await renderContractPDF(rows[0].snapshot, { watermark: DRAFT_MODE });
  } catch (err) {
    log.error('contract render failed', { contractId, contractNumber, error: err.message });
    throw new ContractError(
      `The contract could not be generated (${err.message}). Number ${contractNumber} is reserved — retrying will reuse it.`,
      500, { code: 'RENDER_FAILED', contract_number: contractNumber }
    );
  }

  // ── phase 3: finalise ──
  const hash = await sha256(pdf.buffer);
  const filename = `${contractNumber}-${hash.slice(0, 8)}.pdf`;
  const relPath = path.join('contracts', filename);
  try {
    await writeAtomic(path.join(CONTRACT_DIR, filename), pdf.buffer);
  } catch (err) {
    log.error('contract write failed', { contractId, error: err.message });
    throw new ContractError(
      `The contract was generated but could not be saved (${err.message}). Number ${contractNumber} is reserved — retrying will reuse it.`,
      500, { code: 'WRITE_FAILED', contract_number: contractNumber }
    );
  }

  const { rows } = await pool.query(
    `UPDATE contracts
        SET status = 'issued', file_path = $2, file_sha256 = $3,
            page_count = $4, issued_at = NOW()
      WHERE id = $1
      RETURNING id, contract_number, status, page_count, issued_at, draft_watermark`,
    [contractId, relPath, hash, pdf.pageCount]
  );
  log.info('contract issued', { contractNumber, handoverId, pages: pdf.pageCount });
  return rows[0];
}

/** ID numbers, addresses and the plate are worth keeping for next time. */
async function persistLearnedFields(client, data) {
  for (const [side, key] of [['seller', 'seller'], ['buyer', 'buyer']]) {
    const p = data[side];
    if (!p.user_id) continue;
    await client.query(
      `UPDATE users
          SET national_id_number = COALESCE(NULLIF($2,''), national_id_number),
              id_document_type   = COALESCE(NULLIF($3,''), id_document_type),
              id_document_expiry = COALESCE($4::date, id_document_expiry),
              name_on_document   = COALESCE(NULLIF($5,''), name_on_document),
              address_line       = COALESCE(NULLIF($6,''), address_line),
              district           = COALESCE(NULLIF($7,''), district),
              sector             = COALESCE(NULLIF($8,''), sector),
              cell               = COALESCE(NULLIF($9,''), cell)
        WHERE id = $1`,
      [p.user_id, p.id_number || '', p.id_type || '', p.id_expiry || null,
        p.legal_name || '', p.address_line || '', p.district || '', p.sector || '', p.cell || '']
    );
  }
  const v = data.vehicle;
  if (v.car_id) {
    await client.query(
      `UPDATE cars
          SET vin                = COALESCE(NULLIF($2,''), vin),
              registration_plate = COALESCE(NULLIF($3,''), registration_plate),
              condition_grade    = COALESCE(NULLIF($4,''), condition_grade)
        WHERE id = $1`,
      [v.car_id, v.vin || '', v.plate || '', v.condition_grade || '']
    );
  }
}

// ─── read / lifecycle ────────────────────────────────────────────────────────

async function getContractForDownload(contractId) {
  const { rows } = await pool.query(
    `SELECT id, contract_number, status, file_path, file_sha256, page_count
       FROM contracts WHERE id = $1`,
    [contractId]
  );
  if (!rows.length) throw new ContractError('Contract not found', 404);
  const c = rows[0];
  if (!c.file_path) {
    throw new ContractError(
      `Contract ${c.contract_number} has no saved file — generation did not finish. Retry generation to reuse the number.`,
      409
    );
  }
  const abs = path.join(UPLOAD_DIR, c.file_path);
  // Containment check: file_path is ours, but never trust a stored path blindly.
  const root = path.resolve(CONTRACT_DIR);
  if (!path.resolve(abs).startsWith(root + path.sep)) {
    throw new ContractError('Contract file path is invalid', 500);
  }
  if (!fs.existsSync(abs)) {
    throw new ContractError(`The file for contract ${c.contract_number} is missing from storage.`, 410);
  }
  return { ...c, absolutePath: abs };
}

async function latestForHandover(handoverId) {
  const { rows } = await pool.query(
    `SELECT id, contract_number, status, page_count, generated_at, issued_at, signed_at, draft_watermark
       FROM contracts
      WHERE handover_id = $1
      ORDER BY (status IN ('draft','issued','signed')) DESC, generated_at DESC
      LIMIT 1`,
    [handoverId]
  );
  return rows[0] || null;
}

/** Mark the paper copy signed. After this the row can never be regenerated. */
async function markSigned(contractId) {
  const { rows } = await pool.query(
    `UPDATE contracts SET status = 'signed', signed_at = NOW()
      WHERE id = $1 AND status = 'issued'
      RETURNING id, contract_number, status, signed_at`,
    [contractId]
  );
  if (!rows.length) {
    const cur = await pool.query('SELECT status, contract_number FROM contracts WHERE id = $1', [contractId]);
    if (!cur.rows.length) throw new ContractError('Contract not found', 404);
    throw new ContractError(
      `Contract ${cur.rows[0].contract_number} is “${cur.rows[0].status}” — only an issued contract can be marked signed.`,
      409
    );
  }
  return rows[0];
}

/**
 * Replace a contract. The old row keeps its number, its file and its place in
 * the register; the replacement gets a NEW number. Nothing is overwritten.
 */
async function supersedeContract({ contractId, adminId, reason }) {
  const trimmed = String(reason || '').trim();
  if (trimmed.length < 5) {
    throw new ContractError('A reason is required to supersede a contract.', 400);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, handover_id, status, contract_number FROM contracts WHERE id = $1 FOR UPDATE`,
      [contractId]
    );
    if (!rows.length) throw new ContractError('Contract not found', 404);
    const old = rows[0];
    if (!LIVE_STATUSES.includes(old.status)) {
      throw new ContractError(`Contract ${old.contract_number} is already “${old.status}”.`, 409);
    }
    await client.query(
      `UPDATE contracts SET status = 'superseded', void_reason = $2 WHERE id = $1`,
      [contractId, `Superseded by ${adminId}: ${trimmed}`]
    );
    await client.query('COMMIT');
    return { superseded: old.contract_number, handover_id: old.handover_id };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  buildPrefill, generateContract, getContractForDownload, latestForHandover,
  markSigned, supersedeContract, allocateNumber, ContractError,
  CONTRACT_DIR, DRAFT_MODE, COMPANY,
};
