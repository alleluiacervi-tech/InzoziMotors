import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { colors } from '../theme';

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={['#0B2A6B', '#0A1A3F', '#070D1F']}
      locations={[0, 0.55, 1]}
      style={styles.root}
    >
      <StatusBar style="light" />
      {/* Glow accents */}
      <View style={styles.glowBlue} />
      <View style={styles.glowGreen} />

      <View style={[styles.content, { paddingTop: insets.top }]}>

        <View style={styles.topBar}>
          <Logo size={18} />
          <View style={styles.langPill}>
            <Text style={styles.langText}>EN</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>PREMIUM USED-CAR MARKETPLACE</Text>
          <Text style={styles.title}>
            Buy Smarter.{'\n'}Sell Faster.{'\n'}
            <Text style={{ color: colors.greenLight }}>Trust Better.</Text>
          </Text>
          <Text style={styles.subtitle}>
            150-point inspections, escrow-protected payments, and 7-day risk-free returns on
            every car.
          </Text>

          <View style={styles.chips}>
            {['150-pt inspection', 'Escrow protected', '7-day returns'].map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <Button
            title="Find My Car"
            icon="search"
            onPress={() => navigation.replace('Main')}
          />
          <Button
            title="Sell My Car"
            icon="pricetag-outline"
            variant="secondary"
            onDark
            onPress={() => navigation.replace('Main', { screen: 'Sell' })}
          />
          <Pressable onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.signin}>
              Already have an account? <Text style={styles.signinLink}>Sign in</Text>
            </Text>
          </Pressable>
          <Text style={styles.terms}>
            By continuing, you agree to our <Text style={styles.termsStrong}>Terms</Text> &{' '}
            <Text style={styles.termsStrong}>Privacy Policy</Text>.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const chipStyle = {
  backgroundColor: 'rgba(255,255,255,0.08)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.14)',
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  glowBlue: {
    position: 'absolute',
    top: -120,
    left: -60,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(37,99,235,0.30)',
  },
  glowGreen: {
    position: 'absolute',
    bottom: -160,
    right: -120,
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  content: { flex: 1, paddingHorizontal: 28 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  langText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  hero: { flex: 1, justifyContent: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.6, color: colors.blueLight },
  title: { fontSize: 42, fontWeight: '800', lineHeight: 44, letterSpacing: -1.2, color: '#fff', marginTop: 14 },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(226,232,240,0.8)',
    marginTop: 18,
    maxWidth: 300,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 22 },
  chip: { ...chipStyle, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  chipText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  actions: { gap: 12 },
  signin: { textAlign: 'center', fontSize: 14, color: 'rgba(226,232,240,0.85)', marginTop: 4 },
  signinLink: { color: colors.blueLight, fontWeight: '700' },
  terms: { textAlign: 'center', fontSize: 11, lineHeight: 17, color: 'rgba(148,163,184,0.85)' },
  termsStrong: { color: 'rgba(226,232,240,0.9)' },
});
