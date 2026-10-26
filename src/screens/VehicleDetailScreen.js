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
import Price, { RateNote } from '../components/Price';
import LoginModal from '../components/LoginModal';
import PhotoViewer from '../components/PhotoViewer';
import BrandMark from '../components/BrandMark';
import { getCertTier } from '../data/certification';
import {
  getMarketDiff, getMarketAvg, getPriceHistory, getPriceDrop, hasRealMarketData,
  getSavedCount, getListedDaysAgo, getNeighborhood, getDriveType, formatRWF,
} from '../data/marketData';
import { monthlyEstimate } from '../data/finance';
import { isDealerSeller } from './DealerProfileScreen';
import { Image as ExpoImage } from 'expo-image';
import Photo from '../components/Photo';
import { PHOTO, photoUrl } from '../utils/photo';
import inspectionsApi from '../api/inspections';
import { buildReportFromApi } from '../data/inspectionData';

const SPECS = [
  { icon: 'speedometer-outline', label: 'Mileage', key: 'mileage' },
  { icon: 'flash-outline', label: 'Fuel', key: 'fuel' },
  { icon: 'cog-outline', label: 'Transmission', key: 'transmission' },
  { icon: 'calendar-outline', label: 'Year', key: 'year' },
];

function Sparkline({ data, width: w = 80, height: h = 30 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    // An unchanged price is a flat line through the middle, never a slope.
    const y = range === 0 ? h / 2 : h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const lastX = w;
  const lastParts = pts.split(' ').pop().split(',');
  const lastY = parseFloat(lastParts[1]);
  return (
    <Svg width={w} height={h}>
      <Polyline points={pts} fill="none" stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={lastX} cy={lastY} r="3" fill={colors.textPrimary} />
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
  const { isCarSaved, toggleSaveCar, isLoggedIn, currentUser, loginAsGuest, demoMode, addToComparison, comparisonCars, fetchCarDetail, brandLogo, locale, t } = useApp();

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
  // { index, mode: 'pager' | 'grid' } while the photo viewer is open.
  const [viewer, setViewer] = useState(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const { cars, recordCarView } = useApp();
  React.useEffect(() => { if (car?.id) recordCarView(car.id); }, [car?.id, recordCarView]);

  // This car's own inspection, by category. It replaced four paragraphs that
  // were the same on every listing (one of them claimed RRA data Sawa does not
  // have). Null while loading or when no report can be read; the row linking to
  // the full report stays either way.
  const [report, setReport] = useState(null);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const reportCarId = car?.inspected && String(car?.id || '').includes('-') ? car.id : null;
  React.useEffect(() => {
    if (!reportCarId) return undefined;
    let alive = true;
    inspectionsApi.getReport(reportCarId)
      .then((raw) => { if (alive) setReport(buildReportFromApi(raw)); })
      .catch(() => { if (alive) setReport(null); });
    return () => { alive = false; };
  }, [reportCarId]);

  const imageList = React.useMemo(() => {
    if (!car) return [];
    return car.images && car.images.length > 0 ? car.images : [car.image];
  }, [car]);

  // Prefetch the gallery into the memory-disk cache so swiping shows every
  // photo without a wait. This effect sat below the early return, so a car
  // opened by id (featured slide, deep link, push tap) rendered one hook fewer
  // while loading than once loaded, and React threw — the app's error screen.
  // scripts/check-hook-order.js now fails CI on this shape.
  React.useEffect(() => {
    if (!Array.isArray(imageList) || imageList.length <= 1) return;
    const urls = imageList
      .map((img) => photoUrl(img, PHOTO.WIDE))
      .filter((u) => typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://')));
    if (urls.length > 0) {
      ExpoImage.prefetch(urls, 'memory-disk').catch(() => {});
    }
  }, [imageList]);

  // Arriving by link: nothing to draw until the fetch resolves. Reading car.id
  // before this point would crash on a link-opened screen.
  if (!car) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        {notFound ? (
          <>
            <Ionicons name="car-outline" size={40} color={colors.textMuted} />
            <Text style={styles.linkStateTitle}>{t('vehicleDetail.unavailable')}</Text>
            <Text style={styles.linkStateSub}>
              {t('vehicleDetail.unavailableSub')}
            </Text>
            <Pressable
              style={styles.linkStateBtn}
              onPress={() => navigation.replace('Main')}
              accessibilityRole="button"
              accessibilityLabel={t('vehicleDetail.browseCars')}
            >
              <Text style={styles.linkStateBtnText}>{t('vehicleDetail.browseCars')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.linkStateSub}>{t('vehicleDetail.loadingCar')}</Text>
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
  const hasPriceHistory = Array.isArray(priceHistory) && priceHistory.length > 1;
  const priceDrop = getPriceDrop(car);
  const savedCount = getSavedCount(car);
  const listedDaysAgo = getListedDaysAgo(car);
  const neighborhood = getNeighborhood(car);
  const driveType = getDriveType(car);
  const price = isAuction ? car.currentBid : car.price;
  const tier = getCertTier(car);
  // A real showroom (the server says so) opens its storefront. The demo
  // dealer fixtures keep their own screen in development builds.
  const isShowroom = car.sellerIsShowroom === true;
  const isDealer = !isShowroom && isDealerSeller(car.seller);
  const sellerName = car.seller || t('vehicleDetail.verifiedSeller');
  // Sellers type the location themselves, so it is sometimes "Kimihurura" and
  // sometimes "Kimihurura, Kigali". Append the city only when it is missing.
  const place = /kigali/i.test(neighborhood) ? neighborhood : `${neighborhood}, Kigali`;
  const brandSub = [car.model, car.category, car.year ? String(car.year) : null].filter(Boolean).join(' · ');

  const similarCars = cars.filter(
    (c) => c.id !== car.id && (c.make === car.make || c.category === car.category)
  ).slice(0, 6);

  const isInComparison = comparisonCars.some((c) => c.id === car.id);

  // The bar offers what this viewer can actually do with this car. A demo
  // fixture carries no status, so only an explicit non-live status hides it.
  const isOwnListing = Boolean(isLoggedIn && car.sellerId && currentUser?.id === car.sellerId);
  const isUnavailable = Boolean(car.status) && car.status !== 'live';
  const offersWhatsApp = car.sellerContactAvailable?.whatsapp === true;
  // Every channel still goes through SellerContact, which holds the
  // direct-deal acknowledgement the server requires before any disclosure.
  const openContact = (channel) => executeWithAuth(() => navigation.navigate('SellerContact', { car, channel }));

  const executeWithAuth = (action) => {
    if (isLoggedIn) { action(); }
    else { setPendingAction(() => action); setLoginVisible(true); }
  };

  const infoRows = [
    { label: t('vehicleDetail.make'), value: car.make },
    { label: t('vehicleDetail.model'), value: car.model },
    { label: t('vehicleDetail.year'), value: String(car.year) },
    { label: t('vehicleDetail.bodyType'), value: car.category },
    { label: t('vehicleDetail.transmission'), value: car.transmission },
    { label: t('vehicleDetail.fuel'), value: car.fuel },
    { label: t('vehicleDetail.mileage'), value: formatMiles(car.mileage) },
    { label: t('vehicleDetail.driveSide'), value: `${driveType} drive` },
    {
      label: t('vehicleDetail.inspectionScore'),
      value: tier
        ? (car.inspectionScore ? `${tier.label} · ${car.inspectionScore}/150` : tier.label)
        : t('common.pending'),
    },
  ].filter((r) => r.value != null && r.value !== '' && r.value !== 'undefined');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
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
              <Pressable key={index} onPress={() => setViewer({ index, mode: 'pager' })}>
                <Photo
                  uri={img}
                  width={PHOTO.WIDE}
                  style={[styles.heroImage, { width }]}
                  resizeMode="contain"
                  priority={index < 2 ? 'high' : 'normal'}
                />
              </Pressable>
            ))}
          </ScrollView>

          <View style={[styles.galleryBar, { top: insets.top + 8 }]}>
            <Pressable style={styles.circleBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('common.back')}>
              <Ionicons name="chevron-back" size={20} color={colors.slate700} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                style={[styles.circleBtn, isInComparison && styles.circleBtnActive]}
                onPress={() => addToComparison(car)} accessibilityRole="button" accessibilityLabel={t('common.compare')}
              >
                <Ionicons name="git-compare-outline" size={18} color={isInComparison ? colors.primary : colors.slate700} />
              </Pressable>
              <Pressable
                style={styles.circleBtn}
                onPress={() => Share.share({
                  message: t('vehicleDetail.shareMessage', {
                    year: car.year,
                    title: car.title,
                    price: formatPrice(price),
                  }),
                }).catch(() => {})} accessibilityRole="button" accessibilityLabel={t('common.share')}
              >
                <Ionicons name="share-outline" size={19} color={colors.slate700} />
              </Pressable>
              <Pressable
                style={styles.circleBtn}
                onPress={() => toggleSaveCar(car.id)}
                accessibilityRole="button"
                accessibilityLabel={saved ? t('home.removeSaved', { title: car.title }) : t('home.saveCar', { title: car.title })}
                accessibilityState={{ selected: saved }}
              >
                <Ionicons name={saved ? 'heart' : 'heart-outline'} size={19} color={saved ? '#EF4444' : colors.slate700} />
              </Pressable>
            </View>
          </View>

          {/* Opens every photo as one vertical page (PhotoViewer's grid). */}
          {imageList.length > 1 && (
            <Pressable
              style={styles.indicatorContainer}
              onPress={() => setViewer({ index: activeIdx, mode: 'grid' })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('browse.allPhotosCount', { count: imageList.length })}
            >
              <Ionicons name="grid-outline" size={12} color="#fff" />
              <Text style={styles.indicatorText}>{activeIdx + 1} / {imageList.length}</Text>
            </Pressable>
          )}
          {tier && (
            <Badge variant={tier.variant} icon="shield-checkmark" label={tier.label} style={styles.inspectBadge} />
          )}
        </View>

        <View style={styles.body}>
          {/* Title, then price. The title gets the full width: beside a
              30pt price it was squeezed into a narrow column and wrapped over
              three or four lines. */}
          <Text style={styles.title}>{car.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.meta}>{place}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.meta}>{t('common.daysAgo', { count: listedDaysAgo })}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={[styles.meta, { fontFamily: fonts.bold }]}>{driveType}</Text>
          </View>

          <View style={styles.priceRow}>
            <View style={{ flexShrink: 1 }}>
              {isAuction && <Text style={styles.bidLabel}>{t('vehicleDetail.currentBid').toUpperCase()}</Text>}
              <Price amountRwf={price} size="detail" />
            </View>
            {/* Where the dollar figure comes from, one tap away instead of a
                paragraph under every price. */}
            <Pressable
              onPress={() => setRateOpen((open) => !open)}
              hitSlop={10}
              style={styles.rateInfoBtn}
              accessibilityRole="button"
              accessibilityState={{ expanded: rateOpen }}
              accessibilityLabel={t('browse.aboutRate')}
            >
              <Ionicons name={rateOpen ? 'information-circle' : 'information-circle-outline'} size={18} color={colors.textMuted} />
            </Pressable>
            {/* Null unless the server computed a position from real
                comparables — see getMarketDiff. */}
            {typeof marketDiff === 'number' && marketDiff !== 0 && (
              <View style={[styles.marketBadge, marketDiff < 0 ? styles.marketBadgeLow : styles.marketBadgeHigh]}>
                <Ionicons
                  name={marketDiff < 0 ? 'trending-down' : 'trending-up'}
                  size={11}
                  color={marketDiff < 0 ? colors.green : colors.alertRed}
                />
                <Text style={[styles.marketBadgeText, { color: marketDiff < 0 ? colors.green : colors.alertRed }]}>
                  {marketDiff < 0
                    ? t('home.belowMarket', { percent: Math.abs(marketDiff) })
                    : t('vehicleDetail.aboveMarket', { amount: `${Math.abs(marketDiff)}%` })}
                </Text>
              </View>
            )}
          </View>
          {rateOpen ? <RateNote style={styles.rateNote} /> : null}

          {/* Social proof bar */}
          {savedCount > 0 && (
            <View style={styles.socialBar}>
              <View style={styles.socialItem}>
                <Ionicons name="heart" size={13} color={colors.textMuted} />
                <Text style={styles.socialText}>{t('vehicleDetail.peopleSaved', { count: savedCount })}</Text>
              </View>
              {savedCount >= 10 && (
                <View style={styles.highDemandBadge}>
                  <Text style={styles.highDemandText}>{t('vehicleDetail.highDemand')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Seller, straight after the price: who you would be dealing with
              comes before the detail. A showroom opens its storefront, an
              individual their profile. */}
          <Pressable
            style={styles.sellerCard}
            onPress={() => {
              if (isShowroom && car.sellerId) navigation.navigate('Showroom', { sellerId: car.sellerId, name: sellerName });
              else if (isDealer) navigation.navigate('DealerProfile', { dealerName: car.seller, sellerId: car.sellerId });
              else navigation.navigate('SellerProfile', { sellerName: car.seller, sellerId: car.sellerId });
            }}
            accessibilityRole="button"
          >
            {car.sellerAvatar ? (
              <Image source={{ uri: car.sellerAvatar }} style={styles.sellerAvatarImage} accessibilityIgnoresInvertColors />
            ) : (
              <View style={styles.sellerAvatar}>
                <Text style={styles.sellerInitial}>{sellerName[0]}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName} numberOfLines={1}>{sellerName}</Text>
              {/* What is actually verified about this seller, not a star. */}
              <View style={styles.ratingRow}>
                <Ionicons
                  name={car.sellerIdVerified || isShowroom ? 'shield-checkmark' : 'shield-outline'}
                  size={13}
                  color={car.sellerIdVerified || isShowroom ? colors.green : colors.textMuted}
                />
                <Text style={styles.ratingText} numberOfLines={1}>
                  {isShowroom
                    ? `${t('browse.verifiedShowroom')} · ${t('browse.visitShowroom')}`
                    : `${car.sellerIdVerified ? t('settings.verified') : t('settings.notVerified')}${isDealer ? ` · ${t('vehicleDetail.verifiedSeller')}` : ''} · ${t('common.profile')}`}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          {/* Sawa Cars is not a party to any deal, so its own stock is sold by a
              separate company, and that relationship is said wherever its cars appear. */}
          {car.sellerSawaAffiliated ? (
            <View style={styles.affiliateNote}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.affiliateTitle}>{t('browse.sawaAffiliated')}</Text>
                <Text style={styles.affiliateText}>{t('browse.sawaAffiliatedCar')}</Text>
              </View>
            </View>
          ) : null}

          {/* The direct-deal notice, in the page rather than the sticky bar.
              It is repeated in full on the contact step. */}
          <View style={styles.directDealNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
            <Text style={styles.directDealText}>{t('vehicleDetail.directDealBody')}</Text>
          </View>

          {/* Inspection: the score, then this car's categories as recorded. */}
          {car.inspected && (
            <View style={styles.inspectCard}>
              <View style={styles.inspectHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inspectTitle}>{t('vehicleDetail.inspectionTitle')}</Text>
                  {report?.completedAt ? (
                    <Text style={styles.inspectSub}>
                      {t('vehicleDetail.inspectedOn', { date: new Date(report.completedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) })}
                    </Text>
                  ) : null}
                </View>
                {car.inspectionScore ? (
                  <Text style={styles.inspectScore}>
                    {car.inspectionScore}<Text style={styles.inspectScoreMax}>/150</Text>
                  </Text>
                ) : null}
              </View>

              {report?.categories?.length ? (
                <View style={styles.catList}>
                  {report.categories.map((cat) => {
                    const share = cat.maxPts > 0 ? Math.max(0, Math.min(1, cat.earned / cat.maxPts)) : 0;
                    const flagged = cat.flags.length > 0;
                    const label = t(`vehicleDetail.inspCat.${cat.id}`);
                    return (
                      <View key={cat.id} style={styles.catRow} accessible accessibilityLabel={`${label}, ${cat.earned} / ${cat.maxPts}`}>
                        <View style={styles.catLine}>
                          <Text style={styles.catName} numberOfLines={1}>
                            {label.startsWith('vehicleDetail.') ? cat.name : label}
                          </Text>
                          <Text style={styles.catPts}>{cat.earned}/{cat.maxPts}</Text>
                        </View>
                        <View style={styles.catTrack}>
                          <View style={[styles.catFill, { width: `${share * 100}%` }, flagged && styles.catFillFlagged]} />
                        </View>
                        {flagged ? (
                          <Text style={styles.catFlag}>{t('vehicleDetail.itemsFlagged', { count: cat.flags.length })}</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <Pressable
                style={styles.inspectLink}
                onPress={() => navigation.navigate('InspectionReport', { car, score: car.inspectionScore })}
                accessibilityRole="button"
              >
                <Text style={styles.inspectLinkText}>{t('vehicleDetail.fullReport')}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>
          )}

          {/* Key specs, once. The full table folds away under them. */}
          <View style={styles.specs}>
            {[
              { icon: 'speedometer-outline', label: t('vehicleDetail.mileage'), key: 'mileage', val: formatMiles(car.mileage) },
              { icon: 'flash-outline', label: t('vehicleDetail.fuel'), key: 'fuel', val: String(car.fuel || '') },
              { icon: 'cog-outline', label: t('vehicleDetail.transmission'), key: 'transmission', val: String(car.transmission || '') },
              { icon: 'calendar-outline', label: t('vehicleDetail.year'), key: 'year', val: String(car.year || '') },
            ].map((s) => (
              <View key={s.key} style={styles.specCard}>
                <Ionicons name={s.icon} size={20} color={colors.textSecondary} />
                <Text style={styles.specValue} numberOfLines={1} adjustsFontSizeToFit>{s.val}</Text>
                <Text style={styles.specLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={styles.detailsToggle}
            onPress={() => setShowAllDetails((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAllDetails }}
          >
            <Text style={styles.detailsToggleText}>
              {showAllDetails ? t('vehicleDetail.fewerDetails') : t('vehicleDetail.allDetails')}
            </Text>
            <Ionicons name={showAllDetails ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textPrimary} />
          </Pressable>
          {showAllDetails && (
            <View style={styles.infoCard}>
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
          )}

          {/* Financing, as a plain row: an estimate, not an offer. */}
          {monthly && !isAuction && (
            <Pressable style={styles.plainRow} onPress={() => navigation.navigate('Financing', { carPrice: car.price })} accessibilityRole="button">
              <View style={styles.plainRowIcon}>
                <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.plainRowTitle}>{t('vehicleDetail.financeFrom', { amount: formatPrice(monthly) })}</Text>
                <Text style={styles.plainRowSub}>{t('vehicleDetail.loanEstParams')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          )}

          {/* Price history and market position, only when at least one is
              real. One price is not a history, so it draws no chart. */}
          {(hasPriceHistory || realMarket) && (
            <View style={styles.sparklineCard}>
              <View style={styles.sparklineLeft}>
                <Text style={styles.sparklineTitle}>
                  {hasPriceHistory ? t('vehicleDetail.priceHistory') : t('vehicleDetail.marketPosition')}
                </Text>
                {hasPriceHistory ? (
                  priceDrop > 0 ? (
                    <View style={styles.priceDropRow}>
                      <Ionicons name="arrow-down" size={12} color={colors.green} />
                      <Text style={styles.priceDropText}>{t('vehicleDetail.droppedSinceListed', { amount: formatPrice(priceDrop) })}</Text>
                    </View>
                  ) : priceHistory[priceHistory.length - 1] === priceHistory[0] ? (
                    <Text style={styles.sparklineStable}>{t('vehicleDetail.stableSinceListing')}</Text>
                  ) : null
                ) : null}
                {realMarket && (
                  <Text style={styles.marketAvgText}>
                    {t('vehicleDetail.marketAvgStats', { avg: formatPrice(marketAvg), count: car.comparables })}
                  </Text>
                )}
              </View>
              {hasPriceHistory && (
                <View style={styles.sparklineRight}>
                  <Sparkline data={priceHistory} width={80} height={32} />
                  <Text style={styles.sparklineNow}>{t('common.now')}</Text>
                </View>
              )}
            </View>
          )}

          <Pressable style={styles.plainRow} onPress={() => navigation.navigate('VehicleHistory', { car })} accessibilityRole="button">
            <View style={styles.plainRowIcon}>
              <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.plainRowTitle}>{t('vehicleDetail.vehicleRecord')}</Text>
              <Text style={styles.plainRowSub}>{t('vehicleDetail.vehicleRecordSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable style={styles.promiseLink} onPress={() => navigation.navigate('SawaPromise')} accessibilityRole="link">
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.promiseLinkText}>{t('vehicleDetail.safetyNoticeLink')}</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} />
          </Pressable>

          {/* Similar cars, with the make's full list one tap away. */}
          {similarCars.length > 0 && (
            <>
              <View style={styles.similarHead}>
                <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>{t('vehicleDetail.similarTitle')}</Text>
                <Pressable
                  onPress={() => navigation.navigate('SearchResults', { filters: { make: car.make } })}
                  hitSlop={10}
                  accessibilityRole="link"
                  style={styles.similarMore}
                >
                  <BrandMark name={car.make} logoUrl={brandLogo(car.make)} size={20} />
                  <Text style={styles.similarMoreText}>{t('vehicleDetail.seeMake', { make: car.make })}</Text>
                </Pressable>
              </View>
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
                    <Photo uri={item.image} width={PHOTO.CARD} style={styles.similarThumb} resizeMode="cover" />
                    <View style={styles.similarBody}>
                      <Text style={styles.similarTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.similarPrice}>{formatPrice(item.type === 'auction' ? item.currentBid : item.price)}</Text>
                      {item.inspected && item.inspectionScore ? (
                        <Text style={styles.similarCertText}>{t('home.inspected', { score: item.inspectionScore })}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                )}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky CTA — one slim row: what it costs, and how to ask. */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, 10) + 8 }]}>
        <View style={styles.ctaInner}>
          <View style={styles.ctaPrice}>
            <Text style={styles.ctaPriceLabel}>{isAuction ? t('vehicleDetail.currentBid') : t('vehicleDetail.askingPrice')}</Text>
            <Text style={styles.ctaPriceValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatPrice(price)}
            </Text>
          </View>
          {isOwnListing ? (
            <Button
              title={t('vehicleDetail.manageListing')}
              icon="create-outline"
              variant="outline"
              style={styles.requestButton}
              accessibilityLabel={`${t('vehicleDetail.ownListingBar')}. ${t('vehicleDetail.manageListing')}`}
              onPress={() => navigation.navigate('SellerDashboard')}
            />
          ) : isUnavailable ? (
            <View style={styles.ctaUnavailable} accessibilityRole="text">
              <Ionicons name="pause-circle-outline" size={18} color={colors.textMuted} />
              <Text style={styles.ctaUnavailableText} numberOfLines={1}>{t('vehicleDetail.notAvailableBar')}</Text>
            </View>
          ) : (
            <>
              {offersWhatsApp ? (
                <Pressable
                  onPress={() => openContact('whatsapp')}
                  accessibilityRole="button"
                  accessibilityLabel={t('vehicleDetail.whatsappSeller')}
                  accessibilityHint={t('sellerContact.directDealNotice')}
                  hitSlop={4}
                  style={({ pressed }) => [styles.ctaIconButton, pressed && styles.ctaIconButtonPressed]}
                >
                  <Ionicons name="logo-whatsapp" size={22} color={colors.textPrimary} />
                </Pressable>
              ) : null}
              <Button
                title={t('vehicleDetail.messageSeller')}
                icon="chatbubble-outline"
                style={styles.requestButton}
                accessibilityHint={t('sellerContact.directDealNotice')}
                onPress={() => openContact('in_app')}
              />
            </>
          )}
        </View>
      </View>

      <PhotoViewer
        visible={viewer !== null}
        images={imageList}
        initialIndex={viewer?.index || 0}
        initialMode={viewer?.mode || 'pager'}
        title={car.title}
        onClose={() => setViewer(null)}
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
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  circleBtnActive: { backgroundColor: colors.greenTint, borderWidth: 1.5, borderColor: colors.primary },
  inspectBadge: { position: 'absolute', bottom: 34, left: 16 },
  indicatorContainer: {
    position: 'absolute', bottom: 34, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill,
  },
  indicatorText: { color: '#fff', fontSize: 11, fontFamily: fonts.extraBold },
  body: {
    backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, paddingHorizontal: 20, paddingTop: 22,
  },
  title: { fontSize: 22, lineHeight: 28, fontFamily: fonts.extraBold, letterSpacing: -0.5, color: colors.textPrimary },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  rateInfoBtn: { alignSelf: 'flex-start', marginTop: 8 },
  rateNote: { marginTop: 8 },
  brandBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, paddingVertical: 10, paddingLeft: 10, paddingRight: 12, marginTop: 18,
  },
  brandMark: { borderWidth: 1, borderColor: colors.borderSoft },
  brandName: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.2 },
  brandSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  brandLink: { fontSize: 12, fontFamily: fonts.bold, color: colors.textSecondary, maxWidth: 120 },
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
  marketBadgeHigh: { backgroundColor: colors.primaryTint },
  marketBadgeText: { fontSize: 11, fontFamily: fonts.bold },
  socialBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  socialItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  socialText: { fontSize: 12, color: colors.textSecondary, fontFamily: fonts.semiBold },
  highDemandBadge: {
    backgroundColor: colors.amberTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5,
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
  specs: { flexDirection: 'row', gap: 10, marginTop: 10 },
  specCard: {
    flex: 1, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.lg, paddingVertical: 14,
    alignItems: 'center', gap: 6,
  },
  specValue: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.textPrimary },
  specLabel: { fontSize: 11, color: colors.textMuted },
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
  sellerAvatarImage: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceAlt },
  sellerInitial: { color: '#fff', fontFamily: fonts.extraBold, fontSize: 18 },
  directDealNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10, paddingHorizontal: 4 },
  directDealText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  sellerName: { fontSize: 15, fontFamily: fonts.bold, color: colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  ratingText: { fontSize: 12, color: colors.textSecondary },
  affiliateNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 10, padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft,
  },
  affiliateTitle: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.textPrimary },
  affiliateText: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
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
  promiseLinkText: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.textSecondary },
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
  inspectCard: {
    marginTop: 14, padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  inspectHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  inspectTitle: { fontSize: 17, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.2 },
  inspectSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  inspectScore: { fontVariant: ['tabular-nums'], fontSize: 22, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.4 },
  inspectScoreMax: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textMuted },
  catList: { marginTop: 14, gap: 12 },
  catRow: { gap: 6 },
  catLine: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  catName: { flex: 1, fontSize: 13.5, fontFamily: fonts.semiBold, color: colors.textPrimary },
  catPts: { fontVariant: ['tabular-nums'], fontSize: 12.5, fontFamily: fonts.semiBold, color: colors.textSecondary },
  catTrack: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  catFill: { height: 4, borderRadius: 2, backgroundColor: colors.textPrimary },
  catFillFlagged: { backgroundColor: colors.amber },
  catFlag: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.amberText },
  inspectLink: {
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44,
  },
  inspectLinkText: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  detailsToggle: {
    marginTop: 10, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface,
  },
  detailsToggleText: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  plainRow: {
    marginTop: 10, minHeight: 60, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.lg,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
  },
  plainRowIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt,
  },
  plainRowTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  plainRowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  similarHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  similarMore: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  similarMoreText: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
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
  similarThumb: { width: '100%', height: 96, backgroundColor: colors.surfaceAlt },
  similarBody: { padding: 10, gap: 3 },
  similarTitle: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.textPrimary, lineHeight: 17 },
  similarPrice: { fontVariant: ['tabular-nums'], fontSize: 14, fontFamily: fonts.extraBold, color: colors.primary },
  similarCert: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  similarCertText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.greenText },
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
    paddingHorizontal: 16, paddingTop: 10, ...shadows.floating,
  },
  ctaInner: {
    width: '100%', maxWidth: 720, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  ctaPrice: { flexShrink: 1, minWidth: 96 },
  ctaPriceLabel: {
    fontSize: 10, lineHeight: 13, fontFamily: fonts.extraBold, color: colors.textMuted,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  ctaPriceValue: {
    fontVariant: ['tabular-nums'], fontSize: 19, lineHeight: 24,
    fontFamily: fonts.extraBold, color: colors.primary, letterSpacing: -0.4,
  },
  ctaIconButton: {
    width: 48, height: 48, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaIconButtonPressed: { backgroundColor: colors.bg },
  ctaUnavailable: {
    flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: radius.lg, backgroundColor: colors.bg, paddingHorizontal: 12,
  },
  ctaUnavailableText: { flexShrink: 1, fontSize: 14, fontFamily: fonts.bold, color: colors.textMuted },
  requestButton: {
    flex: 1, width: 'auto', minWidth: 0, minHeight: 48,
    paddingVertical: 12, borderRadius: radius.lg,
  },
});
