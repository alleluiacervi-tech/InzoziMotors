// ─────────────────────────────────────────────────────────────────────────────
// "Continue with Apple" / "Continue with Google", with an "or" rule beneath.
//
// Apple's button is Apple's own (AppleAuthenticationButton): Review Guideline
// 4.8 and the Human Interface Guidelines expect the system button, which
// localises itself. Google's follows Google's branding rules — white, a 1 px
// #747775 border, #1F1F1F label, the four-colour "G".
//
// Draws nothing for a provider the server has not switched on, or the device
// cannot offer (Apple off iOS, Google without its client ids), so a person is
// never shown a button that cannot work. Once signed in, a new account goes to
// CompleteProfile for the phone number and role a provider cannot supply;
// everyone else goes straight in.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '../context/AppContext';
import { auth as authApi } from '../api/auth';
import { appleAvailable, googleConfigured, signInWithApple, signInWithGoogle } from '../utils/socialAuth';
import { colors, fonts, radius } from '../theme';
import { showConfirm, showToast } from './Feedback';

const BUTTON_HEIGHT = 52;

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
};

function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

export default function SocialAuthButtons({ navigation, role, mode = 'signin' }) {
  const { socialSignIn, t } = useApp();
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
      showToast(key ? t(key) : (err?.isNetworkError ? err.message : t('auth.social.failed')), 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!show.apple && !show.google) return null;

  return (
    <View style={styles.wrap}>
      {show.apple ? (
        <View pointerEvents={busy ? 'none' : 'auto'} style={busy && busy !== 'apple' ? styles.dimmed : null}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={mode === 'signup'
              ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.lg}
            style={styles.apple}
            onPress={() => run('apple')}
          />
        </View>
      ) : null}

      {show.google ? (
        <Pressable
          onPress={() => run('google')}
          disabled={Boolean(busy)}
          accessibilityRole="button"
          accessibilityLabel={t('auth.social.google')}
          style={({ pressed }) => [
            styles.google,
            pressed && styles.googlePressed,
            busy && busy !== 'google' && styles.dimmed,
          ]}
        >
          {busy === 'google' ? <ActivityIndicator color="#1F1F1F" /> : <GoogleMark />}
          <Text style={styles.googleText}>{t('auth.social.google')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.rule} accessibilityRole="none">
        <View style={styles.line} />
        <Text style={styles.ruleText}>{t('auth.social.orEmail')}</Text>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 26, gap: 12 },
  apple: { width: '100%', height: BUTTON_HEIGHT },
  google: {
    height: BUTTON_HEIGHT,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#747775',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googlePressed: { backgroundColor: '#F2F4F8' },
  googleText: {
    fontSize: Platform.OS === 'ios' ? 17 : 15,
    fontFamily: fonts.semiBold,
    color: '#1F1F1F',
    letterSpacing: Platform.OS === 'ios' ? -0.2 : 0,
  },
  dimmed: { opacity: 0.5 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  ruleText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textMuted },
});
