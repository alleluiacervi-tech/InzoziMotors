import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function flushPendingPushNavigation() {}

export function initPushNavigation() {
  return () => {};
}
