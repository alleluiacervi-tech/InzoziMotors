// ─────────────────────────────────────────────────────────────────────────────
// Apple and Google sign-in as a row of two icon buttons, with an "or" rule
// beneath. Both brands permit a logo-only button:
//   Apple  — HIG "logo-only" Sign in with Apple button: black with the white
//            logo, or white with the black logo on a dark background
//   Google — the standard "G" icon button: white, 1 px #747775 border (dark
//            theme: #131314 with a #8E918F border)
// The two are the same size and weight, as guideline 4.8 expects. Each keeps
// its full name as the accessibility label, so VoiceOver/TalkBack still say
// "Continue with Apple".
//
// Draws nothing for a provider the server has not switched on, or the device
// cannot offer (Apple off iOS, Google without its client ids), so a person is
// never shown a button that cannot work. Once signed in, a new account goes to
// CompleteProfile for the phone number and role a provider cannot supply;
// everyone else goes straight in.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme/ThemeContext';
import { auth as authApi } from '../api/auth';
import { appleAvailable, googleConfigured, signInWithApple, signInWithGoogle } from '../utils/socialAuth';
import { colors, fonts, radius } from '../theme';
import { showConfirm, showToast } from './Feedback';
import { reportClientError } from '../utils/crashReport';

const BUTTON_HEIGHT = 54;

// What each refusal means to the person holding the phone.
const ERROR_KEYS = {
  EMAIL_IN_USE: 'auth.social.emailInUse',
  EMAIL_REQUIRED: 'auth.social.emailRequired',
  ADMIN_PASSWORD_ONLY: 'auth.social.staff',
  ACCOUNT_UNAVAILABLE: 'auth.social.accountUnavailable',
  ACCOUNT_PURGED: 'auth.social.purged',
  PROVIDER_DISABLED: 'auth.social.unavailable',
  JWKS_UNAVAILABLE: 'auth.social.unavailable',
  PLAY_SERVICES: 'auth.social.playServices',
  GOOGLE_CONFIG: 'auth.social.unavailable',
};

function AppleMark({ color }) {
  return (
    <Svg width={20} height={24} viewBox="0 0 814 1000">
      <Path fill={color} d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </Svg>
  );
}

function GoogleMark() {
  return (
    <Svg width={22} height={22} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

export default function SocialAuthButtons({ navigation, role }) {
  const { socialSignIn, t } = useApp();
  const { isDark } = useTheme();
  const [show, setShow] = useState({ apple: false, google: false });
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [server, apple] = await Promise.all([authApi.oauthProviders(), appleAvailable()]);
      if (alive) setShow({ apple: Boolean(server.apple && apple), google: Boolean(server.google && googleConfigured()) });
    })();
    return () => { alive = false; };
  }, []);

  const finish = (result) => {
    if (result.needsProfile) navigation.replace('CompleteProfile', { role });
    else navigation.replace('Main');
  };

  const run = async (provider) => {
    if (busy) return;
    setBusy(provider);
    try {
      const payload = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
      if (!payload) return; // cancelled: their choice, nothing to say
      try {
        finish(await socialSignIn(provider, payload, { role }));
      } catch (err) {
        if (err?.code !== 'ACCOUNT_CLOSED') throw err;
        // Same moment as the password sign-in: the provider just proved who
        // this is, and the account is still inside its thirty days.
        const until = err.reopen_until ? String(err.reopen_until).slice(0, 10) : null;
        const ok = await showConfirm({
          title: t('auth.accountClosed'),
          message: until
            ? `${t('auth.accountClosedMessage')}\n\n${t('auth.accountClosedUntil', { date: until })}`
            : t('auth.accountClosedMessage'),
          confirmLabel: t('auth.reopen'),
          cancelLabel: t('auth.notNow'),
        });
        if (!ok) return;
        finish(await socialSignIn(provider, payload, { role, reopen: true }));
        showToast(t('auth.welcomeBack'), 'success');
      }
    } catch (err) {
      const key = ERROR_KEYS[err?.code];
      // A provider-side failure is a configuration problem nobody on the phone
      // can see: report its code (never the person) so it shows in the API logs.
      if (!err?.isNetworkError && (!key || err.code === 'GOOGLE_CONFIG')) {
        reportClientError(err, `oauth:${provider}:${err?.code ?? 'none'}`);
      }
      showToast(key ? t(key) : (err?.isNetworkError ? err.message : t('auth.social.failed')), 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!show.apple && !show.google) return null;

  const appleInk = isDark ? '#000000' : '#FFFFFF';

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {show.apple ? (
          <Pressable
            onPress={() => run('apple')}
            disabled={Boolean(busy)}
            accessibilityRole="button"
            accessibilityLabel={t('auth.social.apple')}
            accessibilityState={{ disabled: Boolean(busy), busy: busy === 'apple' }}
            hitSlop={4}
            style={({ pressed }) => [
              styles.button,
              isDark ? styles.appleDark : styles.appleLight,
              pressed && styles.pressed,
              busy && busy !== 'apple' && styles.dimmed,
            ]}
          >
            {busy === 'apple' ? <ActivityIndicator color={appleInk} /> : <AppleMark color={appleInk} />}
          </Pressable>
        ) : null}

        {show.google ? (
          <Pressable
            onPress={() => run('google')}
            disabled={Boolean(busy)}
            accessibilityRole="button"
            accessibilityLabel={t('auth.social.google')}
            accessibilityState={{ disabled: Boolean(busy), busy: busy === 'google' }}
            hitSlop={4}
            style={({ pressed }) => [
              styles.button,
              isDark ? styles.googleDark : styles.googleLight,
              pressed && styles.pressed,
              busy && busy !== 'google' && styles.dimmed,
            ]}
          >
            {busy === 'google'
              ? <ActivityIndicator color={isDark ? '#E3E3E3' : '#1F1F1F'} />
              : <GoogleMark />}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.rule} accessibilityRole="none">
        <View style={styles.line} />
        <Text style={styles.ruleText}>{t('auth.social.orEmail')}</Text>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 26, gap: 18 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  // Equal halves of the form's width, capped so a lone Google button on
  // Android stays a button rather than a bar.
  button: {
    flex: 1,
    maxWidth: 168,
    height: BUTTON_HEIGHT,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleLight: { backgroundColor: '#000000' },
  appleDark: { backgroundColor: '#FFFFFF' },
  googleLight: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#747775' },
  googleDark: { backgroundColor: '#131314', borderWidth: 1, borderColor: '#8E918F' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  dimmed: { opacity: 0.45 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  ruleText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textMuted },
});
