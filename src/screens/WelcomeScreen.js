import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { colors } from '../theme';

const HERO_CAR = 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=900&q=80';

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.navyLight, colors.navyMid, colors.navyDeep]}
      locations={[0, 0.55, 1]}
      style={styles.root}
    >
      <StatusBar style="light" />

      <View style={[styles.content, { paddingTop: insets.top }]}>

        <View style={styles.topBar}>
          <Logo size={18} />
          <View style={styles.langPill}>
            <Text style={styles.langText}>EN</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>
            The modern standard{'\n'}for premium vehicles.
          </Text>
          <Text style={styles.subtitle}>
            150-point certified. Kigali's most trusted marketplace.
          </Text>
          {/* Hero car image — fades into the dark gradient */}
          <Image source={{ uri: HERO_CAR }} style={styles.heroCar} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', colors.navyDeep]}
            style={styles.heroFade}
            pointerEvents="none"
          />
        </View>

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

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  hero: { flex: 1, justifyContent: 'flex-start', paddingTop: 36, overflow: 'hidden' },
  heroCar: {
    position: 'absolute',
    bottom: -30,
    left: -16,
    right: -16,
    height: 260,
    opacity: 0.28,
  },
  heroFade: {
    position: 'absolute',
    bottom: -30,
    left: 0,
    right: 0,
    height: 100,
  },
  title: { fontSize: 42, fontWeight: '800', lineHeight: 44, letterSpacing: -1.2, color: '#fff', marginTop: 14 },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(226,232,240,0.8)',
    marginTop: 18,
    maxWidth: 300,
  },
  actions: { gap: 12 },
  signin: { textAlign: 'center', fontSize: 14, color: 'rgba(226,232,240,0.85)', marginTop: 4 },
  signinLink: { color: colors.blueLight, fontWeight: '700' },
  terms: { textAlign: 'center', fontSize: 11, lineHeight: 17, color: 'rgba(148,163,184,0.85)' },
  termsStrong: { color: 'rgba(226,232,240,0.9)' },
});
