import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LogoMark } from './Logo';
import { colors, fonts } from '../theme';

// Branded launch overlay — minimal: red logo mark on a clean canvas, fades into the app.
export default function AnimatedSplash({ onFinish }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const container = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 460, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 62, useNativeDriver: true }),
      ]),
      Animated.delay(680),
      Animated.timing(container, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onFinish && onFinish());
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: container }]}>
      <StatusBar style="dark" />
      <Animated.View style={{ opacity: fade, transform: [{ scale }], alignItems: 'center' }}>
        <LogoMark size={84} />
        <Text style={styles.word}>Inzozi Motors</Text>
        <Text style={styles.tag}>Certified · Inspected · Trusted</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, zIndex: 100, elevation: 100 },
  word: { marginTop: 20, fontSize: 24, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -0.5 },
  tag: { marginTop: 8, fontSize: 12, fontFamily: fonts.semiBold, color: colors.textMuted, letterSpacing: 0.3 },
});
