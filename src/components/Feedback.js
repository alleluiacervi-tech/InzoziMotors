import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fonts, shadows } from '../theme';

// Branded feedback layer — replaces OS Alert popups.
//   showToast(message, 'success' | 'error' | 'info')  — calm bottom snackbar
//   await showConfirm({ title, message, confirmLabel, cancelLabel, destructive })
// Mount <FeedbackHost /> once (App.js); the imperative API works anywhere.
let toastFn = null;
let confirmFn = null;

export function showToast(message, type = 'info') {
  if (toastFn) toastFn(message, type);
}

export function showConfirm(opts) {
  return confirmFn ? confirmFn(opts) : Promise.resolve(false);
}

const TOAST_META = {
  success: { icon: 'checkmark-circle', color: colors.greenLight },
  error: { icon: 'alert-circle', color: '#F58FA4' },
  info: { icon: 'information-circle', color: 'rgba(255,255,255,0.85)' },
};

export default function FeedbackHost() {
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
              style={[styles.confirmBtn, confirm?.destructive && styles.confirmBtnDanger]}
              onPress={() => close(true)}
            >
              <Text style={styles.confirmBtnText}>{confirm?.confirmLabel || 'Confirm'}</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => close(false)} hitSlop={6}>
              <Text style={styles.cancelBtnText}>{confirm?.cancelLabel || 'Cancel'}</Text>
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
    borderRadius: radius.xl, paddingVertical: 15,
    alignItems: 'center', marginTop: 20,
  },
  confirmBtnDanger: { backgroundColor: colors.danger },
  confirmBtnText: { fontSize: 15, fontFamily: fonts.extraBold, color: '#FFFFFF' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 2 },
  cancelBtnText: { fontSize: 14, fontFamily: fonts.bold, color: colors.textSecondary },
});
