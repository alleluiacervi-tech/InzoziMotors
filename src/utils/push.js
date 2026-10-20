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

// Why the last registration attempt ended, in a short code a person can read
// out in a support conversation (Settings shows it when the test finds this
// phone unregistered). Before this, every failure path returned null and the
// reason was a console.warn nobody could see, so "push does not work on this
// phone" could not be told apart from "iOS permission was never asked" or "the
// server was unreachable". In memory only; never sent anywhere.
//   ready                  registered with the server
//   permission-not-asked   iOS/Android has not been asked yet (and we were told not to ask)
//   permission-denied      the person said no, or it is off in the phone's settings
//   simulator              a simulator has no push address
//   no-native-module       this build cannot do push at all
//   no-project-id          the build has no EAS project id
//   token-error: <text>    Expo/Apple refused to give this phone an address
//   sync-failed: <text>    the address was minted but the server did not take it
let lastStatus = { stage: 'not-tried', detail: null };
function note(stage, detail = null) {
  lastStatus = { stage, detail: detail ? String(detail).slice(0, 120) : null };
}
export function getPushStatus() {
  return { ...lastStatus };
}

// What the phone's OS currently allows: 'granted', 'denied', 'undetermined', or
// 'unavailable' (no native module). The Settings switch reads this so it never
// shows "on" for a phone that was never given permission.
export async function getPushPermission() {
  if (!available()) return 'unavailable';
  try {
    const current = await callNotifications('getPermissionsAsync');
    return current?.status || 'unavailable';
  } catch {
    return 'unavailable';
  }
}

// Resolve (and, if prompt is true, request) OS notification permission, then
// mint this device's Expo push token. Returns null — never throws — for
// every case a caller should treat identically as "not registered": a
// simulator (Expo push tokens are not meaningful there), a declined or
// undetermined permission when prompt:false says not to ask, a genuine
// decline, or a missing project id. getPushStatus() says which.
export async function registerForPush({ prompt = true } = {}) {
  if (!Device.isDevice) { note('simulator'); return null; }
  // A binary built before the dependency existed cannot do push at all. Saying
  // so here keeps the rest of this function from probing a module that is not
  // there, and is the honest answer rather than a swallowed error.
  if (!available()) { note('no-native-module'); return null; }
  if (!PROJECT_ID) {
    console.warn('Push token skipped: no EAS project id configured');
    note('no-project-id');
    return null;
  }
  try {
    await ensureAndroidChannel();
    const current = await callNotifications('getPermissionsAsync');
    let status = current?.status;
    if (status !== 'granted') {
      if (!prompt) {
        note(status === 'denied' ? 'permission-denied' : 'permission-not-asked');
        return null;
      }
      const requested = await callNotifications('requestPermissionsAsync');
      status = requested?.status;
    }
    if (status !== 'granted') { note('permission-denied'); return null; }
    const minted = await callNotifications('getExpoPushTokenAsync', { projectId: PROJECT_ID });
    if (!minted?.data) { note('token-error', 'no address returned'); return null; }
    return minted.data;
  } catch (err) {
    console.warn('Push registration failed:', err?.message);
    note('token-error', err?.message || 'unknown error');
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
    note('ready');
    return token;
  } catch (err) {
    console.warn('Push token sync failed:', err?.message);
    note('sync-failed', err?.message || 'unknown error');
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
