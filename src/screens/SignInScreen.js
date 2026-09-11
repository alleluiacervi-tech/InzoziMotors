import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { LogoMark } from '../components/Logo';
import { useApp } from '../context/AppContext';
import { colors, radius, fonts } from '../theme';
import { showToast, showConfirm } from '../components/Feedback';

export default function SignInScreen({ navigation, route }) {
  const { loginUser, reopenAccount, t } = useApp();
  // Carried over from a completed password reset so the user isn't retyping it
  const [email, setEmail] = useState(route?.params?.email || '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSignIn = async () => {
    const errs = {};
    if (!email || !email.includes('@')) errs.email = t('auth.validEmail');
    if (!password || password.length < 6) errs.password = t('auth.passwordMin');
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await loginUser(email.trim(), password);
      navigation.replace('Main');
    } catch (err) {
      // The password was right and the account is closed but not yet erased.
      // This is the only moment the thirty-day window is worth anything: the
      // person is here, holding the right credentials, and the alternative is
      // telling them their own account does not exist.
      if (err?.code === 'ACCOUNT_CLOSED') {
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
        try {
          await reopenAccount(email.trim(), password);
          showToast(t('auth.welcomeBack'), 'success');
          navigation.replace('Main');
        } catch (reopenErr) {
          showToast(reopenErr.message || t('auth.reopenError'), 'error');
        }
        return;
      }
      showToast(err.message || t('auth.invalidCredentials'), 'error');
    }
  };

  return (
    <Screen background={colors.surface}>
      <BackHeader onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <LogoMark size={54} />
        <Text style={styles.title}>{t('auth.signInTitle')}</Text>
        <Text style={styles.sub}>{t('auth.signInSub')}</Text>

        <Text style={[styles.label, { marginTop: 26 }]}>{t('auth.email')}</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="you@email.com"
          value={email}
          onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

        <View style={styles.labelRow}>
          <Text style={styles.label}>{t('auth.password')}</Text>
          <Pressable onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() })}>
            <Text style={styles.forgot}>{t('auth.forgot')}</Text>
          </Pressable>
        </View>
        <View style={[styles.passwordWrap, errors.password && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t('auth.enterPassword')}
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!show}
          />
          <Pressable
            onPress={() => setShow((s) => !s)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t(show ? 'auth.hidePassword' : 'auth.showPassword')}
          >
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        </View>
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

        <Button title={t('auth.signIn')} style={{ marginTop: 28 }} onPress={handleSignIn} />

        <Pressable onPress={() => navigation.navigate('SignUp')} style={{ marginTop: 16 }}>
          <Text style={styles.footer}>
            {t('auth.noAccount')} <Text style={styles.link}>{t('auth.signUp')}</Text>
          </Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 28, paddingBottom: 40 },
  title: { fontSize: 30, fontFamily: fonts.extraBold, letterSpacing: -0.9, color: colors.textPrimary, marginTop: 18 },
  sub: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  label: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.slate600, marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14, marginBottom: 6 },
  forgot: { fontSize: 13, fontFamily: fonts.bold, color: colors.primary },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerTint },
  passwordWrap: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: { flex: 1, fontSize: 15, fontFamily: fonts.medium, color: colors.textPrimary },
  errorText: { fontSize: 13, color: colors.textSecondary, marginTop: 5, marginLeft: 4, lineHeight: 17 },
  footer: { textAlign: 'center', fontSize: 14, color: colors.textSecondary },
  link: { color: colors.primary, fontFamily: fonts.bold },
});
