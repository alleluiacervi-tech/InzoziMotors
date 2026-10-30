import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { authContinuation, resumeAfterAuth } from '../utils/authContinuation';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { LogoMark } from '../components/Logo';
import { useApp } from '../context/AppContext';
import { colors, radius, fonts } from '../theme';
import { showToast } from '../components/Feedback';
import PhoneInput from '../components/PhoneInput';
import SocialAuthButtons from '../components/SocialAuthButtons';

const SITE_URL = (Constants.expoConfig?.extra?.siteUrl || 'https://sawacars.com').replace(/\/+$/, '');
const openLegal = (path) => Linking.openURL(`${SITE_URL}${path}`).catch(() => {});


export default function SignUpScreen({ navigation, route }) {
  const { signUpUser, t } = useApp();
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+250');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);

  const handleSignUp = async () => {
    const errs = {};
    if (!name.trim()) errs.name = t('auth.nameRequired');

    const rawPhone = phone.replace(/[\s-]/g, '');
    const fullPhone = rawPhone.startsWith('+') ? rawPhone : `${countryCode}${rawPhone.replace(/^0+/, '')}`;
    if (!rawPhone || !/^\+[1-9]\d{7,14}$/.test(fullPhone)) {
      errs.phone = t('auth.validPhone') || 'Valid phone number required';
    }

    if (!email || !email.includes('@')) errs.email = t('auth.validEmail');
    if (!password || password.length < 6) errs.password = t('auth.passwordMin');
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    try {
      await signUpUser(name.trim(), email.trim(), password, 'buyer', fullPhone);
      resumeAfterAuth(navigation, route?.params);
    } catch (err) {
      showToast(err.message || t('auth.createError'), 'error');
    } finally {
      pending.current = false;
      setSubmitting(false);
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
        <Text style={styles.title}>{t('auth.createTitle')}</Text>
        <Text style={styles.sub}>{t('auth.createSub')}</Text>

        <SocialAuthButtons continuation={authContinuation(route?.params)} navigation={navigation} />

        <Text style={[styles.label, { marginTop: 22 }]}>{t('auth.fullName')}</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder={t('auth.namePlaceholder')}
          value={name}
          onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: undefined })); }}
          placeholderTextColor={colors.textMuted}
        />
        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

        <Text style={[styles.label, { marginTop: 14 }]}>{t('common.phone') || 'Phone number'}</Text>
        <PhoneInput
          countryCode={countryCode}
          onCountryCode={setCountryCode}
          phone={phone}
          onPhone={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: undefined })); }}
          error={Boolean(errors.phone)}
        />
        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

        <Text style={[styles.label, { marginTop: 14 }]}>{t('auth.email')}</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="you@email.com"
          value={email}
          onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          accessibilityLabel={t('auth.email')}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

        <Text style={[styles.label, { marginTop: 14 }]}>{t('auth.password')}</Text>
        <View style={[styles.passwordWrap, errors.password && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!show}
            autoComplete="new-password"
            textContentType="newPassword"
            accessibilityLabel={t('auth.password')}
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

        <Button
          title={t('auth.createAccount')}
          style={{ marginTop: 28 }}
          loading={submitting} onPress={handleSignUp}
        />


        {/* The EULA moment. Welcome has the same line, but two entry points
            (drawer "Register", SignIn's footer) reach this screen without ever
            passing Welcome — for a UGC app the agreement must sit at the point
            of account creation, not one screen upstream of it. */}
        <Text style={styles.terms}>
          {t('auth.termsPrefix')}{' '}
          <Text
            style={styles.termsLink}
            onPress={() => openLegal('/legal/terms')}
            suppressHighlighting
            accessibilityRole="link"
          >
            {t('auth.terms')}
          </Text>
          {' '}and{' '}
          <Text
            style={styles.termsLink}
            onPress={() => openLegal('/legal/privacy')}
            suppressHighlighting
            accessibilityRole="link"
          >
            {t('auth.privacy')}
          </Text>
          .
        </Text>

        <Pressable onPress={() => navigation.navigate('SignIn', authContinuation(route?.params))} style={{ marginTop: 16 }}>
          <Text style={styles.footer}>
            {t('auth.alreadyAccount')} <Text style={styles.link}>{t('auth.signIn')}</Text>
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
  link: { color: colors.accentText, fontFamily: fonts.bold },
  terms: {
    marginTop: 14, textAlign: 'center',
    fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted,
  },
  termsLink: { fontFamily: fonts.semiBold, color: colors.textSecondary },
});
