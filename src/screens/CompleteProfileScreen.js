import { resumeAfterAuth } from '../utils/authContinuation';
// ─────────────────────────────────────────────────────────────────────────────
// After a first sign-in with Apple or Google: the two things a provider cannot
// tell us. A phone number (every account has one — inspection bookings, rental
// providers and the seller ID check all rely on it) and whether this person is
// here to buy or to sell. The website asks the same at /signup/complete.
//
// No way back from here but forward: the account exists, and leaving it without
// a phone would strand it. Signing out is offered for the person who tapped the
// wrong account.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { LogoMark } from '../components/Logo';
import PhoneInput, { isValidE164, toE164 } from '../components/PhoneInput';
import { useApp } from '../context/AppContext';
import { colors, radius, fonts } from '../theme';
import { showToast } from '../components/Feedback';

function RoleOption({ selected, icon, title, sub, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.role, selected && styles.roleSelected]}
    >
      <View style={styles.roleTop}>
        <Ionicons name={icon} size={20} color={selected ? colors.primary : colors.textMuted} />
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
        </View>
      </View>
      <Text style={styles.roleTitle}>{title}</Text>
      <Text style={styles.roleSub}>{sub}</Text>
    </Pressable>
  );
}

export default function CompleteProfileScreen({ navigation, route }) {
  const { currentUser, completeProfile, logoutUser, t } = useApp();
  const [countryCode, setCountryCode] = useState('+250');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(route?.params?.role === 'seller' ? 'seller' : 'buyer');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const full = toE164(countryCode, phone);
    if (!phone.trim() || !isValidE164(full)) {
      setError(t('auth.validPhone'));
      return;
    }
    setSaving(true);
    try {
      await completeProfile(full, role);
      resumeAfterAuth(navigation, route?.params);
    } catch (err) {
      // Finished in another session already: nothing left to ask.
      if (err?.code === 'PROFILE_COMPLETE') {
        resumeAfterAuth(navigation, route?.params);
        return;
      }
      if (err?.code === 'INVALID_PHONE') setError(t('auth.validPhone'));
      else showToast(err?.message || t('auth.social.failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await logoutUser();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  return (
    <Screen background={colors.surface}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LogoMark size={54} />
          <Text style={styles.title}>{t('auth.complete.title')}</Text>
          <Text style={styles.sub}>{t('auth.complete.sub')}</Text>
          {currentUser?.email ? (
            <Text style={styles.signedIn}>{t('auth.complete.signedInAs', { email: currentUser.email })}</Text>
          ) : null}

          <Text style={[styles.label, { marginTop: 24 }]}>{t('common.phone') || 'Phone number'}</Text>
          <PhoneInput
            countryCode={countryCode}
            onCountryCode={setCountryCode}
            phone={phone}
            onPhone={(v) => { setPhone(v); setError(''); }}
            error={Boolean(error)}
            autoFocus
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : (
            <Text style={styles.hint}>{t('auth.complete.phoneHint')}</Text>
          )}

          <Text style={[styles.label, { marginTop: 22 }]}>{t('auth.complete.roleLegend')}</Text>
          <View style={styles.roles} accessibilityRole="radiogroup">
            <RoleOption
              selected={role === 'buyer'}
              icon="search-outline"
              title={t('auth.complete.buying')}
              sub={t('auth.complete.buyingSub')}
              onPress={() => setRole('buyer')}
            />
            <RoleOption
              selected={role === 'seller'}
              icon="key-outline"
              title={t('auth.complete.selling')}
              sub={t('auth.complete.sellingSub')}
              onPress={() => setRole('seller')}
            />
          </View>

          <Button title={t('auth.complete.continue')} style={{ marginTop: 28 }} onPress={save} loading={saving} disabled={saving} />

          <Pressable onPress={signOut} style={{ marginTop: 18 }} hitSlop={8}>
            <Text style={styles.footer}>{t('auth.complete.wrongAccount')} <Text style={styles.link}>{t('auth.complete.signOut')}</Text></Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 40 },
  title: { fontSize: 30, fontFamily: fonts.extraBold, letterSpacing: -0.9, color: colors.textPrimary, marginTop: 18 },
  sub: { fontSize: 15, lineHeight: 21, color: colors.textSecondary, marginTop: 6 },
  signedIn: { fontSize: 13, color: colors.textMuted, marginTop: 10 },
  label: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.slate600, marginBottom: 6 },
  hint: { fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 6, marginLeft: 2 },
  errorText: { fontSize: 13, color: colors.textSecondary, marginTop: 5, marginLeft: 4, lineHeight: 17 },
  roles: { flexDirection: 'row', gap: 10 },
  role: {
    flex: 1, padding: 14, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, minHeight: 120,
  },
  roleSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint || '#FFF5F5' },
  roleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 10 },
  roleSub: { fontSize: 12, lineHeight: 16, color: colors.textSecondary, marginTop: 4 },
  footer: { textAlign: 'center', fontSize: 14, color: colors.textSecondary },
  link: { color: colors.primary, fontFamily: fonts.bold },
});
