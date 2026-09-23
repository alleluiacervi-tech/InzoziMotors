import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import CarListCard from '../components/CarListCard';
import CarCard from '../components/CarCard';
import ImportCarCard from '../components/ImportCarCard';
import SkeletonCard from '../components/SkeletonCard';
import { colors, radius, fonts, shadows } from '../theme';
import { showToast } from '../components/Feedback';
import { useApp } from '../context/AppContext';
import { searchImportCatalog } from '../data/importCatalog';
import StaggerEntrance from '../components/StaggerEntrance';

const SORTS = ['Best match', 'Price ↑', 'Price ↓', 'Newest', 'Mileage'];
const SORT_LABEL_KEYS = {
  'Best match': 'bestMatch', 'Price ↑': 'priceLow', 'Price ↓': 'priceHigh',
  Newest: 'newest', Mileage: 'mileage',
};

const priceOf = (c) =>
  c.listingType === 'rental' ? c.dailyRate : c.type === 'auction' ? c.currentBid : c.price;

function filterLocally(list, { query, filters, sort }) {
  let out = list;
  if (query?.trim()) {
    const q = query.toLowerCase().trim();
    out = out.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.make.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }
  if (filters) {
    if (filters.make) out = out.filter((c) => c.make.toLowerCase() === filters.make.toLowerCase());
    if (filters.body) out = out.filter((c) => c.category.toLowerCase() === filters.body.toLowerCase());
    if (filters.fuel) out = out.filter((c) => c.fuel.toLowerCase() === filters.fuel.toLowerCase());
    if (filters.transmission) {
      out = out.filter((c) => String(c.transmission || '').toLowerCase() === filters.transmission.toLowerCase());
    }
    if (filters.location) {
      out = out.filter((c) => String(c.location || '').toLowerCase()
        .includes(filters.location.toLowerCase()));
    }
    if (filters.maxPrice) out = out.filter((c) => priceOf(c) <= filters.maxPrice);
    if (filters.minPrice) out = out.filter((c) => priceOf(c) >= filters.minPrice);
    if (filters.minYear) out = out.filter((c) => Number(c.year) >= filters.minYear);
    if (filters.maxMileage) out = out.filter((c) => Number(c.mileage ?? Infinity) <= filters.maxMileage);
    if (filters.minScore) out = out.filter((c) => Number(c.inspectionScore || 0) >= filters.minScore);
  }
  if (sort === 'Price ↑') out = [...out].sort((a, b) => priceOf(a) - priceOf(b));
  else if (sort === 'Price ↓') out = [...out].sort((a, b) => priceOf(b) - priceOf(a));
  else if (sort === 'Mileage') out = [...out].sort((a, b) => a.mileage - b.mileage);
  else if (sort === 'Newest') out = [...out].sort((a, b) => b.year - a.year);
  return out;
}

const SCOPES = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'local', label: 'In Rwanda', icon: 'location-outline' },
  { id: 'import', label: 'Import Direct', icon: 'globe-outline' },
];

export default function SearchResultsScreen({ navigation, route }) {
  const { cars, rentalCars, createSavedSearch, searchCars, t } = useApp();
  const isRentMode = route.params?.mode === 'rent';
  const [scope, setScope] = useState(route.params?.mode === 'import' ? 'import' : 'all');
  const [sort, setSort] = useState('Best match');
  const [searchQuery, setSearchQuery] = useState(route.params?.query || '');
  const [activeFilters, setActiveFilters] = useState(route.params?.filters || null);
  const [layout, setLayout] = useState('list');
  const isGrid = layout === 'grid';

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (route.params?.filters) {
      setActiveFilters(route.params.filters);
    }
  }, [route.params?.filters]);

  useEffect(() => {
    if (isRentMode) return;
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      const page = await searchCars({ query: searchQuery, filters: activeFilters, sort, offset: 0 });
      if (id !== requestId.current) return;
      setResults(page ? page.items : null);
      setExhausted(page ? page.exhausted : true);
      setLoading(false);
    }, searchQuery ? 350 : 0);
    return () => clearTimeout(timer);
  }, [searchQuery, activeFilters, sort, isRentMode, searchCars]);

  const loadMore = useCallback(async () => {
    if (isRentMode || loadingMore || exhausted || !results?.length) return;
    setLoadingMore(true);
    const id = requestId.current;
    const page = await searchCars({
      query: searchQuery, filters: activeFilters, sort, offset: results.length,
    });
    if (id === requestId.current && page) {
      setResults((prev) => {
        const seen = new Set((prev || []).map((c) => c.id));
        return [...(prev || []), ...page.items.filter((c) => !seen.has(c.id))];
      });
      setExhausted(page.exhausted);
    }
    setLoadingMore(false);
  }, [isRentMode, loadingMore, exhausted, results, searchQuery, activeFilters, sort, searchCars]);

  const removeFilter = (key) => {
    setActiveFilters((prev) => {
      if (!prev) return null;
      const next = { ...prev };
      delete next[key];
      const hasRemaining = Object.values(next).some((v) => v !== null && v !== undefined);
      return hasRemaining ? next : null;
    });
  };

  const serverBacked = !isRentMode && results !== null;

  const narrowUnsupported = (list) => {
    if (!activeFilters) return list;
    let out = list;
    if (activeFilters.maxMileage) {
      out = out.filter((c) => Number(c.mileage ?? Infinity) <= activeFilters.maxMileage);
    }
    if (activeFilters.minScore) {
      out = out.filter((c) => Number(c.inspectionScore || 0) >= activeFilters.minScore);
    }
    return out;
  };

  const filteredCars = serverBacked
    ? narrowUnsupported(results)
    : filterLocally(isRentMode ? rentalCars : cars, {
        query: searchQuery, filters: activeFilters, sort,
      });

  // Global import matches
  const filteredImportCars = useMemo(() => {
    if (isRentMode) return [];
    return searchImportCatalog(searchQuery, {
      make: activeFilters?.make,
      bodyType: activeFilters?.body,
    });
  }, [searchQuery, activeFilters, isRentMode]);

  const showLocal = isRentMode || scope === 'all' || scope === 'local';
  const showImport = !isRentMode && (scope === 'all' || scope === 'import');

  const displayLocalCars = showLocal ? filteredCars : [];

  return (
    <Screen background={colors.bg}>
      {/* Search header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('searchResults.back')}>
          <Ionicons name="chevron-back" size={20} color={colors.slate700} />
        </Pressable>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={isRentMode ? t('home.searchRentals') : t('home.search')}
            autoFocus={!!route.params?.focusSearch}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('searchResults.clearSearch')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={styles.filterBtn}
          onPress={() => navigation.navigate('Filters', { filters: activeFilters })} accessibilityRole="button" accessibilityLabel={t('searchResults.filterButton')}
        >
          <Ionicons name="options-outline" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Scope selector tabs (All | In Rwanda | Import Direct) */}
      {!isRentMode && (
        <View style={styles.scopeRow}>
          {SCOPES.map((s) => {
            const on = scope === s.id;
            return (
              <Pressable
                key={s.id}
                style={[styles.scopeTab, on && styles.scopeTabOn]}
                onPress={() => setScope(s.id)}
                accessibilityRole="tab"
              >
                <Ionicons name={s.icon} size={14} color={on ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[styles.scopeText, on && styles.scopeTextOn]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <FlatList
        key={layout}
        numColumns={isGrid ? 2 : 1}
        data={displayLocalCars}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: isGrid ? 10 : 16, paddingBottom: 30 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        ListHeaderComponent={
          <View style={isGrid && { paddingHorizontal: 6 }}>
            <View style={styles.resultRow}>
              <Text style={styles.resultCount}>
                {isRentMode
                  ? t('searchResults.rentalsFound', { count: filteredCars.length })
                  : `${(showLocal ? filteredCars.length : 0) + (showImport ? filteredImportCars.length : 0)} vehicles found`}
              </Text>
              <View style={styles.resultActions}>
                {(searchQuery.trim() || activeFilters) && !isRentMode && (
                  <Pressable
                    style={styles.layoutBtn}
                    hitSlop={6}
                    onPress={async () => {
                      const parts = [
                        activeFilters?.make, activeFilters?.body, activeFilters?.fuel,
                        activeFilters?.maxPrice ? `< RWF ${(activeFilters.maxPrice / 1000000)}M` : null,
                        searchQuery.trim() || null,
                      ].filter(Boolean);
                      const label = parts.join(' · ') || t('searchResults.allCars');
                      await createSavedSearch(label, { ...activeFilters, query: searchQuery.trim() });
                      showToast(t('searchResults.savedToast'), 'success');
                    }} accessibilityRole="button" accessibilityLabel={t('searchResults.saveSearch')}
                  >
                    <Ionicons name="bookmark-outline" size={16} color={colors.textSecondary} />
                  </Pressable>
                )}
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
            </View>

            {/* Active Filters Summary Chips */}
            {activeFilters && (
              <View style={styles.activeFiltersRow}>
                {activeFilters.make && (
                  <Pressable style={styles.filterChip} onPress={() => removeFilter('make')}>
                    <Text style={styles.filterChipText}>{activeFilters.make}</Text>
                    <Ionicons name="close" size={12} color={colors.primary} />
                  </Pressable>
                )}
                {activeFilters.body && (
                  <Pressable style={styles.filterChip} onPress={() => removeFilter('body')}>
                    <Text style={styles.filterChipText}>{activeFilters.body}</Text>
                    <Ionicons name="close" size={12} color={colors.primary} />
                  </Pressable>
                )}
                {activeFilters.fuel && (
                  <Pressable style={styles.filterChip} onPress={() => removeFilter('fuel')}>
                    <Text style={styles.filterChipText}>{activeFilters.fuel}</Text>
                    <Ionicons name="close" size={12} color={colors.primary} />
                  </Pressable>
                )}
                {activeFilters.maxPrice && (
                  <Pressable style={styles.filterChip} onPress={() => removeFilter('maxPrice')}>
                    <Text style={styles.filterChipText}>RWF {(activeFilters.maxPrice / 1000000)}M</Text>
                    <Ionicons name="close" size={12} color={colors.primary} />
                  </Pressable>
                )}
              </View>
            )}

            <FlatList
              horizontal
              data={SORTS}
              keyExtractor={(s) => s}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
              renderItem={({ item }) => {
                const on = item === sort;
                return (
                  <Pressable style={[styles.sortChip, on && styles.sortChipOn]} onPress={() => setSort(item)}>
                    <Text style={[styles.sortText, { color: on ? '#fff' : colors.slate600 }]}>{t(`searchResults.${SORT_LABEL_KEYS[item]}`)}</Text>
                  </Pressable>
                );
              }}
            />

            {/* Notice if 0 local cars in Kigali but import models exist */}
            {!isRentMode && showLocal && filteredCars.length === 0 && filteredImportCars.length > 0 && (
              <View style={styles.noLocalNotice}>
                <Ionicons name="information-circle-outline" size={20} color={colors.infoText} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.noLocalTitle}>0 in Rwanda stock · {filteredImportCars.length} available to import</Text>
                  <Text style={styles.noLocalSub}>
                    You can import these models on-demand directly from South Korea, Dubai & China — get a formal landed-price quotation before you pay anything.
                  </Text>
                </View>
              </View>
            )}

            {/* Local Section Header in 'all' mode */}
            {!isRentMode && scope === 'all' && filteredCars.length > 0 && (
              <View style={styles.sectionHeader}>
                <Ionicons name="location" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>In Rwanda Physical Stock ({filteredCars.length})</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          const target = item.listingType === 'rental' ? 'RentalDetail' : 'VehicleDetail';
          const card = isGrid ? (
            <CarCard car={item} onPress={() => navigation.navigate(target, { car: item })} />
          ) : (
            <CarListCard car={item} onPress={() => navigation.navigate(target, { car: item })} />
          );
          return (
            <StaggerEntrance index={index} flexGrid={isGrid}>
              {card}
            </StaggerEntrance>
          );
        }}
        ListFooterComponent={
          <View>
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
            ) : null}

            {/* Import On-Demand Section */}
            {showImport && filteredImportCars.length > 0 && (
              <View style={styles.importSection}>
                <View style={styles.importSectionHeader}>
                  <View style={styles.importHeaderLeft}>
                    <Ionicons name="boat" size={18} color={colors.infoText} />
                    <View>
                      <Text style={styles.importSectionTitle}>
                        Import Direct from Korea, Dubai & China ({filteredImportCars.length})
                      </Text>
                      <Text style={styles.importSectionSub}>
                        Verified sourcing, transparent landed pricing, 50/50 payment schedule
                      </Text>
                    </View>
                  </View>
                </View>

                {filteredImportCars.map((importCar) => (
                  <ImportCarCard
                    key={importCar.id}
                    item={importCar}
                    onPress={() => navigation.navigate('ImportVehicleDetail', { item: importCar })}
                  />
                ))}
              </View>
            )}

            {/* Custom Sourcing Concierge Banner */}
            {!isRentMode && (
              <View style={styles.customSourcingCard}>
                <View style={styles.sourcingIconCircle}>
                  <Ionicons name="search" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.sourcingTitle}>Can't find your exact trim or model?</Text>
                <Text style={styles.sourcingDesc}>
                  Our global sourcing team in South Korea, Dubai, and China will find your exact vehicle, verify its condition, and provide a formal landed-price quotation.
                </Text>
                <Pressable
                  style={styles.sourcingBtn}
                  onPress={() => {
                    navigation.navigate('ImportOrderDetail', { isNewCustom: true });
                  }}
                >
                  <Text style={styles.sourcingBtnText}>Request Custom Vehicle Sourcing</Text>
                  <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 12, paddingTop: 4 }}>
              {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
            </View>
          ) : (!showImport || filteredImportCars.length === 0) && displayLocalCars.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={52} color={colors.border} />
              <Text style={styles.emptyTitle}>{t('filters.noResults')}</Text>
              <Text style={styles.emptySub}>{t('filters.adjust')}</Text>
              {(activeFilters || searchQuery) && (
                <Pressable
                  style={styles.clearBtn}
                  onPress={() => { setSearchQuery(''); setActiveFilters(null); }}
                >
                  <Text style={styles.clearBtnText}>{t('filters.clear')}</Text>
                </Pressable>
              )}
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
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
  scopeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scopeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  scopeTabOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scopeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  scopeTextOn: {
    color: '#FFFFFF',
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  resultCount: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  resultActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  layoutBtn: {
    width: 40, height: 40, borderRadius: radius.pill,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center',
  },
  activeFiltersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryTint,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.pill,
  },
  filterChipText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primary },
  sortChip: { minHeight: 40, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill },
  sortChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortText: { fontSize: 13, fontFamily: fonts.semiBold },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  noLocalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.blueTint,
    borderRadius: radius.lg,
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.infoBorder,
  },
  noLocalTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.infoText,
  },
  noLocalSub: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.infoText,
    marginTop: 2,
  },
  importSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 20,
  },
  importSectionHeader: {
    marginBottom: 16,
  },
  importHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  importSectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  importSectionSub: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.greenText,
    marginTop: 2,
  },
  customSourcingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    ...shadows.card,
  },
  sourcingIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sourcingTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sourcingDesc: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  sourcingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  sourcingBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 8 },
  emptySub: { fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  clearBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  clearBtnText: { color: '#fff', fontSize: 14, fontFamily: fonts.bold },
});
