import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LogoMark } from '../components/Logo';
import Button from '../components/Button';
import { setJSON } from '../storage';
import { setUpdateMode, UPDATE_MODE } from '../utils/updates';
import { colors, fonts } from '../theme';
import { useApp } from '../context/AppContext';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  { key: 'inspect', car: true, titleKey: 'onboarding.inspectTitle', subKey: 'onboarding.inspectSub' },
  { key: 'photos', icon: 'camera-outline', titleKey: 'onboarding.photosTitle', subKey: 'onboarding.photosSub' },
  { key: 'trust', icon: 'shield-checkmark-outline', titleKey: 'onboarding.trustTitle', subKey: 'onboarding.trustSub' },
];

export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { language, languageInfo, t } = useApp();
  const [idx, setIdx] = useState(0);
  const ref = useRef(null);
  const last = idx === SLIDES.length - 1;

  // Ticked by default, and asked here rather than buried in Settings.
  //
  // Improvements reach this app over the air, and a person who never finds the
  // preference sits on whatever bundle they installed with — which in practice
  // is most people. Asking once, at the only moment the question is not an
  // interruption, gets the honest outcome: the default is the useful one, and
  // it was still a choice somebody made rather than one made for them. Settings
  // keeps the same switch for anyone who changes their mind.
  const [autoUpdate, setAutoUpdate] = useState(true);

  // `sawTheChoice` is false when Skip is what ended the tour. Somebody who
  // skipped never saw the tick box, so recording a preference from it would be
  // putting words in their mouth — they keep the shipped default, which is to
  // be asked. Only the Get Started button carries a real answer.
  const finish = (sawTheChoice) => {
    setJSON('onboardingSeen', true);
    if (sawTheChoice) setUpdateMode(autoUpdate ? UPDATE_MODE.AUTOMATIC : UPDATE_MODE.ASK);
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Welcome');
  };

  const go = () => {
    if (last) finish(true);
    else ref.current?.scrollTo({ x: width * (idx + 1), animated: true });
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {SLIDES.map((s) => (
          <View key={s.key} style={styles.slide}>
            {s.car ? (
              <View style={styles.artMark}>
                <LogoMark size={208} />
              </View>
            ) : (
              <View style={styles.art}>
                <Ionicons name={s.icon} size={76} color={colors.primary} />
              </View>
            )}
            <Text style={styles.title}>{t(s.titleKey)}</Text>
            <Text style={styles.sub}>{t(s.subKey)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        <Pressable
          style={styles.langPill}
          onPress={() => navigation.navigate('Language')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.language')}
        >
          {Platform.OS === 'ios' && languageInfo.flag ? (
            <Text style={styles.langFlag}>{languageInfo.flag}</Text>
          ) : null}
          <Text style={styles.langText}>{language.toUpperCase()}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          style={styles.skip}
          onPress={() => finish(false)}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>{t('common.skip')}</Text>
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
          ))}
        </View>
        {last ? (
          <Pressable
            style={styles.optIn}
            onPress={() => setAutoUpdate((on) => !on)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: autoUpdate }}
            accessibilityLabel={t('onboarding.updateChoice')}
          >
            <View style={[styles.box, autoUpdate && styles.boxOn]}>
              {autoUpdate ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
            </View>
            <Text style={styles.optInText}>
              {t('onboarding.updateChoice')}
            </Text>
          </Pressable>
        ) : null}
        <Button title={last ? t('common.getStarted') : t('common.next')} onPress={go} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  slide: {
    width,
    height,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 120,
  },
  art: {
    width: 208,
    height: 208,
    borderRadius: 104,
    backgroundColor: '#F2F0EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
  },
  artMark: { marginBottom: 44 },
  title: {
    fontSize: 24, fontFamily: fonts.black, color: colors.textPrimary,
    letterSpacing: -0.5, textAlign: 'center',
  },
  sub: {
    fontSize: 15, fontFamily: fonts.medium, color: colors.textMuted,
    marginTop: 10, textAlign: 'center',
  },
  topBar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
  langPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
  },
  langText: { fontFamily: fonts.bold, color: colors.textPrimary, fontSize: 12, letterSpacing: 0.4 },
  langFlag: { fontSize: 14, marginRight: -2 },
  skip: { paddingVertical: 8, paddingHorizontal: 4 },
  skipText: { fontSize: 14, fontFamily: fonts.bold, color: colors.textMuted },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 0 },
  optIn: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  box: {
    width: 20, height: 20, borderRadius: 6, marginTop: 1,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  optInText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: fonts.regular, color: colors.textMuted },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 18 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 22, backgroundColor: colors.primary },
});
