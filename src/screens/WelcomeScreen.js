import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { colors, fonts } from '../theme';

const TRUST_CHIPS = [
  { icon: 'shield-checkmark-outline', label: '150-pt Inspection' },
  { icon: 'person-outline', label: 'Verified Sellers' },
  { icon: 'refresh-outline', label: '7-Day Returns' },
];

const STATS = ['240+ certified cars', '3 Kigali centres', '36-angle photos'];

const HERO_CAR = 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=900&q=80';

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[colors.navyLight, colors.navyMid, colors.navyDeep]}
      locations={[0, 0.5, 1]}
      style={styles.root}
    >
      <StatusBar style="light" />
      <View style={[styles.content, { paddingTop: insets.top + 12 }]}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <Logo size={18} />
          <View style={styles.langPill}>
            <Text style={styles.langText}>EN</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          {/* Ghost car image fades into the dark gradient */}
          <Image source={{ uri: HERO_CAR }} style={styles.heroCar} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', colors.navyDeep]}
            style={styles.heroFade}
            pointerEvents="none"
          />

          <Text style={styles.eyebrow}>KIGALI'S CERTIFIED MARKETPLACE</Text>

          <Text style={styles.title}>
            Rwanda's most{'\n'}trusted car{'\n'}marketplace.
          </Text>

          <Text style={styles.subtitle}>
            Every car professionally inspected before listing.{'\n'}No guesswork. No false listings.
          </Text>

          {/* Trust chips */}
          <View style={styles.chips}>
            {TRUST_CHIPS.map((chip) => (
              <View key={chip.label} style={styles.chip}>
                <Ionicons name={chip.icon} size={13} color={colors.greenLight} />
                <Text style={styles.chipText}>{chip.label}</Text>
              </View>
            ))}
          </View>

          {/* Stats strip */}
          <View style={styles.statsRow}>
            {STATS.map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <Text style={styles.statsDot}>·</Text>}
                <Text style={styles.statText}>{s}</Text>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* CTAs */}
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <Button
            title="Find My Car"
            icon="search"
            onPress={() => navigation.replace('Main')}
          />
          <Button
            title="Certify My Vehicle"
            icon="shield-checkmark-outline"
            variant="secondary"
            onDark
            onPress={() => navigation.replace('Main', { screen: 'Sell' })}
          />
          <Pressable onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.signin}>
              Already have an account?{' '}
              <Text style={styles.signinLink}>Sign in</Text>
            </Text>
          </Pressable>
          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsStrong}>Terms</Text> &{' '}
            <Text style={styles.termsStrong}>Privacy Policy</Text>.
          </Text>
        </View>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  langPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  langText: { fontFamily: fonts.semiBold, color: '#fff', fontSize: 13 },

  hero: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  heroCar: {
    position: 'absolute',
    bottom: -30,
    left: -28,
    right: -28,
    height: 260,
    opacity: 0.22,
  },
  heroFade: {
    position: 'absolute',
    bottom: -30,
    left: 0,
    right: 0,
    height: 120,
  },

  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.greenLight,
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.1,
    color: '#fff',
    marginBottom: 18,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(226,232,240,0.8)',
    marginBottom: 30,
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 26,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipText: {
    fontFamily: fonts.semiBold,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: 'rgba(148,163,184,0.9)',
  },
  statsDot: {
    fontSize: 12,
    color: 'rgba(148,163,184,0.45)',
  },

  actions: { gap: 12 },
  signin: {
    fontFamily: fonts.regular,
    textAlign: 'center',
    fontSize: 14,
    color: 'rgba(226,232,240,0.85)',
    marginTop: 4,
  },
  signinLink: { fontFamily: fonts.bold, color: colors.greenLight },
  terms: {
    fontFamily: fonts.regular,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    color: 'rgba(148,163,184,0.8)',
  },
  termsStrong: { fontFamily: fonts.semiBold, color: 'rgba(226,232,240,0.9)' },
});
