import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../theme';

// Pill badge — variants: inspected (green), auction (amber), tag (blue), neutral.
export default function Badge({ label, variant = 'neutral', icon, dot, style }) {
  const v = VARIANTS[variant] || VARIANTS.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: v.dotColor || v.fg }]} /> : null}
      {icon ? <Ionicons name={icon} size={11} color={v.fg} /> : null}
      <Text style={[styles.text, { color: v.fg }]}>{label}</Text>
    </View>
  );
}

const VARIANTS = {
  inspected: { bg: colors.jeondanPlus, fg: '#FFFFFF' },
  auction: { bg: colors.jeondanPlusPlus, fg: '#FFFFFF' },
  tag: { bg: colors.blueTint, fg: colors.primary },
  live: { bg: colors.amberTint, fg: colors.amberText, dotColor: colors.amber },
  neutral: { bg: colors.surfaceAlt, fg: colors.slate600 },
  success: { bg: colors.greenTint, fg: colors.green },

  // Inzozi Specifics
  jeondan: { bg: colors.jeondan, fg: '#FFFFFF' },
  jeondanPlus: { bg: colors.jeondanPlus, fg: '#FFFFFF' },
  jeondanPlusPlus: { bg: colors.jeondanPlusPlus, fg: '#FFFFFF' },
  contract: { bg: colors.contract, fg: '#FFFFFF' },
  alert: { bg: colors.alert, fg: '#FFFFFF' },
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontFamily: fonts.semiBold, fontSize: 11, letterSpacing: 0.1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
