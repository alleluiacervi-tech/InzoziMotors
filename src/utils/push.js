import { Platform } from 'react-native';

// In-app notifications and NotificationCenter handle all marketplace updates.
// Native push is disabled for v1 App Store distribution.
export async function registerForPush() {
  return null;
}

export async function syncPushToken() {
  return null;
}

export async function unregisterPushToken() {
  return;
}
