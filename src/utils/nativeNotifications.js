// A guarded handle on expo-notifications.
//
// expo-notifications is a NATIVE module. Its JavaScript half is inside every
// bundle, but the native half only exists in a binary that was built after the
// dependency was added — during the 1.0.2 line, here. On an older binary the
// JS is present and every call into it throws "Cannot find native module".
//
// That matters because two of those calls sit on the launch path:
// App.js runs initPushNavigation() in an effect on every start, and
// AppContext imports the token sync. An unguarded throw there is not a broken
// feature, it is a white screen before any UI — which is exactly what an
// over-the-air update reaching an older binary produced.
//
// Everything here is total. `available()` answers honestly, each helper
// no-ops when the module is absent, and nothing reaches a caller as a throw.
// Push simply does not work on a binary that cannot do push, which is the
// correct outcome and was always the intended one.

let Notifications = null;
try {
  // Required rather than imported: a static import cannot be caught, and some
  // versions of this module throw while initialising rather than on first use.
  // eslint-disable-next-line global-require
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

/** True only when the native side is really there and usable. */
export function available() {
  return !!Notifications;
}

/** Call a module function if it exists, swallowing a missing-native throw.
 *  Returns undefined when the call could not be made. */
export function callNotifications(name, ...args) {
  try {
    const fn = Notifications && Notifications[name];
    if (typeof fn !== 'function') return undefined;
    return fn(...args);
  } catch {
    return undefined;
  }
}

/** The enum lookups are property reads on the same native-backed object, so
 *  they throw in the same circumstances the calls do. */
export function notificationsConstant(path, fallback) {
  try {
    return path.split('.').reduce((node, key) => node?.[key], Notifications) ?? fallback;
  } catch {
    return fallback;
  }
}

export default Notifications;
