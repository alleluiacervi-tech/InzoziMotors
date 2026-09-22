import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, fonts, iconSize } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import AppText from './AppText';

// Pill badge — variants: inspected (green), auction (amber), tag (blue), neutral.
//
// Theme-aware: VARIANTS is built from the live palette inside the component
// (useMemo, keyed on colors) rather than once at module load from the static
// import, so a badge painted on a dark card gets the dark theme's measured
// pairs instead of the light ones baked in at import time.
export default function Badge({ label, variant = 'neutral', icon, dot, style }) {
  const { colors } = useTheme();
  const variants = useMemo(() => buildVariants(colors), [colors]);
  const v = variants[variant] || variants.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: v.dotColor || v.fg }]} /> : null}
      {icon ? <Ionicons name={icon} size={iconSize.xs} color={v.fg} /> : null}
      <AppText style={[styles.text, { color: v.fg }]} maxFontSizeMultiplier={1.3} numberOfLines={1}>{label}</AppText>
    </View>
  );
}

function buildVariants(colors) {
  return {
    inspected: { bg: colors.jeondanPlus, fg: '#FFFFFF' },
    auction: { bg: colors.jeondanPlusPlus, fg: '#FFFFFF' },
    tag: { bg: colors.blueTint, fg: colors.primary },
    live: { bg: colors.amberTint, fg: colors.amberText, dotColor: colors.amber },
    neutral: { bg: colors.surfaceAlt, fg: colors.slate600 },
    success: { bg: colors.greenTint, fg: colors.green },

    // Certification tiers (Encar-style graded trust)
    certPlus: { bg: colors.primary, fg: '#FFFFFF' },
    // Was a hand-typed '#FBE4EA' — the same soft brand wash `primaryTint`
    // already names, just never reused here.
    cert: { bg: colors.primaryTint, fg: colors.primary },
    inspectedTier: { bg: colors.surfaceAlt, fg: colors.slate600 },

    // Sawa Specifics
    jeondan: { bg: colors.jeondan, fg: '#FFFFFF' },
    jeondanPlus: { bg: colors.jeondanPlus, fg: '#FFFFFF' },
    jeondanPlusPlus: { bg: colors.jeondanPlusPlus, fg: '#FFFFFF' },
    contract: { bg: colors.contract, fg: '#FFFFFF' },
    alert: { bg: colors.alert, fg: '#FFFFFF' },
  };
}

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
