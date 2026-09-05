import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fonts, shadows } from '../theme';
import { useApp } from '../context/AppContext';

let toastFn = null;
let confirmFn = null;
let sheetFn = null;

export function showToast(message, type = 'info') {
  if (toastFn) toastFn(message, type);
}

export function showConfirm(opts) {
  return confirmFn ? confirmFn(opts) : Promise.resolve(false);
}

export function showActionSheet(opts) {
  return sheetFn ? sheetFn(opts) : Promise.resolve(-1);
}

const TOAST_META = {
  success: { icon: 'checkmark-circle', color: colors.greenLight },
  error: { icon: 'alert-circle', color: '#F58FA4' },
  info: { icon: 'information-circle', color: 'rgba(255,255,255,0.85)' },
};

export default function FeedbackHost() {
  const { t } = useApp();
  const insets = useSafeAreaInsets();

  // ── Toast ──
  const [toast, setToast] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef(null);

  useEffect(() => {
    toastFn = (message, type) => {
      clearTimeout(hideTimer.current);
      setToast({ message, type });
      Animated.spring(anim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 260, useNativeDriver: true })
          .start(() => setToast(null));
      }, 2800);
    };
    return () => { toastFn = null; clearTimeout(hideTimer.current); };
  }, []);

  // ── Confirm sheet ──
  const [confirm, setConfirm] = useState(null);
  useEffect(() => {
    confirmFn = (opts) => new Promise((resolve) => setConfirm({ ...opts, resolve }));
    return () => { confirmFn = null; };
  }, []);
  const close = (result) => {
    if (confirm) confirm.resolve(result);
    setConfirm(null);
  };

  // ── Action sheet ──
  const [sheet, setSheet] = useState(null);
  useEffect(() => {
    sheetFn = (opts) => new Promise((resolve) => setSheet({ ...opts, resolve }));
    return () => { sheetFn = null; };
  }, []);
  const closeSheet = (index) => {
    if (sheet) sheet.resolve(index);
    setSheet(null);
  };

  const meta = toast ? (TOAST_META[toast.type] || TOAST_META.info) : null;

  return (
    <>
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              bottom: insets.bottom + 84,
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          <Ionicons name={meta.icon} size={17} color={meta.color} />
          <Text style={styles.toastText} numberOfLines={2}>{toast.message}</Text>
        </Animated.View>
      )}

      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => close(false)}>
        <Pressable style={styles.backdrop} onPress={() => close(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>{confirm?.title}</Text>
            {confirm?.message ? <Text style={styles.sheetMessage}>{confirm.message}</Text> : null}
            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                confirm?.destructive && styles.confirmBtnDanger,
                pressed && styles.controlPressed,
              ]}
              onPress={() => close(true)}
              accessibilityRole="button"
              accessibilityLabel={confirm?.confirmLabel || t('common.confirm')}
            >
              <Text style={styles.confirmBtnText}>{confirm?.confirmLabel || t('common.confirm')}</Text>
            </Pressable>
            {confirm?.hideCancel ? null : (
              <Pressable style={({ pressed }) => [styles.cancelBtn, pressed && styles.controlPressed]} onPress={() => close(false)} hitSlop={6} accessibilityRole="button">
                <Text style={styles.cancelBtnText}>{confirm?.cancelLabel || t('common.cancel')}</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={() => closeSheet(-1)}>
        <Pressable style={styles.backdrop} onPress={() => closeSheet(-1)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>{sheet?.title}</Text>
            {sheet?.message ? <Text style={styles.sheetMessage}>{sheet.message}</Text> : null}
            <View style={styles.optionList}>
              {(sheet?.options || []).map((opt, i) => (
                <Pressable key={opt.label} style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]} onPress={() => closeSheet(i)} accessibilityRole="button" accessibilityLabel={opt.label}>
                  {opt.icon ? <Ionicons name={opt.icon} size={19} color={colors.textSecondary} /> : null}
                  <Text style={styles.optionText}>{opt.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
            <Pressable style={({ pressed }) => [styles.cancelBtn, pressed && styles.controlPressed]} onPress={() => closeSheet(-1)} hitSlop={6} accessibilityRole="button">
              <Text style={styles.cancelBtnText}>{sheet?.cancelLabel || t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: colors.navyDeep,
    borderRadius: radius.xl,
    paddingHorizontal: 16, paddingVertical: 13,
    zIndex: 200, elevation: 200,
    ...shadows.floating,
  },
  toastText: { flex: 1, fontSize: 13.5, fontFamily: fonts.semiBold, color: '#FFFFFF', lineHeight: 19 },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,12,10,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center', width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, marginBottom: 18,
  },
  sheetTitle: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.3 },
  sheetMessage: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginTop: 8 },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl, minHeight: 52, paddingHorizontal: 20, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  confirmBtnDanger: { backgroundColor: colors.danger },
  confirmBtnText: { fontSize: 15, fontFamily: fonts.extraBold, color: '#FFFFFF' },
  optionList: { marginTop: 18, gap: 8 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl, minHeight: 52, paddingHorizontal: 16, paddingVertical: 14,
  },
  optionRowPressed: { backgroundColor: colors.borderSoft },
  optionText: { flex: 1, fontSize: 15, fontFamily: fonts.bold, color: colors.textPrimary },
  cancelBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 2 },
  cancelBtnText: { fontSize: 14, fontFamily: fonts.bold, color: colors.textSecondary },
  controlPressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
});
