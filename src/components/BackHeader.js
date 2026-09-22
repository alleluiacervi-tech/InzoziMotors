import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, fonts, iconSize } from '../theme';
import Touchable from './Touchable';

/**
 * The universal secondary-screen header. `palette` is optional and additive:
 * omitted, this behaves exactly as it always has (the static light-only
 * `colors` import) — every screen that has not been migrated onto
 * useTheme() yet is completely unaffected. A screen that HAS migrated passes
 * its live `colors` from useTheme() here so the header's own background and
 * border follow the current theme instead of staying stuck in light mode
 * underneath an otherwise-dark screen.
 *
 * `tint` still overrides just the icon/title colour on top of whichever
 * palette is in effect, unchanged from before.
 */
export default function BackHeader({ title, onBack, right, tint, transparent, palette }) {
  const c = palette || colors;
  const resolvedTint = tint || c.slate700;

  return (
    <View
      style={[
        styles.row,
        !transparent && {
          backgroundColor: c.surface,
          borderBottomWidth: 1,
          borderBottomColor: c.borderSoft,
          ...shadows.header,
        },
      ]}
    >
      {onBack ? (
        <Touchable
          scaleTo={0.9}
          onPress={onBack}
          style={({ pressed }) => [
            styles.iconBtn,
            !transparent && { backgroundColor: c.surfaceAlt },
            pressed && styles.iconBtnPressed,
          ]}
          hitSlop={8}
          // An icon with no text is silent to VoiceOver and TalkBack — the
          // control announces as "button" with nothing to say what it does.
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={iconSize.md} color={resolvedTint} />
        </Touchable>
      ) : (
        <View style={{ width: 48 }} />
      )}
      {title ? <Text style={[styles.title, { color: resolvedTint }]}>{title}</Text> : <View />}
      <View style={styles.right}>{right || <View style={{ width: 48 }} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  iconBtn: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  // Scale now comes from Touchable's spring.
  iconBtnPressed: { opacity: 0.72 },
  title: { fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.2 },
  right: { minWidth: 48, alignItems: 'flex-end' },
});
