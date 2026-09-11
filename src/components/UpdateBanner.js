import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts, shadows } from '../theme';
import {
  checkForUpdate, applyUpdate, updatesEnabled, UPDATE_STATUS,
  getUpdateMode, UPDATE_MODE,
} from '../utils/updates';
import { useApp } from '../context/AppContext';

export default function UpdateBanner() {
  const { t } = useApp();
  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const appState = useRef(AppState.currentState);
  const pendingAuto = useRef(false);
  const insets = useSafeAreaInsets();

  const look = useCallback(async (returning) => {
    const mode = await getUpdateMode();

    if (mode === UPDATE_MODE.AUTOMATIC && returning && pendingAuto.current) {
      if (await applyUpdate()) return;
      pendingAuto.current = false;
    }

    const { status } = await checkForUpdate();
    if (status !== UPDATE_STATUS.AVAILABLE) return;

    if (mode === UPDATE_MODE.AUTOMATIC) {
      pendingAuto.current = true;
      return;
    }

    setDismissed(false);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!updatesEnabled()) return undefined;
    look(false);
    const sub = AppState.addEventListener('change', (next) => {
      const returning = appState.current.match(/inactive|background/) && next === 'active';
      appState.current = next;
      if (returning) look(true);
    });
    return () => sub.remove();
  }, [look]);

  if (!ready || dismissed) return null;

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}
      accessibilityLiveRegion="polite"
      pointerEvents="box-none"
    >
      <Ionicons name="arrow-down-circle" size={20} color="#fff" />
      <View style={styles.copy}>
        <Text style={styles.title}>{t('updates.newVersionReady')}</Text>
        <Text style={styles.body}>{t('updates.restartCopy')}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        style={styles.action}
        disabled={applying}
        onPress={async () => {
          setApplying(true);
          const ok = await applyUpdate();
          if (!ok) setApplying(false);
        }}
      >
        <Text style={styles.actionText}>{applying ? t('updates.restarting') : t('updates.restart')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('updates.dismiss')}
        hitSlop={10}
        onPress={() => setDismissed(true)}
      >
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.75)" />
      </Pressable>
    </View>
  );
}

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
  body: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontFamily: fonts.regular, marginTop: 1 },
  action: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  actionText: { color: '#fff', fontSize: 13, fontFamily: fonts.bold },
});
