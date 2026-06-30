import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, fonts } from '../theme';
import { formatPrice, formatMiles } from '../data/cars';

const SPEC_ROWS = [
  { key: 'price', label: 'Price', getValue: (car) => car.type === 'auction' ? car.currentBid : car.price, format: (v) => formatPrice(v), winner: 'lowest' },
  { key: 'year', label: 'Year', getValue: (car) => car.year, format: (v) => String(v), winner: 'highest' },
  { key: 'mileage', label: 'Mileage', getValue: (car) => car.mileage, format: (v) => formatMiles(v), winner: 'lowest' },
  { key: 'fuel', label: 'Fuel Type', getValue: (car) => car.fuel, format: (v) => v, winner: 'none' },
  { key: 'transmission', label: 'Transmission', getValue: (car) => car.transmission, format: (v) => v, winner: 'none' },
  { key: 'category', label: 'Category', getValue: (car) => car.category, format: (v) => v, winner: 'none' },
  { key: 'rating', label: 'Seller Rating', getValue: (car) => car.rating, format: (v) => `⭐ ${v}`, winner: 'highest' },
  { key: 'inspected', label: 'Inspection', getValue: (car) => car.inspected ? 1 : 0, format: (v) => v ? '✓ 150-pt Certified' : '— Not inspected', winner: 'highest' },
  { key: 'returnDays', label: 'Return Policy', getValue: (car) => car.returnDays || 0, format: (v) => v ? `${v}-day returns` : 'No return policy', winner: 'none' },
];

function getWinnerIndex(row, cars) {
  if (row.winner === 'none' || cars.length < 2) return -1;
  const values = cars.map((c) => row.getValue(c));
  const numericVals = values.map((v) => Number(v));
  if (numericVals.some(isNaN)) return -1;
  const best = row.winner === 'lowest' ? Math.min(...numericVals) : Math.max(...numericVals);
  const indices = numericVals.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
  return indices.length === 1 ? indices[0] : -1;
}

function CarColumn({ car, onRemove, style }) {
  return (
    <View style={[styles.carCol, style]}>
      <Pressable style={styles.removeChip} onPress={onRemove}>
        <Ionicons name="close" size={14} color={colors.textMuted} />
      </Pressable>
      <Image source={{ uri: car.image }} style={styles.carThumb} resizeMode="cover" />
      <Text style={styles.carTitle} numberOfLines={2}>{car.title}</Text>
      {car.inspected && (
        <View style={styles.certPill}>
          <Ionicons name="shield-checkmark" size={10} color={colors.green} />
          <Text style={styles.certPillText}>Certified</Text>
        </View>
      )}
    </View>
  );
}

function EmptySlot({ onAdd }) {
  return (
    <Pressable style={[styles.carCol, styles.emptySlot]} onPress={onAdd}>
      <View style={styles.addCircle}>
        <Ionicons name="add" size={24} color={colors.primary} />
      </View>
      <Text style={styles.addSlotText}>Add car to compare</Text>
    </Pressable>
  );
}

function SpecRow({ row, cars }) {
  const winnerIdx = getWinnerIndex(row, cars);
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{row.label}</Text>
      <View style={styles.specCells}>
        {cars.map((car, i) => {
          const val = row.getValue(car);
          const isWinner = winnerIdx === i;
          return (
            <View key={car.id} style={[styles.specCell, isWinner && styles.specCellWinner]}>
              <Text style={[styles.specValue, isWinner && styles.specValueWinner]} numberOfLines={2}>
                {row.format(val)}
              </Text>
              {isWinner && <View style={styles.winnerDot} />}
            </View>
          );
        })}
        {cars.length < 3 && <View style={[styles.specCell, styles.specCellEmpty]} />}
      </View>
    </View>
  );
}

const COMPARE_FEATURES = [
  'Price vs market average',
  'Mileage & year comparison',
  'Inspection status side-by-side',
];

export default function ComparisonScreen({ navigation }) {
  const { comparisonCars, removeFromComparison, cars } = useApp();
  const canShowTable = comparisonCars.length >= 2;

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Compare Cars" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Car columns header */}
        <View style={styles.columnsHeader}>
          {comparisonCars.map((car) => (
            <CarColumn
              key={car.id}
              car={car}
              style={{ flex: 1 }}
              onRemove={() => removeFromComparison(car.id)}
            />
          ))}
          {comparisonCars.length < 3 && (
            <EmptySlot style={{ flex: 1 }} onAdd={() => navigation.navigate('SearchResults')} />
          )}
        </View>

        {!canShowTable ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconOuter}>
              <View style={styles.emptyIconInner}>
                <Ionicons name="git-compare-outline" size={36} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>Add 2 cars to compare</Text>
            <Text style={styles.emptySub}>
              Open any listing and tap "Compare" to add it here. Up to 3 cars side by side.
            </Text>
            <View style={styles.emptyFeatures}>
              {COMPARE_FEATURES.map((f) => (
                <View key={f} style={styles.emptyFeature}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                  <Text style={styles.emptyFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
            <Pressable style={styles.browseBtn} onPress={() => navigation.navigate('SearchResults')}>
              <Text style={styles.browseBtnText}>Browse listings</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.legendRow}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Green highlight = best value in this category</Text>
            </View>
            <View style={styles.table}>
              {SPEC_ROWS.map((row, i) => (
                <View key={row.key} style={i > 0 && styles.rowDivider}>
                  <SpecRow row={row} cars={comparisonCars} />
                </View>
              ))}
            </View>
            <Pressable style={styles.clearBtn} onPress={() => comparisonCars.forEach((c) => removeFromComparison(c.id))}>
              <Ionicons name="trash-outline" size={16} color={colors.alertRed} />
              <Text style={styles.clearBtnText}>Clear comparison</Text>
            </Pressable>
          </>
        )}

        {comparisonCars.length === 0 && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestTitle}>Recently viewed</Text>
            {cars.slice(0, 4).map((car) => (
              <Pressable
                key={car.id}
                style={styles.suggestRow}
                onPress={() => navigation.navigate('VehicleDetail', { car })}
              >
                <Image source={{ uri: car.image }} style={styles.suggestThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestName} numberOfLines={1}>{car.title}</Text>
                  <Text style={styles.suggestPrice}>{formatPrice(car.price)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  columnsHeader: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  carCol: { alignItems: 'center', gap: 6, position: 'relative', paddingTop: 8 },
  carThumb: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.border },
  carTitle: { fontSize: 11, fontFamily: fonts.bold, color: colors.textPrimary, textAlign: 'center', lineHeight: 15 },
  certPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.greenTint,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  certPillText: { fontSize: 9, fontFamily: fonts.bold, color: colors.green },
  removeChip: {
    position: 'absolute', top: 0, right: 0, zIndex: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  emptySlot: {
    borderWidth: 1.5, borderColor: colors.border,
    borderStyle: 'dashed', borderRadius: radius.xl,
    paddingVertical: 20, justifyContent: 'center',
  },
  addCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center',
  },
  addSlotText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textMuted, textAlign: 'center' },
  legendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.greenTint,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green },
  legendText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.green },
  table: {
    backgroundColor: colors.surface,
    marginHorizontal: 16, marginTop: 16,
    borderRadius: radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.borderSoft,
    ...shadows.card,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  specRow: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: 2 },
  specLabel: {
    width: 90, paddingVertical: 14, paddingLeft: 14,
    fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted,
    alignSelf: 'center',
  },
  specCells: {
    flex: 1, flexDirection: 'row',
    borderLeftWidth: 1, borderLeftColor: colors.borderSoft,
  },
  specCell: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 10,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
    borderLeftWidth: 1, borderLeftColor: colors.borderSoft,
  },
  specCellWinner: { backgroundColor: colors.greenTint },
  specCellEmpty: { backgroundColor: colors.surfaceAlt },
  specValue: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textPrimary, textAlign: 'center' },
  specValueWinner: { fontFamily: fonts.extraBold, color: colors.green },
  winnerDot: {
    position: 'absolute', top: 6, right: 6,
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green,
  },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 20, paddingVertical: 12,
  },
  clearBtnText: { fontSize: 14, fontFamily: fonts.bold, color: colors.alertRed },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 52, paddingHorizontal: 36, paddingBottom: 20 },
  emptyIconOuter: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: 'rgba(10,92,46,0.07)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 22,
  },
  emptyIconInner: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: 'rgba(10,92,46,0.12)',
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

  // Suggestions
  suggestions: { paddingHorizontal: 16, marginTop: 24 },
  suggestTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textMuted, marginBottom: 12 },
  suggestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 12, marginBottom: 8,
  },
  suggestThumb: { width: 60, height: 46, borderRadius: radius.md, backgroundColor: colors.border },
  suggestName: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  suggestPrice: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primary, marginTop: 2 },
});
