import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';
import { useApp } from '../context/AppContext';

export default function CatalogueNotice({ onRetry }) {
  const { t } = useApp();
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={20} color={colors.amberText} />
      <Text style={styles.copy}>{t('refinement.offlineResults')}</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('common.retry')} style={styles.retry}>
        <Text style={styles.label}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 12, borderRadius: radius.md, backgroundColor: colors.amberTint },
  copy: { flex: 1, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  retry: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 6 },
  label: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 13 },
});
