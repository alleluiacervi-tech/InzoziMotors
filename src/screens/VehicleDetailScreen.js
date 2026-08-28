import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, FlatList, Share, ActivityIndicator, useWindowDimensions } from 'react-native';
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
import PhotoViewer from '../components/PhotoViewer';
import { getCertTier } from '../data/certification';
import { CarGlyph } from '../components/Logo';
import {
  getMarketDiff, getMarketAvg, getPriceHistory, getPriceDrop, hasRealMarketData,
  getSavedCount, getListedDaysAgo, getNeighborhood, getDriveType, formatRWF,
} from '../data/marketData';
import { monthlyEstimate } from '../data/finance';
import { isDealerSeller } from './DealerProfileScreen';
import Photo from '../components/Photo';
import { PHOTO } from '../utils/photo';

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
  const { width } = useWindowDimensions();
  const listCar = route.params?.car;
  // A deep link (sawa://cars/<id>, or a push notification tap) carries only an
  // id — there is no car object to render from until the fetch lands.
  const carId = route.params?.carId || listCar?.id;
  const insets = useSafeAreaInsets();
  const { isCarSaved, toggleSaveCar, isLoggedIn, loginAsGuest, demoMode, addToComparison, comparisonCars, fetchCarDetail } = useApp();

  // The browse payload is deliberately lean. The detail endpoint adds price
  // history, the seller's phone and the full market comparison — and counts the
  // view. Render the list version immediately, then upgrade in place.
  const [detail, setDetail] = useState(null);
  const [notFound, setNotFound] = useState(false);
  React.useEffect(() => {
    let alive = true;
    if (carId) {
      fetchCarDetail(carId).then((full) => {
        if (!alive) return;
        if (full) setDetail(full);
        // Only a link-opened car can be missing entirely; one reached from a
        // list already has something to show.
        else if (!listCar) setNotFound(true);
      });
    }
    return () => { alive = false; };
  }, [carId, listCar, fetchCarDetail]);

  const car = detail || listCar;

  // ── Every hook must run before the early return below ──────────────────────
  // A deep-linked car starts as null and becomes an object once the fetch
  // lands. If the "still loading" return sat above these, the hook count would
  // change between renders and React would throw — so they stay here, above any
  // conditional exit, and the derived values tolerate a null car.
  const [activeIdx, setActiveIdx] = useState(0);
  const [loginVisible, setLoginVisible] = useState(false);
  const [viewerIdx, setViewerIdx] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const { cars, recordCarView } = useApp();
  React.useEffect(() => { if (car?.id) recordCarView(car.id); }, [car?.id, recordCarView]);

  // Arriving by link: nothing to draw until the fetch resolves. Reading car.id
  // before this point would crash on a link-opened screen.
  if (!car) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        {notFound ? (
          <>
            <Ionicons name="car-outline" size={40} color={colors.textMuted} />
            <Text style={styles.linkStateTitle}>This car isn&apos;t available</Text>
            <Text style={styles.linkStateSub}>
              It may have been sold or taken off the marketplace.
            </Text>
            <Pressable
              style={styles.linkStateBtn}
              onPress={() => navigation.replace('Main')}
              accessibilityRole="button"
              accessibilityLabel="Browse cars"
            >
              <Text style={styles.linkStateBtnText}>Browse cars</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.linkStateSub}>Loading this car…</Text>
          </>
        )}
      </View>
    );
  }

  const saved = isCarSaved(car.id);
  const isAuction = car.type === 'auction';

  const monthly = car.price ? monthlyEstimate(car.price) : null;

  const marketDiff = getMarketDiff(car);
  const marketAvg = getMarketAvg(car);
  // Only a server-computed average backed by real comparables earns the count
  const realMarket = hasRealMarketData(car);
  const priceHistory = getPriceHistory(car);
  const priceDrop = getPriceDrop(car);
  const savedCount = getSavedCount(car);
  const listedDaysAgo = getListedDaysAgo(car);
  const neighborhood = getNeighborhood(car);
  const driveType = getDriveType(car);
  const price = isAuction ? car.currentBid : car.price;
  const tier = getCertTier(car);
  const isDealer = isDealerSeller(car.seller);

  const similarCars = cars.filter(
    (c) => c.id !== car.id && (c.make === car.make || c.category === car.category)
  ).slice(0, 6);

  const isInComparison = comparisonCars.some((c) => c.id === car.id);

  const executeWithAuth = (action) => {
    if (isLoggedIn) { action(); }
    else { setPendingAction(() => action); setLoginVisible(true); }
  };

  const imageList = car.images && car.images.length > 0 ? car.images : [car.image];

  const infoRows = [
    { label: 'Make', value: car.make },
    { label: 'Model', value: car.model },
    { label: 'Year', value: String(car.year) },
    { label: 'Body Type', value: car.category },
    { label: 'Transmission', value: car.transmission },
    { label: 'Fuel', value: car.fuel },
    { label: 'Mileage', value: formatMiles(car.mileage) },
    { label: 'Drive', value: `${driveType} drive` },
    {
      label: 'Inspection',
      value: tier
        ? (car.inspectionScore ? `${tier.label} · ${car.inspectionScore}/150` : tier.label)
        : 'Scheduled',
    },
  ].filter((r) => r.value != null && r.value !== '' && r.value !== 'undefined');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 184 }}>
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
              <Pressable key={index} onPress={() => setViewerIdx(index)}>
                <Photo uri={img} width={PHOTO.WIDE} style={[styles.heroImage, { width }]} resizeMode="contain" />
              </Pressable>
            ))}
          </ScrollView>

          <View style={[styles.galleryBar, { top: insets.top + 8 }]}>
            <Pressable style={styles.circleBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={20} color={colors.slate700} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                style={[styles.circleBtn, isInComparison && styles.circleBtnActive]}
                onPress={() => addToComparison(car)} accessibilityRole="button" accessibilityLabel="Compare"
              >
                <Ionicons name="git-compare-outline" size={18} color={isInComparison ? colors.primary : colors.slate700} />
              </Pressable>
              <Pressable
                style={styles.circleBtn}
                onPress={() => Share.share({
                  message: `${car.title} — ${formatPrice(price)} on Sawa Cars. View the listing and available inspection information in the app.`,
                }).catch(() => {})} accessibilityRole="button" accessibilityLabel="Share"
              >
                <Ionicons name="share-outline" size={19} color={colors.slate700} />
              </Pressable>
              <Pressable
                style={styles.circleBtn}
                onPress={() => toggleSaveCar(car.id)}
                accessibilityRole="button"
                accessibilityLabel={saved ? 'Remove from saved' : 'Save this car'}
                accessibilityState={{ selected: saved }}
              >
                <Ionicons name={saved ? 'heart' : 'heart-outline'} size={19} color={saved ? '#EF4444' : colors.slate700} />
              </Pressable>
            </View>
          </View>

          {imageList.length > 1 && (
            <View style={styles.indicatorContainer}>
              <Text style={styles.indicatorText}>{activeIdx + 1} / {imageList.length}</Text>
            </View>
          )}
          {tier && (
            <Badge variant={tier.variant} icon="shield-checkmark" label={tier.label} style={styles.inspectBadge} />
          )}
        </View>

        <View style={styles.body}>
          {/* Title + price */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{car.title}</Text>
              <View style={styles.pipeRow}>
                {[car.make, car.model, car.category, String(car.year)]
                  .filter(Boolean)
                  .map((part, i, arr) => (
                    <Text key={i} style={styles.pipePart}>
                      {part}
                      {i < arr.length - 1 && <Text style={styles.pipeSep}>{'  |  '}</Text>}
                    </Text>
                  ))}
              </View>
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
            <Pressable style={styles.financeStrip} onPress={() => navigation.navigate('Financing', { carPrice: car.price })}>
              <View style={styles.financeIcon}>
                <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.financeTitle}>
                  Bank financing from <Text style={styles.financeAmount}>{formatPrice(monthly)}/mo</Text>
                </Text>
                <Text style={styles.financeSub}>Loan estimate · 20% down · 60 months · 4 partner banks</Text>
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
              <Text style={styles.marketAvgText}>
                {realMarket
                  ? `Market avg: ${formatPrice(marketAvg)} · ${car.comparables} similar sold`
                  : `Market avg: ${formatPrice(marketAvg)}`}
              </Text>
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
                <Ionicons name={s.icon} size={20} color={colors.textSecondary} />
                <Text style={styles.specValue}>
                  {s.key === 'mileage' ? formatMiles(car.mileage) : String(car[s.key])}
                </Text>
                <Text style={styles.specLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Vehicle Information — full spec table */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <CarGlyph width={26} body={colors.primary} glass={colors.surface} />
              <Text style={styles.infoHeaderText}>Vehicle Information</Text>
            </View>
            {infoRows.map((row, i) => (
              <View
                key={row.label}
                style={[styles.infoRow, i === infoRows.length - 1 && styles.infoRowLast]}
              >
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          {/* Seller — professional dealers get their branded storefront,
              private sellers get the individual trust profile */}
          <Pressable
            style={styles.sellerCard}
            onPress={() =>
              navigation.navigate(
                isDealer ? 'DealerProfile' : 'SellerProfile',
                isDealer
                  ? { dealerName: car.seller, sellerId: car.sellerId }
                  : { sellerName: car.seller, sellerId: car.sellerId }
              )
            }
          >
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerInitial}>{car.seller[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{car.seller}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={colors.amber} />
                <Text style={styles.ratingText}>
                  {car.rating} · {isDealer ? 'Partner dealer' : 'Verified seller'} · View profile
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          {/* Trust rows */}
          {car.inspected && (
            <Pressable style={styles.inspectionRow} onPress={() => navigation.navigate('InspectionReport', { car, score: car.inspectionScore })}>
              <View style={styles.inspectionIcon}>
                <Ionicons name="shield-checkmark" size={20} color={colors.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inspectionTitle}>150-Point Inspection Report</Text>
                <Text style={styles.inspectionSub}>
                  {car.inspectionScore ? `Scored ${car.inspectionScore}/150 · View full report` : 'Passed · View full report'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}

          <Pressable style={[styles.inspectionRow, { marginTop: 8 }]} onPress={() => navigation.navigate('VehicleHistory', { car })}>
            <View style={[styles.inspectionIcon, { backgroundColor: colors.greenTint }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inspectionTitle}>Vehicle History Report</Text>
              <Text style={[styles.inspectionSub, { color: colors.textMuted }]}>RRA duty · ownership · accident history</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <View style={styles.trustChips}>
            <Badge variant="tag" label="Direct seller contact" />
            <Badge variant="tag" label={`${driveType} drive`} />
            {tier && <Badge variant={tier.variant} label={tier.label} />}
          </View>

          <Pressable style={styles.promiseLink} onPress={() => navigation.navigate('SawaPromise')}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
            <Text style={styles.promiseLinkText}>Marketplace safety & responsibilities</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </Pressable>

          {/* Description — derived from this car's actual data */}
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.desc}>
            {car.year} {car.make} {car.model} · {formatMiles(car.mileage)} · {car.fuel}, {car.transmission?.toLowerCase()} transmission.
            {car.inspected
              ? ' The published inspection records the checks completed by Sawa Cars on the inspection date.'
              : ' Inspection scheduled — the report must be completed before the listing can be published.'}
            {marketDiff < 0 ? ` Priced ${Math.abs(marketDiff)}% below the Kigali market average for this model.` : ''}
          </Text>

          {/* Inspection highlights — keyed off this car's data */}
          <Text style={styles.sectionTitle}>Inspection Highlights</Text>
          <View style={styles.highlightGrid}>
            {[
              { icon: 'cog-outline', title: 'Engine & Mechanicals', desc: `${car.fuel} engine checked — fluids, mounts and diagnostics within spec.` },
              { icon: 'disc-outline', title: 'Brakes & Tyres', desc: 'Brake wear and tread depth measured on all four wheels.' },
              { icon: 'color-palette-outline', title: 'Body & Paint', desc: 'Panel gaps and paint depth verified across all panels.' },
              { icon: 'document-text-outline', title: 'Documentation', desc: `Registration, ${listedDaysAgo < 30 ? 'recent ' : ''}service records and RRA duty status verified.` },
            ].map((item, idx) => (
              <View key={idx} style={styles.highlightCard}>
                <View style={styles.highlightIcon}>
                  <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
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
                    <Photo uri={item.image} width={PHOTO.CARD} style={styles.similarThumb} resizeMode="contain" />
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
              <Ionicons name="calculator-outline" size={18} color={colors.textSecondary} />
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
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <View style={styles.ctaInner}>
          <View style={styles.ctaMetaRow}>
            <View style={styles.ctaPrice}>
              <Text style={styles.ctaPriceLabel}>{isAuction ? 'Current bid' : 'Asking price'}</Text>
              <Text style={styles.ctaPriceValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatPrice(price)}
              </Text>
              <Text style={styles.ctaContext}>
                Contact seller directly · no Sawa checkout
              </Text>
            </View>
            <View style={styles.ctaAssurance}>
              <Ionicons name="shield-checkmark" size={14} color={colors.greenText} />
              <Text style={styles.ctaAssuranceText}>Direct deal</Text>
            </View>
          </View>

          <View style={styles.ctaActions}>
            <Button
              title="Contact verified seller"
              icon="chatbubble-outline"
              style={styles.requestButton}
              accessibilityHint="Choose an available contact method and review the direct-deal notice"
              onPress={() => executeWithAuth(() => navigation.navigate('SellerContact', { car }))}
            />
          </View>
        </View>
      </View>

      <PhotoViewer
        visible={viewerIdx !== null}
        images={imageList}
        initialIndex={viewerIdx || 0}
        onClose={() => setViewerIdx(null)}
      />

      <LoginModal
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
        onSignIn={() => {
          setLoginVisible(false);
          navigation.navigate('SignIn');
        }}
        onContinueAsGuest={demoMode ? () => {
          setLoginVisible(false);
          loginAsGuest();
          if (pendingAction) setTimeout(() => pendingAction(), 300);
        } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  linkStateTitle: { marginTop: 14, fontSize: 17, fontFamily: fonts.extraBold, color: colors.textPrimary, textAlign: 'center' },
  linkStateSub: { marginTop: 8, fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  linkStateBtn: {
    marginTop: 20, height: 48, paddingHorizontal: 26, borderRadius: radius.lg,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  linkStateBtnText: { fontSize: 15, fontFamily: fonts.extraBold, color: '#FFFFFF' },
  gallery: { height: 320, backgroundColor: colors.navyDeep },
  heroImage: { height: 320 },
  galleryBar: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  circleBtn: {
    width: 48, height: 48, borderRadius: 24,
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
  bidLabel: { fontVariant: ['tabular-nums'], fontSize: 11, fontFamily: fonts.semiBold, color: colors.textMuted },
  price: { fontVariant: ['tabular-nums'], fontSize: 24, fontFamily: fonts.extraBold, letterSpacing: -0.6, color: colors.textPrimary },
  priceRwf: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  marketBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, marginTop: 4,
  },
  marketBadgeLow: { backgroundColor: colors.greenTint },
  marketBadgeHigh: { backgroundColor: '#FEF2F2' },
  marketBadgeText: { fontSize: 11, fontFamily: fonts.bold },
  socialBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  socialItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  socialText: { fontSize: 12, color: colors.textSecondary, fontFamily: fonts.semiBold },
  highDemandBadge: {
    backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5,
  },
  highDemandText: { fontSize: 11, fontFamily: fonts.extraBold, color: colors.amberText },
  sparklineCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14, marginTop: 14, ...shadows.card,
  },
  sparklineLeft: { flex: 1, gap: 3 },
  sparklineTitle: { fontSize: 12, fontFamily: fonts.bold, color: colors.textPrimary },
  priceDropRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  priceDropText: { fontVariant: ['tabular-nums'], fontSize: 11, fontFamily: fonts.bold, color: colors.greenText },
  sparklineStable: { fontSize: 11, color: colors.textMuted },
  marketAvgText: { fontSize: 11, color: colors.textMuted },
  sparklineRight: { alignItems: 'flex-end', gap: 2 },
  sparklineNow: { fontSize: 10, color: colors.textMuted },
  specs: { flexDirection: 'row', gap: 10, marginTop: 18 },
  specCard: {
    flex: 1, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.lg, paddingVertical: 14,
    alignItems: 'center', gap: 6,
  },
  specValue: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.textPrimary },
  specLabel: { fontSize: 11, color: colors.textMuted },
  pipeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 5 },
  pipePart: { fontSize: 13, fontFamily: fonts.bold, color: colors.textSecondary },
  pipeSep: { fontFamily: fonts.bold, color: colors.primary },
  infoCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2,
    marginTop: 18, ...shadows.card,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  infoHeaderText: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 13.5, color: colors.textMuted },
  infoValue: {
    fontSize: 13.5, fontFamily: fonts.semiBold, color: colors.textPrimary,
    maxWidth: '55%', textAlign: 'right',
  },
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
  inspectionSub: { fontSize: 12, color: colors.greenText, fontFamily: fonts.semiBold, marginTop: 2 },
  trustChips: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  promiseLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  promiseLinkText: { fontSize: 12, fontFamily: fonts.extraBold, color: colors.primary },
  financeStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.greenTint,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 12, marginTop: 14,
  },
  financeIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  financeTitle: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary },
  financeAmount: { fontFamily: fonts.extraBold, color: colors.primary },
  financeSub: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  financeCta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  financeCtaText: { fontSize: 11, fontFamily: fonts.extraBold, color: colors.primary },
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
  similarPrice: { fontVariant: ['tabular-nums'], fontSize: 13, fontFamily: fonts.extraBold, color: colors.primary },
  similarCert: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  similarCertText: { fontSize: 10, fontFamily: fonts.bold, color: colors.greenText },
  dutyLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.greenTint, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14, marginTop: 14,
  },
  dutyLinkIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  dutyLinkTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  dutyLinkSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft,
    paddingHorizontal: 16, paddingTop: 12, ...shadows.floating,
  },
  ctaInner: {
    width: '100%', maxWidth: 720, alignSelf: 'center', gap: 12,
  },
  ctaMetaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  ctaPrice: { flex: 1, minWidth: 0 },
  ctaPriceLabel: {
    fontSize: 10, lineHeight: 13, fontFamily: fonts.extraBold, color: colors.textMuted,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 1,
  },
  ctaPriceValue: {
    flexShrink: 1, fontVariant: ['tabular-nums'], fontSize: 22, lineHeight: 27,
    fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.5,
  },
  ctaContext: {
    fontSize: 11, lineHeight: 15, fontFamily: fonts.medium, color: colors.textSecondary, marginTop: 1,
  },
  ctaAssurance: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.greenTint, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  ctaAssuranceText: { fontSize: 11, fontFamily: fonts.bold, color: colors.greenText },
  ctaActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestButton: {
    flex: 1, width: 'auto', minWidth: 0, minHeight: 54,
    paddingVertical: 14, borderRadius: radius.lg,
  },
});
