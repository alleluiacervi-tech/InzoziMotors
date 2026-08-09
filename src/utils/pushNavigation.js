import { createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

// Push taps used to be thrown away: the server sends routable metadata on
// every push ({ type, conversationId | carId | bookingId }), but nothing
// listened — a "New message" tap opened the app wherever it last was.
// This wires tap → screen for both warm and cold starts.

export const navigationRef = createNavigationContainerRef();

function routeFor(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.conversationId) return ['Chat', { convId: String(data.conversationId) }];
  if (data.carId) return ['VehicleDetail', { carId: String(data.carId) }];
  if (data.bookingId) return ['OrderTracking', { bookingId: String(data.bookingId) }];
  if (data.disputeId) return ['Disputes', {}];
  // Anything unrouted still lands somewhere sensible.
  return ['NotificationCenter', {}];
}

// A cold-start tap fires before the NavigationContainer is ready — hold the
// route and let onReady flush it.
let pending = null;

function navigateFromPush(data) {
  const route = routeFor(data);
  if (!route) return;
  if (navigationRef.isReady()) {
    navigationRef.navigate(route[0], route[1]);
  } else {
    pending = route;
  }
}

export function flushPendingPushNavigation() {
  if (pending && navigationRef.isReady()) {
    const [name, params] = pending;
    pending = null;
    navigationRef.navigate(name, params);
  }
}

// Call once from App. Returns the unsubscribe.
export function initPushNavigation() {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    navigateFromPush(response?.notification?.request?.content?.data);
  });
  // Cold start: the tap that launched the app is not delivered to the
  // listener above — it has to be pulled.
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) navigateFromPush(response.notification?.request?.content?.data);
    })
    .catch(() => {});
  return () => sub.remove();
}
