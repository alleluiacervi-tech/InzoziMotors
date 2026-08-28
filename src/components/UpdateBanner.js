// ─────────────────────────────────────────────────────────────────────────────
// "A new version is ready."
//
// Deliberately a banner and not a modal. An update is good news, not an
// interruption: nobody should have a dialog thrown at them mid-search over a
// copy fix. It appears only once a new bundle is DOWNLOADED and can be applied
// instantly, so the button never leads to a progress spinner.
//
// It checks on mount and again whenever the app returns to the foreground.
// The config's ON_LOAD check only runs at a cold start, and a phone that never
// gets fully closed can otherwise sit on a stale bundle for weeks.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts, shadows } from '../theme';
import { checkForUpdate, applyUpdate, updatesEnabled, UPDATE_STATUS } from '../utils/updates';

export default function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const appState = useRef(AppState.currentState);
  const insets = useSafeAreaInsets();

  const look = useCallback(async () => {
    const { status } = await checkForUpdate();
    if (status === UPDATE_STATUS.AVAILABLE) {
      // A new update supersedes an earlier dismissal: the person said "not that
      // one", not "never tell me again".
      setDismissed(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!updatesEnabled()) return undefined;
    look();
    const sub = AppState.addEventListener('change', (next) => {
      const returning = appState.current.match(/inactive|background/) && next === 'active';
      appState.current = next;
      if (returning) look();
    });
    return () => sub.remove();
  }, [look]);

  if (!ready || dismissed) return null;

  return (
    // Floated over whatever screen is showing rather than inserted into a
    // layout, so no screen has to make room for something that is absent
    // almost all of the time. Offset above the tab bar and the home
    // indicator — a banner under either is a banner nobody can tap.
    <View
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}
      accessibilityLiveRegion="polite"
      pointerEvents="box-none"
    >
      <Ionicons name="arrow-down-circle" size={20} color="#fff" />
      <View style={styles.copy}>
        <Text style={styles.title}>A new version is ready</Text>
        <Text style={styles.body}>Restart to get the latest improvements. It takes a second.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        style={styles.action}
        disabled={applying}
        onPress={async () => {
          setApplying(true);
          // If the relaunch cannot happen, the banner stays rather than
          // vanishing as though something had been done.
          const ok = await applyUpdate();
          if (!ok) setApplying(false);
        }}
      >
        <Text style={styles.actionText}>{applying ? 'Restarting…' : 'Restart'}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={10}
        onPress={() => setDismissed(true)}
      >
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.75)" />
      </Pressable>
    </View>
  );
}

// Roughly a tab bar's height. Approximate on purpose: the exact value differs
// per device and being a few points clear is enough.
const TAB_BAR_CLEARANCE = 68;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.slate700,
    ...(shadows?.card || {}),
  },
  copy: { flex: 1 },
  title: { color: '#fff', fontSize: 13, fontFamily: fonts.bold },
  body: { color: 'rgba(255,255,255,0.78)', fontSize: 11.5, fontFamily: fonts.regular, marginTop: 1 },
  action: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  actionText: { color: '#fff', fontSize: 12.5, fontFamily: fonts.bold },
});
