import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

// "Title ........ See all ›" row used above content sections. The link is ink
// with a chevron, not red: red is for prices and the one main action.
export default function SectionHeader({ title, actionLabel = 'View all', onAction }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="link" style={styles.actionHit}>
          <Text style={styles.action}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  title: { flexShrink: 1, fontSize: 19, fontFamily: fonts.bold, letterSpacing: -0.3, color: colors.textPrimary },
  actionHit: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  action: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textSecondary },
});
