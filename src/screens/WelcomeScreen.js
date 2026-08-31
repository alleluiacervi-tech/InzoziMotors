import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Dimensions, Linking } from 'react-native';
import Constants from 'expo-constants';
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

const { height: SCREEN_H } = Dimensions.get('window');

// Reviewers tap these. Same single-source legal pages Settings links to.
const SITE_URL = (Constants.expoConfig?.extra?.siteUrl || 'https://sawacars.com').replace(/\/+$/, '');
const openLegal = (path) => Linking.openURL(`${SITE_URL}${path}`).catch(() => {});

// Nothing scrolls here, so the whole composition has to fit whatever screen it
// lands on. Two scales rather than one: whitespace gives way readily, type does
// not. A phone 20% shorter than the reference loses a fifth of its padding but
// only a tenth of its type, which keeps small labels legible on cheap Androids
// instead of shrinking everything uniformly into a blur.
const RATIO = SCREEN_H / 852;
const sp = (n) => Math.round(n * Math.min(1.10, Math.max(0.62, RATIO)));
const ft = (n) => Math.round(n * Math.min(1.06, Math.max(0.88, RATIO)) * 10) / 10;

const TRIO = [
  { icon: 'shield-checkmark-outline', titleKey: 'welcome.trusted', subKey: 'welcome.trustedSub' },
  { icon: 'pricetag-outline', titleKey: 'welcome.fairPrices', subKey: 'welcome.fairPricesSub' },
  // Was "2,000+ satisfied customers". Nobody counted them, no screen in the
  // app can produce the figure, and it is the first claim a new user reads —
  // on a product whose entire pitch is that its claims are checked. The
  // replacement is the one thing here that is verifiable, on every listing.
  { icon: 'people-outline', titleKey: 'welcome.directContact', subKey: 'welcome.directContactSub' },
];

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { setHomeMode, language, t } = useApp();

  const explore = () => {
    setHomeMode('buy');
    navigation.replace('Main');
  };

  const sell = () => {
    // Replace the welcome route and add Sell in one transaction. The old
    // replace-then-navigate pair raced on slower iPads, leaving the second
    // action unhandled and making the button look broken to reviewers.
    navigation.reset({
      index: 1,
      routes: [{ name: 'Main' }, { name: 'Sell' }],
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.topBar, { paddingTop: insets.top + sp(4) }]}>
        <Pressable
          style={styles.langPill}
          onPress={() => navigation.navigate('Language')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.language')}
        >
          <Text style={styles.langText}>{language.toUpperCase()}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.brand}>
        <LogoStack width={sp(118)} />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>{t('welcome.title')}</Text>
        <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
      </View>

      {/* The one elastic element: it takes whatever the fixed blocks leave, so
          the page fills the screen exactly on any height without scrolling. */}
      <Image
        source={HERO}
        style={styles.photo}
        resizeMode="cover"
        // Android cross-fades bundled images by default, which reads as lag.
        fadeDuration={0}
      />

      <View style={styles.sheet}>
        <View style={styles.trioCard}>
          {TRIO.map((item, i) => (
            <React.Fragment key={item.titleKey}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.trioCol}>
                <View style={styles.trioIcon}>
                  <Ionicons name={item.icon} size={ft(17)} color={colors.primary} />
                </View>
                <Text style={styles.trioTitle} numberOfLines={1}>{t(item.titleKey)}</Text>
                <Text style={styles.trioSub}>{t(item.subKey)}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={explore}
        >
          <Text style={styles.primaryText}>{t('welcome.exploreCars')}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={sell}
        >
          <Ionicons name="car-sport-outline" size={19} color={colors.primary} />
          <Text style={styles.secondaryText}>{t('welcome.sellCar')}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.primary} />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('SignIn')}
          hitSlop={8}
          style={styles.signinWrap}
        >
          <Text style={styles.signin}>
            {t('welcome.alreadyAccount')} <Text style={styles.signinLink}>{t('common.signIn')}</Text>
          </Text>
        </Pressable>

        <Text style={styles.terms}>
          {t('welcome.termsPrefix')}{' '}
          <Text
            style={styles.termsStrong}
            onPress={() => openLegal('/legal/terms')}
            suppressHighlighting
            accessibilityRole="link"
          >
            {t('welcome.terms')}
          </Text>
          {' '}&{' '}
          <Text
            style={styles.termsStrong}
            onPress={() => openLegal('/legal/privacy')}
            suppressHighlighting
            accessibilityRole="link"
          >
            {t('welcome.privacy')}
          </Text>
          .
        </Text>
      </View>

      <View style={styles.waveWrap}>
        {/* preserveAspectRatio="none" lets the curve flatten to whatever band
            height the screen can spare, instead of clipping it. */}
        <Svg width="100%" height={sp(52)} viewBox="0 0 400 84" preserveAspectRatio="none">
          <Path
            d="M0 26 C 70 6 140 36 220 26 C 296 18 350 3 400 10 L400 84 L0 84 Z"
            fill={colors.primary}
            fillOpacity={0.12}
          />
          <Path
            d="M0 43 C 74 24 138 52 222 43 C 300 35 352 20 400 27 L400 84 L0 84 Z"
            fill={colors.primary}
          />
        </Svg>
        {/* Carries the red past the curve to the very bottom, including the
            home-indicator area. */}
        <View style={[styles.waveFoot, { height: insets.bottom + sp(14) }]} />
        <View style={[styles.dotsRow, { bottom: insets.bottom + sp(4) }]}>
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

  topBar: { alignItems: 'flex-end', paddingHorizontal: 22 },
  langPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: sp(6), paddingHorizontal: 13, borderRadius: 999,
    ...shadows.card,
  },
  langText: { fontFamily: fonts.semiBold, color: colors.textPrimary, fontSize: 13 },

  brand: { alignItems: 'center', marginTop: sp(2) },

  copy: { paddingHorizontal: 24, marginTop: sp(14) },
  title: {
    fontFamily: fonts.black,
    fontSize: ft(29), lineHeight: ft(35), letterSpacing: -0.8,
    color: colors.textPrimary,
  },
  titleAccent: { color: colors.primary },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: ft(14.5), lineHeight: ft(20),
    color: colors.textMuted,
    marginTop: sp(8),
  },

  photo: {
    width: '100%',
    flex: 1,
    minHeight: sp(70),
    marginTop: sp(12),
    backgroundColor: colors.surfaceAlt,
  },

  // Lifted over the photograph, as in the reference.
  sheet: { marginTop: sp(-50), paddingHorizontal: 20 },

  trioCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: sp(10), paddingHorizontal: 8,
    ...shadows.card,
    shadowOpacity: 0.1, shadowRadius: 18, elevation: 6,
  },
  trioCol: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  divider: { width: 1, backgroundColor: colors.borderSoft, marginVertical: 4 },
  trioIcon: {
    width: ft(30), height: ft(30), borderRadius: ft(30) / 2,
    backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: sp(5),
  },
  trioTitle: { fontFamily: fonts.bold, fontSize: ft(12.5), color: colors.textPrimary },
  trioSub: {
    fontFamily: fonts.regular, fontSize: ft(11), lineHeight: ft(13),
    color: colors.textMuted, textAlign: 'center', marginTop: 2,
  },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: sp(13),
    marginTop: sp(12),
    ...shadows.card,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 14, elevation: 4,
  },
  primaryText: { fontFamily: fonts.extraBold, fontSize: ft(16), color: '#FFFFFF', letterSpacing: -0.2 },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: sp(12),
    marginTop: sp(8),
  },
  secondaryText: { fontFamily: fonts.extraBold, fontSize: ft(16), color: colors.primary, letterSpacing: -0.2 },

  pressed: { opacity: 0.8 },

  signinWrap: { alignItems: 'center', marginTop: sp(10) },
  signin: { fontFamily: fonts.regular, fontSize: ft(14), color: colors.textSecondary },
  signinLink: { fontFamily: fonts.bold, color: colors.primary },

  terms: {
    fontFamily: fonts.regular, fontSize: ft(12), lineHeight: ft(16),
    color: colors.textMuted, textAlign: 'center', marginTop: sp(4),
  },
  termsStrong: { fontFamily: fonts.semiBold, color: colors.textSecondary },

  waveWrap: { marginTop: sp(10) },
  // -1 closes the hairline seam antialiasing leaves under the SVG.
  waveFoot: { backgroundColor: colors.primary, marginTop: -1 },
  dotsRow: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 7,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: '#FFFFFF', width: 8, height: 8, borderRadius: 4 },
});
