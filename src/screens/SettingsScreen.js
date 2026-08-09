import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Linking, Modal, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, radius, fonts } from '../theme';
import { showToast, showConfirm } from '../components/Feedback';
import { useApp } from '../context/AppContext';
import { getJSON } from '../storage';
import {
  SAWA_WHATSAPP, SAWA_PHONE_DISPLAY, SAWA_EMAIL, WHATSAPP_VERIFIED,
} from '../utils/whatsapp';

// The legal texts live on the website so there is one wording, not two that
// drift. Play Store policy requires the privacy policy to be reachable from
// inside the app for anything handling sensitive data — and this app
// photographs national ID documents.
const SITE_URL = (Constants.expoConfig?.extra?.siteUrl || 'https://sawacars.com').replace(/\/+$/, '');
const LEGAL = {
  privacy: `${SITE_URL}/legal/privacy`,
  terms: `${SITE_URL}/legal/terms`,
  guarantee: `${SITE_URL}/legal/guarantee`,
};

async function openLink(url) {
  try {
    await Linking.openURL(url);
  } catch {
    showToast('Could not open the page. Please try again.', 'error');
  }
}

// Rows that promise nothing they can't deliver. The dead toggles went first
// (they flipped local state and did nothing); the "coming soon" rows went
// next — a settings row whose only behaviour is announcing a future feature
// is exactly what a store reviewer probes as non-functional (guideline 4.2).
// Edit-profile, language and rate-us return WHEN they work.
const buildGroups = (verificationValue) => [
  {
    title: 'Account',
    items: [
      { icon: 'shield-checkmark-outline', label: 'Verification & trust', value: verificationValue, screen: 'IDVerification' },
      { icon: 'notifications-outline', label: 'Saved searches', screen: 'Saved' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: 'notifications-outline', label: 'Push notifications', toggle: true },
    ],
  },
  {
    // The Support group used to offer no way to reach support: an intro replay
    // and a coming-soon rating row. The three rows below are the same single
    // business line and single mailbox the website publishes, and they are
    // gated on WHATSAPP_VERIFIED for the same reason every other surface is —
    // a dead contact row is worse than none.
    title: 'Support',
    items: [
      ...(WHATSAPP_VERIFIED
        ? [
            {
              icon: 'logo-whatsapp',
              label: 'WhatsApp us',
              value: SAWA_PHONE_DISPLAY,
              link: `https://wa.me/${SAWA_WHATSAPP}`,
            },
            {
              icon: 'call-outline',
              label: 'Call us',
              value: SAWA_PHONE_DISPLAY,
              link: `tel:+${SAWA_WHATSAPP}`,
            },
          ]
        : []),
      { icon: 'mail-outline', label: 'Email us', value: SAWA_EMAIL, link: `mailto:${SAWA_EMAIL}` },
      { icon: 'play-circle-outline', label: 'Replay intro', screen: 'Onboarding' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { icon: 'lock-closed-outline', label: 'Privacy policy', link: LEGAL.privacy },
      { icon: 'document-text-outline', label: 'Terms of service', link: LEGAL.terms },
      { icon: 'shield-checkmark-outline', label: '7-day guarantee terms', link: LEGAL.guarantee },
    ],
  },
];

function Toggle({ on }) {
  return (
    <View style={[styles.switch, on ? styles.switchOn : styles.switchOff]}>
      <View style={[styles.switchKnob, on ? styles.knobOn : styles.knobOff]} />
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const { isLoggedIn, deleteAccount, setPushEnabled, idVerificationStatus } = useApp();

  // Persisted, and actually wired: off tells the server to forget this device.
  const [pushOn, setPushOn] = useState(true);
  React.useEffect(() => {
    let alive = true;
    getJSON('pushEnabled', true).then((v) => { if (alive) setPushOn(v !== false); });
    return () => { alive = false; };
  }, []);

  const handlePushToggle = async () => {
    const next = !pushOn;
    setPushOn(next);
    const ok = await setPushEnabled(next).catch(() => false);
    if (next && !ok) {
      // Permission denied or registration failed — reflect reality, not the tap.
      setPushOn(false);
      showToast('Push could not be enabled. Check notification permissions in your phone settings.', 'error');
    }
  };

  const VERIFICATION_LABELS = {
    approved: 'Verified',
    pending: 'Under review',
    rejected: 'Action needed',
  };
  const groups = buildGroups(VERIFICATION_LABELS[idVerificationStatus] || 'Not verified');

  // Deletion state. A dedicated modal rather than showConfirm(), because this
  // needs a password field and needs to show the server's specific refusals —
  // "wrong password" and "you have a handover open" call for different actions
  // from the user, and a toast that says neither is useless.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleItemPress = (item) => {
    if (item.screen) {
      navigation.navigate(item.screen);
    } else if (item.link) {
      openLink(item.link);
    }
  };

  const askToDelete = async () => {
    const ok = await showConfirm({
      title: 'Delete your account?',
      message:
        'This removes your profile, saved cars, saved searches and identity documents for good. ' +
        'Records of cars you have already bought or sold are kept, as the law requires. This cannot be undone.',
      confirmLabel: 'Continue',
      cancelLabel: 'Keep my account',
      destructive: true,
    });
    if (!ok) return;
    setPassword('');
    setDeleteError('');
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!password) {
      setDeleteError('Enter your password to confirm.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount(password);
      setDeleteOpen(false);
      showToast('Your account has been deleted.', 'success');
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    } catch (err) {
      // 409 is the open-handover guard: actionable, so say what to do about it.
      if (err?.status === 409) {
        setDeleteError(err.message || 'Finish or cancel your open handover first.');
      } else if (err?.status === 401) {
        setDeleteError('That password is not correct.');
      } else if (err?.isNetworkError) {
        setDeleteError("We couldn't reach Sawa Cars. Check your connection and try again.");
      } else {
        setDeleteError(err?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 30 }}>
        {groups.map((g) => (
          <View key={g.title} style={{ marginBottom: 22 }}>
            <Text style={styles.groupTitle}>{g.title}</Text>
            <View style={styles.group}>
              {g.items.map((item, i) => {
                const isToggle = 'toggle' in item;
                const navigates = Boolean(item.screen || item.link);
                return (
                  <Pressable
                    key={item.label}
                    style={[styles.item, i < g.items.length - 1 && styles.itemBorder]}
                    onPress={() => (isToggle ? handlePushToggle() : handleItemPress(item))}
                  >
                    <View style={styles.itemIcon}>
                      <Ionicons name={item.icon} size={20} color={colors.slate700} />
                    </View>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    {isToggle ? (
                      <Toggle on={pushOn} />
                    ) : (
                      <View style={styles.itemRight}>
                        {item.value ? <Text style={styles.itemValue}>{item.value}</Text> : null}
                        {/* A chevron promises navigation — coming-soon rows don't get one */}
                        {navigates && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* Deletion has to be reachable from inside the app — Apple Guideline
            5.1.1(v) and Google Play both require it of any app with accounts.
            Kept visually separate and last, so it is never a mis-tap. */}
        {isLoggedIn && (
          <View style={{ marginBottom: 22 }}>
            <Text style={styles.groupTitle}>Danger zone</Text>
            <View style={styles.group}>
              <Pressable style={styles.item} onPress={askToDelete}>
                <View style={styles.itemIcon}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, { color: colors.danger }]}>Delete my account</Text>
                  <Text style={styles.itemHint}>Permanent. Your data is erased.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        )}

        <Text style={styles.version}>Sawa Cars v1.0.0</Text>
      </ScrollView>

      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm deletion</Text>
            <Text style={styles.modalBody}>
              Enter your password to permanently delete your Sawa Cars account.
            </Text>

            <TextInput
              style={[styles.modalInput, !!deleteError && styles.modalInputError]}
              placeholder="Your password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={(t) => { setPassword(t); setDeleteError(''); }}
              secureTextEntry
              autoCapitalize="none"
              editable={!deleting}
            />
            {!!deleteError && <Text style={styles.modalError}>{deleteError}</Text>}

            <Pressable
              style={[styles.modalDanger, deleting && { opacity: 0.6 }]}
              onPress={confirmDelete}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.modalDangerText}>Delete my account</Text>}
            </Pressable>
            <Pressable
              style={styles.modalCancel}
              onPress={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textSecondary, letterSpacing: 0.3, marginBottom: 10, marginLeft: 4, textTransform: 'uppercase' },
  group: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  itemIcon: { width: 36, alignItems: 'center' },
  itemLabel: { flex: 1, fontSize: 15, fontFamily: fonts.semiBold, color: colors.textPrimary },
  itemHint: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 22 },
  modalTitle: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary },
  modalBody: { fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
  modalInput: {
    marginTop: 18, height: 48, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 14,
    fontSize: 15, fontFamily: fonts.regular, color: colors.textPrimary,
  },
  modalInputError: { borderColor: colors.danger },
  modalError: { marginTop: 8, fontSize: 13, fontFamily: fonts.medium, color: colors.danger },
  modalDanger: {
    marginTop: 18, height: 50, borderRadius: radius.lg, backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  modalDangerText: { fontSize: 15, fontFamily: fonts.extraBold, color: '#FFFFFF' },
  modalCancel: { marginTop: 10, height: 46, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 15, fontFamily: fonts.bold, color: colors.textSecondary },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemValue: { fontSize: 14, color: colors.textSecondary },
  switch: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: colors.primary, alignItems: 'flex-end' },
  switchOff: { backgroundColor: colors.border, alignItems: 'flex-start' },
  switchKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  knobOn: {},
  knobOff: {},
  version: { textAlign: 'center', fontSize: 13, color: colors.textMuted, marginTop: 6 },
});
