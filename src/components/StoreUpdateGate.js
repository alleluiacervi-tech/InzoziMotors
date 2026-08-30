// ─────────────────────────────────────────────────────────────────────────────
// "There is a newer version of the app."
//
// UpdateBanner handles the other kind of update — a JavaScript bundle that has
// already downloaded and needs a restart. This one is about a new BINARY, which
// only a store can give you, so the two say different things and must not be
// mistaken for each other: one restarts in a second, the other is a trip to the
// App Store or Play Store.
//
// Two levels, and the difference between them is the whole design:
//
//   SUGGEST  a quiet card at the bottom. Dismissable, and the dismissal sticks
//            until a NEWER build appears — "not now" is about this version, not
//            about being told ever again.
//   BLOCK    a full screen with no way past. Reserved for a build that is
//            genuinely broken or unsafe, because it stops somebody where they
//            stand, possibly mid-message with a seller.
//
// It fails open in every direction. No answer from the server, an answer it
// does not understand, no store link configured — the app carries on. The only
// thing that produces the blocking screen is a definite, well-formed answer
// saying this build is below the floor.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, AppState, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts, shadows } from '../theme';
import { LogoMark } from './Logo';
import {
  checkStoreRelease, STORE_ACTION,
  getStorePromptDismissal, setStorePromptDismissal,
} from '../utils/updates';

export default function StoreUpdateGate() {
  const [verdict, setVerdict] = useState({ action: STORE_ACTION.NONE });
  const [dismissed, setDismissed] = useState(true);
  const appState = useRef(AppState.currentState);
  const insets = useSafeAreaInsets();

  const look = useCallback(async () => {
    const next = await checkStoreRelease();
    setVerdict(next);
    if (next.action === STORE_ACTION.SUGGEST) {
      const alreadyAsked = await getStorePromptDismissal();
      setDismissed(alreadyAsked === String(next.latest));
    } else {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    look();
    // Also on return, so a person who leaves the app open for a week still
    // hears about a build published in the meantime. Same reasoning as
    // UpdateBanner, and cheap — one small GET against a 60-second cache.
    const sub = AppState.addEventListener('change', (next) => {
      const returning = appState.current.match(/inactive|background/) && next === 'active';
      appState.current = next;
      if (returning) look();
    });
    return () => sub.remove();
  }, [look]);

  const open = () => { if (verdict.url) Linking.openURL(verdict.url).catch(() => {}); };

  if (verdict.action === STORE_ACTION.BLOCK) {
    return (
      // Covers everything, including the tab bar. There is deliberately no
      // close control and no back handling: a floor that can be walked around
      // is not a floor, and the only reason to raise one is a build that should
      // not be in use.
      <View style={[styles.blockRoot, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.blockBody}>
          <LogoMark size={92} />
          <Text style={styles.blockTitle}>Time to update</Text>
          <Text style={styles.blockCopy}>
            This version of Sawa Cars is no longer supported. Update from the store to carry
            on — your saved cars, messages and account are all still here.
          </Text>
          {verdict.notes ? <Text style={styles.blockNotes}>{verdict.notes}</Text> : null}
        </View>
        <Pressable style={styles.blockButton} onPress={open} accessibilityRole="button">
          <Text style={styles.blockButtonText}>Update Sawa Cars</Text>
        </Pressable>
        <Text style={styles.blockVersion}>
          You have {verdict.current} · newest is {verdict.latest}
        </Text>
      </View>
    );
  }

  if (verdict.action !== STORE_ACTION.SUGGEST || dismissed) return null;

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}
      accessibilityLiveRegion="polite"
      pointerEvents="box-none"
    >
      <Ionicons name="sparkles" size={20} color="#fff" />
      <View style={styles.copy}>
        <Text style={styles.title}>Version {verdict.latest} is out</Text>
        <Text style={styles.body} numberOfLines={2}>
          {verdict.notes || 'Get the newest Sawa Cars from the store.'}
        </Text>
      </View>
      <Pressable accessibilityRole="button" style={styles.action} onPress={open}>
        <Text style={styles.actionText}>Get it</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Not now"
        hitSlop={10}
        onPress={() => { setDismissed(true); setStorePromptDismissal(verdict.latest); }}
      >
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.75)" />
      </Pressable>
    </View>
  );
}

const TAB_BAR_CLEARANCE = 68;

const styles = StyleSheet.create({
  // Sits ABOVE UpdateBanner's z-index so the two can never overlap illegibly.
  // In practice both showing at once is rare and harmless — one is a restart,
  // the other a store trip — but "rare" is not "impossible".
  wrap: {
    position: 'absolute', left: 0, right: 0, zIndex: 90,
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

  blockRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120, elevation: 120,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    alignItems: 'center', justifyContent: 'space-between',
  },
  blockBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  blockTitle: { fontSize: 24, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -0.5, marginTop: 8 },
  blockCopy: {
    fontSize: 14.5, lineHeight: 22, fontFamily: fonts.regular,
    color: colors.textSecondary, textAlign: 'center',
  },
  blockNotes: {
    fontSize: 13, lineHeight: 20, fontFamily: fonts.medium,
    color: colors.textMuted, textAlign: 'center',
  },
  blockButton: {
    alignSelf: 'stretch', alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16, borderRadius: radius.lg,
  },
  blockButtonText: { color: '#fff', fontSize: 15, fontFamily: fonts.bold },
  blockVersion: { marginTop: 12, fontSize: 11.5, fontFamily: fonts.regular, color: colors.textMuted },
});
