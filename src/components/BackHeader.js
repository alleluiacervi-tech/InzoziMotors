import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, fonts } from '../theme';

export default function BackHeader({ title, onBack, right, tint = colors.slate700, transparent }) {
  return (
    <View style={[styles.row, !transparent && styles.elevated]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.iconBtn,
            !transparent && styles.iconBtnFilled,
            pressed && styles.iconBtnPressed,
          ]}
          hitSlop={8}
          // An icon with no text is silent to VoiceOver and TalkBack — the
          // control announces as "button" with nothing to say what it does.
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color={tint} />
        </Pressable>
      ) : (
        <View style={{ width: 44 }} />
      )}
      {title ? <Text style={[styles.title, { color: tint }]}>{title}</Text> : <View />}
      <View style={styles.right}>{right || <View style={{ width: 44 }} />}</View>
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
  elevated: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    ...shadows.header,
  },
  iconBtn: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  iconBtnFilled: { backgroundColor: colors.surfaceAlt },
  iconBtnPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  title: { fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.2, color: colors.textPrimary },
  right: { minWidth: 44, alignItems: 'flex-end' },
});
