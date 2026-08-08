import React from 'react';
import { Text, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, fonts } from '../theme';

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
}) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  const containerStyle = [
    styles.base,
    isPrimary && [styles.primary, shadows.blueGlow],
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
      style={({ pressed }) => [containerStyle, pressed && !blocked && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
          <Text style={[styles.text, { color }, textStyle]}>{title}</Text>
        </View>
      )}
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
  text: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: -0.1 },
  primary: { backgroundColor: colors.primary },
  secondaryLight: { backgroundColor: colors.surfaceAlt },
  secondaryDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  dark: { backgroundColor: colors.textPrimary },
  outline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
