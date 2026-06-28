import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

// "Title ........ See all" row used above content sections.
export default function SectionHeader({ title, actionLabel = 'See all', onAction }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onAction || actionLabel ? (
        <Pressable onPress={onAction}>
          <Text style={styles.action}>{actionLabel}</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, color: colors.textPrimary },
  action: { fontSize: 13, fontWeight: '600', color: colors.primary },
});
