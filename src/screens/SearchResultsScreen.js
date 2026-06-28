import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import CarCard from '../components/CarCard';
import { colors, radius } from '../theme';
import { useApp } from '../context/AppContext';

const SORTS = ['Best match', 'Price ↑', 'Price ↓', 'Newest', 'Mileage'];

export default function SearchResultsScreen({ navigation }) {
  const { cars } = useApp();
  const [sort, setSort] = useState('Best match');
  return (
    <Screen background={colors.bg}>
      {/* Search header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={colors.slate700} />
        </Pressable>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchText}>SUV under $40,000</Text>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </View>
        <Pressable style={styles.filterBtn} onPress={() => navigation.navigate('Filters')}>
          <Ionicons name="options-outline" size={20} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={cars}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
        ListHeaderComponent={
          <View>
            <View style={styles.resultRow}>
              <Text style={styles.resultCount}>{cars.length} cars found</Text>
              <Pressable style={styles.mapBtn} onPress={() => navigation.navigate('Filters')}>
                <Ionicons name="map-outline" size={16} color={colors.primary} />
                <Text style={styles.mapText}>Map</Text>
              </Pressable>
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
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingHorizontal: 12, height: 46,
  },
  searchText: { flex: 1, fontSize: 14, color: colors.textPrimary },
  filterBtn: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultCount: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.blueTint, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  mapText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  sortChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill },
  sortChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortText: { fontSize: 13, fontWeight: '600' },
  columnWrapper: { paddingHorizontal: 4 },
});
