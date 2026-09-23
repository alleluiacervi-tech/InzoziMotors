import React from 'react';
import { Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts, iconSize } from '../theme';
import Touchable from './Touchable';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  style,
  textStyle,
  onDark = false,
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  fullWidth = true,
  size = 'md',
}) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  const containerStyle = [
    styles.base,
    styles[size] || styles.md,
    fullWidth && styles.fullWidth,
    isPrimary && styles.primary,
    isSecondary && (onDark ? styles.secondaryDark : styles.secondaryLight),
    variant === 'dark' && styles.dark,
    variant === 'outline' && styles.outline,
    disabled && styles.disabled,
    style,
  ];

  // `dark` is an inverted button (textPrimary fill), so its label takes the page colour.
  const color = variant === 'dark'
    ? colors.bg
    : isPrimary || onDark
    ? colors.white
    : colors.textPrimary;

  const blocked = disabled || loading;

  return (
    <Touchable
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
      haptic={isPrimary ? 'medium' : 'light'}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      hitSlop={6}
      android_ripple={{ color: 'rgba(255,255,255,0.16)', borderless: false }}
      style={({ pressed }) => [containerStyle, pressed && !blocked && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={iconSize.sm} color={color} /> : null}
          <Text
            style={[styles.text, { color }, textStyle]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {title}
          </Text>
        </View>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    overflow: 'hidden',
  },
  fullWidth: { width: '100%' },
  sm: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 11, borderRadius: radius.lg },
  md: { minHeight: 52, paddingHorizontal: 20, paddingVertical: 14 },
  lg: { minHeight: 56, paddingHorizontal: 24, paddingVertical: 16 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minWidth: 0 },
  text: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, letterSpacing: -0.1, textAlign: 'center' },
  primary: { backgroundColor: colors.primary },
  secondaryLight: { backgroundColor: colors.surfaceAlt },
  secondaryDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  dark: { backgroundColor: colors.textPrimary },
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  // Scale now comes from Touchable's spring; this stays opacity-only.
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.46 },
});
