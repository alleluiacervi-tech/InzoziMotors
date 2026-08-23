import React from 'react';
import { Text, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../theme';

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

  const color = isPrimary || variant === 'dark'
    ? colors.white
    : onDark
    ? colors.white
    : colors.textPrimary;

  const blocked = disabled || loading;

  return (
    <Pressable
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
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
          {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
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
    </Pressable>
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
  sm: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.lg },
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
  outline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.46 },
});
