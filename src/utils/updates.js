// ─────────────────────────────────────────────────────────────────────────────
// Over-the-air updates.
//
// expo-updates was in package.json, EAS Update was configured, and a GitHub
// workflow published a new bundle on every push to main — and not one line of
// the app ever imported the module. Nothing checked, nothing applied, nothing
// told anyone. Two separate faults produced that: no build profile declared a
// `channel`, so an install had nothing mapping it to the `production` branch
// the workflow publishes to; and there was no runtime code to act on an update
// even if one had arrived.
//
// What can and cannot travel this way is the thing to be honest about:
//
//   • JavaScript, images, fonts, copy, layout, business rules — yes. This is
//     most of what changes, and it arrives without a store review.
//   • A new native dependency, a permission change, an SDK upgrade, or a bump
//     to `version` in app.config.js — no. Those need a build from the store,
//     and no button in the app can conjure one.
//
// Every function here is total: no throw reaches a caller, because a failed
// update check is not worth an error screen over. The worst outcome is the
// user keeps running the perfectly good version they already have.
// ─────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { getJSON, setJSON } from '../storage';
import api from '../api/client';

// ─── How an update gets applied ───────────────────────────────────────────────
// Two honest options, and no third one that pretends to be both.
//
//   ask       a banner appears when a new bundle is downloaded, and the person
//             decides when to restart. Nothing ever interrupts them.
//   automatic the update is applied for them — but only on a RETURN to the app,
//             never mid-use. Restarting the runtime under someone who is
//             reading a listing is not "automatic", it is rude.
//
// `ask` is the default because a first launch has no basis for assuming
// consent to a restart. The choice lives in Settings and persists.
export const UPDATE_MODE = { ASK: 'ask', AUTOMATIC: 'automatic' };
const UPDATE_MODE_KEY = 'updateMode';

/** The stored preference, defaulting to `ask`. Never throws. */
export async function getUpdateMode() {
  try {
    const stored = await getJSON(UPDATE_MODE_KEY, UPDATE_MODE.ASK);
    return stored === UPDATE_MODE.AUTOMATIC ? UPDATE_MODE.AUTOMATIC : UPDATE_MODE.ASK;
  } catch {
    return UPDATE_MODE.ASK;
  }
}

/** Persist the preference. Returns the mode actually stored. */
export async function setUpdateMode(mode) {
  const next = mode === UPDATE_MODE.AUTOMATIC ? UPDATE_MODE.AUTOMATIC : UPDATE_MODE.ASK;
  try { await setJSON(UPDATE_MODE_KEY, next); } catch { /* a lost preference is not a failure */ }
  return next;
}

/** Whether over-the-air updates are live for this install.
 *
 *  False in Expo Go and in a development client, where the bundle comes from
 *  Metro and `fetchUpdateAsync` would fail. Checking this rather than __DEV__
 *  alone also covers a release build with updates deliberately disabled. */
export function updatesEnabled() {
  try {
    return Updates.isEnabled === true && !__DEV__;
  } catch {
    return false;
  }
}

/** What is actually running, for a settings screen and for support. "Which
 *  version are you on?" is unanswerable without this, and "1.0.0" is not the
 *  answer — every install reports that. The update id is what differs. */
export function runningBuild() {
  const version = Constants.expoConfig?.version || '1.0.0';
  let channel = null;
  let updateId = null;
  let embedded = true;
  let publishedAt = null;
  try {
    channel = Updates.channel || null;
    updateId = Updates.updateId || null;
    embedded = Updates.isEmbeddedLaunch !== false;
    publishedAt = Updates.createdAt || null;
  } catch { /* the module is absent or disabled; the version alone still stands */ }
  return {
    version,
    channel,
    updateId,
    // True when the app is running the bundle that shipped inside the build,
    // rather than one downloaded since.
    embedded,
    publishedAt,
    // A short, readable handle for a support conversation.
    label: updateId ? `${version} · ${String(updateId).slice(0, 8)}` : `${version} · base`,
  };
}

export const UPDATE_STATUS = {
  AVAILABLE: 'available',     // downloaded and ready to apply on restart
  CURRENT: 'current',         // already running the newest published bundle
  UNSUPPORTED: 'unsupported', // Expo Go, dev client, or updates switched off
  OFFLINE: 'offline',         // could not reach the update server
};

/**
 * Look for a newer bundle and download it if there is one.
 *
 * Downloading here rather than only checking is deliberate: the moment worth
 * interrupting someone is when the update is ready to apply, not when it is
 * ready to start downloading. A check that says "an update is available" and
 * then makes the user wait at a spinner is a worse experience than one that
 * says nothing until it can say "restart to get it".
 */
export async function checkForUpdate() {
  if (!updatesEnabled()) return { status: UPDATE_STATUS.UNSUPPORTED };
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return { status: UPDATE_STATUS.CURRENT };
    await Updates.fetchUpdateAsync();
    return { status: UPDATE_STATUS.AVAILABLE };
  } catch (error) {
    // Almost always a network failure, and almost always temporary. It is not
    // worth surfacing as an error: nothing is broken, the app simply could not
    // ask. The caller decides whether to say anything at all.
    return { status: UPDATE_STATUS.OFFLINE, error: error?.message };
  }
}

/**
 * Restart into the downloaded update.
 *
 * `reloadAsync` tears down and relaunches the JS runtime — it is not a crash
 * and not a logout, because the session lives in the keychain. Returns false
 * rather than throwing if the relaunch cannot happen, so a caller can leave the
 * banner up instead of pretending it worked.
 */
export async function applyUpdate() {
  if (!updatesEnabled()) return false;
  try {
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}


// ─── The other kind of update: a new BUILD ────────────────────────────────────
//
// Everything above ships JavaScript. None of it can ship a native module, a
// permission, an SDK bump or a new `version` — those need a binary from a
// store, and no code running inside the app can produce one. The app had no
// concept of that at all, so somebody on a stale build was simply stuck, with
// nothing to tell them a newer one existed.
//
// The server answers with what the newest build is per platform and what the
// oldest still-allowed one is. Everything below is total and fails OPEN: a
// launch that cannot reach the server, or gets something it does not
// understand, carries on into the app. Refusing to start because the app could
// not confirm it was allowed to start would be a self-inflicted outage, and it
// would arrive on exactly the flaky connections this market runs on.

const STORE_PROMPT_KEY = 'storeUpdatePromptedFor';

/** -1, 0 or 1. Mirrors backend/src/lib/app-release.js — keep them in step. */
export function compareVersions(a, b) {
  const left = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const right = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export const STORE_ACTION = {
  NONE: 'none',       // running something current enough
  SUGGEST: 'suggest', // a newer build exists; a dismissable prompt
  BLOCK: 'block',     // this build is below the supported floor
};

/**
 * Decide what to do about the installed build. Pure, so it can be reasoned
 * about and tested without a network or a device.
 *
 * The empty-url rule is the important one: with no store link there is nowhere
 * to send anybody, so a block would be a dead end and a prompt would be a lie.
 * Both collapse to NONE. That is also what makes it impossible to lock installs
 * out before the app is really on a store — the same honesty gate as
 * APP.storesLive elsewhere in the tree.
 */
export function evaluateRelease(release, { version, platform } = {}) {
  const none = { action: STORE_ACTION.NONE };
  if (!release || typeof release !== 'object') return none;
  const block = release[platform === 'ios' ? 'ios' : 'android'];
  if (!block || !block.url) return none;

  const current = version || Constants.expoConfig?.version || '1.0.0';
  const shared = {
    latest: block.latest_version,
    url: block.url,
    notes: String(release.release_notes || '').trim(),
    current,
  };
  if (compareVersions(current, block.min_supported_version) < 0) {
    return { ...shared, action: STORE_ACTION.BLOCK };
  }
  if (compareVersions(current, block.latest_version) < 0) {
    return { ...shared, action: STORE_ACTION.SUGGEST };
  }
  return none;
}

/** Ask the server, then decide. Never throws; NONE on any failure. */
export async function checkStoreRelease() {
  try {
    const release = await api.get('/settings/app-release');
    return evaluateRelease(release, {
      version: Constants.expoConfig?.version,
      platform: Platform.OS,
    });
  } catch {
    return { action: STORE_ACTION.NONE };
  }
}

/** Which version we last nagged about, so a dismissal sticks until a NEWER
 *  build appears. "Not now" means not this one, not never. */
export async function getStorePromptDismissal() {
  try { return await getJSON(STORE_PROMPT_KEY, null); } catch { return null; }
}

export async function setStorePromptDismissal(version) {
  try { await setJSON(STORE_PROMPT_KEY, String(version || '')); } catch { /* not worth failing over */ }
}
