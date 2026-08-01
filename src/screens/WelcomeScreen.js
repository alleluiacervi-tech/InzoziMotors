import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LogoStack } from '../components/Logo';
import { colors, fonts, radius, shadows } from '../theme';
import { useApp } from '../context/AppContext';

// JPEG, not PNG — this is a photograph, and as a PNG it was 1.1 MB, which is
// why it used to crawl in. The lockup and headline are set as real text below
// rather than baked into it, so they stay sharp and translatable.
// assets/about.png keeps the fully composed poster for marketing and store use.
const HERO = require('../../assets/welcome-hero.jpg');
const HERO_RATIO = 853 / 670;

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

      {/* One continuous page: the whole story reads top to bottom and the
          sign-in link is reached by scrolling, not by squeezing the layout. */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 6 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.langPill} hitSlop={8}>
            <Text style={styles.langText}>EN</Text>
            <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.brand}>
          <LogoStack width={148} />
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

        <Image
          source={HERO}
          style={styles.photo}
          resizeMode="cover"
          // Android cross-fades bundled images by default, which reads as lag.
          fadeDuration={0}
        />

        <View style={styles.sheet}>
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

          <Pressable
            onPress={() => navigation.navigate('SignIn')}
            hitSlop={8}
            style={styles.signinWrap}
          >
            <Text style={styles.signin}>
              Already have an account? <Text style={styles.signinLink}>Sign in</Text>
            </Text>
          </Pressable>

          <Text style={styles.terms}>
            By continuing, you agree to our <Text style={styles.termsStrong}>Terms</Text> &{' '}
            <Text style={styles.termsStrong}>Privacy Policy</Text>.
          </Text>
        </View>

        {/* Closes the page rather than floating over it, so nothing is hidden
            behind it at the end of the scroll. */}
        <View style={styles.waveWrap}>
          <Svg width="100%" height={92} viewBox="0 0 400 92" preserveAspectRatio="none">
            <Path
              d="M0 30 C 70 8 140 40 220 30 C 296 21 350 4 400 12 L400 92 L0 92 Z"
              fill={colors.primary}
              fillOpacity={0.12}
            />
            <Path
              d="M0 48 C 74 27 138 58 222 48 C 300 39 352 23 400 30 L400 92 L0 92 Z"
              fill={colors.primary}
            />
          </Svg>
          {/* Carries the red past the curve to the very bottom of the page,
              including the home-indicator area. */}
          <View style={[styles.waveFoot, { height: insets.bottom + 30 }]} />
          <View style={[styles.dotsRow, { bottom: insets.bottom + 10 }]}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { backgroundColor: colors.surface },

  topBar: { alignItems: 'flex-end', paddingHorizontal: 22 },
  langPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999,
    ...shadows.card,
  },
  langText: { fontFamily: fonts.semiBold, color: colors.textPrimary, fontSize: 13 },

  brand: { alignItems: 'center', marginTop: 6 },

  copy: { paddingHorizontal: 24, marginTop: 22 },
  title: {
    fontFamily: fonts.black,
    fontSize: 32, lineHeight: 39, letterSpacing: -0.9,
    color: colors.textPrimary,
  },
  titleAccent: { color: colors.primary },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15, lineHeight: 22,
    color: colors.textMuted,
    marginTop: 11,
  },

  // Natural aspect — the photo is never squeezed to make the page fit.
  photo: {
    width: '100%',
    aspectRatio: HERO_RATIO,
    marginTop: 18,
    backgroundColor: colors.surfaceAlt,
  },

  // Lifted over the photograph, as in the reference.
  sheet: { marginTop: -46, paddingHorizontal: 20 },

  trioCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 14, paddingHorizontal: 8,
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
    fontFamily: fonts.regular, fontSize: 11, lineHeight: 14,
    color: colors.textMuted, textAlign: 'center', marginTop: 3,
  },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    marginTop: 18,
    ...shadows.card,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 14, elevation: 4,
  },
  primaryText: { fontFamily: fonts.extraBold, fontSize: 16, color: '#FFFFFF', letterSpacing: -0.2 },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14.5,
    marginTop: 11,
  },
  secondaryText: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.primary, letterSpacing: -0.2 },

  pressed: { opacity: 0.8 },

  signinWrap: { alignItems: 'center', marginTop: 16 },
  signin: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  signinLink: { fontFamily: fonts.bold, color: colors.primary },

  terms: {
    fontFamily: fonts.regular, fontSize: 12, lineHeight: 18,
    color: colors.textMuted, textAlign: 'center', marginTop: 8,
  },
  termsStrong: { fontFamily: fonts.semiBold, color: colors.textSecondary },

  waveWrap: { marginTop: 26 },
  // -1 closes the hairline seam antialiasing leaves under the SVG.
  waveFoot: { backgroundColor: colors.primary, marginTop: -1 },
  dotsRow: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 7,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: '#FFFFFF', width: 8, height: 8, borderRadius: 4 },
});
