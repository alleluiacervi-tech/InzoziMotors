import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows } from '../theme';
import { formatPrice } from '../data/cars';
import { KIGALI_NEIGHBORHOODS, getCarsInNeighborhood, getListedDaysAgo } from '../data/marketData';

const CATEGORY_FILTERS = ['All', 'SUV', 'Sedan', 'EV', 'Truck'];

const NEIGHBORHOOD_ICONS = {
  Nyarutarama: 'leaf-outline',
  Remera: 'business-outline',
  Kicukiro: 'home-outline',
  Kimihurura: 'diamond-outline',
  Gisozi: 'partly-sunny-outline',
  Kacyiru: 'library-outline',
};

function NeighborhoodPin({ hood, carCount, isSelected, onPress }) {
  return (
    <Pressable
      style={[styles.pin, isSelected && styles.pinSelected]}
      onPress={onPress}
    >
      <View style={[styles.pinIcon, isSelected && styles.pinIconSelected]}>
        <Ionicons
          name={NEIGHBORHOOD_ICONS[hood.name] || 'location-outline'}
          size={20}
          color={isSelected ? '#fff' : colors.primary}
        />
      </View>
      <Text style={[styles.pinName, isSelected && styles.pinNameSelected]}>{hood.name}</Text>
      <Text style={[styles.pinArea, isSelected && styles.pinAreaSelected]}>{hood.description}</Text>
      <View style={[styles.pinCount, isSelected && styles.pinCountSelected]}>
        <Text style={[styles.pinCountText, isSelected && styles.pinCountTextSelected]}>
          {carCount} car{carCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function CarListingCard({ car, onPress }) {
  const daysAgo = getListedDaysAgo(car.id);
  return (
    <Pressable style={styles.listingCard} onPress={onPress}>
      <Image source={{ uri: car.image }} style={styles.listingThumb} resizeMode="cover" />
      <View style={styles.listingBody}>
        <Text style={styles.listingTitle} numberOfLines={2}>{car.title}</Text>
        <View style={styles.listingMeta}>
          {car.inspected && (
            <View style={styles.inspChip}>
              <Ionicons name="shield-checkmark" size={9} color={colors.green} />
              <Text style={styles.inspChipText}>Certified</Text>
            </View>
          )}
          <Text style={styles.listingDays}>{daysAgo}d ago</Text>
        </View>
        <Text style={styles.listingPrice}>{formatPrice(car.type === 'auction' ? car.currentBid : car.price)}</Text>
      </View>
    </Pressable>
  );
}

export default function MapScreen({ navigation }) {
  const { cars } = useApp();
  const [selectedHood, setSelectedHood] = useState(KIGALI_NEIGHBORHOODS[0].id);
  const [categoryFilter, setCategoryFilter] = useState('All');

  const activeHood = KIGALI_NEIGHBORHOODS.find((h) => h.id === selectedHood);

  const filteredCars = getCarsInNeighborhood(cars, activeHood?.name || '').filter((car) => {
    if (categoryFilter === 'All') return true;
    return car.category === categoryFilter;
  });

  const countForHood = (hoodName) => {
    const base = getCarsInNeighborhood(cars, hoodName);
    if (categoryFilter === 'All') return base.length;
    return base.filter((c) => c.category === categoryFilter).length;
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Kigali Area View" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Map header */}
        <View style={styles.mapBanner}>
          <View style={styles.mapBannerInner}>
            <Ionicons name="map-outline" size={28} color="#fff" />
            <View>
              <Text style={styles.mapBannerTitle}>Kigali, Rwanda</Text>
              <Text style={styles.mapBannerSub}>Browse cars by neighborhood</Text>
            </View>
          </View>
          <View style={styles.totalChip}>
            <Text style={styles.totalChipText}>{cars.length} listings</Text>
          </View>
        </View>

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORY_FILTERS.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text style={[styles.filterChipText, categoryFilter === cat && styles.filterChipTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Neighborhood grid — 2 columns */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Select a neighborhood</Text>
        </View>
        <View style={styles.pinsGrid}>
          {KIGALI_NEIGHBORHOODS.map((hood) => (
            <NeighborhoodPin
              key={hood.id}
              hood={hood}
              carCount={countForHood(hood.name)}
              isSelected={selectedHood === hood.id}
              onPress={() => setSelectedHood(hood.id)}
            />
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Selected neighborhood header */}
        <View style={styles.hoodResultHeader}>
          <View>
            <Text style={styles.hoodResultTitle}>{activeHood?.name}</Text>
            <Text style={styles.hoodResultSub}>
              {activeHood?.area} · {activeHood?.description} · {filteredCars.length} car{filteredCars.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {filteredCars.length === 0 && categoryFilter !== 'All' && (
            <Pressable onPress={() => setCategoryFilter('All')}>
              <Text style={styles.clearFilter}>Clear filter</Text>
            </Pressable>
          )}
        </View>

        {filteredCars.length === 0 ? (
          <View style={styles.emptyHood}>
            <Ionicons name="car-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyHoodText}>No {categoryFilter !== 'All' ? categoryFilter : ''} listings in {activeHood?.name}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCars}
            keyExtractor={(c) => c.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            renderItem={({ item }) => (
              <CarListingCard
                car={item}
                onPress={() => navigation.navigate('VehicleDetail', { car: item })}
              />
            )}
          />
        )}

        {/* View all CTA */}
        <Pressable
          style={styles.viewAllBtn}
          onPress={() => navigation.navigate('SearchResults')}
        >
          <Text style={styles.viewAllText}>View all listings in Kigali</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapBanner: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  mapBannerInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mapBannerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  mapBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  totalChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill,
  },
  totalChipText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  sectionHead: { paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  pinsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16,
  },
  pin: {
    width: '47%', alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl, paddingVertical: 14, paddingHorizontal: 10,
    gap: 4, ...shadows.card,
  },
  pinSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  pinIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center',
  },
  pinIconSelected: { backgroundColor: 'rgba(255,255,255,0.2)' },
  pinName: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  pinNameSelected: { color: '#fff' },
  pinArea: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  pinAreaSelected: { color: 'rgba(255,255,255,0.7)' },
  pinCount: {
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: colors.greenTint, borderRadius: radius.pill, marginTop: 2,
  },
  pinCountSelected: { backgroundColor: 'rgba(255,255,255,0.2)' },
  pinCountText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  pinCountTextSelected: { color: '#fff' },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginHorizontal: 16, marginVertical: 20 },
  hoodResultHeader: {
    paddingHorizontal: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  hoodResultTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  hoodResultSub: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  clearFilter: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 4 },
  emptyHood: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  emptyHoodText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  listingCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 12,
    ...shadows.card,
  },
  listingThumb: { width: 90, height: 68, borderRadius: radius.lg, backgroundColor: colors.border },
  listingBody: { flex: 1, justifyContent: 'center', gap: 4 },
  listingTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, lineHeight: 18 },
  listingMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inspChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.greenTint, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  inspChipText: { fontSize: 9, fontWeight: '700', color: colors.green },
  listingDays: { fontSize: 11, color: colors.textMuted },
  listingPrice: { fontSize: 15, fontWeight: '800', color: colors.primary },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 20, paddingVertical: 14,
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl,
  },
  viewAllText: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
