// A Pressable that feels like it was built by someone who cares.
//
// Every tappable surface in this app used React Native's default press
// feedback: an instant opacity/scale snap with no spring, no overshoot, no
// haptic — the single most recognisable "this is an unfinished RN app" tell
// there is. This component is the fix, and it is a DROP-IN for the
// `Pressable` usages it replaces: the same `style`-as-function and
// `children`-as-function contracts Pressable itself supports still work,
// because this still renders a real Pressable underneath — it only adds a
// Reanimated-driven scale on top of whatever style you already pass.
//
// The physics: a fast, slightly under-damped spring (damping 16 / stiffness
// 380) so a press reads as a firm, immediate press — not a squishy bounce,
// which is wrong for a marketplace app buying and selling real money. Scale
// runs entirely on the UI thread (useAnimatedStyle + withSpring), so it never
// competes with JS-thread work like a network response or a list re-render.
//
// Haptics fire on press-IN, not on press (release): the tactile confirmation
// has to land with the moment of contact or it reads as delayed/laggy. A
// press that gets cancelled (finger drags off before release) still restores
// the scale on pressOut/pressCancel; RN calls one of the two.
import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import useReducedMotion from '../hooks/useReducedMotion';
import * as haptics from '../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { damping: 16, stiffness: 380, mass: 0.5 };

export default function Touchable({
  children,
  style,
  scaleTo = 0.97,
  haptic = 'light',
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (event) => {
      if (!disabled) {
        scale.value = reducedMotion ? 1 : withSpring(scaleTo, SPRING);
        if (haptic === 'light') haptics.tapLight();
        else if (haptic === 'medium') haptics.tapMedium();
        else if (haptic === 'selection') haptics.selectionTick();
      }
      onPressIn?.(event);
    },
    [disabled, reducedMotion, scaleTo, haptic, onPressIn, scale],
  );

  const handlePressOut = useCallback(
    (event) => {
      scale.value = reducedMotion ? 1 : withSpring(1, SPRING);
      onPressOut?.(event);
    },
    [reducedMotion, onPressOut, scale],
  );

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={(state) => [typeof style === 'function' ? style(state) : style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
