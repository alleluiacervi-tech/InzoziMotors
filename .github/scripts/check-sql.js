// Parses every SQL statement the backend emits using libpg-query — the actual
// PostgreSQL grammar, not an approximation. Catches genuine syntax errors in
// hand-built SQL without needing a running database.
const fs = require('fs');
const path = require('path');
const pg = require('libpg-query');

const BACKEND = require('path').join(process.cwd(), 'backend/src');

// Pull the literal SQL out of every pool.query(`…`) / client.query(`…`) call.
function extractQueries(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { extractQueries(p, out); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const src = fs.readFileSync(p, 'utf8');
    // Template literals passed to .query(
    const re = /\.query\(\s*`([\s\S]*?)`/g;
    let m;
    while ((m = re.exec(src))) out.push({ file: path.relative(BACKEND, p), sql: m[1] });
    // Single-quoted one-liners
    const re2 = /\.query\(\s*'([^']+)'/g;
    while ((m = re2.exec(src))) out.push({ file: path.relative(BACKEND, p), sql: m[1] });
    const re3 = /\.query\(\s*"([^"]+)"/g;
    while ((m = re3.exec(src))) out.push({ file: path.relative(BACKEND, p), sql: m[1] });
  }
  return out;
}

// Interpolated fragments (${MARKET_LATERALS}, ${conditions.join(...)}, ${col})
// have to be resolved before parsing. Substitute the real values where we know
// them and a syntactically valid placeholder where we don't.
function resolve(sql) {
  return sql
    .replace(/\$\{MARKET_COLUMNS\}/g, ' 1 AS market_placeholder')
    .replace(/\$\{MARKET_LATERALS\}/g, ' LEFT JOIN LATERAL (SELECT 1 AS n) mkt ON TRUE')
    .replace(/\$\{MIN_COMPARABLES\}/g, '3')
    .replace(/\$\{conditions\.join\([^)]*\)\}/g, 'TRUE')
    .replace(/\$\{where\}/g, '')
    .replace(/\$\{owner\}/g, '')
    .replace(/\$\{safeSort\}/g, 'listed_at')
    .replace(/\$\{safeOrder\}/g, 'ASC')
    .replace(/\$\{col\}/g, 'pickup_record')
    .replace(/\$\{params\.length - 1\}/g, '1')
    .replace(/\$\{params\.length\}/g, '2')
    .replace(/\$\{updates\.join\([^)]*\)\}/g, 'price = $1')
    .replace(/\$\{sets\.join\([^)]*\)\}/g, 'price = $1')
    .replace(/\$\{fields\.join\([^)]*\)\}/g, 'price')
    .replace(/\$\{[^}]*\}/g, '1');
}

(async () => {
  await pg.loadModule(); // libpg-query 17 ships the parser as WASM

  const queries = extractQueries(BACKEND);
  let ok = 0;
  const failures = [];

  for (const q of queries) {
    const sql = resolve(q.sql).trim();
    if (!sql || !/^(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP|BEGIN|COMMIT|ROLLBACK)/i.test(sql)) continue;
    try {
      pg.parseSync(sql);
      ok++;
    } catch (err) {
      failures.push({ file: q.file, sql: sql.replace(/\s+/g, ' ').slice(0, 220), error: err.message });
    }
  }

  console.log(`Parsed ${ok} statements with the PostgreSQL grammar — ${failures.length} failed`);
  failures.forEach((f) => {
    console.log(`\nFAIL ${f.file}\n  ${f.error}\n  ${f.sql}`);
  });

  const schema = fs.readFileSync(path.join(BACKEND, 'schema.sql'), 'utf8');
  try {
    pg.parseSync(schema);
    console.log('\nschema.sql parses cleanly (all statements)');
  } catch (err) {
    console.log('\nschema.sql FAILED: ' + err.message);
    process.exitCode = 1;
  }

  if (failures.length) process.exitCode = 1;
})();
