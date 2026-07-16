import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Dimensions, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Polyline, Circle } from 'react-native-svg';
import Badge from '../components/Badge';
import { useApp } from '../context/AppContext';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { formatPrice, formatMiles } from '../data/cars';
import LoginModal from '../components/LoginModal';
import {
  getMarketDiff, getMarketAvg, getPriceHistory, getPriceDrop,
  getSavedCount, getListedDaysAgo, getNeighborhood, getDriveType, formatRWF,
} from '../data/marketData';
import { monthlyEstimate } from '../data/finance';

const { width } = Dimensions.get('window');

const SPECS = [
  { icon: 'speedometer-outline', label: 'Mileage', key: 'mileage' },
  { icon: 'flash-outline', label: 'Fuel', key: 'fuel' },
  { icon: 'cog-outline', label: 'Transmission', key: 'transmission' },
  { icon: 'calendar-outline', label: 'Year', key: 'year' },
];

function Sparkline({ data, width: w = 80, height: h = 30 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const lastX = w;
  const lastParts = pts.split(' ').pop().split(',');
  const lastY = parseFloat(lastParts[1]);
  return (
    <Svg width={w} height={h}>
      <Polyline points={pts} fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={lastX} cy={lastY} r="3" fill={colors.primary} />
    </Svg>
  );
}

export default function VehicleDetailScreen({ navigation, route }) {
  const car = route.params?.car;
  const insets = useSafeAreaInsets();
  const { isCarSaved, toggleSaveCar, isLoggedIn, loginUser, addToComparison, comparisonCars, currency } = useApp();
  const saved = isCarSaved(car.id);
  const isAuction = car.type === 'auction';
  const [activeIdx, setActiveIdx] = useState(0);
  const [loginVisible, setLoginVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const { cars, rentalCars } = useApp();

  const monthly = car.price ? monthlyEstimate(car.price) : null;
  // Rent-to-own bridge: a rental of the same make (or same category) to try first
  const tryRental = rentalCars.find((r) => r.make === car.make)
    || rentalCars.find((r) => r.category === car.category);

  const marketDiff = getMarketDiff(car);
  const marketAvg = getMarketAvg(car);
  const priceHistory = getPriceHistory(car);
  const priceDrop = getPriceDrop(car.id);
  const savedCount = getSavedCount(car.id);
  const listedDaysAgo = getListedDaysAgo(car.id);
  const neighborhood = getNeighborhood(car.id);
  const driveType = getDriveType(car.id);
  const price = isAuction ? car.currentBid : car.price;

  const similarCars = cars.filter(
    (c) => c.id !== car.id && (c.make === car.make || c.category === car.category)
  ).slice(0, 6);

  const isInComparison = comparisonCars.some((c) => c.id === car.id);

  const executeWithAuth = (action) => {
    if (isLoggedIn) { action(); }
    else { setPendingAction(() => action); setLoginVisible(true); }
  };

  const imageList = car.images && car.images.length > 0 ? car.images : [car.image];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Gallery */}
        <View style={styles.gallery}>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / width);
              if (slide !== activeIdx) setActiveIdx(slide);
            }}
            scrollEventThrottle={16}
          >
            {imageList.map((img, index) => (
              <Image key={index} source={{ uri: img }} style={styles.heroImage} resizeMode="cover" />
            ))}
          </ScrollView>

          <View style={[styles.galleryBar, { top: insets.top + 8 }]}>
            <Pressable style={styles.circleBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color={colors.slate700} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                style={[styles.circleBtn, isInComparison && styles.circleBtnActive]}
                onPress={() => addToComparison(car)}
              >
                <Ionicons name="git-compare-outline" size={18} color={isInComparison ? colors.primary : colors.slate700} />
              </Pressable>
              <Pressable style={styles.circleBtn}>
                <Ionicons name="share-outline" size={19} color={colors.slate700} />
              </Pressable>
              <Pressable style={styles.circleBtn} onPress={() => executeWithAuth(() => toggleSaveCar(car.id))}>
                <Ionicons name={saved ? 'heart' : 'heart-outline'} size={19} color={saved ? '#EF4444' : colors.slate700} />
              </Pressable>
            </View>
          </View>

          {imageList.length > 1 && (
            <View style={styles.indicatorContainer}>
              <Text style={styles.indicatorText}>{activeIdx + 1} / {imageList.length}</Text>
            </View>
          )}
          {car.inspected && (
            <Badge variant="inspected" icon="checkmark" label="150-pt Inspected" style={styles.inspectBadge} />
          )}
        </View>

        <View style={styles.body}>
          {/* Title + price */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{car.title}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.meta}>{neighborhood}, Kigali</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.meta}>{listedDaysAgo}d ago</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={[styles.meta, { fontFamily: fonts.bold }]}>{driveType}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {isAuction && <Text style={styles.bidLabel}>CURRENT BID</Text>}
              <Text style={styles.price}>{formatPrice(price)}</Text>
              <Text style={styles.priceRwf}>{formatRWF(price)}</Text>
              {/* Market diff badge */}
              {marketDiff !== 0 && (
                <View style={[styles.marketBadge, marketDiff < 0 ? styles.marketBadgeLow : styles.marketBadgeHigh]}>
                  <Ionicons
                    name={marketDiff < 0 ? 'trending-down' : 'trending-up'}
                    size={11}
                    color={marketDiff < 0 ? colors.green : colors.alertRed}
                  />
                  <Text style={[styles.marketBadgeText, { color: marketDiff < 0 ? colors.green : colors.alertRed }]}>
                    {Math.abs(marketDiff)}% {marketDiff < 0 ? 'below' : 'above'} market
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Social proof bar */}
          <View style={styles.socialBar}>
            {savedCount > 0 && (
              <View style={styles.socialItem}>
                <Ionicons name="heart" size={13} color="#EF4444" />
                <Text style={styles.socialText}>{savedCount} people saved this</Text>
              </View>
            )}
            {savedCount >= 10 && (
              <View style={styles.highDemandBadge}>
                <Text style={styles.highDemandText}>High Demand</Text>
              </View>
            )}
          </View>

          {/* Financing strip — own it monthly */}
          {monthly && !isAuction && (
            <Pressable style={styles.financeStrip} onPress={() => navigation.navigate('Financing', { car })}>
              <View style={styles.financeIcon}>
                <Ionicons name="card-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.financeTitle}>
                  Own it from <Text style={styles.financeAmount}>~${monthly}/mo</Text>
                </Text>
                <Text style={styles.financeSub}>20% down · 60 months · 4 partner banks</Text>
              </View>
              <View style={styles.financeCta}>
                <Text style={styles.financeCtaText}>Get pre-qualified</Text>
                <Ionicons name="arrow-forward" size={12} color={colors.primary} />
              </View>
            </Pressable>
          )}

          {/* Price history sparkline */}
          <View style={styles.sparklineCard}>
            <View style={styles.sparklineLeft}>
              <Text style={styles.sparklineTitle}>Price history</Text>
              {priceDrop > 0 ? (
                <View style={styles.priceDropRow}>
                  <Ionicons name="arrow-down" size={12} color={colors.green} />
                  <Text style={styles.priceDropText}>Dropped {formatPrice(priceDrop)} since listed</Text>
                </View>
              ) : (
                <Text style={styles.sparklineStable}>Stable since listing</Text>
              )}
              <Text style={styles.marketAvgText}>Market avg: {formatPrice(marketAvg)}</Text>
            </View>
            <View style={styles.sparklineRight}>
              <Sparkline data={priceHistory} width={80} height={32} />
              <Text style={styles.sparklineNow}>Now</Text>
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
          <Pressable
            style={styles.sellerCard}
            onPress={() => navigation.navigate('SellerProfile', { sellerName: car.seller })}
          >
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerInitial}>{car.seller[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{car.seller}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={colors.amber} />
                <Text style={styles.ratingText}>{car.rating} · Verified seller · View profile</Text>
              </View>
            </View>
            <Pressable
              style={styles.msgBtn}
              onPress={() => executeWithAuth(() => navigation.navigate('Chat', { name: car.seller, car }))}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            </Pressable>
          </Pressable>

          {/* Trust rows */}
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

          <Pressable style={[styles.inspectionRow, { marginTop: 8 }]} onPress={() => navigation.navigate('VehicleHistory', { car })}>
            <View style={[styles.inspectionIcon, { backgroundColor: colors.greenTint }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inspectionTitle}>Vehicle History Report</Text>
              <Text style={[styles.inspectionSub, { color: colors.primary }]}>RRA duty · ownership · accident history</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          {/* Rent-to-own bridge — try this model first */}
          {tryRental && !isAuction && (
            <Pressable
              style={styles.tryRentalRow}
              onPress={() => navigation.navigate('RentalDetail', { car: tryRental })}
            >
              <Image source={{ uri: tryRental.image }} style={styles.tryRentalThumb} resizeMode="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.tryRentalTitle}>Not sure yet? Try before you buy</Text>
                <Text style={styles.tryRentalSub}>
                  Rent a {tryRental.make} from ${tryRental.dailyRate}/day — rental fees credit toward your purchase
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </Pressable>
          )}

          <View style={styles.trustChips}>
            <Badge variant="tag" label="7-day returns" />
            <Badge variant="tag" label={`${driveType} drive`} />
            {car.inspected && <Badge variant="success" label="Inzozi Certified" />}
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.desc}>
            This {car.year} {car.make} {car.model} is in excellent condition with a clean title and
            full service history. Single owner, non-smoker, garage kept. Every Inzozi listing is
            inspected across 150 points and protected by our 7-day money-back guarantee.
          </Text>

          {/* Photo highlights */}
          <Text style={styles.sectionTitle}>Visual & Photo Inspection</Text>
          <View style={styles.highlightGrid}>
            {[
              { icon: 'cog-outline', title: 'Engine & Mechanicals', desc: 'No oil leaks, clean fluids, zero OBD fault codes.' },
              { icon: 'disc-outline', title: 'Brakes & Tires', desc: 'Tread at 6/32" (~70% life). Brake pads at 8mm.' },
              { icon: 'color-palette-outline', title: 'Exterior Paint Depth', desc: 'Factory original paint across all panels. No filler.' },
              { icon: 'car-sport-outline', title: 'Cabin & Controls', desc: 'HVAC, seat heating, infotainment — all working.' },
            ].map((item, idx) => (
              <View key={idx} style={styles.highlightCard}>
                <View style={styles.highlightIcon}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.highlightTitle}>{item.title}</Text>
                  <Text style={styles.highlightDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Similar Cars */}
          {similarCars.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Similar Cars</Text>
              <FlatList
                horizontal
                data={similarCars}
                keyExtractor={(c) => c.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingRight: 4 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.similarCard}
                    onPress={() => navigation.navigate('VehicleDetail', { car: item })}
                  >
                    <Image source={{ uri: item.image }} style={styles.similarThumb} resizeMode="cover" />
                    <View style={styles.similarBody}>
                      <Text style={styles.similarTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.similarPrice}>{formatPrice(item.type === 'auction' ? item.currentBid : item.price)}</Text>
                      {item.inspected && (
                        <View style={styles.similarCert}>
                          <Ionicons name="shield-checkmark" size={10} color={colors.green} />
                          <Text style={styles.similarCertText}>Certified</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                )}
              />
            </>
          )}

          {/* Duty calculator link */}
          <Pressable style={styles.dutyLink} onPress={() => navigation.navigate('DutyCalculator')}>
            <View style={styles.dutyLinkIcon}>
              <Ionicons name="calculator-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dutyLinkTitle}>Estimate import duty</Text>
              <Text style={styles.dutyLinkSub}>See Rwanda RRA duty on this vehicle</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.cta, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.ctaPrice}>
          <Text style={styles.ctaPriceLabel}>{isAuction ? 'Current bid' : 'Price'}</Text>
          <Text style={styles.ctaPriceValue}>{formatPrice(price)}</Text>
          <Text style={styles.ctaPriceRwf}>{formatRWF(price)}</Text>
        </View>
        <Button
          title={isAuction ? 'Place a Bid' : 'Book Handover'}
          style={{ flex: 1 }}
          onPress={() => executeWithAuth(() => navigation.navigate('Checkout', { car }))}
        />
      </View>

      <LoginModal
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
        onLoginSuccess={() => {
          loginUser('Guest User', 'guest@inzozimotors.com');
          if (pendingAction) setTimeout(() => pendingAction(), 300);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  gallery: { height: 320, backgroundColor: colors.border },
  heroImage: { width, height: 320 },
  galleryBar: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  circleBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  circleBtnActive: { backgroundColor: colors.greenTint, borderWidth: 1.5, borderColor: colors.primary },
  inspectBadge: { position: 'absolute', bottom: 16, left: 16 },
  indicatorContainer: {
    position: 'absolute', bottom: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.md,
  },
  indicatorText: { color: '#fff', fontSize: 11, fontFamily: fonts.extraBold },
  body: {
    backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, paddingHorizontal: 20, paddingTop: 22,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 22, fontFamily: fonts.extraBold, letterSpacing: -0.5, color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  meta: { fontSize: 12, color: colors.textSecondary },
  metaDot: { fontSize: 12, color: colors.textMuted },
  bidLabel: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textMuted },
  price: { fontSize: 24, fontFamily: fonts.extraBold, letterSpacing: -0.6, color: colors.textPrimary },
  priceRwf: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  marketBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, marginTop: 4,
  },
  marketBadgeLow: { backgroundColor: colors.greenTint },
  marketBadgeHigh: { backgroundColor: '#FEF2F2' },
  marketBadgeText: { fontSize: 10, fontFamily: fonts.bold },
  socialBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  socialItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  socialText: { fontSize: 12, color: colors.textSecondary, fontFamily: fonts.semiBold },
  highDemandBadge: {
    backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5,
  },
  highDemandText: { fontSize: 10, fontFamily: fonts.extraBold, color: colors.amber },
  sparklineCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14, marginTop: 14, ...shadows.card,
  },
  sparklineLeft: { flex: 1, gap: 3 },
  sparklineTitle: { fontSize: 12, fontFamily: fonts.bold, color: colors.textPrimary },
  priceDropRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  priceDropText: { fontSize: 11, fontFamily: fonts.bold, color: colors.green },
  sparklineStable: { fontSize: 11, color: colors.textMuted },
  marketAvgText: { fontSize: 11, color: colors.textMuted },
  sparklineRight: { alignItems: 'flex-end', gap: 2 },
  sparklineNow: { fontSize: 9, color: colors.textMuted },
  specs: { flexDirection: 'row', gap: 10, marginTop: 18 },
  specCard: {
    flex: 1, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.lg, paddingVertical: 14,
    alignItems: 'center', gap: 6,
  },
  specValue: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.textPrimary },
  specLabel: { fontSize: 11, color: colors.textMuted },
  sellerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14, marginTop: 18,
  },
  sellerAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.navyMid, alignItems: 'center', justifyContent: 'center',
  },
  sellerInitial: { color: '#fff', fontFamily: fonts.extraBold, fontSize: 18 },
  sellerName: { fontSize: 15, fontFamily: fonts.bold, color: colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  ratingText: { fontSize: 12, color: colors.textSecondary },
  msgBtn: {
    width: 42, height: 42, borderRadius: radius.md,
    backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center',
  },
  inspectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14, marginTop: 12,
  },
  inspectionIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center',
  },
  inspectionTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  inspectionSub: { fontSize: 12, color: colors.green, fontFamily: fonts.semiBold, marginTop: 2 },
  trustChips: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  financeStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.greenTint,
    borderWidth: 1, borderColor: '#DCFCE7',
    borderRadius: radius.xl, padding: 12, marginTop: 14,
  },
  financeIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  financeTitle: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary },
  financeAmount: { fontFamily: fonts.extraBold, color: colors.primary },
  financeSub: { fontSize: 10, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  financeCta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  financeCtaText: { fontSize: 11, fontFamily: fonts.extraBold, color: colors.primary },
  tryRentalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.greenTint,
    borderRadius: radius.xl, padding: 12, marginTop: 8,
  },
  tryRentalThumb: { width: 56, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  tryRentalTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  tryRentalSub: { fontSize: 11, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2, lineHeight: 15 },
  sectionTitle: { fontSize: 17, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 22, marginBottom: 10 },
  desc: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  highlightGrid: { gap: 10 },
  highlightCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14,
  },
  highlightIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center',
  },
  highlightTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  highlightDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 3, lineHeight: 16 },
  similarCard: {
    width: 140,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, overflow: 'hidden',
  },
  similarThumb: { width: '100%', height: 90, backgroundColor: colors.border },
  similarBody: { padding: 10, gap: 3 },
  similarTitle: { fontSize: 11, fontFamily: fonts.bold, color: colors.textPrimary, lineHeight: 15 },
  similarPrice: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.primary },
  similarCert: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  similarCertText: { fontSize: 9, fontFamily: fonts.bold, color: colors.green },
  dutyLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.greenTint, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14, marginTop: 14,
  },
  dutyLinkIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  dutyLinkTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.primary },
  dutyLinkSub: { fontSize: 12, color: colors.primary, marginTop: 2 },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft,
    paddingHorizontal: 20, paddingTop: 12, ...shadows.floating,
  },
  ctaPrice: { minWidth: 90 },
  ctaPriceLabel: { fontSize: 12, color: colors.textSecondary },
  ctaPriceValue: { fontSize: 20, fontFamily: fonts.extraBold, color: colors.textPrimary },
  ctaPriceRwf: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
});
