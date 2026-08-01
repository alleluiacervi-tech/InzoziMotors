import React from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows } from '../theme';
import { useApp } from '../context/AppContext';

// The brand hero — the lockup, the promise and the Kigali skyline are part of
// the artwork itself (assets/about.png), so this screen deliberately carries no
// duplicate logo or headline text.
const HERO = require('../../assets/about.png');

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { setHomeMode } = useApp();

  const enterAs = (mode) => {
    setHomeMode(mode);
    navigation.replace('Main');
  };

  return (
    <ImageBackground source={HERO} resizeMode="cover" style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.topBar, { marginTop: insets.top + 18 }]}>
        <Pressable style={styles.langPill} hitSlop={8}>
          <Text style={styles.langText}>EN</Text>
        </Pressable>
      </View>

      <View style={styles.spacer} />

      {/* The sheet lifts the actions off the photograph so both stay readable. */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.82)', colors.surface]}
        locations={[0, 0.22, 0.46]}
        style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}
      >
        <View style={styles.actions}>
          <View style={styles.intentRow}>
            <Pressable style={({ pressed }) => [styles.intentCard, pressed && styles.pressed]} onPress={() => enterAs('buy')}>
              <View style={styles.intentIcon}>
                <Ionicons name="pricetag" size={19} color={colors.primary} />
              </View>
              <Text style={styles.intentTitle}>Buy a Car</Text>
              <Text style={styles.intentSub}>Certified used cars</Text>
            </Pressable>

            <Pressable style={({ pressed }) => [styles.intentCard, pressed && styles.pressed]} onPress={() => enterAs('rent')}>
              <View style={styles.intentIcon}>
                <Ionicons name="key" size={19} color={colors.primary} />
              </View>
              <Text style={styles.intentTitle}>Rent a Car</Text>
              <Text style={styles.intentSub}>From $40 / day</Text>
            </Pressable>
          </View>

          {/* Sell — refined secondary path */}
          <Pressable
            style={({ pressed }) => [styles.sellRow, pressed && styles.pressed]}
            onPress={() => { navigation.replace('Main'); navigation.navigate('Sell'); }}
          >
            <Ionicons name="car-sport-outline" size={20} color={colors.textPrimary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sellTitle}>Sell your car</Text>
              <Text style={styles.sellSub}>We inspect, photograph and list it for you</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <Pressable onPress={() => navigation.navigate('SignIn')} style={styles.signinWrap} hitSlop={8}>
            <Text style={styles.signin}>
              Already have an account? <Text style={styles.signinLink}>Sign in</Text>
            </Text>
          </Pressable>

          <Text style={styles.terms}>
            By continuing, you agree to our <Text style={styles.termsStrong}>Terms</Text> &{' '}
            <Text style={styles.termsStrong}>Privacy Policy</Text>.
          </Text>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  spacer: { flex: 1 },
  sheet: { paddingHorizontal: 24, paddingTop: 96 },

  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 24 },
  langPill: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 6, paddingHorizontal: 13, borderRadius: 999,
  },
  langText: { fontFamily: fonts.semiBold, color: colors.textSecondary, fontSize: 13 },

  actions: { gap: 12 },
  intentRow: { flexDirection: 'row', gap: 12 },
  intentCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 18,
    ...shadows.card,
  },
  intentIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  intentTitle: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.textPrimary, letterSpacing: -0.3 },
  intentSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 3 },

  sellRow: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingVertical: 15, paddingHorizontal: 16,
  },
  sellTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.textPrimary },
  sellSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },

  pressed: { opacity: 0.65 },

  signinWrap: { alignItems: 'center', marginTop: 6 },
  signin: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  signinLink: { fontFamily: fonts.bold, color: colors.primary },

  terms: {
    fontFamily: fonts.regular, textAlign: 'center',
    fontSize: 11.5, lineHeight: 17, color: colors.textMuted,
    marginTop: 2, paddingHorizontal: 12,
  },
  termsStrong: { fontFamily: fonts.semiBold, color: colors.textSecondary },
});
