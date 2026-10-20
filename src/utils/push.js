import { Platform } from 'react-native';
import { available, callNotifications, notificationsConstant } from './nativeNotifications';
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
// AppContext imports this file, so this runs at launch. The previous guard
// wrapped only the CALL; the static `import` above it could still throw while
// the native module initialised, which no try/catch around the call can catch.
// The import is now a guarded require — see ./nativeNotifications.
// The server always sends the push; this decides what to show while the app is
// open. The one thing worth hiding is a message for the conversation already on
// screen — the bubble just appeared there. Anything else (a message in another
// thread, a price drop, a search match) gets a banner, so a person with the app
// open is not left to notice a small bell badge.
let activeConversationId = null;
export function setActiveConversationForPush(id) {
  activeConversationId = id || null;
}

export function isForCurrentThread(data) {
  return !!activeConversationId
    && data?.type === 'new_message'
    && String(data?.conversationId || '') === String(activeConversationId);
}

callNotifications('setNotificationHandler', {
  // shouldShowBanner/shouldShowList replace shouldShowAlert (deprecated in
  // expo-notifications 0.32); the old key stays for any older binary.
  handleNotification: async (notification) => {
    const quiet = isForCurrentThread(notification?.request?.content?.data);
    return {
      shouldShowBanner: !quiet,
      shouldShowList: !quiet,
      shouldShowAlert: !quiet,
      shouldPlaySound: !quiet,
      shouldSetBadge: true,
    };
  },
});

// Same identity app.config.js publishes at extra.eas.projectId — the push
// token is meaningless without it (Expo needs to know which project's
// credentials to relay through).
const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || null;

// Android lets a person silence a channel without silencing the app. Messages
// need to interrupt (HIGH); deal alerts should be seen but not buzz (DEFAULT).
// 'default' stays for account and listing notices and for pushes from a server
// that predates the other two. Channels are created from JavaScript, so a change
// here can ship over the air.
const ANDROID_CHANNELS = [
  { id: 'default', name: 'Sawa Cars', importance: 'HIGH', fallback: 4, vibrate: true },
  { id: 'messages', name: 'Messages', importance: 'HIGH', fallback: 4, vibrate: true },
  { id: 'alerts', name: 'Deals & alerts', importance: 'DEFAULT', fallback: 3, vibrate: false },
];

let androidChannelReady = false;
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || androidChannelReady) return;
  for (const channel of ANDROID_CHANNELS) {
    await callNotifications('setNotificationChannelAsync', channel.id, {
      name: channel.name,
      importance: notificationsConstant(`AndroidImportance.${channel.importance}`, channel.fallback),
      ...(channel.vibrate ? { vibrationPattern: [0, 200, 200, 200], enableVibrate: true } : {}),
      lightColor: '#CC050F',
      sound: 'default',
      showBadge: true,
    });
  }
  androidChannelReady = true;
}

// The number on the app icon. The server sets it with each push; this keeps it
// true while the app is in use (everything read = 0) and clears it at sign-out.
// Never throws: a binary without the native module simply has no badge.
export async function setAppBadge(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  try {
    await callNotifications('setBadgeCountAsync', n);
  } catch {
    // best effort
  }
}

// Resolve (and, if prompt is true, request) OS notification permission, then
// mint this device's Expo push token. Returns null — never throws — for
// every case a caller should treat identically as "not registered": a
// simulator (Expo push tokens are not meaningful there), a declined or
// undetermined permission when prompt:false says not to ask, a genuine
// decline, or a missing project id.
export async function registerForPush({ prompt = true } = {}) {
  if (!Device.isDevice) return null;
  // A binary built before the dependency existed cannot do push at all. Saying
  // so here keeps the rest of this function from probing a module that is not
  // there, and is the honest answer rather than a swallowed error.
  if (!available()) return null;
  if (!PROJECT_ID) {
    console.warn('Push token skipped: no EAS project id configured');
    return null;
  }
  try {
    await ensureAndroidChannel();
    const current = await callNotifications('getPermissionsAsync');
    let status = current?.status;
    if (status !== 'granted') {
      if (!prompt) return null;
      const requested = await callNotifications('requestPermissionsAsync');
      status = requested?.status;
    }
    if (status !== 'granted') return null;
    const minted = await callNotifications('getExpoPushTokenAsync', { projectId: PROJECT_ID });
    return minted?.data || null;
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
