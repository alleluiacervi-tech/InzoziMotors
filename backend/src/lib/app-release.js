// ─────────────────────────────────────────────────────────────────────────────
// What the newest installable app is, and what the oldest usable one is.
//
// An over-the-air update carries JavaScript. It cannot carry a native module, a
// permission, an SDK bump or a new `version` — those need a binary from the
// store, and no code inside the running app can conjure one. Until now the app
// had no concept of that at all: nothing anywhere in the tree knew a newer
// BUILD could exist, so a person on a stale binary was simply stuck, silently,
// with no prompt and no explanation.
//
// This row is how an operator says "there is a newer build, and here is where
// to get it" without a release. The app reads it at launch.
//
// ── The hard block is the dangerous field ────────────────────────────────────
// `min_supported_version` locks a person out of the app until they update. Set
// it wrong and every install on earth is bricked, with no way back that does
// not go through a store review. Three rails, all deliberate:
//
//   • it may never exceed latest_version — you cannot demand a build that does
//     not exist;
//   • it does nothing at all while that platform's store `url` is empty, so it
//     is structurally impossible to brick installs before the app is on a store
//     you could send anybody to;
//   • the app only ever acts on a definite answer, never on a failed request.
//
// ── Per platform, not one number ─────────────────────────────────────────────
// Apple and Google review at different speeds, so 1.0.1 is routinely live on
// Play while still pending on the App Store. One shared "latest" would prompt
// iPhone users to fetch a build they cannot get yet, which reads as a broken
// app rather than a pending review.
// ─────────────────────────────────────────────────────────────────────────────
const pool = require('../db');
const { log } = require('./log');

const SETTING_KEY = 'app_release';

const DEFAULT_RELEASE = {
  ios: { latest_version: '1.0.0', min_supported_version: '1.0.0', url: '' },
  android: { latest_version: '1.0.0', min_supported_version: '1.0.0', url: '' },
  release_notes: '',
  // The stop switch for over-the-air publishing. mobile-update.yml reads it
  // before it publishes, so an operator can halt updates from the admin console
  // at 2am without a GitHub account, a laptop, or a deploy.
  ota_paused: false,
  ota_pause_reason: '',
};

const PLATFORMS = ['ios', 'android'];
const VERSION_RE = /^\d{1,4}(\.\d{1,4}){0,3}$/;

/** -1, 0 or 1. Missing components count as zero, so 1.2 === 1.2.0. */
function compareVersions(a, b) {
  const left = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const right = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/** Human-readable problems, each naming its field. Empty means valid. */
function validateRelease(value) {
  const problems = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ['App release must be an object'];
  }
  for (const platform of PLATFORMS) {
    const block = value[platform];
    const at = platform;
    if (!block || typeof block !== 'object' || Array.isArray(block)) {
      problems.push(`${at} must be an object with latest_version, min_supported_version and url`);
      continue;
    }
    for (const field of ['latest_version', 'min_supported_version']) {
      if (!VERSION_RE.test(String(block[field] || ''))) {
        problems.push(`${at}.${field} must be a dotted version like 1.2.0`);
      }
    }
    if (compareVersions(block.min_supported_version, block.latest_version) > 0) {
      // The one mistake that cannot be undone from inside the app.
      problems.push(
        `${at}.min_supported_version cannot be newer than ${at}.latest_version — `
        + 'that would lock every install out of a build nobody can download yet'
      );
    }
    if (block.url && !/^https:\/\//.test(String(block.url))) {
      problems.push(`${at}.url must be an https link to the store listing, or empty`);
    }
  }
  if (value.release_notes !== undefined && typeof value.release_notes !== 'string') {
    problems.push('release_notes must be text');
  }
  if (value.ota_paused !== undefined && typeof value.ota_paused !== 'boolean') {
    problems.push('ota_paused must be true or false');
  }
  if (value.ota_pause_reason !== undefined && typeof value.ota_pause_reason !== 'string') {
    problems.push('ota_pause_reason must be text');
  }
  return problems;
}

// Deliberately shorter than the duty-rate TTL. This is read on every cold
// launch, but it is also the switch you reach for when something is on fire —
// and a five-minute wait for a stop switch to take effect is the wrong trade.
let cache = { at: 0, value: null };
const TTL_MS = 60 * 1000;

async function loadAppRelease({ force = false } = {}) {
  if (!force && cache.value && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const { rows } = await pool.query('SELECT value FROM platform_settings WHERE key = $1', [SETTING_KEY]);
    const stored = rows[0]?.value;
    const problems = stored ? validateRelease(stored) : ['missing'];
    if (stored && problems.length) {
      log.error('stored app release is invalid — serving defaults', { problems });
    }
    const value = stored && problems.length === 0
      ? { ...DEFAULT_RELEASE, ...stored }
      : DEFAULT_RELEASE;
    cache = { at: Date.now(), value };
    return value;
  } catch (err) {
    log.error('app release load failed', { error: err.message });
    return cache.value || DEFAULT_RELEASE;
  }
}

function invalidateAppRelease() { cache = { at: 0, value: null }; }

module.exports = {
  SETTING_KEY, DEFAULT_RELEASE, PLATFORMS,
  compareVersions, validateRelease, loadAppRelease, invalidateAppRelease,
};
