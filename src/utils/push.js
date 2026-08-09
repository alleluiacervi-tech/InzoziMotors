import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import api from '../api/client';

// Push registration lives here rather than in AppContext so the permission
// dance and the token round-trip stay in one testable place.
//
// Rwanda is a WhatsApp-first market, so push is additive: every notification
// this delivers also exists in the in-app Notification Center, which is the
// source of truth. A user who declines push loses nothing but immediacy.

// Foreground behaviour — a banner while the app is open, since a price drop or
// a new message matters even mid-browse.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// Expo requires the EAS project id to mint a token in a standalone build.
function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    null
  );
}

// Returns the Expo push token, or null when unavailable (simulator, permission
// denied, no EAS project). Never throws — push is a nice-to-have.
export async function registerForPush() {
  try {
    // No device check here on purpose. `Constants.isDevice` was removed from
    // expo-constants, so the old guard read `undefined` → falsy → returned
    // null on EVERY device: push never registered anywhere. Simulators are
    // instead handled by the catch below — getExpoPushTokenAsync throws there,
    // which is exactly the quiet skip the guard was trying to be.
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Sawa Cars',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#CC050F',
      });
    }

    const projectId = getProjectId();
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return data || null;
  } catch (err) {
    console.warn('Push registration skipped:', err.message);
    return null;
  }
}

// Hand the token to the backend so it can address this device. Best-effort:
// a failure here must never block sign-in.
export async function syncPushToken() {
  const token = await registerForPush();
  if (!token) return null;
  try {
    await api.post('/devices/token', { token, platform: Platform.OS });
    return token;
  } catch (err) {
    console.warn('Push token not registered with the server:', err.message);
    return null;
  }
}

// Called on sign-out so a shared handset stops receiving the previous user's
// notifications.
export async function unregisterPushToken(token) {
  if (!token) return;
  try {
    await api.delete('/devices/token', { body: JSON.stringify({ token }) });
  } catch (err) {
    console.warn('Push token not removed:', err.message);
  }
}
