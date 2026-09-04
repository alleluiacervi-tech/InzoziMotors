import * as Notifications from 'expo-notifications';
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
  // Cold start: tapping the notification is what launched the app. Expo only
  // answers this once per app process, so it's asked for explicitly here
  // rather than relying on the listener below, which only fires for a tap
  // while some JS is already running.
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data) go(resolveNotificationRoute(data));
    })
    .catch(() => {});

  // Warm: the app was already running (foreground or backgrounded).
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data;
    if (data) go(resolveNotificationRoute(data));
  });

  return () => subscription.remove();
}
