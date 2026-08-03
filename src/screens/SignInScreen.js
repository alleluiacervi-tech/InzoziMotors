import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { LogoMark } from '../components/Logo';
import { useApp } from '../context/AppContext';
import { colors, radius, fonts } from '../theme';
import { showToast } from '../components/Feedback';

export default function SignInScreen({ navigation, route }) {
  const { loginUser } = useApp();
  // Carried over from a completed password reset so the user isn't retyping it
  const [email, setEmail] = useState(route?.params?.email || '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSignIn = async () => {
    const errs = {};
    if (!email || !email.includes('@')) errs.email = 'Please enter a valid email address.';
    if (!password || password.length < 6) errs.password = 'Password must be at least 6 characters.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await loginUser(email.trim(), password);
      navigation.replace('Main');
    } catch (err) {
      showToast(err.message || 'Invalid email or password.', 'error');
    }
  };

  return (
    <Screen background={colors.surface}>
      <BackHeader onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <LogoMark size={54} />
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to continue to Sawa Cars.</Text>

        <Text style={[styles.label, { marginTop: 26 }]}>Email</Text>
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
          <Text style={styles.label}>Password</Text>
          <Pressable onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() })}>
            <Text style={styles.forgot}>Forgot?</Text>
          </Pressable>
        </View>
        <View style={[styles.passwordWrap, errors.password && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!show}
          />
          <Pressable
            onPress={() => setShow((s) => !s)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={show ? 'Hide password' : 'Show password'}
          >
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        </View>
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

        <Button title="Sign in" style={{ marginTop: 28 }} onPress={handleSignIn} />

        <Pressable onPress={() => navigation.navigate('SignUp')} style={{ marginTop: 16 }}>
          <Text style={styles.footer}>
            Don't have an account? <Text style={styles.link}>Sign up</Text>
          </Text>
        </Pressable>
      </ScrollView>
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
  passwordInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  errorText: { fontSize: 12.5, color: colors.textSecondary, marginTop: 5, marginLeft: 4, lineHeight: 17 },
  footer: { textAlign: 'center', fontSize: 14, color: colors.textSecondary },
  link: { color: colors.primary, fontFamily: fonts.bold },
});
