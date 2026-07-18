import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { CarGlyph } from './Logo';
import { fonts } from '../theme';

// Branded launch moment — full-bleed brand red with the white car mark,
// mirroring the app icon. In-app surfaces stay minimal; the splash is the
// one place where full brand color belongs.
export default function AnimatedSplash({ onFinish }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const container = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
      Animated.delay(950),
      Animated.timing(container, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start(() => onFinish && onFinish());
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: container }]}>
      <StatusBar style="light" />
      <LinearGradient colors={['#E5403A', '#C11C1C']} style={StyleSheet.absoluteFill} />
      <Animated.View style={{ opacity: fade, transform: [{ scale }], alignItems: 'center' }}>
        <CarGlyph width={140} body="#FFFFFF" glass="#D42222" />
        <Text style={styles.word}>Inzozi Motors</Text>
        <Text style={styles.tag}>Certified · Inspected · Trusted</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100, elevation: 100 },
  word: { marginTop: 24, fontSize: 26, fontFamily: fonts.black, color: '#fff', letterSpacing: -0.5 },
  tag: { marginTop: 10, fontSize: 12.5, fontFamily: fonts.semiBold, color: 'rgba(255,255,255,0.92)', letterSpacing: 0.4 },
});
