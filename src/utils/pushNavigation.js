import { callNotifications } from './nativeNotifications';
import { createNavigationContainerRef } from '@react-navigation/native';
import { resolveNotificationRoute } from './notificationRouting';

// Routes a tap on an OS push notification to the thing it's about — a chat
// thread, a listing, an order — using the same resolver
// NotificationCenterScreen uses for an in-app tap, so the two never disagree.
export const navigationRef = createNavigationContainerRef();

// A tap that arrives before the navigator has mounted (a cold start — the
// notification IS what launched the app) has nowhere to go yet.
// flushPendingPushNavigation (App.js's NavigationContainer onReady) replays
// it exactly once, then this is cleared so a later remount can't replay it
// again.
let pending = null;

function go(target) {
  if (!target?.screen) return;
  if (navigationRef.isReady()) {
    navigationRef.navigate(target.screen, target.params);
  } else {
    pending = target;
  }
}

export function flushPendingPushNavigation() {
  if (!pending) return;
  const target = pending;
  pending = null;
  navigationRef.navigate(target.screen, target.params);
}

// Registers both listeners a push tap can arrive through and returns a
// cleanup function, matching what App.js's `useEffect(() =>
// initPushNavigation(), [])` expects.
export function initPushNavigation() {
  // App.js runs this in an effect on EVERY launch, so nothing in here may
  // throw. On a binary built before expo-notifications existed these are not
  // functions at all, and calling one is a white screen rather than a missing
  // feature — see src/utils/nativeNotifications.js.

  // Cold start: tapping the notification is what launched the app. Expo only
  // answers this once per app process, so it's asked for explicitly here
  // rather than relying on the listener below, which only fires for a tap
  // while some JS is already running.
  const pendingResponse = callNotifications('getLastNotificationResponseAsync');
  if (pendingResponse && typeof pendingResponse.then === 'function') {
    pendingResponse
      .then((response) => {
        const data = response?.notification?.request?.content?.data;
        if (data) go(resolveNotificationRoute(data));
      })
      .catch(() => {});
  }

  // Warm: the app was already running (foreground or backgrounded).
  const subscription = callNotifications('addNotificationResponseReceivedListener', (response) => {
    const data = response?.notification?.request?.content?.data;
    if (data) go(resolveNotificationRoute(data));
  });

  // The teardown runs on unmount and must survive the same absence.
  return () => {
    try {
      if (subscription && typeof subscription.remove === 'function') subscription.remove();
    } catch {
      // Nothing was ever subscribed.
    }
  };
}
