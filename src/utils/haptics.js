// A guarded handle on expo-haptics — the same shape as nativeNotifications.js,
// for the same reason.
//
// expo-haptics is a NATIVE module added in the same commit that introduced
// Reanimated and gesture-handler (see package.json / CLAUDE.md's runtimeVersion
// discipline). Its JS half ships in every bundle from this commit forward, but
// the native half only exists in a binary built after this change — and this
// change, because it touches package.json, is native-sensitive and cannot be
// published over the air (mobile-update.yml refuses it and defers to
// mobile-build.yml, a real store build). So the practical window where an
// unguarded call could reach a binary without the native module is narrow.
//
// It is guarded anyway, at zero cost, because this exact bug — a native call
// left unguarded on the launch or interaction path — is what produced two real
// crash-on-launch releases (1.0.4, 1.0.5; see CLAUDE.md). A haptic is also, by
// definition, decoration: the tap already worked before this file existed, so
// a silently-skipped haptic is invisible and a thrown one is not.

let Haptics = null;
try {
  // Required rather than imported: a static import cannot be caught, and some
  // native modules throw while initialising rather than on first use.
  // eslint-disable-next-line global-require
  Haptics = require('expo-haptics');
} catch {
  Haptics = null;
}

/** True only when the native side is really there and usable. */
export function hapticsAvailable() {
  return !!Haptics;
}

function fire(fn) {
  try {
    fn();
  } catch {
    // A haptic that fails to fire changes nothing the user can see.
  }
}

/** A light tick — the default for any press: buttons, cards, list rows. */
export function tapLight() {
  if (Haptics) fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** A firmer tick — a toggle that changes real state (save, filter chip). */
export function tapMedium() {
  if (Haptics) fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** The click of moving between discrete options — a segmented control, a
 *  stepper, scrolling past a snap point. Distinct from tapLight: this is
 *  meant to repeat quickly without fatiguing. */
export function selectionTick() {
  if (Haptics) fire(() => Haptics.selectionAsync());
}

/** Confirms a completed action succeeded — a save, a submitted form. */
export function success() {
  if (Haptics) fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Flags something the user needs to correct — a validation failure. */
export function warning() {
  if (Haptics) fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export default { tapLight, tapMedium, selectionTick, success, warning, hapticsAvailable };
