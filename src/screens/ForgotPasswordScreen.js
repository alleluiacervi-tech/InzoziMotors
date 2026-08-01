import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { showToast } from '../components/Feedback';
import authApi from '../api/auth';

// Two steps in one screen: request a code, then set the new password. The
// server never says whether an email exists, so step 2 always follows step 1 —
// a wrong address simply produces a code that never arrives.
export default function ForgotPasswordScreen({ navigation, route }) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(route?.params?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // Dev builds get the code back in the response — there is no mail provider
  // yet, and typing a code you cannot receive would make this untestable.
  const [devCode, setDevCode] = useState(null);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const requestCode = async () => {
    if (!emailValid || busy) {
      setError('Enter the email address on your account.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.forgotPassword(email.trim().toLowerCase());
      if (res?.dev_code) setDevCode(res.dev_code);
      setStep(1);
    } catch (err) {
      setError(err.message || 'Could not start the reset. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    if (busy) return;
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code we sent you.');
      return;
    }
    if (password.length < 6) {
      setError('Your new password needs at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Both passwords need to match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authApi.resetPassword(email.trim().toLowerCase(), code.trim(), password);
      showToast('Password updated — sign in with your new password.', 'success');
      navigation.replace('SignIn', { email: email.trim().toLowerCase() });
    } catch (err) {
      setError(err.message || 'That reset code is invalid or has expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title="Reset password"
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
            {step === 0 ? 'Forgot your password?' : 'Enter your code'}
          </Text>
          <Text style={styles.sub}>
            {step === 0
              ? 'Tell us the email on your account and we will send a 6-digit reset code.'
              : `If ${email} has an Sawa account, a 6-digit code is on its way. It expires in 30 minutes.`}
          </Text>

          {step === 0 ? (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder="you@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(null); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                title={busy ? 'Sending…' : 'Send Reset Code'}
                onPress={requestCode}
                disabled={busy}
                style={{ marginTop: 20 }}
              />
            </>
          ) : (
            <>
              {devCode ? (
                <View style={styles.devBox}>
                  <Text style={styles.devLabel}>Development build</Text>
                  <Text style={styles.devCode}>{devCode}</Text>
                  <Text style={styles.devHint}>
                    Shown because no email provider is connected yet. This never appears in production.
                  </Text>
                </View>
              ) : null}

              <Text style={styles.label}>6-digit code</Text>
              <TextInput
                style={[styles.input, styles.codeInput, error && styles.inputError]}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                value={code}
                onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                keyboardType="number-pad"
                maxLength={6}
              />

              <Text style={styles.label}>New password</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null); }}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.label}>Confirm new password</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder="Repeat it"
                placeholderTextColor={colors.textMuted}
                value={confirm}
                onChangeText={(v) => { setConfirm(v); setError(null); }}
                secureTextEntry
                autoCapitalize="none"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                title={busy ? 'Updating…' : 'Set New Password'}
                onPress={submitReset}
                disabled={busy}
                style={{ marginTop: 20 }}
              />
              <Pressable onPress={requestCode} disabled={busy} style={styles.resend}>
                <Text style={styles.resendText}>Didn't get a code? Send another</Text>
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
    fontSize: 15, color: colors.textPrimary,
  },
  codeInput: { fontSize: 22, fontFamily: fonts.extraBold, letterSpacing: 8, textAlign: 'center' },
  inputError: { borderColor: colors.danger },
  error: { fontSize: 12.5, color: colors.danger, marginTop: 10, lineHeight: 18 },
  devBox: {
    backgroundColor: colors.amberTint,
    borderRadius: radius.lg, padding: 14, alignItems: 'center', gap: 4,
  },
  devLabel: {
    fontSize: 10, fontFamily: fonts.bold, color: colors.amberText,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  devCode: { fontSize: 26, fontFamily: fonts.extraBold, color: colors.amberText, letterSpacing: 6 },
  devHint: { fontSize: 11, color: colors.amberText, textAlign: 'center', lineHeight: 16 },
  resend: { alignItems: 'center', paddingVertical: 16 },
  resendText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.primary },
});
