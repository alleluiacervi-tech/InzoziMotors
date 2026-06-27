import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

// Pill badge — variants: inspected (green), auction (amber), tag (blue), neutral.
export default function Badge({ label, variant = 'neutral', icon, dot, style }) {
  const v = VARIANTS[variant] || VARIANTS.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: v.dotColor || v.fg }]} /> : null}
      {icon ? <Ionicons name={icon} size={12} color={v.fg} /> : null}
      <Text style={[styles.text, { color: v.fg }]}>{label}</Text>
    </View>
  );
}

const VARIANTS = {
  inspected: { bg: colors.green, fg: '#fff' },
  auction: { bg: colors.amber, fg: '#fff', dotColor: '#fff' },
  tag: { bg: colors.blueTint, fg: colors.primary },
  live: { bg: colors.amberTint, fg: colors.amberText, dotColor: colors.amber },
  neutral: { bg: colors.surfaceAlt, fg: colors.slate600 },
  success: { bg: colors.greenTint, fg: colors.green },
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '700' },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
