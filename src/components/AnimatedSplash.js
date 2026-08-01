import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoMark } from './Logo';
import Button from './Button';
import { colors, fonts } from '../theme';

// Branded landing — the Sawa identity holds on screen from launch until
// the user taps through; no auto-dismiss.
export default function AnimatedSplash({ onFinish }) {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const btnFade = useRef(new Animated.Value(0)).current;
  const container = useRef(new Animated.Value(1)).current;
  const leaving = useRef(false);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 58, useNativeDriver: true }),
      ]),
      Animated.timing(btnFade, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

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
        <Animated.View style={{ opacity: fade, transform: [{ scale }], alignItems: 'center' }}>
          <LogoMark size={148} />
          <Text style={styles.word}>Sawa</Text>
          <Text style={styles.tag}>Certified · Inspected · Trusted</Text>
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
