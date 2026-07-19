import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import CarListCard from '../components/CarListCard';
import CarCard from '../components/CarCard';
import { colors, radius, fonts } from '../theme';
import { useApp } from '../context/AppContext';

// Marketplace browse tab — full inventory with live search, sort, and filters.

const SORTS = ['Best match', 'Price ↑', 'Price ↓', 'Newest', 'Mileage'];

export default function SearchScreen({ navigation }) {
  const { cars } = useApp();
  const [sort, setSort] = useState('Best match');
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState('list'); // 'list' | 'grid'
  const isGrid = layout === 'grid';

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
          onPress={() => navigation.navigate('Filters')}
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
              <Text style={styles.resultCount}>{filteredCars.length} certified cars</Text>
              <View style={styles.resultActions}>
                <Pressable style={styles.layoutBtn} onPress={() => setLayout(isGrid ? 'list' : 'grid')} hitSlop={6}>
                  <Ionicons name={isGrid ? 'list-outline' : 'grid-outline'} size={17} color={colors.textSecondary} />
                </Pressable>
                <Pressable style={styles.mapBtn} onPress={() => navigation.navigate('MapView')}>
                  <Ionicons name="map-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.mapText}>Map</Text>
                </Pressable>
              </View>
            </View>

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
        renderItem={({ item }) =>
          isGrid ? (
            <CarCard car={item} onPress={() => navigation.navigate('VehicleDetail', { car: item })} />
          ) : (
            <CarListCard car={item} onPress={() => navigation.navigate('VehicleDetail', { car: item })} />
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={52} color={colors.border} />
            <Text style={styles.emptyTitle}>No cars found</Text>
            <Text style={styles.emptySub}>Try a different make, model, or keyword</Text>
            <Pressable style={styles.clearBtn} onPress={() => setSearchQuery('')}>
              <Text style={styles.clearBtnText}>Clear search</Text>
            </Pressable>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
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
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  resultCount: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  resultActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  layoutBtn: {
    width: 34, height: 34, borderRadius: radius.pill,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center',
  },
  resultActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  layoutBtn: {
    width: 32, height: 32, borderRadius: radius.pill,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center',
  },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.greenTint, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  mapText: { fontSize: 13, fontFamily: fonts.bold, color: colors.primary },
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
