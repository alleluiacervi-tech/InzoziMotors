// ─────────────────────────────────────────────────────────────────────────────
// Import, entered through the brand.
//
// Somebody importing a car knows they want a Hyundai long before they know
// which Hyundai. The previous screen showed a flat, horizontally-scrolled strip
// of eight vehicles out of twenty-nine, which answers neither question: you
// could not see what a marque offers, and most of the range was unreachable.
//
// So: every marque, with how many models sit behind it, and a search that
// matches a brand OR a model — typing "tucson" should not require knowing it is
// a Hyundai.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import BrandMark from '../components/BrandMark';
import { EmptyState } from '../components/StateViews';
import { colors, radius, fonts, spacing, typography, shadows } from '../theme';
import { importCatalogMakes, searchImportCatalog } from '../data/importCatalog';
import { useApp } from '../context/AppContext';

const ORIGIN_LABEL = {
  'South Korea': 'South Korea',
  Japan: 'Japan',
  China: 'China',
};

function BrandTile({ entry, logoUrl, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${entry.make}, ${entry.modelCount} models from ${entry.originCountry}`}
    >
      <BrandMark name={entry.make} logoUrl={logoUrl} size={44} />
      <Text style={styles.tileName} numberOfLines={1}>{entry.make}</Text>
      <Text style={styles.tileMeta} numberOfLines={1}>
        {entry.modelCount} {entry.modelCount === 1 ? 'model' : 'models'}
      </Text>
      <Text style={styles.tileOrigin} numberOfLines={1}>
        {ORIGIN_LABEL[entry.originCountry] || entry.originCountry}
      </Text>
    </Pressable>
  );
}

export default function ImportBrandsScreen({ navigation }) {
  const { brandLogo } = useApp();
  const [query, setQuery] = useState('');
  const makes = useMemo(() => importCatalogMakes(), []);

  // A search that matches models as well as brands. Two result shapes fall out
  // of one query, and showing both beats making the user guess which box their
  // word belongs in.
  const trimmed = query.trim();
  const matchingModels = useMemo(
    () => (trimmed ? searchImportCatalog(trimmed).slice(0, 40) : []),
    [trimmed],
  );
  const matchingMakes = useMemo(() => {
    if (!trimmed) return makes;
    const q = trimmed.toLowerCase();
    return makes.filter((m) => m.make.toLowerCase().includes(q));
  }, [makes, trimmed]);

  const openBrand = (make) => navigation.navigate('ImportBrandModels', { make });

  return (
    <Screen>
      <BackHeader title="Import a new vehicle" onBack={() => navigation.goBack()} />

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search a brand or model"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search import brands and models"
        />
        {trimmed.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={matchingMakes}
        keyExtractor={(item) => item.make}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <BrandTile entry={item} logoUrl={brandLogo(item.make)} onPress={() => openBrand(item.make)} />
        )}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.introText}>
              Brand-new, zero-kilometre vehicles sourced to order from Japan, South
              Korea and China. Pick a brand to see its full range, then ask us for
              details on the one you want.
            </Text>
          </View>
        }
        ListFooterComponent={
          trimmed && matchingModels.length > 0 ? (
            <View style={styles.modelMatches}>
              <Text style={styles.modelMatchesTitle}>
                Models matching “{trimmed}”
              </Text>
              {matchingModels.map((m) => (
                <Pressable
                  key={m.id}
                  style={styles.modelRow}
                  onPress={() => navigation.navigate('ImportVehicleDetail', { item: m })}
                >
                  <BrandMark name={m.make} logoUrl={brandLogo(m.make)} size={30} />
                  <View style={styles.modelRowBody}>
                    <Text style={styles.modelRowName}>{m.make} {m.model}</Text>
                    <Text style={styles.modelRowMeta}>
                      {m.bodyType} · {m.fuelTypes.join(' / ')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="car-sport-outline"
            title="No brand matches that"
            sub={`Nothing in the import catalogue matches “${trimmed}”. Try the brand name on its own.`}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    // 44 tall and 16px text: below 16px iOS Safari-style zoom does not apply in
    // a native app, but a smaller field here would still be under the 44pt
    // minimum touch target.
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.textPrimary, padding: 0 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  intro: { marginBottom: spacing.lg },
  introText: { ...typography.body, color: colors.textSecondary },
  row: { gap: spacing.md, marginBottom: spacing.md },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  tilePressed: { opacity: 0.7 },
  tileName: { ...typography.cardTitle, color: colors.textPrimary, marginTop: spacing.sm, textAlign: 'center' },
  tileMeta: { ...typography.cardMeta, color: colors.textSecondary, marginTop: 2 },
  tileOrigin: { ...typography.micro, color: colors.textMuted, marginTop: 2 },
  modelMatches: { marginTop: spacing.xl },
  modelMatchesTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  modelRowBody: { flex: 1 },
  modelRowName: { ...typography.bodyStrong, color: colors.textPrimary },
  modelRowMeta: { ...typography.cardMeta, color: colors.textSecondary, marginTop: 1 },
});
