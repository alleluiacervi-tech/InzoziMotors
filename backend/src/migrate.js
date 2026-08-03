// ─────────────────────────────────────────────────────────────────────────────
// Migration runner.
//
// The schema was maintained as one idempotent file replayed on every container
// start, with ALTER TABLE ... IF NOT EXISTS accumulating at the bottom. That
// works until it doesn't: there was no way to know what a given environment was
// actually running, no way to go backwards, and destructive statements sat in
// the replay path where they ran on every single boot.
//
// This is deliberately ~90 lines and not a library. The team needs to be able
// to read exactly what will touch production, and a dependency that hides the
// mechanism behind conventions is the wrong trade for a schema this size.
//
// Rules:
//   • Files in migrations/ named NNNN_description.sql, applied in order.
//   • Each runs inside a transaction — a failure leaves nothing half-applied.
//   • Applied filenames and their checksums are recorded in schema_migrations.
//   • An already-applied file whose contents changed is an ERROR, not a re-run:
//     editing history is how environments silently diverge.
//
//   node src/migrate.js          apply everything pending
//   node src/migrate.js status   show what is applied and what is pending
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

const checksum = (sql) => crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16);

function readMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort() // NNNN_ prefix makes lexical order the intended order
    .map((name) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
      return { name, sql, checksum: checksum(sql) };
    });
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function appliedMap(client) {
  const { rows } = await client.query('SELECT name, checksum FROM schema_migrations');
  return new Map(rows.map((r) => [r.name, r.checksum]));
}

async function migrate() {
  const client = await pool.connect();
  try {
    await ensureTable(client);
    const applied = await appliedMap(client);
    const all = readMigrations();

    // A file that has already run must never change. If it does, this
    // environment and the next one will disagree about what the schema is.
    const tampered = all.filter((m) => applied.has(m.name) && applied.get(m.name) !== m.checksum);
    if (tampered.length) {
      console.error('✗ These migrations were edited after being applied:');
      for (const m of tampered) console.error(`    ${m.name}`);
      console.error('  Add a new migration instead of changing history.');
      process.exitCode = 1;
      return;
    }

    const pending = all.filter((m) => !applied.has(m.name));
    if (!pending.length) {
      console.log(`✓ Schema up to date (${applied.size} migration${applied.size === 1 ? '' : 's'} applied)`);
      return;
    }

    for (const m of pending) {
      process.stdout.write(`  → ${m.name} ... `);
      try {
        await client.query('BEGIN');
        await client.query(m.sql);
        await client.query(
          'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)',
          [m.name, m.checksum]
        );
        await client.query('COMMIT');
        console.log('ok');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.log('FAILED');
        console.error(`\n✗ ${m.name}: ${err.message}\n`);
        console.error('  Nothing from this migration was applied. Earlier ones stand.');
        process.exitCode = 1;
        return;
      }
    }
    console.log(`✓ Applied ${pending.length} migration${pending.length === 1 ? '' : 's'}`);
  } finally {
    client.release();
  }
}

async function status() {
  const client = await pool.connect();
  try {
    await ensureTable(client);
    const applied = await appliedMap(client);
    const all = readMigrations();
    if (!all.length) return console.log('No migrations found.');
    for (const m of all) {
      const state = !applied.has(m.name)
        ? 'PENDING'
        : applied.get(m.name) === m.checksum
        ? 'applied'
        : 'CHANGED SINCE APPLIED';
      console.log(`  ${state.padEnd(22)} ${m.name}`);
    }
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const command = process.argv[2] === 'status' ? status : migrate;
  command()
    .catch((err) => {
      console.error('Migration error:', err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { migrate, status, readMigrations };
