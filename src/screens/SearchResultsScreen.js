import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import CarCard from '../components/CarCard';
import { colors, radius } from '../theme';
import { useApp } from '../context/AppContext';

const SORTS = ['Best match', 'Price ↑', 'Price ↓', 'Newest', 'Mileage'];

export default function SearchResultsScreen({ navigation, route }) {
  const { cars } = useApp();
  const [sort, setSort] = useState('Best match');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState(route.params?.filters || null);

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
  let filteredCars = cars;
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
      filteredCars = filteredCars.filter((c) => {
        const price = c.type === 'auction' ? c.currentBid : c.price;
        return price <= activeFilters.maxPrice;
      });
    }
  }

  // 3. Sort Results
  if (sort === 'Price ↑') {
    filteredCars = [...filteredCars].sort((a, b) => {
      const pa = a.type === 'auction' ? a.currentBid : a.price;
      const pb = b.type === 'auction' ? b.currentBid : b.price;
      return pa - pb;
    });
  } else if (sort === 'Price ↓') {
    filteredCars = [...filteredCars].sort((a, b) => {
      const pa = a.type === 'auction' ? a.currentBid : a.price;
      const pb = b.type === 'auction' ? b.currentBid : b.price;
      return pb - pa;
    });
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
            placeholder="Search make, model, type..."
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
        data={filteredCars}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
        ListHeaderComponent={
          <View>
            <View style={styles.resultRow}>
              <Text style={styles.resultCount}>{filteredCars.length} cars found</Text>
              <Pressable style={styles.mapBtn} onPress={() => navigation.navigate('Filters', { filters: activeFilters })}>
                <Ionicons name="map-outline" size={16} color={colors.primary} />
                <Text style={styles.mapText}>Map</Text>
              </Pressable>
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
        renderItem={({ item }) => (
          <CarCard car={item} onPress={() => navigation.navigate('VehicleDetail', { car: item })} />
        )}
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
  resultCount: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.blueTint, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  mapText: { fontSize: 13, fontWeight: '700', color: colors.primary },
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
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  sortChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill },
  sortChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortText: { fontSize: 13, fontWeight: '600' },
  columnWrapper: { paddingHorizontal: 4 },
});
