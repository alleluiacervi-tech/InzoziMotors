// A small in-process runner for the few things Sawa does on a clock.
//
// It lives inside the API on purpose: the jobs are light queries, not the
// long-running work that justifies encar-sync's own container, so a separate
// service would be one more thing to build, deploy and monitor for no gain.
// What keeps it safe is not where it runs but how it claims work:
//   - a Postgres advisory lock per job, so when two API instances run (a deploy
//     overlap, a restart loop) only one runs the job at a time;
//   - each job claims its rows in the same statement that selects them (see
//     lib/daily-digest.js and lib/alerts.js), so even a job that did run twice
//     cannot send twice.
// It is off under NODE_ENV=test (tests call the jobs directly) and never throws:
// a job that fails is logged and tried again on the next tick.
//
// Jobs:
//   release-held-pushes   sends the search-match / price-drop pushes that quiet
//                         hours held back (lib/alerts.js), from 07:00 Kigali
//   announce-new-rentals  finds rental cars that just became public and tells
//                         the saved searches that target cars for hire
//   daily-digest          the 18:00-21:00 "new on Sawa today" summary
//   unread-message-email  the "while you were away" email for a message still
//                         unread after a grace period

const pool = require('../db');
const { log } = require('./log');
const { releaseHeldPushes } = require('./alerts');
const { announceNewRentals } = require('./rental-alerts');
const { runDailyDigest } = require('./daily-digest');
const { sweepUnreadMessageEmails } = require('./unread-message-email');

const TICK_MS = 5 * 60 * 1000;

const JOBS = [
  { name: 'release-held-pushes', run: () => releaseHeldPushes() },
  { name: 'announce-new-rentals', run: () => announceNewRentals() },
  { name: 'daily-digest', run: () => runDailyDigest() },
  { name: 'unread-message-email', run: () => sweepUnreadMessageEmails() },
];

// Runs fn only if this process gets the job's lock. A session-level advisory
// lock belongs to one connection, so the lock, the job and the unlock all use
// the same dedicated client.
async function withJobLock(name, fn) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS ok', [`sawa:${name}`]);
    if (!rows[0].ok) return false;
    try {
      await fn();
    } finally {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', [`sawa:${name}`]).catch(() => {});
    }
    return true;
  } finally {
    client.release();
  }
}

async function runJobsOnce(jobs = JOBS) {
  for (const job of jobs) {
    try {
      await withJobLock(job.name, job.run);
    } catch (err) {
      log.error('scheduled job failed', { job: job.name, error: err.message });
    }
  }
}

function startScheduler({ intervalMs = TICK_MS, jobs = JOBS } = {}) {
  if (process.env.NODE_ENV === 'test') return null;
  let running = false;
  const timer = setInterval(() => {
    if (running) return; // a slow tick is never overlapped by the next one
    running = true;
    runJobsOnce(jobs).finally(() => { running = false; });
  }, intervalMs);
  timer.unref();
  return timer;
}

module.exports = { startScheduler, runJobsOnce, withJobLock, JOBS };
