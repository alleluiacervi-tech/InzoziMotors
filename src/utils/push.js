import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from '../api/client';

// Real push registration. AppContext already carries the full contextual-ask
// design (maybeAskForPush, the Settings toggle, the pushEnabled/pushAsked
// flags) — this file is the one piece that used to be a deliberate no-op stub
// for v1 App Store distribution (see CLAUDE.md). It is no longer a stub, but
// it still does nothing useful until the app is built with real APNs (iOS)
// and FCM (Android) credentials and resubmitted — Expo's push service is a
// relay, not a certificate authority, and cannot deliver without them.

// A push that arrives while the app is open would otherwise vanish silently —
// this is what makes it still show as a banner. Set once at module load
// (Expo's documented pattern), not inside a component.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Same identity app.config.js publishes at extra.eas.projectId — the push
// token is meaningless without it (Expo needs to know which project's
// credentials to relay through).
const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || null;

let androidChannelReady = false;
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || androidChannelReady) return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Sawa Cars',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 200, 200],
    lightColor: '#CC050F',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });
  androidChannelReady = true;
}

// Resolve (and, if prompt is true, request) OS notification permission, then
// mint this device's Expo push token. Returns null — never throws — for
// every case a caller should treat identically as "not registered": a
// simulator (Expo push tokens are not meaningful there), a declined or
// undetermined permission when prompt:false says not to ask, a genuine
// decline, or a missing project id.
export async function registerForPush({ prompt = true } = {}) {
  if (!Device.isDevice) return null;
  if (!PROJECT_ID) {
    console.warn('Push token skipped: no EAS project id configured');
    return null;
  }
  try {
    await ensureAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      if (!prompt) return null;
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    return data || null;
  } catch (err) {
    console.warn('Push registration failed:', err?.message);
    return null;
  }
}

// Register (or refresh) this device's token with the server. Only returns the
// token once the server actually has it — a token minted on-device but never
// synced is useless to the backend's push fan-out (lib/push.js on the
// backend only sends to rows in device_tokens), so a sync failure here must
// look identical to "no token" to every caller, not a token nobody can reach.
export async function syncPushToken({ prompt = true } = {}) {
  const token = await registerForPush({ prompt });
  if (!token) return null;
  try {
    await api.post('/devices/token', { token, platform: Platform.OS });
    return token;
  } catch (err) {
    console.warn('Push token sync failed:', err?.message);
    return null;
  }
}

// Tell the server to forget this device — logout and account deletion in
// AppContext both call this ahead of the auth token dying, with no try/catch
// of their own, so it must never throw: a dead network here must not be able
// to block someone from signing out.
export async function unregisterPushToken(token) {
  if (!token) return;
  try {
    await api.delete('/devices/token', { body: JSON.stringify({ token }) });
  } catch (err) {
    console.warn('Push token unregister failed:', err?.message);
  }
}
