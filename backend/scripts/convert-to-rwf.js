#!/usr/bin/env node
/* eslint-disable no-console */
// ─────────────────────────────────────────────────────────────────────────────
// Restate every USD-denominated amount in RWF.
//
// This is NOT a migration, on purpose. src/migrate.js runs automatically on
// every deploy and checksum-locks what it applied, so an exchange rate placed
// in a migration would be baked in permanently and applied by a deploy rather
// than by a decision. What this script touches includes platform_fees.amount —
// money sellers actually owe — so the rate is a business input.
//
// It therefore:
//   • refuses to run without an explicit --rate,
//   • shows you what it will do and requires --commit to do it,
//   • writes every single change to fx_conversions before changing it, so any
//     restated amount can be explained and reversed,
//   • runs in ONE transaction, so a failure leaves the books untouched.
//
// Contracts are deliberately out of scope. A generated contract stores an
// immutable snapshot of its terms and may already be signed; re-denominating a
// signed legal document is not a data migration, it is forgery. handovers keeps
// its own currency + price_minor from 0005 for the same reason.
//
//   node scripts/convert-to-rwf.js --rate=live                 # dry run, live rate
//   node scripts/convert-to-rwf.js --rate=1447.5               # dry run, chosen rate
//   node scripts/convert-to-rwf.js --rate=live --commit        # do it
//   node scripts/convert-to-rwf.js --rate=1447.5 --commit --note="BNR mid 2026-08-09"
//
// --rate=live fetches from the platform's FX providers (src/lib/fx.js) and
// REFUSES a stale answer: restating what sellers owe on last week's rate is a
// decision, and this script does not make decisions on its own.
//
// Idempotent: it only ever selects rows still marked USD, so running it twice
// cannot double-convert.
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const pool = require('../src/db');

// Every column that holds an amount, with the table's primary key so each
// change can be recorded against a specific row.
const TARGETS = [
  { table: 'cars',            pk: 'id', columns: ['price'] },
  { table: 'submissions',     pk: 'id', columns: ['asking_price'] },
  { table: 'platform_fees',   pk: 'id', columns: ['amount'] },
  { table: 'price_history',   pk: 'id', columns: ['price'] },
  { table: 'rental_cars',     pk: 'id', columns: ['daily_rate', 'weekly_rate', 'deposit'] },
  { table: 'rental_bookings', pk: 'id', columns: ['deposit', 'pickup_fee'] },
];

function parseArgs(argv) {
  const out = { rate: null, live: false, commit: false, note: null };
  for (const a of argv.slice(2)) {
    if (a === '--rate=live') out.live = true;
    else if (a.startsWith('--rate=')) out.rate = Number(a.slice(7));
    else if (a === '--commit') out.commit = true;
    else if (a.startsWith('--note=')) out.note = a.slice(7);
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

function usage(message) {
  console.error(`\n${message}\n`);
  console.error('  node scripts/convert-to-rwf.js --rate=<RWF per 1 USD> [--commit] [--note="..."]\n');
  console.error('The rate is required and has no default. Use the rate you are prepared to');
  console.error('defend to a seller asking why their fee changed.\n');
  process.exit(2);
}

async function main() {
  const parsed = parseArgs(process.argv);
  const { commit } = parsed;
  let { rate, note } = parsed;

  if (parsed.live) {
    const { getRate } = require('../src/lib/fx');
    const fx = await getRate('USD', 'RWF');
    if (fx.stale) {
      console.error('\nRefusing --rate=live: the freshest available rate is STALE');
      console.error(`  (${fx.rate} from ${fx.source}, fetched ${fx.fetched_at || 'never'}).`);
      console.error('Money is not restated on an old rate. Retry when the providers');
      console.error('answer, or pass an explicit --rate you are prepared to defend.\n');
      await pool.end();
      process.exit(2);
    }
    rate = fx.rate;
    note = note || `live rate from ${fx.source} at ${fx.fetched_at}`;
    console.log(`\nLive rate: ${rate} RWF per USD (${fx.source}, fetched ${fx.fetched_at})`);
  }

  if (rate == null || !Number.isFinite(rate)) usage('A --rate is required.');
  if (rate <= 0) usage('The rate must be positive.');
  // A sanity band, not a policy: RWF/USD has been four figures for many years.
  // Someone typing --rate=1.45 (thinking "thousands") would otherwise quietly
  // divide every price on the platform by a thousand.
  if (rate < 100 || rate > 10000) {
    usage(`--rate=${rate} looks wrong. RWF per USD is a four-figure number (e.g. 1447.5).`);
  }

  const client = await pool.connect();
  let changed = 0;
  let scanned = 0;

  try {
    await client.query('BEGIN');

    for (const { table, pk, columns } of TARGETS) {
      // Only rows still labelled USD. This is what makes a second run a no-op.
      const cols = columns.join(', ');
      const { rows } = await client.query(
        `SELECT ${pk} AS __pk, ${cols} FROM ${table} WHERE currency = 'USD' FOR UPDATE`
      );
      scanned += rows.length;
      if (!rows.length) {
        console.log(`  ${table.padEnd(16)} nothing in USD`);
        continue;
      }

      let tableChanged = 0;
      for (const row of rows) {
        const sets = [];
        const values = [];
        for (const col of columns) {
          const old = row[col];
          // NULL stays NULL — weekly_rate and pickup_fee are optional, and
          // 0 * rate is still 0 but must still be relabelled.
          if (old == null) continue;
          const next = Math.round(Number(old) * rate);
          values.push({ col, old: Number(old), next });
          sets.push(col);
        }

        for (const v of values) {
          await client.query(
            `INSERT INTO fx_conversions
               (table_name, row_id, column_name, from_currency, to_currency,
                old_value, new_value, rate, note)
             VALUES ($1, $2, $3, 'USD', 'RWF', $4, $5, $6, $7)`,
            [table, String(row.__pk), v.col, v.old, v.next, rate, note]
          );
        }

        // Relabel the row even when every amount was NULL: the row is RWF now,
        // and leaving it marked USD would make the next run try again forever.
        const assignments = sets.map((c, i) => `${c} = $${i + 2}`);
        assignments.push(`currency = 'RWF'`);
        await client.query(
          `UPDATE ${table} SET ${assignments.join(', ')} WHERE ${pk} = $1`,
          [row.__pk, ...values.map((v) => v.next)]
        );
        tableChanged += 1;
      }

      console.log(`  ${table.padEnd(16)} ${tableChanged} row(s), ${columns.length} column(s) each`);
      changed += tableChanged;
    }

    if (commit) {
      await client.query('COMMIT');
      console.log(`\n✓ Committed. ${changed} row(s) restated at ${rate} RWF per USD.`);
      console.log('  Every change is in fx_conversions with its old value and rate.');
    } else {
      await client.query('ROLLBACK');
      console.log(`\nDRY RUN — rolled back. ${changed} row(s) would be restated at ${rate}.`);
      console.log('  Re-run with --commit to apply.');
    }

    if (scanned === 0) {
      console.log('\nNothing was marked USD. Either the conversion already ran, or this');
      console.log('database only ever held RWF.');
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\nFAILED — nothing was changed.');
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
