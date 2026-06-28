import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Image, Switch, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows } from '../theme';
import { formatPrice } from '../data/cars';
import { getPriceDrop, getSavedCount, getListedDaysAgo } from '../data/marketData';

function SavedCarRow({ car, onPress, onRemove }) {
  const drop = getPriceDrop(car.id);
  const saves = getSavedCount(car.id);
  const daysAgo = getListedDaysAgo(car.id);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Image source={{ uri: car.image }} style={styles.thumb} resizeMode="cover" />
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
          <Text style={styles.rowPrice}>{formatPrice(car.type === 'auction' ? car.currentBid : car.price)}</Text>
          {drop > 0 && (
            <View style={styles.dropBadge}>
              <Ionicons name="arrow-down" size={10} color={colors.green} />
              <Text style={styles.dropText}>Dropped {formatPrice(drop)}</Text>
            </View>
          )}
        </View>
      </View>
      <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={10}>
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
      <Pressable style={styles.deleteBtn} onPress={() => onDelete(search.id)} hitSlop={8}>
        <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
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
    Alert.alert('Remove from saved?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => toggleSaveCar(carId) },
    ]);
  };

  const handleDeleteSearch = (id) => {
    Alert.alert('Delete saved search?', 'You will stop receiving alerts for this search.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSavedSearch(id) },
    ]);
  };

  return (
    <Screen background={colors.bg}>
      <View style={styles.header}>
        <Text style={styles.h1}>Saved</Text>
      </View>

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'saved' && styles.tabActive]} onPress={() => setTab('saved')}>
          <Text style={[styles.tabText, tab === 'saved' && styles.tabTextActive]}>Cars ({saved.length})</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'searches' && styles.tabActive]} onPress={() => setTab('searches')}>
          <Text style={[styles.tabText, tab === 'searches' && styles.tabTextActive]}>Searches ({savedSearches.length})</Text>
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
              onPress={() => navigation.navigate('VehicleDetail', { car: item })}
              onRemove={() => handleRemove(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="heart-outline" size={44} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No saved cars yet</Text>
              <Text style={styles.emptySub}>Tap the heart icon on any listing to save it here. We'll alert you if the price drops.</Text>
              <Pressable style={styles.browseBtn} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.browseBtnText}>Browse cars</Text>
              </Pressable>
            </View>
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
              <Ionicons name="notifications-outline" size={14} color={colors.statusScheduled} />
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
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="bookmark-outline" size={44} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No saved searches</Text>
              <Text style={styles.emptySub}>Use Search to filter by make, model, price and more — then save the filter to get alerts.</Text>
              <Pressable style={styles.browseBtn} onPress={() => navigation.navigate('SearchResults')}>
                <Text style={styles.browseBtnText}>Search now</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: colors.textPrimary },
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
  tabText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 12, ...shadows.card,
  },
  thumb: { width: 90, height: 68, borderRadius: radius.lg, backgroundColor: colors.border },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, lineHeight: 18 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  certBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.greenTint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  certText: { fontSize: 10, fontWeight: '700', color: colors.green },
  metaText: { fontSize: 11, color: colors.textMuted },
  highDemandChip: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  highDemandText: { fontSize: 10, fontWeight: '700', color: colors.amber },
  rowPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowPrice: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  dropBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.greenTint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  dropText: { fontSize: 10, fontWeight: '700', color: colors.green },
  removeBtn: { padding: 4 },
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
  searchLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  searchMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  searchMatchText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  searchDot: { fontSize: 11, color: colors.textMuted },
  searchLastText: { fontSize: 11, color: colors.textMuted },
  deleteBtn: { padding: 4, marginLeft: 4 },
  searchHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', borderRadius: radius.lg,
    padding: 10, marginBottom: 12,
  },
  searchHintText: { fontSize: 12, color: colors.statusScheduled, flex: 1 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  browseBtn: {
    marginTop: 22, backgroundColor: colors.primary,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
  },
  browseBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
