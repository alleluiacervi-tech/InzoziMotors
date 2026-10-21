import React, { useEffect, useState } from 'react';
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
import {
  checkForUpdate, applyUpdate, runningBuild, UPDATE_STATUS,
  getUpdateMode, setUpdateMode, UPDATE_MODE,
} from '../utils/updates';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme/ThemeContext';
import authApi from '../api/auth';
import api from '../api/client';
import { getJSON } from '../storage';
import { syncPushToken, getPushStatus, getPushPermission } from '../utils/push';
import {
  SAWA_WHATSAPP, SAWA_PHONE_DISPLAY, SAWA_EMAIL, WHATSAPP_VERIFIED,
} from '../utils/whatsapp';

// The legal texts live on the website so there is one wording, not two that
// drift. Play Store policy requires the privacy policy to be reachable from
// inside the app for anything handling sensitive data — and this app
// photographs national ID documents.
// The recovery window, and the list of reasons, both come from the server —
// GET /auth/closure-reasons — because the same vocabulary is a CHECK constraint
// there and two copies would eventually disagree about what can be stored.
// These are only what the screen renders before that answer arrives, or if it
// never does. Closing an account must work on a bad connection.
const RECOVERY_DAYS = 30;
const FALLBACK_REASONS = [
  { value: 'found_a_car', label: 'I found a car' },
  { value: 'sold_my_car', label: 'I sold my car' },
  { value: 'not_useful', label: "I didn't find what I was looking for" },
  { value: 'too_many_messages', label: 'Too many messages or notifications' },
  { value: 'privacy', label: "I don't want my details on the platform" },
  { value: 'bad_experience', label: 'I had a bad experience' },
  { value: 'duplicate_account', label: 'I have another account' },
  { value: 'other', label: 'Something else' },
];
// The server owns the VALUES (a CHECK constraint); the words shown come from
// the translations, keyed by value. An unknown value falls back to the label
// the server sent.
const REASON_KEYS = {
  found_a_car: 'settings.reasonFound',
  sold_my_car: 'settings.reasonSold',
  not_useful: 'settings.reasonNotUseful',
  too_many_messages: 'settings.reasonTooMany',
  privacy: 'settings.reasonPrivacy',
  bad_experience: 'settings.reasonBad',
  duplicate_account: 'settings.reasonDuplicate',
  other: 'settings.reasonOther',
};

const SITE_URL = (Constants.expoConfig?.extra?.siteUrl || 'https://sawacars.com').replace(/\/+$/, '');
const LEGAL = {
  privacy: `${SITE_URL}/legal/privacy`,
  terms: `${SITE_URL}/legal/terms`,
  guarantee: `${SITE_URL}/legal/guarantee`,
};

async function openLink(url, failedMessage) {
  try {
    await Linking.openURL(url);
  } catch {
    showToast(failedMessage, 'error');
  }
}

// Rows that promise nothing they can't deliver. The dead toggles went first
// (they flipped local state and did nothing); the "coming soon" rows went
// next — a settings row whose only behaviour is announcing a future feature
// is exactly what a store reviewer probes as non-functional (guideline 4.2).
// All user-facing settings labels come through the same translation function as
// the language picker. This keeps the selector useful even when the user cannot
// read the default English screen.
// Settings rows saved on the account (PATCH /auth/me), by toggle id.
const ACCOUNT_TOGGLE_FIELDS = {
  messageEmail: 'message_email_notifications',
  alertSearch: 'alert_search_matches',
  alertPrice: 'alert_price_drops',
  alertDigest: 'alert_daily_digest',
};

const buildGroups = (t, verificationValue, buildLabel, languageLabel, appearanceLabel, showTestPush, signedIn) => [
  {
    title: t('settings.account'),
    items: [
      { icon: 'shield-checkmark-outline', label: t('settings.verification'), value: verificationValue, screen: 'IDVerification' },
      { icon: 'notifications-outline', label: t('settings.savedSearches'), screen: 'Saved' },
    ],
  },
  {
    title: t('settings.preferences'),
    items: [
      { icon: 'language-outline', label: t('settings.language'), value: languageLabel, screen: 'Language' },
      { icon: 'contrast-outline', label: t('settings.appearance'), value: appearanceLabel, screen: 'Appearance' },
      { icon: 'notifications-outline', label: t('settings.push'), toggle: 'push' },
      ...(showTestPush ? [{ icon: 'paper-plane-outline', label: t('settings.testPush'), action: 'testPush' }] : []),
      // The same switch the website has: one email at most per conversation per
      // hour, only when no session is open, never the message itself.
      ...(signedIn ? [{ icon: 'mail-outline', label: t('settings.messageEmails'), sub: t('settings.messageEmailsHint'), toggle: 'messageEmail' }] : []),
    ],
  },
  // The two alerts Sawa sends on its own. Saved per account, so they apply on
  // every phone and the website; each saved search keeps its own switch too.
  ...(signedIn ? [{
    title: t('settings.alerts'),
    items: [
      { icon: 'search-outline', label: t('settings.alertSearchMatches'), sub: t('settings.alertSearchMatchesHint'), toggle: 'alertSearch' },
      { icon: 'trending-down-outline', label: t('settings.alertPriceDrops'), sub: t('settings.alertPriceDropsHint'), toggle: 'alertPrice' },
      // Off until the person turns it on: a summary of every new car is
      // promotional, which the App Store only allows with explicit opt-in.
      { icon: 'newspaper-outline', label: t('settings.alertDailyDigest'), sub: t('settings.alertDailyDigestHint'), toggle: 'alertDigest' },
    ],
  }] : []),
  {
    // The Support group used to offer no way to reach support: an intro replay
    // and a coming-soon rating row. Both are gone — replaying a first-run tour
    // is not support, and it was the only thing in Settings that led BACKWARDS
    // into the launch sequence. The rows below are the same single business
    // line and single mailbox the website publishes, and they are
    // gated on WHATSAPP_VERIFIED for the same reason every other surface is —
    // a dead contact row is worse than none.
    title: t('settings.support'),
    items: [
      ...(WHATSAPP_VERIFIED
        ? [
            {
              icon: 'logo-whatsapp',
              label: t('settings.whatsapp'),
              value: SAWA_PHONE_DISPLAY,
              link: `https://wa.me/${SAWA_WHATSAPP}`,
            },
            {
              icon: 'call-outline',
              label: t('settings.call'),
              value: SAWA_PHONE_DISPLAY,
              link: `tel:+${SAWA_WHATSAPP}`,
            },
          ]
        : []),
      { icon: 'mail-outline', label: t('settings.email'), value: SAWA_EMAIL, link: `mailto:${SAWA_EMAIL}` },
      { icon: 'pricetag-outline', label: t('settings.serviceFees'), screen: 'ServiceFees' },
    ],
  },
  {
    // What is actually running, and the way to get what is newer. The version
    // alone is useless for support — every install reports 1.0.0 — so the row
    // shows the running bundle, which is what actually differs between two
    // phones that were updated on different days.
    title: t('settings.app'),
    items: [
      { icon: 'refresh-outline', label: t('settings.checkUpdates'), action: 'checkUpdate', value: buildLabel },
      // Off by default. A first launch has no basis for assuming somebody
      // consents to the app restarting itself, and an update that arrives
      // without being asked for should still be announced rather than done.
      { icon: 'cloud-download-outline', label: t('settings.autoUpdate'), toggle: 'autoUpdate' },
    ],
  },
  {
    title: t('settings.legal'),
    items: [
      { icon: 'lock-closed-outline', label: t('settings.privacy'), link: LEGAL.privacy },
      { icon: 'document-text-outline', label: t('settings.terms'), link: LEGAL.terms },
      { icon: 'shield-checkmark-outline', label: t('settings.directDeal'), link: LEGAL.guarantee },
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
  const {
    isLoggedIn, deleteAccount, setPushEnabled, idVerificationStatus,
    languageInfo, t, currentUser, updateCurrentUserProfile,
  } = useApp();
  const { mode: themeMode } = useTheme();

  // Persisted, and actually wired: off tells the server to forget this device.
  const [pushOn, setPushOn] = useState(true);
  // Off only when the account says so explicitly; the server default is on.
  // Account switches: each is on unless the account says false (the server
  // default is on), and follows the account when it changes.
  const accountToggles = React.useMemo(() => ({
    messageEmail: currentUser?.message_email_notifications !== false,
    alertSearch: currentUser?.alert_search_matches !== false,
    alertPrice: currentUser?.alert_price_drops !== false,
    alertDigest: currentUser?.alert_daily_digest === true, // the one switch that starts OFF
  }), [currentUser?.message_email_notifications, currentUser?.alert_search_matches, currentUser?.alert_price_drops, currentUser?.alert_daily_digest]);
  const [accountOn, setAccountOn] = useState(accountToggles);
  React.useEffect(() => { setAccountOn(accountToggles); }, [accountToggles]);
  // Whether a downloaded update applies itself on the next return to the app.
  const [autoUpdateOn, setAutoUpdateOn] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  // Read once: it describes the bundle currently running and cannot change
  // without a relaunch.
  const build = runningBuild();
  React.useEffect(() => {
    let alive = true;
    // The switch must mean what it says. It used to read only our own saved
    // preference (default on), so a phone that was never asked for notification
    // permission (or had refused it) showed "on" and a test button while nothing
    // was registered. It is on only if we want push AND the phone allows it.
    Promise.all([getJSON('pushEnabled', true), getPushPermission()]).then(([enabled, permission]) => {
      if (alive) setPushOn(enabled !== false && permission === 'granted');
    });
    getUpdateMode().then((m) => { if (alive) setAutoUpdateOn(m === UPDATE_MODE.AUTOMATIC); });
    return () => { alive = false; };
  }, []);

  // The auto-update preference. Purely local — nothing to register with a
  // server, so unlike push it cannot fail and be left disagreeing with reality.
  const handleAutoUpdateToggle = async () => {
    const next = !autoUpdateOn;
    setAutoUpdateOn(next);
    await setUpdateMode(next ? UPDATE_MODE.AUTOMATIC : UPDATE_MODE.ASK);
    showToast(
      next
        ? t('settings.autoUpdateOn')
        : t('settings.autoUpdateOff'),
      'success',
    );
  };

  const handleAccountToggle = async (which) => {
    const next = !accountOn[which];
    setAccountOn((prev) => ({ ...prev, [which]: next }));
    try {
      await updateCurrentUserProfile({ [ACCOUNT_TOGGLE_FIELDS[which]]: next });
    } catch {
      // Show what the server actually holds, not the tap.
      setAccountOn((prev) => ({ ...prev, [which]: !next }));
      showToast(t('settings.genericError'), 'error');
    }
  };

  const toggleValue = (which) => {
    if (which === 'autoUpdate') return autoUpdateOn;
    if (which in ACCOUNT_TOGGLE_FIELDS) return accountOn[which];
    return pushOn;
  };

  const handleToggle = (which) => {
    if (which === 'autoUpdate') return handleAutoUpdateToggle();
    if (which in ACCOUNT_TOGGLE_FIELDS) return handleAccountToggle(which);
    return handlePushToggle();
  };

  const handlePushToggle = async () => {
    const next = !pushOn;
    setPushOn(next);
    const ok = await setPushEnabled(next).catch(() => false);
    if (next && !ok) {
      // Permission denied or registration failed — reflect reality, not the tap.
      setPushOn(false);
      showToast(t('settings.pushError'), 'error');
    }
  };

  const VERIFICATION_LABELS = {
    approved: t('settings.verified'),
    pending: t('settings.underReview'),
    rejected: t('settings.actionNeeded'),
  };
  const groups = buildGroups(
    t,
    VERIFICATION_LABELS[idVerificationStatus] || t('settings.notVerified'),
    // The row doubles as the progress indicator: a tap that changes nothing on
    // screen is indistinguishable from a tap that missed.
    checkingUpdate ? t('common.loading') : `v${build.version}`,
    languageInfo.nativeLabel,
    t(`appearance.${themeMode}`),
    isLoggedIn && pushOn,
    isLoggedIn,
  );

  // Deletion state. A dedicated modal rather than showConfirm(), because this
  // needs a password field and needs to show the server's specific refusal.
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Asked because the answer is worth having, and required because a reason
  // list nobody fills in tells the business nothing. The vocabulary is fetched
  // rather than duplicated here: the server has a CHECK constraint on it, and
  // two hardcoded lists would eventually disagree about what is storable.
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [reasons, setReasons] = useState(FALLBACK_REASONS);
  useEffect(() => {
    let alive = true;
    authApi.closureReasons()
      .then((data) => { if (alive && data?.reasons?.length) setReasons(data.reasons); })
      .catch(() => {});   // the bundled list is already usable
    return () => { alive = false; };
  }, []);
  const [password, setPassword] = useState('');
  // An account opened with Google or Apple has no password to confirm with;
  // unknown (an older cached profile) still asks, and the server decides.
  const needsPassword = currentUser?.has_password !== false;
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Asks the server to push to THIS account's devices and reports what Expo
  // said for each, so "nothing arrived" can be told apart from "never sent".
  const sendTestPush = async () => {
    try {
      // First make sure the server has THIS phone's current address (no OS
      // prompt). A registration that failed at launch for a passing reason heals
      // here, and if it still fails the reason is fresh. Without an address there
      // is nothing to test, and the reason is the useful answer.
      const token = await syncPushToken({ prompt: false });
      if (!token) {
        const { stage, detail } = getPushStatus();
        showToast(`${t('settings.testPushNone')} (${stage}${detail ? `: ${detail}` : ''})`, 'error');
        return;
      }
      const { devices } = await api.post('/devices/test', {});
      // Judge by THIS kind of phone only (iPhone rows for an iPhone, Android rows
      // for an Android phone). The account may also have another phone, a browser,
      // or an old address from an earlier build; counting them let an iPhone with
      // no registered address say "Test sent" just because the Android phone
      // worked. The Expo/Apple/Google error code is appended as-is (it reads the
      // same in every language) so a credentials problem can be told from a
      // phone problem without the server logs.
      const mine = (devices || []).filter((d) => d.platform === Platform.OS);
      if (!mine.length) showToast(t('settings.testPushNone'), 'error');
      else if (mine.some((d) => d.ok)) showToast(t('settings.testPushSent'), 'success');
      else showToast(`${t('settings.testPushFailed')} (${mine[0].error || 'Error'})`, 'error');
    } catch (err) {
      showToast(err?.status === 429 ? t('settings.testPushWait') : t('settings.testPushFailed'), 'error');
    }
  };

  const handleItemPress = (item) => {
    if (item.action === 'checkUpdate') {
      runUpdateCheck();
    } else if (item.action === 'testPush') {
      sendTestPush();
    } else if (item.screen) {
      navigation.navigate(item.screen);
    } else if (item.link) {
      openLink(item.link, t('settings.openFailed'));
    }
  };

  // Every outcome says something. A button that goes quiet reads as broken, and
  // "you are already up to date" is a useful answer, not a non-event.
  const runUpdateCheck = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const { status } = await checkForUpdate();
      if (status === UPDATE_STATUS.AVAILABLE) {
        const ok = await showConfirm({
          title: t('updates.newVersionReady'),
          message: t('settings.updateReadyBody'),
          confirmLabel: t('settings.restartNow'),
          cancelLabel: t('settings.later'),
        });
        if (ok) await applyUpdate();
      } else if (status === UPDATE_STATUS.CURRENT) {
        showToast(t('settings.upToDate'), 'success');
      } else if (status === UPDATE_STATUS.UNSUPPORTED) {
        // Expo Go or a development build: the bundle comes from Metro, so
        // there is nothing to fetch. Saying so beats a check that never
        // succeeds and never explains why.
        showToast(t('settings.updateUnsupported'), 'info');
      } else {
        showToast(t('settings.updateUnreachable'), 'error');
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const askToDelete = async () => {
    const ok = await showConfirm({
      title: t('settings.closeConfirmTitle'),
      message: t('settings.closeConfirmBody', { days: RECOVERY_DAYS }),
      confirmLabel: t('settings.continue'),
      cancelLabel: t('settings.keepAccount'),
      destructive: true,
    });
    if (!ok) return;
    setPassword('');
    setDeleteError('');
    setReason(null);
    setNote('');
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!reason) {
      setDeleteError(t('settings.chooseReason'));
      return;
    }
    if (needsPassword && !password) {
      setDeleteError(t('settings.enterPassword'));
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      const result = await deleteAccount(needsPassword ? password : undefined, reason, note);
      setDeleteOpen(false);
      // The date, not "your account has been deleted". Somebody who closes by
      // mistake — or in anger, or on somebody else's phone — needs to leave
      // this screen knowing there is a way back and when it expires.
      const until = result?.reopen_until
        ? String(result.reopen_until).slice(0, 10)
        : null;
      await showConfirm({
        title: t('settings.closedTitle'),
        message: until
          ? t('settings.closedBodyUntil', { date: until })
          : t('settings.closedBody'),
        confirmLabel: t('settings.done'),
        hideCancel: true,
      });
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    } catch (err) {
      if (err?.status === 409) {
        setDeleteError(err.message || t('settings.deleteBlocked'));
      } else if (err?.status === 401) {
        setDeleteError(t('settings.wrongPassword'));
      } else if (err?.isNetworkError) {
        setDeleteError(t('settings.networkError'));
      } else {
        setDeleteError(err?.message || t('settings.genericError'));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('settings.title')} onBack={() => navigation.goBack()} />
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
                    onPress={() => (isToggle ? handleToggle(item.toggle) : handleItemPress(item))}
                    accessibilityRole={isToggle ? 'switch' : 'button'}
                    accessibilityState={isToggle ? { checked: toggleValue(item.toggle) } : undefined}
                  >
                    <View style={styles.itemIcon}>
                      <Ionicons name={item.icon} size={20} color={colors.slate700} />
                    </View>
                    {item.sub ? (
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemLabelText}>{item.label}</Text>
                        <Text style={styles.itemSub}>{item.sub}</Text>
                      </View>
                    ) : (
                      <Text style={styles.itemLabel}>{item.label}</Text>
                    )}
                    {isToggle ? (
                      <Toggle on={toggleValue(item.toggle)} />
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

        {/* Closing has to be reachable from inside the app AND has to complete
            here — Apple Guideline 5.1.1(v) and Google Play both require it of
            any app with accounts, and a request that waits for somebody's
            approval does not satisfy either. So this button really does close
            the account; what it does not do is erase it for thirty days.
            Kept visually separate and last, so it is never a mis-tap. */}
        {isLoggedIn && (
          <View style={{ marginBottom: 22 }}>
            <Text style={styles.groupTitle}>{t('settings.danger')}</Text>
            <View style={styles.group}>
              <Pressable style={styles.item} onPress={askToDelete}>
                <View style={styles.itemIcon}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, { color: colors.danger }]}>{t('settings.closeAccount')}</Text>
                  <Text style={styles.itemHint}>
                    {t('settings.closeHint', { days: RECOVERY_DAYS })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        )}

        <Text style={styles.version}>
          {t('settings.versionLabel', { version: build.version })}
        </Text>
      </ScrollView>

      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.beforeYouGo')}</Text>
            <Text style={styles.modalBody}>{t('settings.closeWhy')}</Text>

            {/* Scrollable: eight reasons plus a password field does not fit on
                a small handset above the keyboard, and a confirm button the
                user cannot reach is a dead end in a flow both app stores
                require to work. */}
            <ScrollView style={styles.reasonScroll} keyboardShouldPersistTaps="handled">
              {reasons.map((option) => {
                const on = reason === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.reasonRow, on && styles.reasonRowOn]}
                    onPress={() => { setReason(option.value); setDeleteError(''); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    disabled={deleting}
                  >
                    <Ionicons
                      name={on ? 'radio-button-on' : 'radio-button-off'}
                      size={19}
                      color={on ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.reasonText, on && styles.reasonTextOn]}>{REASON_KEYS[option.value] ? t(REASON_KEYS[option.value]) : option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <TextInput
              style={styles.modalNote}
              placeholder={t('settings.closeNote')}
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={500}
              editable={!deleting}
            />

            {needsPassword ? (
            <TextInput
              style={[styles.modalInput, !!deleteError && styles.modalInputError]}
              placeholder={t('settings.password')}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={(t) => { setPassword(t); setDeleteError(''); }}
              secureTextEntry
              autoCapitalize="none"
              editable={!deleting}
            />
            ) : null}
            {!!deleteError && <Text style={styles.modalError}>{deleteError}</Text>}

            <Pressable
              style={[styles.modalDanger, deleting && { opacity: 0.6 }]}
              onPress={confirmDelete}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.modalDangerText}>{t('settings.closeAccount')}</Text>}
            </Pressable>
            <Pressable
              style={styles.modalCancel}
              onPress={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
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
  itemLabelText: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.textPrimary },
  itemSub: { marginTop: 3, fontSize: 12, lineHeight: 16, color: colors.textMuted },
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
  reasonScroll: { marginTop: 14, maxHeight: 232 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingHorizontal: 10,
    borderRadius: radius.lg, borderWidth: 1, borderColor: 'transparent',
  },
  reasonRowOn: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  reasonText: { flex: 1, fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary },
  reasonTextOn: { fontFamily: fonts.semiBold, color: colors.textPrimary },
  modalNote: {
    marginTop: 12, minHeight: 62, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10,
    fontSize: 14, fontFamily: fonts.regular, color: colors.textPrimary,
    textAlignVertical: 'top',
  },
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
