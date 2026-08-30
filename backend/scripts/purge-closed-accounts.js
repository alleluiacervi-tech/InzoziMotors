#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Erase every closed account whose thirty days have passed.
//
// The same work the admin console's Account closures page does, for anyone who
// would rather it ran on a cron than be pressed. It exists because the primary
// path is a person clicking a button, and a person can be on leave.
//
//   docker compose exec api node scripts/purge-closed-accounts.js
//   docker compose exec api node scripts/purge-closed-accounts.js --dry-run
//
// This backend has no scheduler on purpose (0009 wrote that down), so nothing
// calls this by itself. Wiring it into cron is a deliberate act, not a default.
//
// It never chooses WHICH accounts: the predicate in lib/account-closure.js
// does, exactly as it does for the admin route. There is no way to purge
// somebody early from here, and no way to skip somebody.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

require('dotenv').config();
const pool = require('../src/db');
const { withTransaction } = require('../src/lib/tx');
const {
  DUE_FOR_PURGE, purgeAccount, removeIdDocuments, RECOVERY_DAYS,
} = require('../src/lib/account-closure');

const dryRun = process.argv.includes('--dry-run');

(async () => {
  const { rows } = await pool.query(DUE_FOR_PURGE);
  if (!rows.length) {
    console.log(`Nothing is due. No closed account is past its ${RECOVERY_DAYS} days.`);
    await pool.end();
    return;
  }

  console.log(`${rows.length} account(s) past their ${RECOVERY_DAYS} days:`);
  for (const row of rows) {
    // No name and no email: this is a terminal and terminals end up in
    // screenshots and support threads. The reason is the useful part anyway.
    console.log(`  closed ${String(row.closed_at).slice(0, 10)} · ${row.closure_reason}`);
  }
  if (dryRun) {
    console.log('\n--dry-run: nothing was erased.');
    await pool.end();
    return;
  }

  let purged = 0;
  // One transaction per account. A single bad row must not roll back the
  // erasure of the others — each of these is an independent obligation, not
  // part of one atomic operation.
  for (const candidate of rows) {
    try {
      const result = await withTransaction((client) => purgeAccount(client, candidate.id));
      if (!result) continue;
      // After the commit, never inside it: there is no undelete for a file.
      removeIdDocuments(result.files);
      purged += 1;
    } catch (err) {
      console.error(`  failed for ${candidate.id}: ${err.message}`);
    }
  }
  console.log(`\nErased ${purged} of ${rows.length}.`);
  await pool.end();
})().catch(async (err) => {
  console.error(err.message);
  await pool.end();
  process.exit(1);
});
