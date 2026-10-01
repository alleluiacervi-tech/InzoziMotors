// ─────────────────────────────────────────────────────────────────────────────
// The Encar sync worker — its own container (`encar-sync` in
// docker-compose.prod.yml), the same image as the API.
//
//   node src/workers/encar-sync.js
//
// It is a separate process on purpose (plan A3). The API never waits on the
// provider and a stalled or crashing sync cannot take a request down with it.
// Its database pool is tiny (2): it must never compete with the API for
// connections.
//
// One copy only. It holds a Postgres advisory lock for its whole life; a second
// copy (a double deploy, a stray `compose run`) finds the lock taken and exits.
//
// It idles — and says so — unless ALL of these are true:
//   · ENCAR_API_KEY is set
//   · platform_settings.encar_flags.sync_enabled is true
// so deploying it, and the migration, is safe before either is done.
//
// Loop: baseline until complete, then the change feed every
// ENCAR_SYNC_INTERVAL_SEC (default 600). Hourly housekeeping purges the detail
// cache and old run rows. A heartbeat file is touched every pass so the
// container healthcheck can tell "idle" from "wedged".
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const fs = require('fs');
process.env.DB_POOL_MAX = process.env.DB_POOL_MAX || '2';
const pool = require('../db');
const { log } = require('../lib/log');
const store = require('../lib/encar/store');
const { createClient, EncarError } = require('../lib/encar/client');
const { createSync, CeilingError } = require('../lib/encar/sync');
const { loadMakes, resolveMake } = require('../lib/vehicle-makes');

const LOCK_KEY = 7240052; // arbitrary, unique to this worker
const HEARTBEAT = process.env.ENCAR_HEARTBEAT_FILE || '/tmp/encar-sync.alive';
const INTERVAL_MS = Math.max(60, Number(process.env.ENCAR_SYNC_INTERVAL_SEC || 600)) * 1000;
const IDLE_MS = 60_000;
// 'catalog' pages the documented JSON catalogue (default, always works).
// 'export' streams the daily CSV instead, which does not count against the
// request cap; only set it after the spike has confirmed the file's columns.
const BASELINE_SOURCE = process.env.ENCAR_BASELINE_SOURCE === 'export' ? 'export' : 'catalog';
const REPAIR_EVERY_MS = 7 * 24 * 3_600_000;
// 70% of the Business plan's 12 GB. Only a warning: the provider enforces its
// own limit, this is so we hear about it first.
const MONTHLY_BYTES_WARN = Number(process.env.ENCAR_MONTHLY_BYTES_WARN || 8_400_000_000);

let stopping = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function beat() {
  try { fs.writeFileSync(HEARTBEAT, String(Date.now())); } catch { /* best effort */ }
}

async function tryLock() {
  const conn = await pool.connect();
  const { rows } = await conn.query('SELECT pg_try_advisory_lock($1) AS got', [LOCK_KEY]);
  if (!rows[0].got) { conn.release(); return null; }
  return conn; // held, not released, until the process ends
}

async function recordedRun(kind, fn) {
  const runId = await store.startRun(pool, kind);
  try {
    const result = await fn();
    const c = result.counts || {};
    await store.finishRun(pool, runId, { ok: true, ...c });
    await store.patchState(pool, { last_success_at: new Date(), last_error: null });
    return result;
  } catch (err) {
    await store.finishRun(pool, runId, { ok: false, error: err.message });
    await store.patchState(pool, { last_error: err.message.slice(0, 500), last_error_at: new Date() });
    throw err;
  }
}

async function main() {
  const lock = await tryLock();
  if (!lock) {
    log.warn('encar sync: another worker holds the lock — exiting');
    return;
  }

  const client = createClient({
    onUsage: (u) => { store.recordUsage(pool, u).catch(() => {}); },
  });
  // Brand spellings are mapped through vehicle_makes (the same table that
  // collapses "Mercedes"/"benz" for sellers). Reloaded each pass, so an alias an
  // admin adds applies from the next change onward.
  let makes = [];
  const sync = createSync({
    db: pool,
    client,
    log,
    canonicalMake: (name) => resolveMake(makes, name)?.name || null,
  });
  let lastHousekeeping = 0;

  log.info('encar sync worker started', { intervalSec: INTERVAL_MS / 1000, configured: client.configured });

  while (!stopping) {
    beat();
    let wait = INTERVAL_MS;
    try {
      const flags = await store.loadFlags(pool);
      if (!client.configured || !flags.sync_enabled) {
        wait = IDLE_MS; // idle: nothing to do, and cheap to check again
      } else {
        const rules = await store.loadRules(pool);
        const state = await store.getState(pool);
        makes = await loadMakes({ includeInactive: true });

        if (!state.baseline_completed_at) {
          const run = BASELINE_SOURCE === 'export'
            ? () => sync.runExport({ rules }).catch((err) => {
              // An export we cannot read is not fatal: page the catalogue instead.
              if (err instanceof EncarError && err.code === 'bad_response') {
                log.warn('encar export unreadable — paging the catalogue instead', { error: err.message });
                return sync.runBaseline({ rules });
              }
              throw err;
            })
            : () => sync.runBaseline({ rules });
          const result = await recordedRun('baseline', run);
          log.info('encar baseline pass', { pages: result.pages, rows: result.rows, done: result.done, ...result.counts });
          if (!result.done) wait = 5_000; // more pages to go; carry on soon
        } else if (!state.last_repair_at || Date.now() - new Date(state.last_repair_at).getTime() > REPAIR_EVERY_MS) {
          // Weekly cross-check: heals any "removed" event the feed missed. A
          // failure here is logged and retried next week; it never blocks the feed.
          try {
            const result = await recordedRun('repair', () => sync.runExport({ rules, repair: true }));
            log.info('encar weekly repair', { rows: result.rows, repaired: result.repaired, ...result.counts });
          } catch (err) {
            log.warn('encar weekly repair failed', { error: err.message });
            await store.patchState(pool, { last_repair_at: new Date(Date.now() - REPAIR_EVERY_MS + 24 * 3_600_000) }); // retry in a day
          }
        } else {
          const result = await recordedRun('changes', () => sync.runChanges({ rules }));
          if (result.counts.added || result.counts.updated || result.counts.removed) {
            log.info('encar changes applied', result.counts);
          }
        }

        const usage = await store.monthUsage(pool);
        if (usage.bytes > MONTHLY_BYTES_WARN) {
          log.error('encar provider traffic is above 70% of the monthly allowance', usage);
        }
      }

      if (Date.now() - lastHousekeeping > 3_600_000) {
        lastHousekeeping = Date.now();
        await store.housekeeping(pool);
      }
    } catch (err) {
      // The run is already recorded as failed. Back off by error kind so a
      // wrong key or a missing plan does not hammer the provider every minute.
      const code = err instanceof EncarError ? err.code : err instanceof CeilingError ? 'ceiling' : 'internal';
      log.error('encar sync run failed', { code, error: err.message });
      wait = code === 'auth' || code === 'plan' || code === 'ceiling' ? 30 * 60_000 : 2 * 60_000;
    }
    beat();
    await sleep(wait);
  }

  try { await lock.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]); } catch { /* exiting anyway */ }
  lock.release();
}

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => { stopping = true; setTimeout(() => process.exit(0), 5_000).unref(); });
}

main()
  .catch((err) => { log.error('encar sync worker crashed', { error: err.message }); process.exitCode = 1; })
  .finally(async () => { await pool.end().catch(() => {}); });
