import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../theme';

// The one loading / error / empty vocabulary. Before this existed the same
// centered-column state was hand-rolled inline in six screens and had already
// drifted (title 16 vs 17, missing lineHeight, bespoke buttons).

export function LoadingState({ label = 'Loading…' }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.sub}>{label}</Text>
    </View>
  );
}

export function ErrorState({ icon = 'cloud-offline-outline', title, sub, actionLabel, onAction }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      {actionLabel ? (
        <Pressable style={styles.btn} onPress={onAction} accessibilityRole="button">
          <Text style={styles.btnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, sub, actionLabel, onAction }) {
  return <ErrorState icon={icon} title={title} sub={sub} actionLabel={actionLabel} onAction={onAction} />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  title: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary, textAlign: 'center' },
  sub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  btn: { marginTop: 10, backgroundColor: colors.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: radius.xl },
  btnText: { color: '#fff', fontSize: 14, fontFamily: fonts.bold },
});
