// ─────────────────────────────────────────────────────────────────────────────
// CSV for admin exports.
//
// RFC 4180 quoting, CRLF line ends, and a UTF-8 byte-order mark so Excel opens
// Kinyarwanda and French names without mojibake.
//
// Formula injection: a spreadsheet treats a cell that starts with = + - @ (or
// a tab / carriage return) as a formula, so a listing titled
// "=HYPERLINK(...)" would run when an operator opens the export. Text cells
// that start with one of those characters are prefixed with an apostrophe.
// Numbers are written as numbers — a negative amount stays a number.
// ─────────────────────────────────────────────────────────────────────────────

const BOM = '﻿';
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value) {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (value instanceof Date) return value.toISOString();
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * @param {{ key: string, header: string }[]} columns
 * @param {object[]} rows
 */
function toCsv(columns, rows) {
  const lines = [columns.map((c) => cell(c.header)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => cell(row[c.key])).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

module.exports = { toCsv, cell };
