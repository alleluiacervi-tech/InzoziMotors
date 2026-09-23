import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export default function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.image} />
      <View style={styles.body}>
        <View style={[styles.line, { width: '85%' }]} />
        <View style={[styles.line, { width: '60%' }]} />
        <View style={[styles.line, { width: '55%' }]} />
        <View style={styles.price} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.surfaceAlt,
  },
  body: {
    padding: 10,
    gap: 6,
  },
  line: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
  },
  price: {
    height: 14,
    width: '42%',
    backgroundColor: colors.border,
    borderRadius: 5,
    marginTop: 2,
  },
});
