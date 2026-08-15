const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const pool = require('../../db');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads');
const DOCUMENT_DIR = path.join(UPLOAD_DIR, 'documents');

class DocumentError extends Error {
  constructor(message, status = 400, code = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const PREFIX = {
  inspection_report: 'INSP',
  import_quotation: 'QUO',
  import_agreement: 'AGR',
  import_deposit_invoice: 'INV',
  import_payment_receipt: 'RCT',
};

async function allocateDocumentNumber(client, kind, year) {
  await client.query(
    `INSERT INTO document_counters (kind, year, last_number) VALUES ($1,$2,0)
     ON CONFLICT (kind, year) DO NOTHING`, [kind, year]
  );
  const { rows } = await client.query(
    `UPDATE document_counters SET last_number=last_number+1
      WHERE kind=$1 AND year=$2 RETURNING last_number`, [kind, year]
  );
  return `${PREFIX[kind] || 'DOC'}-${year}-${String(rows[0].last_number).padStart(5, '0')}`;
}

async function writeAtomic(destination, buffer) {
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  const handle = await fsp.open(temporary, 'w');
  try {
    await handle.writeFile(buffer);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fsp.rename(temporary, destination);
}

/**
 * Issue one immutable PDF for a subject/version. Concurrent requests converge
 * on the unique registry row, and an interrupted draft can safely be retried.
 */
async function issuePdf({ kind, subjectType, subjectId, ownerUserId, title, snapshot, generatedBy, render, version = 1 }) {
  const existing = await pool.query(
    `SELECT * FROM generated_documents
      WHERE kind=$1 AND subject_type=$2 AND subject_id=$3 AND version=$4`,
    [kind, subjectType, subjectId, version]
  );
  if (existing.rows[0]?.status === 'issued') return existing.rows[0];

  let document = existing.rows[0];
  if (!document) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const number = await allocateDocumentNumber(client, kind, new Date().getUTCFullYear());
      const { rows } = await client.query(
        `INSERT INTO generated_documents
          (document_number,kind,subject_type,subject_id,owner_user_id,title,version,snapshot,generated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING *`,
        [number, kind, subjectType, subjectId, ownerUserId || null, title, version, JSON.stringify(snapshot), generatedBy]
      );
      document = rows[0];
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (error.code === '23505') {
        const raced = await pool.query(
          `SELECT * FROM generated_documents WHERE kind=$1 AND subject_type=$2 AND subject_id=$3 AND version=$4`,
          [kind, subjectType, subjectId, version]
        );
        document = raced.rows[0];
      } else throw error;
    } finally {
      client.release();
    }
  }

  if (!document) throw new DocumentError('Document could not be reserved', 500, 'RESERVE_FAILED');
  if (document.status === 'issued') return document;
  // Always render the stored snapshot. A retry must reproduce what was
  // originally reserved, not silently pick up newer mutable database values.
  const pdf = await render(document.snapshot, document);
  const hash = crypto.createHash('sha256').update(pdf.buffer).digest('hex');
  const filename = `${document.document_number}-${hash.slice(0, 8)}.pdf`;
  const relativePath = path.join('documents', kind, filename);
  await writeAtomic(path.join(UPLOAD_DIR, relativePath), pdf.buffer);

  const { rows } = await pool.query(
    `UPDATE generated_documents
        SET status='issued', filename=$2, file_path=$3, file_sha256=$4,
            file_size=$5, page_count=$6, issued_at=NOW()
      WHERE id=$1 AND status='draft' RETURNING *`,
    [document.id, filename, relativePath, hash, pdf.buffer.length, pdf.pageCount]
  );
  return rows[0] || document;
}

async function documentForSubject(kind, subjectType, subjectId) {
  const { rows } = await pool.query(
    `SELECT * FROM generated_documents
      WHERE kind=$1 AND subject_type=$2 AND subject_id=$3 AND status='issued'
      ORDER BY version DESC LIMIT 1`, [kind, subjectType, subjectId]
  );
  if (!rows.length) throw new DocumentError('Document has not been generated yet', 404, 'DOCUMENT_NOT_READY');
  return rows[0];
}

async function downloadableDocument(document) {
  if (!document.file_path) throw new DocumentError('Document file is not ready', 409, 'DOCUMENT_NOT_READY');
  const absolutePath = path.resolve(UPLOAD_DIR, document.file_path);
  const root = path.resolve(DOCUMENT_DIR);
  if (!absolutePath.startsWith(root + path.sep)) throw new DocumentError('Document path is invalid', 500);
  if (!fs.existsSync(absolutePath)) throw new DocumentError('Document file is missing', 410, 'FILE_MISSING');
  return { ...document, absolutePath };
}

module.exports = {
  issuePdf, documentForSubject, downloadableDocument, allocateDocumentNumber,
  DocumentError, DOCUMENT_DIR,
};
