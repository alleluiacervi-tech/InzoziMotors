// A Pressable that feels like it was built by someone who cares.
//
// Every tappable surface in this app used React Native's default press
// feedback: an instant opacity/scale snap with no spring, no overshoot, no
// haptic — the single most recognisable "this is an unfinished RN app" tell
// there is. This component is the fix, and it is a DROP-IN for the
// `Pressable` usages it replaces: `style` may be an object or a function of
// `{ pressed }`, and `children` may be a function, exactly as with Pressable.
//
// A style FUNCTION must never reach the animated component itself. Reanimated
// rewrites `style` into an array before Pressable sees it, and Pressable only
// calls a style that is a bare function, so `[fn]` is silently dropped along
// with every style in it. That shipped once: tab bar, buttons and cards all
// rendered unstyled. The pressed state is tracked here and the style resolved
// before it is handed over.
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
import React, { useCallback, useState } from 'react';
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
  const [pressed, setPressed] = useState(false);
  const styleIsFunction = typeof style === 'function';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (event) => {
      if (!disabled) {
        if (styleIsFunction) setPressed(true);
        scale.value = reducedMotion ? 1 : withSpring(scaleTo, SPRING);
        if (haptic === 'light') haptics.tapLight();
        else if (haptic === 'medium') haptics.tapMedium();
        else if (haptic === 'selection') haptics.selectionTick();
      }
      onPressIn?.(event);
    },
    [disabled, styleIsFunction, reducedMotion, scaleTo, haptic, onPressIn, scale],
  );

  const handlePressOut = useCallback(
    (event) => {
      if (styleIsFunction) setPressed(false);
      scale.value = reducedMotion ? 1 : withSpring(1, SPRING);
      onPressOut?.(event);
    },
    [styleIsFunction, reducedMotion, onPressOut, scale],
  );

  const resolvedStyle = styleIsFunction ? style({ pressed }) : style;

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[resolvedStyle, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
