import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { colors, radius, fonts } from '../theme';
import { showToast } from '../components/Feedback';
import authApi from '../api/auth';
import { useApp } from '../context/AppContext';

// Shown over the whole app (App.js) while the signed-in account is held as a
// suspected bot (backend lib/signup-risk.js). The server refuses everything
// else until the emailed code is confirmed, so there is nothing behind this to
// navigate to. Not a navigator screen: it needs no route and cannot be backed
// out of, only completed or signed out of.
export default function VerifyEmailScreen() {
  const { t, currentUser, confirmEmailCode, logoutUser } = useApp();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [devCode, setDevCode] = useState(null);
  const email = currentUser?.email || '';

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.sendEmailCode();
      if (res?.dev_code) setDevCode(res.dev_code);
      if (res?.verified) {
        await confirmEmailCode(null);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (busy) return;
    if (code.length !== 6) {
      setError(t('verifyEmail.err6Digit'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmEmailCode(code);
      showToast(t('verifyEmail.confirmed'), 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Screen background={colors.bg}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.iconWrap}>
              <Ionicons name={sent ? 'keypad-outline' : 'mail-unread-outline'} size={28} color={colors.primary} />
            </View>
            <Text style={styles.title} accessibilityRole="header">{t('verifyEmail.title')}</Text>
            <Text style={styles.sub}>
              {sent ? t('verifyEmail.sentSub', { email }) : t('verifyEmail.sub', { email })}
            </Text>

            {devCode ? <Text style={styles.devCode}>{devCode}</Text> : null}

            {sent ? (
              <>
                <Text style={styles.label}>{t('verifyEmail.codeLabel')}</Text>
                <TextInput
                  style={[styles.input, styles.codeInput, error && styles.inputError]}
                  placeholder="000000"
                  placeholderTextColor={colors.textMuted}
                  value={code}
                  onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={6}
                  autoFocus
                  accessibilityLabel={t('verifyEmail.codeLabel')}
                />
                {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
                <Button
                  title={busy ? t('verifyEmail.confirming') : t('verifyEmail.confirm')}
                  onPress={confirm}
                  disabled={busy}
                  style={{ marginTop: 20 }}
                />
                <Pressable onPress={send} disabled={busy} style={styles.link} accessibilityRole="button">
                  <Text style={styles.linkText}>{t('verifyEmail.resend')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
                <Button
                  title={busy ? t('verifyEmail.sending') : t('verifyEmail.send')}
                  onPress={send}
                  disabled={busy}
                  style={{ marginTop: 8 }}
                />
              </>
            )}

            <Pressable onPress={logoutUser} disabled={busy} style={styles.link} accessibilityRole="button">
              <Text style={styles.signOut}>{t('verifyEmail.signOut')}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  iconWrap: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: colors.blueTint,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 12, marginBottom: 18,
  },
  title: { fontSize: 24, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginTop: 8, marginBottom: 22 },
  label: {
    fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, fontFamily: fonts.medium, color: colors.textPrimary,
  },
  codeInput: { fontSize: 22, fontFamily: fonts.extraBold, letterSpacing: 8, textAlign: 'center' },
  inputError: { borderColor: colors.danger },
  error: { fontSize: 13, color: colors.danger, marginTop: 10, lineHeight: 18 },
  devCode: {
    fontSize: 20, fontFamily: fonts.extraBold, color: colors.amberText, letterSpacing: 6,
    textAlign: 'center', marginBottom: 14,
  },
  link: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 8 },
  linkText: { fontSize: 14, fontFamily: fonts.bold, color: colors.primary },
  signOut: { fontSize: 14, fontFamily: fonts.bold, color: colors.textSecondary },
});
