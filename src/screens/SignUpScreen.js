import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, Linking, Modal, FlatList,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { LogoMark } from '../components/Logo';
import { useApp } from '../context/AppContext';
import { colors, radius, fonts } from '../theme';
import { showToast } from '../components/Feedback';

const SITE_URL = (Constants.expoConfig?.extra?.siteUrl || 'https://sawacars.com').replace(/\/+$/, '');
const openLegal = (path) => Linking.openURL(`${SITE_URL}${path}`).catch(() => {});

const COUNTRY_CODES = [
  { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+257', flag: '🇧🇮', name: 'Burundi' },
  { code: '+243', flag: '🇨🇩', name: 'DR Congo' },
  { code: '+211', flag: '🇸🇸', name: 'South Sudan' },
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
];

export default function SignUpScreen({ navigation }) {
  const { signUpUser, t } = useApp();
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+250');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [errors, setErrors] = useState({});

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
    try {
      await signUpUser(name.trim(), email.trim(), password, 'buyer', fullPhone);
      navigation.replace('Main');
    } catch (err) {
      showToast(err.message || t('auth.createError'), 'error');
    }
  };

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

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

        <Text style={[styles.label, { marginTop: 26 }]}>{t('auth.fullName')}</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder={t('auth.namePlaceholder')}
          value={name}
          onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: undefined })); }}
          placeholderTextColor={colors.textMuted}
        />
        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

        <Text style={[styles.label, { marginTop: 14 }]}>{t('common.phone') || 'Phone number'}</Text>
        <View style={styles.phoneRow}>
          <Pressable
            style={styles.countryBtn}
            onPress={() => setShowCountryModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Select country code"
          >
            <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
            <Text style={styles.countryCodeText}>{countryCode}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </Pressable>
          <TextInput
            style={[styles.phoneInput, errors.phone && styles.inputError]}
            placeholder="0788 123 456"
            value={phone}
            onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: undefined })); }}
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>
        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

        <Text style={[styles.label, { marginTop: 14 }]}>{t('auth.email')}</Text>
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

        <Text style={[styles.label, { marginTop: 14 }]}>{t('auth.password')}</Text>
        <View style={[styles.passwordWrap, errors.password && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t('auth.passwordPlaceholder')}
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

        <Button
          title={t('auth.createAccount')}
          style={{ marginTop: 28 }}
          onPress={handleSignUp}
        />

        {/* Modal for picking country code */}
        <Modal
          visible={showCountryModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCountryModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowCountryModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country Code</Text>
                <Pressable onPress={() => setShowCountryModal(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </Pressable>
              </View>
              <FlatList
                data={COUNTRY_CODES}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.countryItem, item.code === countryCode && styles.countryItemActive]}
                    onPress={() => {
                      setCountryCode(item.code);
                      setShowCountryModal(false);
                    }}
                  >
                    <Text style={styles.countryItemFlag}>{item.flag}</Text>
                    <Text style={styles.countryItemName}>{item.name}</Text>
                    <Text style={styles.countryItemCode}>{item.code}</Text>
                  </Pressable>
                )}
              />
            </View>
          </Pressable>
        </Modal>

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

        <Pressable onPress={() => navigation.navigate('SignIn')} style={{ marginTop: 16 }}>
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
  link: { color: colors.primary, fontFamily: fonts.bold },
  terms: {
    marginTop: 14, textAlign: 'center',
    fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted,
  },
  termsLink: { fontFamily: fonts.semiBold, color: colors.textSecondary },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 52,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryFlag: { fontSize: 18 },
  countryCodeText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    maxHeight: '65%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  countryItemActive: {
    backgroundColor: colors.primaryTint || '#FFF5F5',
  },
  countryItemFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  countryItemName: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  countryItemCode: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
});
