import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

// Back chevron + optional title + optional right action.
export default function BackHeader({ title, onBack, right, tint = colors.slate700, transparent }) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        style={[styles.iconBtn, !transparent && styles.iconBtnFilled]}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={20} color={tint} />
      </Pressable>
      {title ? <Text style={[styles.title, { color: tint }]}>{title}</Text> : <View />}
      <View style={styles.right}>{right || <View style={{ width: 42 }} />}</View>
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
  iconBtn: { width: 42, height: 42, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  iconBtnFilled: { backgroundColor: colors.surfaceAlt },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  right: { minWidth: 42, alignItems: 'flex-end' },
});
