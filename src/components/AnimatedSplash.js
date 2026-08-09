import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, Easing, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoMark } from './Logo';
import Button from './Button';
import { colors, fonts } from '../theme';

// Branded landing — the Sawa identity holds on screen from launch until
// the user taps through; no auto-dismiss.
//
// The mark makes ONE full clockwise turn as it arrives — 900ms, decelerating
// into place with a spring settle — then the wordmark rises under it. One
// confident rotation, not a loop: a logo that keeps spinning reads as a stuck
// loading indicator, and the whole entrance is over in ~1.4s so the brand
// moment never costs the user time.
export default function AnimatedSplash({ onFinish }) {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  const turn = useRef(new Animated.Value(0)).current;
  const wordFade = useRef(new Animated.Value(0)).current;
  const wordRise = useRef(new Animated.Value(10)).current;
  const btnFade = useRef(new Animated.Value(0)).current;
  const container = useRef(new Animated.Value(1)).current;
  const leaving = useRef(false);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
        // The turn and the scale share one clock so the mark lands as a
        // single motion, not a spin THEN a pop.
        Animated.timing(turn, {
          toValue: 1,
          duration: 900,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 46, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(wordFade, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(wordRise, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(btnFade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // 0 → 1 mapped onto one clockwise revolution.
  const rotation = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const dismiss = () => {
    if (leaving.current) return;
    leaving.current = true;
    Animated.timing(container, { toValue: 0, duration: 420, useNativeDriver: true })
      .start(() => onFinish && onFinish());
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: container }]}>
      <StatusBar style="dark" />
      <View style={styles.center}>
        <Animated.View style={{ alignItems: 'center' }}>
          <Animated.View style={{ opacity: fade, transform: [{ scale }, { rotate: rotation }] }}>
            <LogoMark size={148} />
          </Animated.View>
          <Animated.View
            style={{ opacity: wordFade, transform: [{ translateY: wordRise }], alignItems: 'center' }}
          >
            <Text style={styles.word}>Sawa Cars</Text>
            <Text style={styles.tag}>Certified · Inspected · Trusted</Text>
          </Animated.View>
        </Animated.View>
      </View>
      <Animated.View style={[styles.footer, { opacity: btnFade, paddingBottom: insets.bottom + 24 }]}>
        <Button title="Next" onPress={dismiss} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#FFFFFF', zIndex: 100, elevation: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  word: { marginTop: 26, fontSize: 26, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -0.5 },
  tag: { marginTop: 10, fontSize: 12.5, fontFamily: fonts.semiBold, color: colors.textMuted, letterSpacing: 0.4 },
  footer: { paddingHorizontal: 24 },
});
