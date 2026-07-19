import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LogoMark } from './Logo';
import { colors, fonts } from '../theme';

// Branded launch moment — the Inzozi identity: the red car mark on its soft
// circular field, on a clean canvas. Springs in, holds, fades into the app.
export default function AnimatedSplash({ onFinish }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const container = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 58, useNativeDriver: true }),
      ]),
      Animated.delay(950),
      Animated.timing(container, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start(() => onFinish && onFinish());
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: container }]}>
      <StatusBar style="dark" />
      <Animated.View style={{ opacity: fade, transform: [{ scale }], alignItems: 'center' }}>
        <LogoMark size={148} />
        <Text style={styles.word}>Inzozi Motors</Text>
        <Text style={styles.tag}>Certified · Inspected · Trusted</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', zIndex: 100, elevation: 100,
  },
  word: { marginTop: 26, fontSize: 26, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -0.5 },
  tag: { marginTop: 10, fontSize: 12.5, fontFamily: fonts.semiBold, color: colors.textMuted, letterSpacing: 0.4 },
});
