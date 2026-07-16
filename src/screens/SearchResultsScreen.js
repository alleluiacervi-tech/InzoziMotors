import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import CarListCard from '../components/CarListCard';
import CarCard from '../components/CarCard';
import { colors, radius, fonts } from '../theme';
import { useApp } from '../context/AppContext';

const SORTS = ['Best match', 'Price ↑', 'Price ↓', 'Newest', 'Mileage'];

// Price works for both inventories: rentals sort by daily rate
const priceOf = (c) =>
  c.listingType === 'rental' ? c.dailyRate : c.type === 'auction' ? c.currentBid : c.price;

export default function SearchResultsScreen({ navigation, route }) {
  const { cars, rentalCars, createSavedSearch } = useApp();
  const isRentMode = route.params?.mode === 'rent';
  const [sort, setSort] = useState('Best match');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState(route.params?.filters || null);
  const [layout, setLayout] = useState('list'); // 'list' | 'grid'
  const isGrid = layout === 'grid';

  useEffect(() => {
    if (route.params?.filters) {
      setActiveFilters(route.params.filters);
    }
  }, [route.params?.filters]);

  const removeFilter = (key) => {
    setActiveFilters((prev) => {
      if (!prev) return null;
      const next = { ...prev };
      delete next[key];
      const hasRemaining = Object.values(next).some((v) => v !== null && v !== undefined);
      return hasRemaining ? next : null;
    });
  };

  // 1. Filter by Search Query
  let filteredCars = isRentMode ? rentalCars : cars;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filteredCars = filteredCars.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.make.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }

  // 2. Filter by Active Filters
  if (activeFilters) {
    if (activeFilters.make) {
      filteredCars = filteredCars.filter((c) => c.make.toLowerCase() === activeFilters.make.toLowerCase());
    }
    if (activeFilters.body) {
      filteredCars = filteredCars.filter((c) => c.category.toLowerCase() === activeFilters.body.toLowerCase());
    }
    if (activeFilters.fuel) {
      filteredCars = filteredCars.filter((c) => c.fuel.toLowerCase() === activeFilters.fuel.toLowerCase());
    }
    if (activeFilters.maxPrice) {
      filteredCars = filteredCars.filter((c) => priceOf(c) <= activeFilters.maxPrice);
    }
  }

  // 3. Sort Results
  if (sort === 'Price ↑') {
    filteredCars = [...filteredCars].sort((a, b) => priceOf(a) - priceOf(b));
  } else if (sort === 'Price ↓') {
    filteredCars = [...filteredCars].sort((a, b) => priceOf(b) - priceOf(a));
  } else if (sort === 'Mileage') {
    filteredCars = [...filteredCars].sort((a, b) => a.mileage - b.mileage);
  } else if (sort === 'Newest') {
    filteredCars = [...filteredCars].sort((a, b) => b.year - a.year);
  }

  return (
    <Screen background={colors.bg}>
      {/* Search header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
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
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={styles.filterBtn}
          onPress={() => navigation.navigate('Filters', { filters: activeFilters })}
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
        ListHeaderComponent={
          <View style={isGrid && { paddingHorizontal: 6 }}>
            <View style={styles.resultRow}>
              <Text style={styles.resultCount}>
                {filteredCars.length} {isRentMode ? 'rentals' : 'cars'} found
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
                      Alert.alert('Search saved', "We'll notify you when new matching cars are listed.");
                    }}
                  >
                    <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
                  </Pressable>
                )}
                <Pressable style={styles.layoutBtn} onPress={() => setLayout(isGrid ? 'list' : 'grid')} hitSlop={6}>
                  <Ionicons name={isGrid ? 'list-outline' : 'grid-outline'} size={17} color={colors.primary} />
                </Pressable>
                <Pressable style={styles.mapBtn} onPress={() => navigation.navigate('MapView')}>
                  <Ionicons name="map-outline" size={16} color={colors.primary} />
                  <Text style={styles.mapText}>Map</Text>
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
        ListEmptyComponent={
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
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
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
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
  filterBtn: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultCount: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  resultActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  layoutBtn: {
    width: 34, height: 34, borderRadius: radius.pill,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center',
  },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.blueTint, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  mapText: { fontSize: 13, fontFamily: fonts.bold, color: colors.primary },
  activeFiltersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.blueTint,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  filterChipText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primary },
  sortChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill },
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
