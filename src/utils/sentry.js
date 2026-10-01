import { runningBuild } from './updates';

// Native crash reporting (Sentry). Inert until a DSN is supplied, so a build
// without one behaves exactly as before — nothing starts, nothing is sent.
//
// To switch it on: create a Sentry project (React Native), then set
// EXPO_PUBLIC_SENTRY_DSN for the production build profile (eas.json `env`, or an
// EAS environment variable) and for the update workflow. The DSN is a public
// identifier, not a secret. Source-map upload additionally needs SENTRY_ORG,
// SENTRY_PROJECT and a SENTRY_AUTH_TOKEN secret at build time (see
// app.config.js); without those, crashes are still captured, only unreadable.
//
// What it sends: crashes and the errors we hand it, the app version and update
// id. `sendDefaultPii` is off, so no IP address, and the breadcrumbs we add
// never carry what a person typed. This must be declared in the privacy policy
// and the Play Data Safety / App Privacy forms as diagnostics/crash data.

let Sentry = null;
try {
  // Guarded so the app still starts if the native module is ever absent
  // (an OTA bundle on a binary built before the dependency existed).
  // eslint-disable-next-line global-require
  Sentry = require('@sentry/react-native');
} catch {
  Sentry = null;
}

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
let started = false;

export function initSentry() {
  if (started || !Sentry || !DSN || __DEV__) return;
  try {
    const build = runningBuild();
    Sentry.init({
      dsn: DSN,
      environment: 'production',
      release: `sawa@${build.version}`,
      dist: build.updateId || 'base',
      sendDefaultPii: false,
      // Errors only: no performance tracing, no session replay, so the cost and
      // the data collected stay at "a crash happened".
      tracesSampleRate: 0,
    });
    started = true;
  } catch {
    // never let reporting be the thing that fails to start
  }
}

export function captureError(error, where) {
  if (!started || !Sentry) return;
  try {
    Sentry.withScope((scope) => {
      scope.setTag('where', where || 'unknown');
      Sentry.captureException(error instanceof Error ? error : new Error(String(error?.message || error)));
    });
  } catch {
    // best-effort
  }
}
