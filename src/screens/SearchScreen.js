import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import CarListCard from '../components/CarListCard';
import CarCard from '../components/CarCard';
import ImportCarCard from '../components/ImportCarCard';
import BrandMark from '../components/BrandMark';
import { colors, radius, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { searchImportCatalog, importCatalogMakes, FALLBACK_IMPORT_CATALOG } from '../data/importCatalog';

// The Cars tab.
//
// Two scopes, and it opens on the cars that are actually here. It used to open
// on "All", which rendered every local car AND all 233 import-catalogue models
// as full cards inside the list's footer — not virtualized, all mounted at
// once — which is why tapping the tab hung for seconds. It also announced
// "258 vehicles found" by counting import *models* as cars.
//
// Now: In Rwanda is a virtualized list of real listings with an honest count,
// and a single compact doorway to imports at its foot. Import brand new is its
// own virtualized list, entered by brand, with the models as compact rows.

const SORTS = ['Best match', 'Price ↑', 'Price ↓', 'Newest', 'Mileage'];
const SORT_LABEL_KEYS = { 'Best match': 'bestMatch', 'Price ↑': 'priceLow', 'Price ↓': 'priceHigh', Newest: 'newest', Mileage: 'mileage' };

const SCOPES = [
  { id: 'local', labelKey: 'browse.scopeLocal', icon: 'location-outline' },
  { id: 'import', labelKey: 'browse.scopeImport', icon: 'boat-outline' },
];

// Virtualization settings shared by both lists: draw a screenful first, keep a
// few screens around, and let Android drop what has scrolled away.
const LIST_TUNING = {
  initialNumToRender: 6,
  maxToRenderPerBatch: 6,
  windowSize: 7,
  removeClippedSubviews: Platform.OS === 'android',
};

const IMPORT_MODEL_COUNT = FALLBACK_IMPORT_CATALOG.length;

export default function SearchScreen({ navigation }) {
  const { cars, brandLogo, t } = useApp();
  const [scope, setScope] = useState('local');
  const [sort, setSort] = useState('Best match');
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState('list'); // 'list' | 'grid'
  const isGrid = layout === 'grid';
  const query = searchQuery.trim();

  const localCars = useMemo(() => {
    let list = cars;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((c) =>
        [c.title, c.make, c.model, c.category].some((v) => String(v || '').toLowerCase().includes(q))
      );
    }
    const priceOf = (c) => (c.type === 'auction' ? c.currentBid : c.price);
    if (sort === 'Price ↑') list = [...list].sort((a, b) => priceOf(a) - priceOf(b));
    else if (sort === 'Price ↓') list = [...list].sort((a, b) => priceOf(b) - priceOf(a));
    else if (sort === 'Mileage') list = [...list].sort((a, b) => a.mileage - b.mileage);
    else if (sort === 'Newest') list = [...list].sort((a, b) => b.year - a.year);
    return list;
  }, [cars, query, sort]);

  // Only computed when the import scope is open, or when a search needs the
  // "you could import this instead" hint.
  const importModels = useMemo(
    () => (scope === 'import' || query ? searchImportCatalog(query) : []),
    [scope, query]
  );
  const importBrands = useMemo(
    () => importCatalogMakes().sort((a, b) => b.modelCount - a.modelCount),
    []
  );

  const openCar = useCallback((item) => navigation.navigate('VehicleDetail', { car: item }), [navigation]);
  const openImport = useCallback((item) => navigation.navigate('ImportVehicleDetail', { item }), [navigation]);

  const renderCar = useCallback(({ item }) => (isGrid
    ? <CarCard car={item} onPress={() => openCar(item)} />
    : <CarListCard car={item} onPress={() => openCar(item)} />
  ), [isGrid, openCar]);
  const renderImport = useCallback(({ item }) => (
    <ImportCarCard item={item} onPress={() => openImport(item)} />
  ), [openImport]);

  const sortChips = (
    <FlatList
      horizontal
      data={SORTS}
      keyExtractor={(s) => s}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.sortRow}
      renderItem={({ item }) => {
        const on = item === sort;
        return (
          <Pressable
            style={[styles.sortChip, on && styles.sortChipOn]}
            onPress={() => setSort(item)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.sortText, on && styles.sortTextOn]}>
              {t(`searchResults.${SORT_LABEL_KEYS[item]}`)}
            </Text>
          </Pressable>
        );
      }}
    />
  );

  const sourcingCard = (
    <View style={styles.sourcingCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sourcingTitle}>{t('browse.sourcingTitle')}</Text>
        <Text style={styles.sourcingBody}>{t('browse.sourcingBody')}</Text>
      </View>
      <Pressable
        style={styles.sourcingBtn}
        onPress={() => navigation.navigate('ImportOrderDetail', { isNewCustom: true })}
        accessibilityRole="button"
      >
        <Text style={styles.sourcingBtnText}>{t('browse.sourcingCta')}</Text>
      </Pressable>
    </View>
  );

  const localHeader = (
    <View style={isGrid && styles.gridHeaderPad}>
      <View style={styles.resultRow}>
        <Text style={styles.resultCount} numberOfLines={1}>
          {t(localCars.length === 1 ? 'browse.carsInRwandaOne' : 'browse.carsInRwanda', { count: localCars.length })}
          {query ? <Text style={styles.resultQuery}>{` · ${t('browse.resultsFor', { query })}`}</Text> : null}
        </Text>
        <Pressable
          style={styles.layoutBtn}
          onPress={() => setLayout(isGrid ? 'list' : 'grid')}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t(isGrid ? 'searchResults.showList' : 'searchResults.showGrid')}
        >
          <Ionicons name={isGrid ? 'list-outline' : 'grid-outline'} size={17} color={colors.textSecondary} />
        </Pressable>
      </View>
      {sortChips}
    </View>
  );

  const localFooter = (
    <View style={isGrid && styles.gridHeaderPad}>
      <Pressable
        style={styles.importEntry}
        onPress={() => setScope('import')}
        accessibilityRole="button"
      >
        <View style={styles.importEntryIcon}>
          <Ionicons name="boat-outline" size={20} color={colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.importEntryTitle}>{t('browse.importEntryTitle')}</Text>
          <Text style={styles.importEntryBody}>
            {t('browse.importEntryBody', { models: IMPORT_MODEL_COUNT, brands: importBrands.length })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );

  const localEmpty = (
    <View style={styles.emptyState}>
      <Ionicons name="car-outline" size={48} color={colors.border} />
      <Text style={styles.emptyTitle}>
        {query ? t('browse.noLocalMatches', { query }) : t('filters.noResults')}
      </Text>
      {query && importModels.length ? (
        <>
          <Text style={styles.emptySub}>{t('browse.noLocalImportHint', { count: importModels.length })}</Text>
          <Pressable style={styles.primaryBtn} onPress={() => setScope('import')} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>{t('browse.seeImports')}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.emptySub}>{t('filters.adjust')}</Text>
          {query ? (
            <Pressable style={styles.primaryBtn} onPress={() => setSearchQuery('')} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>{t('searchResults.clearSearch')}</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );

  const importHeader = (
    <View>
      {!query ? (
        <>
          <Text style={styles.sectionLabel}>{t('browse.browseBrands')}</Text>
          <FlatList
            horizontal
            data={importBrands}
            keyExtractor={(b) => b.make}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.brandRow}
            renderItem={({ item }) => (
              <Pressable
                style={styles.brandChip}
                onPress={() => navigation.navigate('ImportBrandModels', { make: item.make })}
                accessibilityRole="button"
                accessibilityLabel={`${item.make}, ${item.modelCount}`}
              >
                <BrandMark name={item.make} logoUrl={brandLogo(item.make)} size={36} />
                <Text style={styles.brandChipName} numberOfLines={1}>{item.make}</Text>
              </Pressable>
            )}
          />
        </>
      ) : null}
      <View style={styles.resultRow}>
        <Text style={styles.resultCount} numberOfLines={1}>
          {t('browse.importModels', { count: importModels.length })}
          {query ? <Text style={styles.resultQuery}>{` · ${t('browse.resultsFor', { query })}`}</Text> : null}
        </Text>
      </View>
      <Text style={styles.importNote}>{t('browse.importNote')}</Text>
    </View>
  );

  return (
    <Screen background={colors.bg}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('home.search')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('searchResults.clearSearch')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={styles.filterBtn}
          onPress={() => navigation.navigate('Filters')}
          accessibilityRole="button"
          accessibilityLabel={t('searchResults.filterButton')}
        >
          <Ionicons name="options-outline" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.scopeRow} accessibilityRole="tablist">
        {SCOPES.map((s) => {
          const on = scope === s.id;
          return (
            <Pressable
              key={s.id}
              style={[styles.scopeTab, on && styles.scopeTabOn]}
              onPress={() => setScope(s.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Ionicons name={s.icon} size={15} color={on ? colors.textPrimary : colors.textMuted} />
              <Text style={[styles.scopeText, on && styles.scopeTextOn]}>{t(s.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      {scope === 'local' ? (
        <FlatList
          key={`local-${layout}`}
          numColumns={isGrid ? 2 : 1}
          data={localCars}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderCar}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, isGrid && styles.gridContent]}
          ListHeaderComponent={localHeader}
          ListFooterComponent={localFooter}
          ListEmptyComponent={localEmpty}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          {...LIST_TUNING}
        />
      ) : (
        <FlatList
          key="import"
          data={importModels}
          keyExtractor={(m) => m.id}
          renderItem={renderImport}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={importHeader}
          ListFooterComponent={sourcingCard}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="boat-outline" size={44} color={colors.border} />
              <Text style={styles.emptyTitle}>{t('filters.noResults')}</Text>
              <Text style={styles.emptySub}>{t('browse.importEmpty')}</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          {...LIST_TUNING}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: fonts.medium, color: colors.textPrimary, padding: 0 },
  filterBtn: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  // A segmented control, not two red pills: red is for the primary action and
  // the active state of a single choice, and this is a view switch.
  scopeRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 3,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
  },
  scopeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: radius.pill,
  },
  scopeTabOn: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  scopeText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textMuted },
  scopeTextOn: { fontFamily: fonts.bold, color: colors.textPrimary },

  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  gridContent: { paddingHorizontal: 10 },
  gridHeaderPad: { paddingHorizontal: 6 },

  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 8, gap: 12 },
  resultCount: { flex: 1, fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  resultQuery: { fontFamily: fonts.medium, color: colors.textMuted },
  layoutBtn: {
    width: 38, height: 38, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  sortRow: { gap: 8, paddingBottom: 12 },
  sortChip: {
    height: 34, justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, borderRadius: radius.pill,
  },
  sortChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortText: { fontSize: 12.5, fontFamily: fonts.semiBold, color: colors.textSecondary },
  sortTextOn: { color: '#FFFFFF' },

  importEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  importEntryIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  importEntryTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  importEntryBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 2 },

  sectionLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSecondary, marginTop: 6, marginBottom: 8 },
  brandRow: { gap: 8, paddingBottom: 14 },
  brandChip: {
    width: 76,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  brandChipName: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textPrimary, maxWidth: 68 },
  importNote: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted, marginBottom: 12 },

  sourcingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sourcingTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  sourcingBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 2 },
  sourcingBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, height: 38, borderRadius: radius.pill, justifyContent: 'center' },
  sourcingBtnText: { fontFamily: fonts.bold, fontSize: 12.5, color: '#FFFFFF' },

  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 28, gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 6, textAlign: 'center' },
  emptySub: { fontSize: 13.5, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  primaryBtn: { marginTop: 10, backgroundColor: colors.primary, paddingHorizontal: 22, height: 44, borderRadius: radius.pill, justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontFamily: fonts.bold },
});
