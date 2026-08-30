import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LogoMark } from '../components/Logo';
import Button from '../components/Button';
import { setJSON } from '../storage';
import { setUpdateMode, UPDATE_MODE } from '../utils/updates';
import { colors, fonts } from '../theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  { key: 'inspect', car: true, title: 'Every car, inspected', sub: '150-point certified check.' },
  { key: 'photos', icon: 'camera-outline', title: 'Real photos, real specs', sub: 'Shot by our own team.' },
  { key: 'trust', icon: 'shield-checkmark-outline', title: 'Contact verified sellers', sub: 'Agree and transact directly.' },
];

export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.sub}>{s.sub}</Text>
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={[styles.skip, { top: insets.top + 14 }]}
        onPress={() => finish(false)}
        hitSlop={12}
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

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
            accessibilityLabel="Keep Sawa Cars up to date automatically"
          >
            <View style={[styles.box, autoUpdate && styles.boxOn]}>
              {autoUpdate ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
            </View>
            <Text style={styles.optInText}>
              Keep Sawa Cars up to date automatically. New versions install when you next
              open the app — never while you are using it.
            </Text>
          </Pressable>
        ) : null}
        <Button title={last ? 'Get Started' : 'Next'} onPress={go} />
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
    fontSize: 25, fontFamily: fonts.black, color: colors.textPrimary,
    letterSpacing: -0.5, textAlign: 'center',
  },
  sub: {
    fontSize: 15, fontFamily: fonts.medium, color: colors.textMuted,
    marginTop: 10, textAlign: 'center',
  },
  skip: { position: 'absolute', right: 20, zIndex: 10 },
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
