import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import AppText from './AppText';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedReaction,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { fonts } from '../theme';
import useReducedMotion from '../hooks/useReducedMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The report's one signature read: a ring that sweeps to the pass/attention
 * colour and a score that counts up to it, instead of both simply appearing.
 * A buyer's eye goes to what moves — this is the thing on the screen most
 * worth looking at, so it is the thing that earns the motion.
 *
 * Score and ring share one driver (`progress`, 0→1) rather than two
 * independent timings, so the number always finishes exactly as the ring
 * does — no chance of the digits settling before or after the stroke does.
 */
export default function ScoreRing({ score, maxScore, size = 88, strokeWidth = 5, color, trackColor }) {
  const reducedMotion = useReducedMotion();
  const pct = maxScore > 0 ? score / maxScore : 0;
  const progress = useSharedValue(0);
  const [displayScore, setDisplayScore] = useState(reducedMotion ? score : 0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    progress.value = reducedMotion
      ? 1
      : withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [reducedMotion, progress, score]);

  useAnimatedReaction(
    () => progress.value,
    (value, previous) => {
      if (value === previous) return;
      runOnJS(setDisplayScore)(Math.round(value * score));
    },
    [score]
  );

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value * pct),
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          // Rotate so the sweep starts at 12 o'clock rather than 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <AppText style={[styles.value, { color }]} maxFontSizeMultiplier={1.3}>{displayScore}</AppText>
        <AppText style={styles.max} maxFontSizeMultiplier={1.3}>/ {maxScore}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 24, fontFamily: fonts.extraBold },
  max: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: -3 },
});
