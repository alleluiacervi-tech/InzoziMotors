import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Badge from '../components/Badge';
import { useApp } from '../context/AppContext';
import Button from '../components/Button';
import { colors, radius, shadows } from '../theme';
import { formatPrice, formatMiles } from '../data/cars';

const { width } = Dimensions.get('window');

const SPECS = [
  { icon: 'speedometer-outline', label: 'Mileage', key: 'mileage' },
  { icon: 'flash-outline', label: 'Fuel', key: 'fuel' },
  { icon: 'cog-outline', label: 'Transmission', key: 'transmission' },
  { icon: 'calendar-outline', label: 'Year', key: 'year' },
];

export default function VehicleDetailScreen({ navigation, route }) {
  const car = route.params?.car;
  const insets = useSafeAreaInsets();
  const { isCarSaved, toggleSaveCar } = useApp();
  const saved = isCarSaved(car.id);
  const isAuction = car.type === 'auction';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Gallery */}
        <View style={styles.gallery}>
          <Image source={{ uri: car.image }} style={styles.heroImage} resizeMode="cover" />
          <View style={[styles.galleryBar, { top: insets.top + 8 }]}>
            <Pressable style={styles.circleBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color={colors.slate700} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable style={styles.circleBtn}>
                <Ionicons name="share-outline" size={19} color={colors.slate700} />
              </Pressable>
              <Pressable style={styles.circleBtn} onPress={() => toggleSaveCar(car.id)}>
                <Ionicons name={saved ? 'heart' : 'heart-outline'} size={19} color={saved ? '#EF4444' : colors.slate700} />
              </Pressable>
            </View>
          </View>
          {car.inspected ? (
            <Badge variant="inspected" icon="checkmark" label="150-pt Inspected" style={styles.inspectBadge} />
          ) : null}
        </View>

        <View style={styles.body}>
          {/* Title + price */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{car.title}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.meta}>{car.location} · {car.distance} mi away</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {isAuction ? <Text style={styles.bidLabel}>CURRENT BID</Text> : null}
              <Text style={styles.price}>{formatPrice(isAuction ? car.currentBid : car.price)}</Text>
              {!isAuction && car.belowMarket ? (
                <Text style={styles.below}>{formatPrice(car.belowMarket)} below market</Text>
              ) : null}
            </View>
          </View>

          {/* Specs grid */}
          <View style={styles.specs}>
            {SPECS.map((s) => (
              <View key={s.key} style={styles.specCard}>
                <Ionicons name={s.icon} size={20} color={colors.primary} />
                <Text style={styles.specValue}>
                  {s.key === 'mileage' ? formatMiles(car.mileage) : String(car[s.key])}
                </Text>
                <Text style={styles.specLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Seller */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerInitial}>{car.seller[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{car.seller}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={colors.amber} />
                <Text style={styles.ratingText}>{car.rating} · Verified dealer</Text>
              </View>
            </View>
            <Pressable style={styles.msgBtn} onPress={() => navigation.navigate('Chat', { name: car.seller })}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>

          {/* Trust row */}
          <Pressable style={styles.inspectionRow} onPress={() => navigation.navigate('InspectionReport', { car })}>
            <View style={styles.inspectionIcon}>
              <Ionicons name="shield-checkmark" size={20} color={colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inspectionTitle}>150-Point Inspection Report</Text>
              <Text style={styles.inspectionSub}>Passed · View full report</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <View style={styles.trustChips}>
            <Badge variant="tag" label="7-day returns" />
            <Badge variant="success" label="Escrow protected" />
            <Badge variant="tag" label="Free delivery" />
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.desc}>
            This {car.year} {car.make} {car.model} is in excellent condition with a clean title and
            full service history. Single owner, non-smoker, garage kept. Every Inzozi listing is
            inspected across 150 points and protected by our 7-day money-back guarantee.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.cta, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.ctaPrice}>
          <Text style={styles.ctaPriceLabel}>{isAuction ? 'Current bid' : 'Price'}</Text>
          <Text style={styles.ctaPriceValue}>{formatPrice(isAuction ? car.currentBid : car.price)}</Text>
        </View>
        <Button
          title={isAuction ? 'Place a Bid' : 'Buy Now'}
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('Checkout', { car })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  gallery: { height: 320, backgroundColor: colors.border },
  heroImage: { width, height: 320 },
  galleryBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectBadge: { position: 'absolute', bottom: 16, left: 16 },
  body: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  meta: { fontSize: 13, color: colors.textSecondary },
  bidLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  price: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6, color: colors.textPrimary },
  below: { fontSize: 12, fontWeight: '700', color: colors.green, marginTop: 2 },
  specs: { flexDirection: 'row', gap: 10, marginTop: 20 },
  specCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  specValue: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  specLabel: { fontSize: 11, color: colors.textMuted },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: 14,
    marginTop: 18,
  },
  sellerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInitial: { color: '#fff', fontWeight: '800', fontSize: 18 },
  sellerName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  ratingText: { fontSize: 12, color: colors.textSecondary },
  msgBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: 14,
    marginTop: 12,
  },
  inspectionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  inspectionSub: { fontSize: 12, color: colors.green, fontWeight: '600', marginTop: 2 },
  trustChips: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, marginTop: 22 },
  desc: { fontSize: 14, lineHeight: 22, color: colors.textSecondary, marginTop: 8 },
  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingHorizontal: 20,
    paddingTop: 12,
    ...shadows.floating,
  },
  ctaPrice: { minWidth: 90 },
  ctaPriceLabel: { fontSize: 12, color: colors.textSecondary },
  ctaPriceValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
});
