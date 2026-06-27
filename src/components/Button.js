import React from 'react';
import { Text, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows } from '../theme';

// Primary / secondary / ghost button matching the mockup's full-width CTAs.
export default function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  style,
  textStyle,
  onDark = false,
}) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  const containerStyle = [
    styles.base,
    isPrimary && [styles.primary, shadows.blueGlow],
    isSecondary && (onDark ? styles.secondaryDark : styles.secondaryLight),
    variant === 'dark' && styles.dark,
    variant === 'outline' && styles.outline,
    style,
  ];

  const color = isPrimary || variant === 'dark'
    ? colors.white
    : onDark
    ? colors.white
    : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [containerStyle, pressed && styles.pressed]}
    >
      <View style={styles.content}>
        {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
        <Text style={[styles.text, { color }, textStyle]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  text: { fontSize: 16, fontWeight: '700' },
  primary: { backgroundColor: colors.primaryBright },
  secondaryLight: { backgroundColor: colors.surfaceAlt },
  secondaryDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  dark: { backgroundColor: colors.textPrimary },
  outline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
