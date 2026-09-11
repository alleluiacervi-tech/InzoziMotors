import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, fonts } from '../theme';
import { showToast } from '../components/Feedback';
import authApi from '../api/auth';
import { useApp } from '../context/AppContext';

export default function ForgotPasswordScreen({ navigation, route }) {
  const { t } = useApp();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(route?.params?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [devCode, setDevCode] = useState(null);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const requestCode = async () => {
    if (!emailValid || busy) {
      setError(t('forgotPassword.errValidEmail'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.forgotPassword(email.trim().toLowerCase());
      if (res?.dev_code) setDevCode(res.dev_code);
      setStep(1);
    } catch (err) {
      setError(err.message || t('forgotPassword.invalidCode'));
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    if (busy) return;
    if (code.trim().length !== 6) {
      setError(t('forgotPassword.err6Digit'));
      return;
    }
    if (password.length < 6) {
      setError(t('forgotPassword.errMinPass'));
      return;
    }
    if (password !== confirm) {
      setError(t('forgotPassword.errMatchPass'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authApi.resetPassword(email.trim().toLowerCase(), code.trim(), password);
      showToast(t('forgotPassword.successToast'), 'success');
      navigation.replace('SignIn', { email: email.trim().toLowerCase() });
    } catch (err) {
      setError(err.message || t('forgotPassword.invalidCode'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title={t('forgotPassword.title')}
        onBack={() => (step === 1 ? setStep(0) : navigation.goBack())}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.iconWrap}>
            <Ionicons name={step === 0 ? 'lock-open-outline' : 'keypad-outline'} size={28} color={colors.primary} />
          </View>

          <Text style={styles.title}>
            {step === 0 ? t('forgotPassword.forgotTitle') : t('forgotPassword.enterCodeTitle')}
          </Text>
          <Text style={styles.sub}>
            {step === 0
              ? t('forgotPassword.forgotSub')
              : t('forgotPassword.enterCodeSub', { email })}
          </Text>

          {step === 0 ? (
            <>
              <Text style={styles.label}>{t('forgotPassword.email')}</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder={t('forgotPassword.emailPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(null); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                title={busy ? t('forgotPassword.sending') : t('forgotPassword.sendResetCode')}
                onPress={requestCode}
                disabled={busy}
                style={{ marginTop: 20 }}
              />
            </>
          ) : (
            <>
              {devCode ? (
                <View style={styles.devBox}>
                  <Text style={styles.devLabel}>{t('forgotPassword.devBuild')}</Text>
                  <Text style={styles.devCode}>{devCode}</Text>
                  <Text style={styles.devHint}>
                    {t('forgotPassword.devHint')}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.label}>{t('forgotPassword.codeLabel')}</Text>
              <TextInput
                style={[styles.input, styles.codeInput, error && styles.inputError]}
                placeholder={t('forgotPassword.codePlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={code}
                onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                keyboardType="number-pad"
                maxLength={6}
              />

              <Text style={styles.label}>{t('forgotPassword.newPassword')}</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder={t('forgotPassword.newPasswordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null); }}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.label}>{t('forgotPassword.confirmPassword')}</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder={t('forgotPassword.confirmPasswordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={confirm}
                onChangeText={(v) => { setConfirm(v); setError(null); }}
                secureTextEntry
                autoCapitalize="none"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                title={busy ? t('forgotPassword.updating') : t('forgotPassword.setNewPassword')}
                onPress={submitReset}
                disabled={busy}
                style={{ marginTop: 20 }}
              />
              <Pressable onPress={requestCode} disabled={busy} style={styles.resend}>
                <Text style={styles.resendText}>{t('forgotPassword.didntGetCode')}</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
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
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14,
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
  devBox: {
    backgroundColor: colors.amberTint,
    borderRadius: radius.lg, padding: 14, alignItems: 'center', gap: 4,
  },
  devLabel: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.amberText,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  devCode: { fontSize: 24, fontFamily: fonts.extraBold, color: colors.amberText, letterSpacing: 6 },
  devHint: { fontSize: 11, color: colors.amberText, textAlign: 'center', lineHeight: 16 },
  resend: { alignItems: 'center', paddingVertical: 16 },
  resendText: { fontSize: 13, fontFamily: fonts.bold, color: colors.primary },
});
