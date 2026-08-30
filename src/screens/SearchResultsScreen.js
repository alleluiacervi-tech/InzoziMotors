import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import CarListCard from '../components/CarListCard';
import CarCard from '../components/CarCard';
import SkeletonCard from '../components/SkeletonCard';
import { colors, radius, fonts } from '../theme';
import { showToast } from '../components/Feedback';
import { useApp } from '../context/AppContext';

const SORTS = ['Best match', 'Price ↑', 'Price ↓', 'Newest', 'Mileage'];

// Price works for both inventories: rentals sort by daily rate
const priceOf = (c) =>
  c.listingType === 'rental' ? c.dailyRate : c.type === 'auction' ? c.currentBid : c.price;

// Applied to the local set when the API is unreachable, and always to rentals
// (a small in-memory fleet with no server-side filtering).
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
    // `includes`, matching the server's ILIKE — sellers type this field
    // themselves, so "Kicukiro" must still find "Kicukiro, Kigali".
    if (filters.location) {
      out = out.filter((c) => String(c.location || '').toLowerCase()
        .includes(filters.location.toLowerCase()));
    }
    if (filters.maxPrice) out = out.filter((c) => priceOf(c) <= filters.maxPrice);
    if (filters.minPrice) out = out.filter((c) => priceOf(c) >= filters.minPrice);
    if (filters.minYear) out = out.filter((c) => Number(c.year) >= filters.minYear);
    // Mileage and inspection score are applied here only: the browse endpoint
    // has no parameter for either, so a server round trip would silently ignore
    // them. At this catalogue size filtering the fetched page is honest and
    // exact; when the inventory outgrows a page, both need a query parameter.
    if (filters.maxMileage) out = out.filter((c) => Number(c.mileage ?? Infinity) <= filters.maxMileage);
    if (filters.minScore) out = out.filter((c) => Number(c.inspectionScore || 0) >= filters.minScore);
  }
  if (sort === 'Price ↑') out = [...out].sort((a, b) => priceOf(a) - priceOf(b));
  else if (sort === 'Price ↓') out = [...out].sort((a, b) => priceOf(b) - priceOf(a));
  else if (sort === 'Mileage') out = [...out].sort((a, b) => a.mileage - b.mileage);
  else if (sort === 'Newest') out = [...out].sort((a, b) => b.year - a.year);
  return out;
}

export default function SearchResultsScreen({ navigation, route }) {
  const { cars, rentalCars, createSavedSearch, searchCars } = useApp();
  const isRentMode = route.params?.mode === 'rent';
  const [sort, setSort] = useState('Best match');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState(route.params?.filters || null);
  const [layout, setLayout] = useState('list'); // 'list' | 'grid'
  const isGrid = layout === 'grid';

  // Server-backed result set. `null` means "no server answer yet or ever" —
  // the local list is rendered instead, so the screen is never empty.
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  // Guards against a slow earlier query overwriting a newer one
  const requestId = useRef(0);

  useEffect(() => {
    if (route.params?.filters) {
      setActiveFilters(route.params.filters);
    }
  }, [route.params?.filters]);

  // Debounced first page — typing shouldn't fire a request per keystroke.
  useEffect(() => {
    if (isRentMode) return;
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      const page = await searchCars({ query: searchQuery, filters: activeFilters, sort, offset: 0 });
      if (id !== requestId.current) return; // a newer query already won
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
      // De-dupe defensively: a listing published mid-scroll shifts the offset
      // window and would otherwise appear twice.
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

  // Two filters the browse endpoint has no parameter for. On the local path
  // filterLocally already applies them; on the server path the results come
  // back unfiltered by these, and returning them as-is would mean a chip the
  // user tapped quietly did nothing. Narrowing the page here is exact at this
  // catalogue size — when the inventory outgrows one page, both need a real
  // query parameter rather than this.
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

  return (
    <Screen background={colors.bg}>
      {/* Search header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={20} color={colors.slate700} />
        </Pressable>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={isRentMode ? 'Search rental cars...' : 'Search make, model, type...'}
            autoFocus={!!route.params?.focusSearch}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={styles.filterBtn}
          onPress={() => navigation.navigate('Filters', { filters: activeFilters })} accessibilityRole="button" accessibilityLabel="Filters"
        >
          <Ionicons name="options-outline" size={20} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        key={layout}
        numColumns={isGrid ? 2 : 1}
        data={filteredCars}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: isGrid ? 10 : 16, paddingBottom: 20 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        ListHeaderComponent={
          <View style={isGrid && { paddingHorizontal: 6 }}>
            <View style={styles.resultRow}>
              <Text style={styles.resultCount}>
                {/* With paging, the count is what's loaded so far — say so rather
                    than implying the whole catalogue fits on screen. */}
                {serverBacked && !exhausted
                  ? `${filteredCars.length}+ cars`
                  : `${filteredCars.length} ${isRentMode ? 'rentals' : 'cars'} found`}
              </Text>
              <View style={styles.resultActions}>
                {(searchQuery.trim() || activeFilters) && !isRentMode && (
                  <Pressable
                    style={styles.layoutBtn}
                    hitSlop={6}
                    onPress={async () => {
                      const parts = [
                        activeFilters?.make, activeFilters?.body, activeFilters?.fuel,
                        activeFilters?.maxPrice ? `< $${(activeFilters.maxPrice / 1000)}k` : null,
                        searchQuery.trim() || null,
                      ].filter(Boolean);
                      const label = parts.join(' · ') || 'All cars';
                      await createSavedSearch(label, { ...activeFilters, query: searchQuery.trim() });
                      showToast("Search saved — we'll notify you when new matching cars are listed.", 'success');
                    }} accessibilityRole="button" accessibilityLabel="Save"
                  >
                    <Ionicons name="bookmark-outline" size={16} color={colors.textSecondary} />
                  </Pressable>
                )}
                <Pressable
                  style={styles.layoutBtn}
                  onPress={() => setLayout(isGrid ? 'list' : 'grid')}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={isGrid ? 'Show results as a list' : 'Show results as a grid'}
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
                    <Text style={styles.filterChipText}>Under ${activeFilters.maxPrice / 1000}k</Text>
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
                    <Text style={[styles.sortText, { color: on ? '#fff' : colors.slate600 }]}>{item}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        }
        renderItem={({ item }) => {
          const target = item.listingType === 'rental' ? 'RentalDetail' : 'VehicleDetail';
          return isGrid ? (
            <CarCard car={item} onPress={() => navigation.navigate(target, { car: item })} />
          ) : (
            <CarListCard car={item} onPress={() => navigation.navigate(target, { car: item })} />
          );
        }}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
          ) : serverBacked && exhausted && filteredCars.length > 0 ? (
            <Text style={styles.endOfList}>That's every match on Sawa Cars right now.</Text>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 12, paddingTop: 4 }}>
              {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={52} color={colors.border} />
              <Text style={styles.emptyTitle}>No cars found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your search or removing filters
              </Text>
              {(activeFilters || searchQuery) && (
                <Pressable
                  style={styles.clearBtn}
                  onPress={() => { setSearchQuery(''); setActiveFilters(null); }}
                >
                  <Text style={styles.clearBtnText}>Clear all filters</Text>
                </Pressable>
              )}
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  endOfList: {
    textAlign: 'center', paddingVertical: 22,
    fontSize: 12.5, fontFamily: fonts.medium, color: colors.textMuted,
  },
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
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultCount: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  resultActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  layoutBtn: {
    width: 44, height: 44, borderRadius: radius.pill,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center',
  },
  activeFiltersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.blueTint,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    minHeight: 44,
  },
  filterChipText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primary },
  sortChip: { minHeight: 44, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill },
  sortChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortText: { fontSize: 13, fontFamily: fonts.semiBold },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 8 },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  clearBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  clearBtnText: { color: '#fff', fontSize: 14, fontFamily: fonts.bold },
});
