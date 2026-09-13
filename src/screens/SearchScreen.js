import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import CarListCard from '../components/CarListCard';
import CarCard from '../components/CarCard';
import ImportCarCard from '../components/ImportCarCard';
import { colors, radius, fonts, shadows } from '../theme';
import { useApp } from '../context/AppContext';
import { searchImportCatalog } from '../data/importCatalog';

// Marketplace browse tab — unified inventory with local Kigali stock + global on-demand imports.

const SORTS = ['Best match', 'Price ↑', 'Price ↓', 'Newest', 'Mileage'];
const SORT_LABEL_KEYS = { 'Best match': 'bestMatch', 'Price ↑': 'priceLow', 'Price ↓': 'priceHigh', Newest: 'newest', Mileage: 'mileage' };

const SCOPES = [
  { id: 'all', label: 'All Vehicles', icon: 'apps-outline' },
  { id: 'local', label: 'In Rwanda', icon: 'location-outline' },
  { id: 'import', label: 'Import Direct', icon: 'globe-outline' },
];

export default function SearchScreen({ navigation }) {
  const { cars, t } = useApp();
  const [scope, setScope] = useState('all'); // 'all' | 'local' | 'import'
  const [sort, setSort] = useState('Best match');
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState('list'); // 'list' | 'grid'
  const isGrid = layout === 'grid';

  // 1. Filter local cars
  const filteredLocalCars = useMemo(() => {
    let list = cars;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.make.toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }

    if (sort === 'Price ↑') {
      list = [...list].sort((a, b) => {
        const pa = a.type === 'auction' ? a.currentBid : a.price;
        const pb = b.type === 'auction' ? b.currentBid : b.price;
        return pa - pb;
      });
    } else if (sort === 'Price ↓') {
      list = [...list].sort((a, b) => {
        const pa = a.type === 'auction' ? a.currentBid : a.price;
        const pb = b.type === 'auction' ? b.currentBid : b.price;
        return pb - pa;
      });
    } else if (sort === 'Mileage') {
      list = [...list].sort((a, b) => a.mileage - b.mileage);
    } else if (sort === 'Newest') {
      list = [...list].sort((a, b) => b.year - a.year);
    }
    return list;
  }, [cars, searchQuery, sort]);

  // 2. Filter global import catalog
  const filteredImportCars = useMemo(() => {
    return searchImportCatalog(searchQuery);
  }, [searchQuery]);

  // Decide what to render based on scope
  const showLocal = scope === 'all' || scope === 'local';
  const showImport = scope === 'all' || scope === 'import';

  const totalResultsCount =
    (showLocal ? filteredLocalCars.length : 0) + (showImport ? filteredImportCars.length : 0);

  return (
    <Screen background={colors.bg}>
      {/* Search header */}
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
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('searchResults.clearSearch')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={styles.filterBtn}
          onPress={() => navigation.navigate('Filters')} accessibilityRole="button" accessibilityLabel={t('searchResults.filterButton')}
        >
          <Ionicons name="options-outline" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Scope Selector: All | In Rwanda | Import Direct */}
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

      <FlatList
        key={layout}
        numColumns={isGrid ? 2 : 1}
        data={showLocal ? filteredLocalCars : []}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: isGrid ? 10 : 16, paddingBottom: 30 }}
        ListHeaderComponent={
          <View style={isGrid && { paddingHorizontal: 6 }}>
            <View style={styles.resultRow}>
              <Text style={styles.resultCount}>
                {totalResultsCount} vehicles found
                {searchQuery.trim() ? ` for "${searchQuery.trim()}"` : ''}
              </Text>
              <View style={styles.resultActions}>
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

            {/* Sorts */}
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
                    <Text style={[styles.sortText, { color: on ? '#fff' : colors.slate600 }]}>
                      {t(`searchResults.${SORT_LABEL_KEYS[item]}`)}
                    </Text>
                  </Pressable>
                );
              }}
            />

            {/* Local Section Header if in 'all' mode and we have local cars */}
            {scope === 'all' && filteredLocalCars.length > 0 && (
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="location" size={16} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Available in Kigali ({filteredLocalCars.length})</Text>
                </View>
                <Text style={styles.sectionSub}>Ready for immediate test drive</Text>
              </View>
            )}

            {/* If 0 local cars but we have import cars */}
            {showLocal && filteredLocalCars.length === 0 && filteredImportCars.length > 0 && (
              <View style={styles.noLocalNotice}>
                <Ionicons name="information-circle-outline" size={20} color="#1D4ED8" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.noLocalTitle}>0 in Rwanda stock · {filteredImportCars.length} available to import</Text>
                  <Text style={styles.noLocalSub}>
                    You can import these verified models directly with our 100% Bank Escrow Guarantee.
                  </Text>
                </View>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) =>
          isGrid ? (
            <CarCard car={item} onPress={() => navigation.navigate('VehicleDetail', { car: item })} />
          ) : (
            <CarListCard car={item} onPress={() => navigation.navigate('VehicleDetail', { car: item })} />
          )
        }
        ListFooterComponent={
          <View>
            {/* Import On-Demand Section */}
            {showImport && filteredImportCars.length > 0 && (
              <View style={styles.importSection}>
                <View style={styles.importSectionHeader}>
                  <View style={styles.importHeaderLeft}>
                    <Ionicons name="boat" size={18} color="#1D4ED8" />
                    <View>
                      <Text style={styles.importSectionTitle}>
                        Import from Korea, Dubai & China ({filteredImportCars.length})
                      </Text>
                      <Text style={styles.importSectionSub}>
                        🛡️ 100% Protected by Bank of Kigali / I&M Bank Escrow
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
            <View style={styles.customSourcingCard}>
              <View style={styles.sourcingIconCircle}>
                <Ionicons name="search" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.sourcingTitle}>Can't find your exact trim or model?</Text>
              <Text style={styles.sourcingDesc}>
                Our global sourcing team in South Korea, Dubai, and China will find your exact vehicle, verify its condition, and provide an official escrow-protected quotation.
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
          </View>
        }
        ListEmptyComponent={
          !showLocal || (filteredLocalCars.length === 0 && filteredImportCars.length === 0) ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={52} color={colors.border} />
              <Text style={styles.emptyTitle}>{t('filters.noResults')}</Text>
              <Text style={styles.emptySub}>{t('filters.adjust')}</Text>
              <Pressable style={styles.clearBtn} onPress={() => setSearchQuery('')}>
                <Text style={styles.clearBtnText}>{t('searchResults.clearSearch')}</Text>
              </Pressable>
            </View>
          ) : null
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
  sortChip: { minHeight: 40, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill },
  sortChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortText: { fontSize: 13, fontFamily: fonts.semiBold },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sectionSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  noLocalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: radius.lg,
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  noLocalTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#1D4ED8',
  },
  noLocalSub: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#1E40AF',
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
