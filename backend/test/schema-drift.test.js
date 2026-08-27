// ─────────────────────────────────────────────────────────────────────────────
// schema.sql must never promise something production will not have.
//
// db-init.js runs ONLY the migrations — schema.sql is never executed against a
// real database. It is documentation, and the whole codebase treats it as the
// readable description of the shape. That makes one direction of drift merely
// untidy and the other direction dangerous:
//
//   • a column migrations create that schema.sql omits  → the file is behind.
//     Annoying. An engineer reading it under-estimates the schema.
//
//   • a column schema.sql declares that NO migration creates → the file is a
//     LIE. Someone hand-edits schema.sql, believes the column exists, writes a
//     query against it, and the query works on nobody's database. Production
//     never had it and never will, because nothing runs this file.
//
// This test enforces the second direction. It builds one database from the
// migrations, applies schema.sql to a scratch schema in the same connection,
// and fails if schema.sql describes anything the migrations do not produce.
//
// It also prints the first direction as a report, without failing, so the size
// of the documentation debt stays visible rather than invisible.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
const pool = require('../src/db');

const SCHEMA_FILE = path.join(__dirname, '..', 'src', 'schema.sql');
const SCRATCH = 'schema_doc_check';

test('schema.sql never describes a column the migrations do not create', async () => {
  const sql = fs.readFileSync(SCHEMA_FILE, 'utf8');

  const client = await pool.connect();
  let documented;
  let real;
  try {
    const liveRows = await client.query(
      `SELECT table_name || '.' || column_name AS ref
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name NOT IN ('schema_migrations')`
    );
    real = new Set(liveRows.rows.map((r) => r.ref));
    assert.ok(real.size > 100, 'the migrated database is there to compare against');

    // An explicit transaction, for two reasons that are both load-bearing.
    //
    // SET LOCAL is scoped to a transaction and is a NO-OP outside one — the
    // first version of this test omitted the BEGIN, so schema.sql ran straight
    // into the public schema and the comparison set came back EMPTY. The test
    // then passed vacuously, which is worse than failing.
    //
    // And DDL in Postgres is transactional, so ROLLBACK discards every table
    // this creates. Nothing schema.sql does here survives the test.
    await client.query('BEGIN');
    await client.query(`DROP SCHEMA IF EXISTS ${SCRATCH} CASCADE`);
    await client.query(`CREATE SCHEMA ${SCRATCH}`);
    // pg_catalog stays reachable; public does NOT, so an unqualified CREATE
    // cannot silently resolve to a real table and be skipped by IF NOT EXISTS.
    await client.query(`SET LOCAL search_path TO ${SCRATCH}, pg_catalog`);
    await client.query(sql);

    const docRows = await client.query(
      `SELECT table_name || '.' || column_name AS ref
         FROM information_schema.columns
        WHERE table_schema = $1 AND table_name NOT IN ('schema_migrations')`,
      [SCRATCH]
    );
    documented = new Set(docRows.rows.map((r) => r.ref));
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
  }

  // The guard against this test going quiet again. If schema.sql stops producing
  // tables here for any reason, that is a broken test, not a clean schema.
  assert.ok(documented.size > 100,
    `schema.sql produced only ${documented.size} columns in the scratch schema — `
    + 'the test is broken, not the schema.');

  const phantom = [...documented].filter((ref) => !real.has(ref)).sort();
  const behind = [...real].filter((ref) => !documented.has(ref)).sort();

  if (behind.length) {
    // Reported, not failed. This direction is documentation debt: real, worth
    // paying down, but it cannot make anyone's query fail.
    console.log(`\n  schema.sql is behind by ${behind.length} column(s) that migrations create.`);
    console.log(`  First few: ${behind.slice(0, 10).join(', ')}${behind.length > 10 ? ' …' : ''}\n`);
  }

  assert.deepEqual(phantom, [],
    'schema.sql declares columns no migration creates. Nothing executes schema.sql, '
    + 'so these exist on no database anywhere. Either add the migration or remove the line.');
});

test.after(async () => { await pool.end(); });
