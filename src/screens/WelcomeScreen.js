import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Dimensions, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LogoStack } from '../components/Logo';
import { colors, fonts, radius, shadows } from '../theme';
import { useApp } from '../context/AppContext';

// Photo only — the lockup and headline are laid out below as real text so they
// scale with the type settings and can be translated. assets/about.png keeps
// the fully composed poster for marketing and store use.
const HERO = require('../../assets/welcome-hero.png');

const { width: SCREEN_W } = Dimensions.get('window');

const TRIO = [
  { icon: 'shield-checkmark-outline', title: 'Trusted', sub: 'Every car is\ninspected' },
  { icon: 'pricetag-outline', title: 'Fair Prices', sub: 'Best value for\nyour money' },
  { icon: 'people-outline', title: 'Happy Customers', sub: '2,000+ satisfied\ncustomers' },
];

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { setHomeMode } = useApp();

  const explore = () => {
    setHomeMode('buy');
    navigation.replace('Main');
  };

  const sell = () => {
    navigation.replace('Main');
    navigation.navigate('Sell');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Everything composes to one screenful on a normal phone; on a short one
          it scrolls rather than clipping the terms and the sign-in link. */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable style={styles.langPill} hitSlop={8}>
          <Text style={styles.langText}>EN</Text>
          <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.brand}>
        <LogoStack width={134} />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>
          Rwanda's most{'\n'}
          <Text style={styles.titleAccent}>trusted</Text> car{'\n'}
          marketplace.
        </Text>
        <Text style={styles.subtitle}>
          Quality cars. Fair prices.{'\n'}Total peace of mind.
        </Text>
      </View>

      <Image source={HERO} style={styles.photo} resizeMode="cover" />

      {/* Lifted over the photograph, exactly as in the reference. */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 58 }]}>
        <View style={styles.trioCard}>
          {TRIO.map((t, i) => (
            <React.Fragment key={t.title}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.trioCol}>
                <View style={styles.trioIcon}>
                  <Ionicons name={t.icon} size={19} color={colors.primary} />
                </View>
                <Text style={styles.trioTitle} numberOfLines={1}>{t.title}</Text>
                <Text style={styles.trioSub}>{t.sub}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={explore}
        >
          <Text style={styles.primaryText}>Explore Cars</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={sell}
        >
          <Ionicons name="car-sport-outline" size={19} color={colors.primary} />
          <Text style={styles.secondaryText}>Sell Your Car</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.primary} />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('SignIn')} hitSlop={8} style={styles.signinWrap}>
          <Text style={styles.signin}>
            Already have an account? <Text style={styles.signinLink}>Sign in</Text>
          </Text>
        </Pressable>

        <Text style={styles.terms}>
          By continuing, you agree to our <Text style={styles.termsStrong}>Terms</Text> &{' '}
          <Text style={styles.termsStrong}>Privacy Policy</Text>.
        </Text>
      </View>
      </ScrollView>

      {/* Brand flourish along the bottom edge. */}
      <View style={[styles.waveWrap, { height: 96 + insets.bottom }]} pointerEvents="none">
        <Svg
          width={SCREEN_W}
          height={96 + insets.bottom}
          viewBox="0 0 400 96"
          preserveAspectRatio="none"
        >
          <Path
            d="M0 34 C 70 10 140 44 220 34 C 296 25 350 6 400 14 L400 96 L0 96 Z"
            fill={colors.primary}
            fillOpacity={0.12}
          />
          <Path
            d="M0 52 C 74 30 138 62 222 52 C 300 43 352 26 400 33 L400 96 L0 96 Z"
            fill={colors.primary}
          />
        </Svg>
        <View style={[styles.dots, { bottom: insets.bottom + 12 }]}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1 },

  topBar: { alignItems: 'flex-end', paddingHorizontal: 22 },
  langPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999,
    ...shadows.card,
  },
  langText: { fontFamily: fonts.semiBold, color: colors.textPrimary, fontSize: 13 },

  brand: { alignItems: 'center', marginTop: 2 },

  copy: { paddingHorizontal: 24, marginTop: 14 },
  title: {
    fontFamily: fonts.black,
    fontSize: 30, lineHeight: 37, letterSpacing: -0.9,
    color: colors.textPrimary,
  },
  titleAccent: { color: colors.primary },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14.5, lineHeight: 21,
    color: colors.textMuted,
    marginTop: 9,
  },

  // The photo absorbs whatever vertical space the fixed blocks leave, so the
  // screen composes the same way on a small phone as on a tall one.
  photo: {
    width: '100%',
    flex: 1,
    minHeight: SCREEN_W * 0.30,
    marginTop: 8,
  },

  // Pulled up over the photograph so the card overlaps it.
  sheet: {
    marginTop: -46,
    paddingHorizontal: 20,
  },

  trioCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 13, paddingHorizontal: 8,
    ...shadows.card,
    shadowOpacity: 0.1, shadowRadius: 18, elevation: 6,
  },
  trioCol: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  divider: { width: 1, backgroundColor: colors.borderSoft, marginVertical: 4 },
  trioIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  trioTitle: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.textPrimary },
  trioSub: {
    fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 14,
    color: colors.textMuted, textAlign: 'center', marginTop: 3,
  },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 15,
    marginTop: 14,
    ...shadows.card,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 14, elevation: 4,
  },
  primaryText: { fontFamily: fonts.extraBold, fontSize: 16, color: '#FFFFFF', letterSpacing: -0.2 },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 13.5,
    marginTop: 9,
  },
  secondaryText: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.primary, letterSpacing: -0.2 },

  pressed: { opacity: 0.8 },

  signinWrap: { alignItems: 'center', marginTop: 12 },
  signin: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textSecondary },
  signinLink: { fontFamily: fonts.bold, color: colors.primary },

  terms: {
    fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17,
    color: colors.textMuted, textAlign: 'center', marginTop: 5,
  },
  termsStrong: { fontFamily: fonts.semiBold, color: colors.textSecondary },

  waveWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  dots: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 7,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: '#FFFFFF', width: 8, height: 8, borderRadius: 4 },
});
