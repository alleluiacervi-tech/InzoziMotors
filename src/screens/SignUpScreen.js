import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { useApp } from '../context/AppContext';
import { colors, radius, fonts } from '../theme';

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#4285F4" d="M45 24c0-1.6-.1-2.8-.4-4H24v7.5h12c-.2 2-1.7 5-4.8 7l4.7 3.6C39.9 41.6 45 35.6 45 24z" />
      <Path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7 5.4C7.5 40.6 15 46 24 46z" />
      <Path fill="#FBBC05" d="M11.5 28.4C11 27 10.8 25.5 10.8 24s.2-3 .6-4.4l-7-5.4C2.9 17 2 20.4 2 24s.9 7 2.4 9.8l7.1-5.4z" />
      <Path fill="#EA4335" d="M24 9.5c3.3 0 6.2 1.1 8.5 3.3l6.1-6.1C34.9 3.1 29.9 1 24 1 15 1 7.5 6.4 4.4 14.2l7.1 5.4C13.3 14.3 18.2 9.5 24 9.5z" />
    </Svg>
  );
}

export default function SignUpScreen({ navigation }) {
  const { signUpUser, loginAsGuest } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSocialSignUp = () => {
    // Demo social sign-up — logs in locally, no real OAuth
    loginAsGuest();
    navigation.replace('Main');
  };

  const handleSignUp = async () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Please enter your full name.';
    if (!email || !email.includes('@')) errs.email = 'Please enter a valid email address.';
    if (!password || password.length < 6) errs.password = 'Password must be at least 6 characters.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await signUpUser(name.trim(), email.trim(), password, 'buyer');
      navigation.replace('Main');
    } catch (err) {
      Alert.alert('Sign Up Failed', err.message || 'Could not register user. Please try again.');
    }
  };

  return (
    <Screen background={colors.surface}>
      <BackHeader onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.sub}>Join 2M+ buyers and sellers on Inzozi Motors.</Text>

        <View style={styles.socials}>
          <Pressable style={[styles.social, styles.socialLight]} onPress={handleSocialSignUp}>
            <GoogleIcon />
            <Text style={styles.socialText}>Continue with Google</Text>
          </Pressable>
          <Pressable style={[styles.social, styles.socialDark]} onPress={handleSocialSignUp}>
            <Ionicons name="logo-apple" size={18} color="#fff" />
            <Text style={[styles.socialText, { color: '#fff' }]}>Continue with Apple</Text>
          </Pressable>
        </View>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>or sign up with email</Text>
          <View style={styles.line} />
        </View>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="Alex Morgan"
          value={name}
          onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: undefined })); }}
          placeholderTextColor={colors.textMuted}
        />
        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

        <Text style={[styles.label, { marginTop: 14 }]}>Email</Text>
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

        <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
        <View style={[styles.passwordWrap, errors.password && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="At least 6 characters"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!show}
          />
          <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        </View>
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

        <Button
          title="Create account"
          style={{ marginTop: 28 }}
          onPress={handleSignUp}
        />
        <Pressable onPress={() => navigation.navigate('SignIn')} style={{ marginTop: 16 }}>
          <Text style={styles.footer}>
            Already have an account? <Text style={styles.link}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 28, paddingBottom: 40 },
  title: { fontSize: 30, fontFamily: fonts.extraBold, letterSpacing: -0.9, color: colors.textPrimary, marginTop: 14 },
  sub: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  socials: { gap: 10, marginTop: 24 },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  socialLight: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  socialDark: { backgroundColor: colors.textPrimary },
  socialText: { fontSize: 15, fontFamily: fonts.bold, color: colors.textPrimary },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.semiBold },
  label: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.slate600, marginBottom: 6 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputError: { borderColor: '#EF4444' },
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
  passwordInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 4 },
  footer: { textAlign: 'center', fontSize: 14, color: colors.textSecondary },
  link: { color: colors.primary, fontFamily: fonts.bold },
});
