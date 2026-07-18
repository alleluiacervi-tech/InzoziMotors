import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CarGlyph } from '../components/Logo';
import Button from '../components/Button';
import { colors, fonts } from '../theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  { key: 'inspect', car: true, title: 'Every car, inspected', sub: '150-point certified check.' },
  { key: 'photos', icon: 'camera-outline', title: 'Real photos, real specs', sub: 'Shot by our own team.' },
  { key: 'trust', icon: 'shield-checkmark-outline', title: 'Buy with confidence', sub: '7-day return, always.' },
];

export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const ref = useRef(null);
  const last = idx === SLIDES.length - 1;

  const go = () => {
    if (last) navigation.replace('Welcome');
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
            <View style={styles.art}>
              {s.car ? (
                <CarGlyph width={128} body={colors.primary} glass={colors.surfaceAlt} />
              ) : (
                <Ionicons name={s.icon} size={76} color={colors.primary} />
              )}
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.sub}>{s.sub}</Text>
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={[styles.skip, { top: insets.top + 14 }]}
        onPress={() => navigation.replace('Welcome')}
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
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
  },
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
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 18 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 22, backgroundColor: colors.primary },
});
