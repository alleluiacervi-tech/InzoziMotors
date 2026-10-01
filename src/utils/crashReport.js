import { Platform } from 'react-native';
import { BASE_URL } from '../api/client';
import { runningBuild } from './updates';
import { captureError } from './sentry';

// Sends a JavaScript error to our own API (POST /client-errors) so a crash on a
// real phone leaves a trace. What is sent: the error message and stack, which
// screen/handler it came from, the app version and update id, the platform. What
// is never sent: who the user is, or anything they typed or saw.
//
// Never throws and never waits on the network for anything that matters — a
// failure to report a crash must not become the next crash. De-duplicated per
// launch, and capped, so one error in a render loop sends one report, not a
// thousand.

const seen = new Set();
const MAX_PER_LAUNCH = 10;

export function reportClientError(error, where, { fatal = false } = {}) {
  try {
    if (__DEV__) return;
    const message = String(error?.message || error || 'Unknown error').slice(0, 500);
    const key = `${where}|${message}`;
    if (seen.has(key) || seen.size >= MAX_PER_LAUNCH) return;
    seen.add(key);
    // The native reporter too, when one is configured (src/utils/sentry.js).
    captureError(error, where);
    const build = runningBuild();
    fetch(`${BASE_URL}/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        stack: typeof error?.stack === 'string' ? error.stack.slice(0, 4000) : undefined,
        where,
        appVersion: build.version,
        updateId: build.updateId,
        platform: Platform.OS,
        osVersion: String(Platform.Version),
        fatal,
      }),
    }).catch(() => {});
  } catch {
    // reporting is best-effort by contract
  }
}

// Route uncaught JavaScript errors (the ones the ErrorBoundary cannot see:
// event handlers, timers, promise callbacks) through the reporter, then hand
// them to whatever handler React Native already had so behaviour is unchanged.
let installed = false;
export function installGlobalErrorReporting() {
  if (installed) return;
  installed = true;
  try {
    const errorUtils = globalThis.ErrorUtils;
    if (!errorUtils?.setGlobalHandler) return;
    const previous = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error, isFatal) => {
      reportClientError(error, 'global', { fatal: !!isFatal });
      if (previous) previous(error, isFatal);
    });
  } catch {
    // leave the default handler in place
  }
}
