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
import { useApp } from '../context/AppContext';

export default function StoreUpdateGate() {
  const { t } = useApp();
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
      <View style={[styles.blockRoot, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.blockBody}>
          <LogoMark size={92} />
          <Text style={styles.blockTitle}>{t('updates.timeToUpdate')}</Text>
          <Text style={styles.blockCopy}>
            {t('updates.blockCopy')}
          </Text>
          {verdict.notes ? <Text style={styles.blockNotes}>{verdict.notes}</Text> : null}
        </View>
        <Pressable style={styles.blockButton} onPress={open} accessibilityRole="button">
          <Text style={styles.blockButtonText}>{t('updates.updateSawaCars')}</Text>
        </Pressable>
        <Text style={styles.blockVersion}>
          {t('updates.versionCompare', { current: verdict.current, latest: verdict.latest })}
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
        <Text style={styles.title}>{t('updates.versionOut', { latest: verdict.latest })}</Text>
        <Text style={styles.body} numberOfLines={2}>
          {verdict.notes || t('updates.getNewestStore')}
        </Text>
      </View>
      <Pressable accessibilityRole="button" style={styles.action} onPress={open}>
        <Text style={styles.actionText}>{t('updates.getIt')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('updates.notNow')}
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
  wrap: {
    position: 'absolute', left: 0, right: 0, zIndex: 90,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.inverseSurface,
    ...(shadows?.card || {}),
  },
  copy: { flex: 1 },
  title: { color: colors.inverseText, fontSize: 13, fontFamily: fonts.bold },
  body: { color: colors.inverseTextMuted, fontSize: 12, fontFamily: fonts.regular, marginTop: 1 },
  action: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  actionText: { color: '#fff', fontSize: 13, fontFamily: fonts.bold },

  blockRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120, elevation: 120,
    backgroundColor: colors.surface,
    paddingHorizontal: 28,
    alignItems: 'center', justifyContent: 'space-between',
  },
  blockBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  blockTitle: { fontSize: 24, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -0.5, marginTop: 8 },
  blockCopy: {
    fontSize: 15, lineHeight: 22, fontFamily: fonts.regular,
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
  blockVersion: { marginTop: 12, fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
});
