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
    for (const sql of scanQueryLiterals(src)) {
      out.push({ file: path.relative(BACKEND, p), sql });
    }
  }
  return out;
}

// Walks each `.query(` and reads the string literal that follows.
//
// Regexes cannot do this correctly and two real call sites proved it: a
// single-quoted string containing \' ended the match early and produced a
// truncated statement, and a template literal containing a NESTED template
// literal (`${cond ? `…` : ''}`) ended at the inner backtick. Both were
// reported as SQL syntax errors when the SQL was fine — a false alarm in a
// check whose whole value is that its alarms mean something.
function scanQueryLiterals(src) {
  const found = [];
  const marker = /\.query\(\s*/g;
  let m;
  while ((m = marker.exec(src))) {
    const start = m.index + m[0].length;
    const quote = src[start];
    if (quote !== '`' && quote !== "'" && quote !== '"') continue;

    let i = start + 1;
    let depth = 0; // ${ } nesting, template literals only
    let literal = '';
    while (i < src.length) {
      const ch = src[i];
      if (ch === '\\') {
        // Keep the escaped character, drop the backslash: \' is just a quote to
        // PostgreSQL's parser once JS has finished with the string.
        literal += src[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (quote === '`') {
        if (ch === '$' && src[i + 1] === '{') { depth++; literal += '${'; i += 2; continue; }
        if (ch === '}' && depth > 0) { depth--; literal += '}'; i++; continue; }
        // A backtick inside ${…} opens a nested literal, not the end of ours.
        if (ch === '`' && depth === 0) break;
      } else if (ch === quote) {
        break;
      }
      literal += ch;
      i++;
    }
    found.push(literal);
  }
  return found;
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
    .replace(/\$\{assignments\.join\([^)]*\)\}/g, 'name = $1')
    .replace(/\$\{fields\.join\([^)]*\)\}/g, 'price')
    // notifyMany builds one VALUES list per recipient; a single tuple is enough
    // to prove the statement's shape.
    .replace(/\$\{tuples\.join\([^)]*\)\}/g, '($1, $2, $3, $4, $5)');
}

// Anything still interpolated after the named substitutions above. Brace-
// balanced, because an expression can contain braces of its own —
// `${col} = COALESCE(${col}, '{}'::jsonb)` broke the old /\$\{[^}]*\}/ badly.
//
// A ternary whose alternative is an empty string is resolved AS the empty
// string: those are optional SQL fragments (`SET a = $1${cond ? ', b = $2' : ''}`),
// and substituting a value there produces a statement the code can never emit.
function resolveRemaining(sql) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    if (sql[i] === '$' && sql[i + 1] === '{') {
      let depth = 1;
      let j = i + 2;
      while (j < sql.length && depth > 0) {
        if (sql[j] === '{') depth++;
        else if (sql[j] === '}') depth--;
        j++;
      }
      const expr = sql.slice(i + 2, j - 1);
      const optional = /\?[\s\S]*:\s*(''|"")\s*$/.test(expr);
      out += optional ? '' : '1';
      i = j;
      continue;
    }
    out += sql[i];
    i++;
  }
  return out;
}

(async () => {
  await pg.loadModule(); // libpg-query 17 ships the parser as WASM

  const queries = extractQueries(BACKEND);
  let ok = 0;
  const failures = [];

  for (const q of queries) {
    const sql = resolveRemaining(resolve(q.sql)).trim();
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

  // ── migrations/ ────────────────────────────────────────────────────────────
  // These were not covered, which is backwards: schema.sql is applied to a fresh
  // test database in CI, so a syntax error there fails the build anyway. A
  // migration is applied automatically by ops/deploy.sh against PRODUCTION, so a
  // syntax error in one is discovered at the worst possible moment — mid-deploy,
  // on the live database, with the new code already checked out.
  //
  // Parsing them here costs milliseconds. They are also the only SQL in the repo
  // that can never be edited after the fact: migrate.js checksum-locks an
  // applied file, so "fix it and re-run" is not available.
  const MIGRATIONS = path.join(process.cwd(), 'backend/migrations');
  if (fs.existsSync(MIGRATIONS)) {
    const files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
    let bad = 0;
    for (const name of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS, name), 'utf8');
      try {
        pg.parseSync(sql);
      } catch (err) {
        bad += 1;
        console.log(`\nmigrations/${name} FAILED: ${err.message}`);
      }
    }
    if (bad) process.exitCode = 1;
    else console.log(`${files.length} migration(s) parse cleanly`);
  }

  if (failures.length) process.exitCode = 1;
})();
