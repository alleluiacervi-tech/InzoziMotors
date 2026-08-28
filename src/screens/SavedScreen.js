import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Image, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, fonts } from '../theme';
import { showToast, showConfirm } from '../components/Feedback';
import { formatPrice } from '../data/cars';
import { getPriceDrop, getSavedCount, getListedDaysAgo } from '../data/marketData';
import { photoSource, PHOTO } from '../utils/photo';

function SavedCarRow({ car, onPress, onRemove }) {
  const drop = getPriceDrop(car);
  const saves = getSavedCount(car);
  const daysAgo = getListedDaysAgo(car);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Image source={photoSource(car.image, PHOTO.THUMB)} style={styles.thumb} resizeMode="contain" />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{car.title}</Text>
        <View style={styles.rowMeta}>
          {car.inspected && (
            <View style={styles.certBadge}>
              <Ionicons name="shield-checkmark" size={10} color={colors.green} />
              <Text style={styles.certText}>Certified</Text>
            </View>
          )}
          <Text style={styles.metaText}>{daysAgo}d ago</Text>
          {saves >= 10 && (
            <View style={styles.highDemandChip}>
              <Text style={styles.highDemandText}>🔥 {saves} saves</Text>
            </View>
          )}
        </View>
        <View style={styles.rowPriceRow}>
          <Text style={styles.rowPrice}>
            {car.listingType === 'rental'
              ? `$${car.dailyRate}/day`
              : formatPrice(car.type === 'auction' ? car.currentBid : car.price)}
          </Text>
          {drop > 0 && (
            <View style={styles.dropBadge}>
              <Ionicons name="arrow-down" size={10} color={colors.green} />
              <Text style={styles.dropText}>Dropped {formatPrice(drop)}</Text>
            </View>
          )}
        </View>
      </View>
      <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel="Remove from saved">
        <Ionicons name="heart" size={22} color="#EF4444" />
      </Pressable>
    </Pressable>
  );
}

function SavedSearchRow({ search, onToggleNotify, onDelete }) {
  return (
    <View style={styles.searchRow}>
      <View style={styles.searchIcon}>
        <Ionicons name="search-outline" size={18} color={colors.primary} />
      </View>
      <View style={styles.searchBody}>
        <Text style={styles.searchLabel}>{search.label}</Text>
        <View style={styles.searchMeta}>
          <Text style={styles.searchMatchText}>{search.matchCount} matches</Text>
          <Text style={styles.searchDot}>·</Text>
          <Text style={styles.searchLastText}>Last: {search.lastMatch}</Text>
        </View>
      </View>
      <Switch
        value={search.notifyEnabled}
        onValueChange={() => onToggleNotify(search.id)}
        trackColor={{ false: colors.borderSoft, true: colors.green }}
        thumbColor="#fff"
        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
      />
      <Pressable style={styles.deleteBtn} onPress={() => onDelete(search.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete">
        <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const SAVED_FEATURES = ['Price drop alerts', 'Compare saved cars', 'Track demand'];
const SEARCH_FEATURES = ['New listing alerts', 'Filter by make & price', 'Re-run anytime'];

function EmptyState({ icon, title, sub, features, btnLabel, onPress }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconOuter}>
        <View style={styles.emptyIconInner}>
          <Ionicons name={icon} size={36} color={colors.textSecondary} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
      <View style={styles.emptyFeatures}>
        {features.map((f) => (
          <View key={f} style={styles.emptyFeature}>
            <Ionicons name="checkmark-circle" size={15} color={colors.textSecondary} />
            <Text style={styles.emptyFeatureText}>{f}</Text>
          </View>
        ))}
      </View>
      <Pressable style={styles.browseBtn} onPress={onPress}>
        <Text style={styles.browseBtnText}>{btnLabel}</Text>
      </Pressable>
    </View>
  );
}

export default function SavedScreen({ navigation }) {
  const {
    getSavedCars, toggleSaveCar,
    savedSearches, toggleSavedSearchNotify, deleteSavedSearch,
  } = useApp();
  const saved = getSavedCars();
  const [tab, setTab] = useState('saved');

  const handleRemove = (carId) => {
    showConfirm({
      title: 'Remove from saved?',
      confirmLabel: 'Remove', destructive: true,
    }).then((ok) => { if (ok) toggleSaveCar(carId); });
  };

  const handleDeleteSearch = (id) => {
    showConfirm({
      title: 'Delete saved search?',
      message: 'You will stop receiving alerts for this search.',
      confirmLabel: 'Delete', destructive: true,
    }).then((ok) => { if (ok) deleteSavedSearch(id); });
  };

  return (
    <Screen background={colors.bg}>
      <View style={styles.header}>
        <Text style={styles.h1}>Saved</Text>
      </View>

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'saved' && styles.tabActive]} onPress={() => setTab('saved')}>
          <Text style={[styles.tabText, tab === 'saved' && styles.tabTextActive]}>
            Cars ({saved.length})
          </Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'searches' && styles.tabActive]} onPress={() => setTab('searches')}>
          <Text style={[styles.tabText, tab === 'searches' && styles.tabTextActive]}>
            Searches ({savedSearches.length})
          </Text>
        </Pressable>
      </View>

      {tab === 'saved' ? (
        <FlatList
          data={saved}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <SavedCarRow
              car={item}
              onPress={() => navigation.navigate(item.listingType === 'rental' ? 'RentalDetail' : 'VehicleDetail', { car: item })}
              onRemove={() => handleRemove(item.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title="No saved cars yet"
              sub="Tap the heart on any listing to save it. We'll notify you the moment the price drops."
              features={SAVED_FEATURES}
              btnLabel="Browse cars"
              // 'Main' resolves from both mounts of this screen (tab bar AND
              // the root-stack instance the drawer opens); 'Home' only existed
              // inside the tab navigator, so the drawer path was a dead button.
              onPress={() => navigation.navigate('Main', { screen: 'Home' })}
            />
          }
        />
      ) : (
        <FlatList
          data={savedSearches}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListHeaderComponent={
            <View style={styles.searchHint}>
              <Ionicons name="notifications-outline" size={14} color={colors.primary} />
              <Text style={styles.searchHintText}>Toggle the bell to get notified when new matches are listed.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <SavedSearchRow
              search={item}
              onToggleNotify={toggleSavedSearchNotify}
              onDelete={handleDeleteSearch}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="bookmark-outline"
              title="No saved searches"
              sub="Filter by make, model, price or year — then save the filter to get instant alerts."
              features={SEARCH_FEATURES}
              btnLabel="Search now"
              onPress={() => navigation.navigate('SearchResults')}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  h1: { fontSize: 24, fontFamily: fonts.extraBold, letterSpacing: -0.5, color: colors.textPrimary },
  tabs: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 4,
    backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  tabText: { fontSize: 14, fontFamily: fonts.bold, color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary },

  // Car row
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 12, ...shadows.card,
  },
  thumb: { width: 90, height: 68, borderRadius: radius.lg, backgroundColor: colors.border },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary, lineHeight: 18 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  certBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.greenTint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  certText: { fontSize: 11, fontFamily: fonts.bold, color: colors.greenText },
  metaText: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
  highDemandChip: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  highDemandText: { fontSize: 11, fontFamily: fonts.bold, color: colors.amberText },
  rowPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowPrice: { fontVariant: ['tabular-nums'], fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  dropBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.greenTint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  dropText: { fontSize: 11, fontFamily: fonts.bold, color: colors.greenText },
  removeBtn: { padding: 4 },

  // Search row
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14, ...shadows.card,
  },
  searchIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  searchBody: { flex: 1 },
  searchLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  searchMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  searchMatchText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.primary },
  searchDot: { fontSize: 11, color: colors.textMuted },
  searchLastText: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
  deleteBtn: { padding: 4, marginLeft: 4 },
  searchHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.greenTint, borderRadius: radius.lg,
    padding: 10, marginBottom: 12,
  },
  searchHintText: { fontSize: 12, fontFamily: fonts.regular, color: colors.primary, flex: 1 },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 52, paddingHorizontal: 36, paddingBottom: 20 },
  emptyIconOuter: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 22,
  },
  emptyIconInner: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  emptySub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyFeatures: { gap: 10, marginTop: 20, alignSelf: 'stretch' },
  emptyFeature: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyFeatureText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  browseBtn: {
    marginTop: 24, backgroundColor: colors.primary,
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14,
  },
  browseBtnText: { fontFamily: fonts.bold, color: '#fff', fontSize: 15 },
});
