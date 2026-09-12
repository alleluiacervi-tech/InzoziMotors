import React, { useState, useRef, useMemo } from 'react';
import { STUDIO } from '../data/carImageAssets';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  FlatList, Dimensions, Image, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import CarCard from '../components/CarCard';
import SkeletonCard from '../components/SkeletonCard';
import SectionHeader from '../components/SectionHeader';
import BrandMark from '../components/BrandMark';
import DrawerMenu from '../components/DrawerMenu';
import { colors, radius, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { getListedDaysAgo, getSavedCount, getDriveType, RWF_RATE, formatRWF, calcRwandaDuty } from '../data/marketData';
import { FALLBACK_IMPORT_CATALOG } from '../data/importCatalog';
import { photoSource, PHOTO } from '../utils/photo';
import { cars as carsApi } from '../api/cars';
import { formatPrice } from '../data/cars';
import Photo from '../components/Photo';
// expo-image's ImageBackground, for the same disk cache the cards now use.
import { ImageBackground } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BANNER_SLIDES = [
  {
    id: 1,
    brandKey: 'bannerCertifiedBrand',
    taglineKey: 'bannerCertifiedTagline',
    tagKey: 'bannerCertifiedTag',
    image: STUDIO.heroSedan,
  },
  {
    id: 2,
    brandKey: 'bannerInspectionBrand',
    taglineKey: 'bannerInspectionTagline',
    tagKey: 'bannerInspectionTag',
    image: STUDIO.heroSuv,
  },
  {
    id: 3,
    brandKey: 'bannerSellBrand',
    taglineKey: 'bannerSellTagline',
    tagKey: 'bannerSellTag',
    image: STUDIO.heroGt,
  },
];


const TOOLS = [
  { labelKey: 'certifyCar', icon: 'car-outline', screen: 'CarSubmission' },
  { labelKey: 'importDuty', icon: 'globe-outline', screen: 'DutyCalculator' },
  { labelKey: 'financing', icon: 'calculator-outline', screen: 'Financing' },
  { labelKey: 'compare', icon: 'git-compare-outline', screen: 'Comparison' },
];

export default function HomeScreen({ navigation }) {
  const { cars, homeMode, setHomeMode, rentalCars, notifications, rentalInquiries, recentlyViewedIds, savedCarIds, backendReachable, refreshCatalogue, refreshing, makes, t } = useApp();

  // Only worth saying when there is nothing to show; a cached catalogue with a
  // dropped connection does not need a banner over the top of it.
  const catalogueEmpty = (homeMode === 'rent' ? rentalCars : cars).length === 0;
  const hasUnread = notifications.some((n) => !n.read);
  const openInquiry = rentalInquiries.find((item) => item.status === 'new' || item.status === 'contacted');
  const [carouselIndex, setCarouselIndex] = useState(1);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rentFilter, setRentFilter] = useState('All');

  const RENT_FILTERS = [
    { value: 'All', labelKey: 'all' },
    { value: 'Safari-Ready', labelKey: 'safariReady' },
    { value: 'SUV', labelKey: 'suv' },
    { value: 'Sedan', labelKey: 'sedan' },
    { value: 'Truck', labelKey: 'truck' },
  ];
  const filteredRentals = useMemo(() => rentalCars.filter((c) => {
    if (rentFilter === 'All') return true;
    if (rentFilter === 'Safari-Ready') return c.safariReady;
    return c.category === rentFilter;
  }), [rentalCars, rentFilter]);

  const carouselRef = useRef(null);

  // ── The banner ────────────────────────────────────────────────────────────
  // These three slides used to be a hardcoded constant over stock studio
  // photography: the most valuable space in the app, showing no car anybody
  // could buy. It now renders whatever an admin placed, in slot order.
  //
  // BANNER_SLIDES survives as the fallback for a first launch on a bad
  // connection and for the days when nothing is placed — an empty hero is a
  // worse answer than a true statement about the service.
  const [featured, setFeatured] = useState([]);
  React.useEffect(() => {
    let alive = true;
    carsApi.getFeatured(6)
      .then((rows) => { if (alive && Array.isArray(rows)) setFeatured(rows); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Hot deals and promoted cars: real vehicles only, never static generic website hero slides
  const slides = useMemo(() => {
    if (featured.length) return featured;
    if (cars && cars.length) {
      return cars.slice(0, 5).map((car, idx) => ({
        ...car,
        placement_id: `deal-${car.id}`,
        headline: `${car.year} ${car.make} ${car.model}`,
        title: `${car.year} ${car.make} ${car.model}`,
        sponsored: idx === 0,
        label: idx === 0 ? (t('home.premiumBadge') || 'PREMIUM') : (t('home.hotDealBadge') || 'HOT DEAL'),
      }));
    }
    return [];
  }, [featured, cars, t]);

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  // The banner used to advance itself every six seconds.
  //
  // That is fine for three interchangeable marketing slides and wrong for a car
  // somebody is looking at. It moved while a person was reading a price, it
  // moved back under a thumb mid-swipe, and — now that these are real listings
  // an operator placed, some of them paid for — it counted an impression
  // nobody chose to look at. A rail that only moves when a person moves it is
  // both more usable and more honest about what a placement is worth.
  //
  // The dots stay: they are what says "there is more here", which is the one
  // job the timer was doing that was worth keeping.

  const handleCarouselScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / SCREEN_WIDTH) + 1;
    if (index !== carouselIndex) setCarouselIndex(index);
  };

  // Fresh = most recently listed; Popular = most saved — two genuinely different sections
  // Sort by listing date once — freshCars and the center window both slice from it.
  const carsByListedDate = useMemo(
    () => [...cars].sort((a, b) => getListedDaysAgo(a) - getListedDaysAgo(b)),
    [cars]
  );
  const freshCars = useMemo(() => carsByListedDate.slice(0, 4), [carsByListedDate]);

  // ── Origin tabs (Encar-style: browse the way buyers think) ──
  const [originTab, setOriginTab] = useState('All');
  const ORIGIN_TABS = ['All', 'Imported', 'Local', 'EV·Hybrid'];
  const originCars = useMemo(() => cars.filter((c) => {
    if (originTab === 'Imported') return getDriveType(c) === 'RHD';
    if (originTab === 'Local') return getDriveType(c) === 'LHD';
    if (originTab === 'EV·Hybrid') return ['Electric', 'Hybrid'].includes(c.fuel);
    return true;
  }), [cars, originTab]);

  // ── Brand showrooms: only brands with 2+ cars earn a window ──
  const showrooms = useMemo(() => Object.values(
    cars.reduce((acc, c) => {
      (acc[c.make] = acc[c.make] || { brand: c.make, cars: [] }).cars.push(c);
      return acc;
    }, {})
  )
    .filter((g) => g.cars.length >= 2)
    .map((g) => ({
      ...g,
      cars: [...g.cars].sort((a, b) => (b.inspectionScore || 0) - (a.inspectionScore || 0)),
    }))
    .sort((a, b) => b.cars.length - a.cars.length)
    .slice(0, 6), [cars]);
  // The served brand list, matched to the brands the catalogue actually holds.
  // A window with a real mark on it reads as a brand's shopfront; one without
  // still reads as a brand's shopfront, because BrandMark draws initials.
  const brandRow = useMemo(() => {
    const byName = new Map(makes.map((m) => [String(m.name).toLowerCase(), m]));
    const byAlias = new Map();
    for (const m of makes) {
      for (const alias of m.aliases || []) byAlias.set(String(alias).toLowerCase(), m);
    }
    return (name) => {
      const key = String(name || '').toLowerCase();
      return byName.get(key) || byAlias.get(key) || null;
    };
  }, [makes]);

  const centerWindow = useMemo(() => ({
    brand: 'Sawa Center',
    subtitle: t('home.onDisplay'),
    cars: carsByListedDate.slice(0, 5),
  }), [carsByListedDate, t]);

  // The production catalogue is allowed to be empty (for example during a
  // first deployment or while the admin is preparing the first listing). Do
  // not render a showroom card without a lead vehicle: reading
  // `cars[0].image` used to throw and send the whole app to ErrorBoundary as
  // soon as a user tapped Explore Cars.
  const showroomWindows = useMemo(
    () => [centerWindow, ...showrooms].filter((window) => window.cars?.[0]?.image),
    [centerWindow, showrooms]
  );

  // ── Personalization rails ──
  const allInventory = useMemo(() => [...cars, ...rentalCars], [cars, rentalCars]);
  const recentlyViewed = useMemo(() => recentlyViewedIds
    .map((id) => allInventory.find((c) => c.id === id))
    .filter(Boolean)
    .slice(0, 8), [recentlyViewedIds, allInventory]);
  const likeSaved = useMemo(() => {
    const savedCars = cars.filter((c) => savedCarIds.includes(c.id));
    return savedCars.length
      ? cars.filter((c) =>
          !savedCarIds.includes(c.id) &&
          savedCars.some((s) => s.make === c.make || s.category === c.category)
        ).slice(0, 6)
      : [];
  }, [cars, savedCarIds]);
  // "Popular" needs somebody to have actually done something. Sorting the whole
  // catalogue by a save count that is zero everywhere just returns catalogue
  // order, which is what Fresh This Week is already showing — so the two rails
  // rendered the same cars under two different claims. Now: only cars with real
  // saves, only ones Fresh did not already show, and the section disappears
  // entirely below three. An empty rail is better than a false one.
  const popularCars = useMemo(() => {
    const alreadyShown = new Set(freshCars.map((c) => c.id));
    const withInterest = cars
      .filter((c) => getSavedCount(c) > 0 && !alreadyShown.has(c.id))
      .sort((a, b) => getSavedCount(b) - getSavedCount(a));
    return withInterest.length >= 3 ? withInterest.slice(0, 5) : [];
  }, [cars, freshCars]);

  return (
    <Screen background={colors.bg}>

      {/* Side drawer — absolutely positioned, on top of everything */}
      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
          <Pressable style={({ pressed }) => [styles.hamburger, pressed && styles.headerControlPressed]} onPress={() => setDrawerOpen(true)} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('common.menu')}>
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, { width: 16 }]} />
          <View style={styles.hamburgerLine} />
        </Pressable>

        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>{t('home.location').toUpperCase()}</Text>
          <View style={styles.locationValueRow}>
            <Text style={styles.locationText}>{t('home.kigali')}</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <Pressable style={({ pressed }) => [styles.bellBtn, pressed && styles.headerControlPressed]} onPress={() => navigation.navigate('NotificationCenter')} accessibilityRole="button" accessibilityLabel={t('drawer.notifications')}>
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            {hasUnread && <View style={styles.bellBadge} />}
          </Pressable>
        </View>
      </View>

      {/* Buy / Rent mode switch */}
      <View style={styles.modeSwitchWrap}>
        <View style={styles.modeSwitch}>
          {['buy', 'rent'].map((m) => {
            const on = homeMode === m;
            return (
              <Pressable
                key={m}
                style={[styles.modeBtn, on && styles.modeBtnOn]}
                onPress={() => setHomeMode(m)}
                accessibilityRole="tab"
                accessibilityLabel={m === 'buy' ? `${t('common.buy')} cars` : `${t('common.rent')} cars`}
                accessibilityState={{ selected: on }}
              >
                <Ionicons
                  name={m === 'buy' ? 'pricetag-outline' : 'key-outline'}
                  size={15}
                  color={on ? '#fff' : colors.textSecondary}
                />
                <Text style={[styles.modeBtnText, on && styles.modeBtnTextOn]}>
                  {m === 'buy' ? t('home.buy') : t('home.rent')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshCatalogue}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >

        {/* Connection notice. The app used to paper over an unreachable API with
            25 bundled demo cars, which meant an outage looked like inventory.
            Now the catalogue is genuinely empty and this says why — an honest
            "we can't reach Sawa" beats a marketplace that appears to have
            nothing for sale, and beats a fake one by a mile. */}
        {!backendReachable && catalogueEmpty && (
          <View style={styles.offlineNotice}>
            <Ionicons name="cloud-offline-outline" size={20} color={colors.amber} />
            <View style={{ flex: 1 }}>
              <Text style={styles.offlineTitle}>{t('home.offlineTitle')}</Text>
              <Text style={styles.offlineSub}>
                {t('home.offlineSub')}
              </Text>
            </View>
            {/* The recovery the notice used to promise but not provide. The
                only line that marks the backend reachable again lives inside
                the catalogue fetch, so without a way to re-run it the notice
                was permanent for the life of the process. */}
            <Pressable
              accessibilityRole="button"
              style={styles.offlineRetry}
              disabled={refreshing}
              onPress={refreshCatalogue}
            >
              <Text style={styles.offlineRetryText}>{refreshing ? t('home.trying') : t('common.retry')}</Text>
            </Pressable>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Pressable
            style={styles.searchBar}
            onPress={() => navigation.navigate('SearchResults', {
              mode: homeMode === 'rent' ? 'rent' : undefined,
              focusSearch: true,
            })}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <Text style={styles.searchPlaceholder}>
              {homeMode === 'rent' ? t('home.searchRentals') : t('home.search')}
            </Text>
          </Pressable>
        </View>

        {homeMode === 'rent' ? (
          <>
            {/* ── RENT MODE ── */}
            {openInquiry && (
              <Pressable style={styles.tripCard} onPress={() => navigation.navigate('MyRentals')}>
                <View style={styles.tripIcon}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripTitle}>{t('home.rentalInquiry')}</Text>
                  <Text style={styles.tripSub} numberOfLines={1}>
                    {openInquiry.carTitle} · {openInquiry.status === 'contacted' ? t('home.providerContacted') : t('home.awaitingProvider')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
              </Pressable>
            )}

            <View style={styles.rentHero}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rentHeroTitle}>{t('home.certifiedRentals')}</Text>
                <Text style={styles.rentHeroSub}>
                  {t('home.certifiedRentalsSub')}
                </Text>
              </View>
              <View style={styles.rentHeroIcon}>
                <Ionicons name="key" size={26} color={colors.textSecondary} />
              </View>
            </View>

            {/* Rental category filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rentFilterRow}
            >
              {RENT_FILTERS.map((f) => {
                const on = rentFilter === f.value;
                return (
                  <Pressable
                    key={f.value}
                    style={[styles.rentFilterChip, on && styles.rentFilterChipOn]}
                    onPress={() => setRentFilter(f.value)}
                  >
                    {f.value === 'Safari-Ready' && (
                      <Ionicons name="trail-sign-outline" size={13} color={on ? '#fff' : colors.textSecondary} />
                    )}
                    <Text style={[styles.rentFilterText, on && styles.rentFilterTextOn]}>{t(`home.${f.labelKey}`)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.sectionContainer}>
              <SectionHeader title={rentFilter === 'Safari-Ready' ? t('home.safari4x4s') : t('home.availableKigali')} />
              <View style={styles.twoColumnGrid}>
                {filteredRentals.map((item) => (
                  <View key={item.id} style={styles.gridCardWrapper}>
                    <CarCard
                      car={item}
                      onPress={() => navigation.navigate('RentalDetail', { car: item })}
                    />
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
        <>
        {/* ── TOP DEALS ── */}
        {/* Titled only when these are cars an operator actually placed. The
            fallback slides are true statements about the service, not deals,
            and calling them one would be the first dishonest label in the app. */}
        {/* ── HOT DEALS & PROMOTED CARS ── */}
        {slides.length ? (
          <View style={styles.topDealsHead}>
            <Text style={styles.topDealsTitle}>{t('home.hotDeals') || t('home.topDeals')}</Text>
            <Text style={styles.topDealsSub}>{t('home.hotDealsSub') || t('home.topDealsSub')}</Text>
          </View>
        ) : null}
        {slides.length ? (
          <View style={styles.carouselContainer}>
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleCarouselScroll}
              scrollEventThrottle={16}
            >
              {slides.map((slide) => {
                const image = slide.images?.[0] || slide.image;
                const heading = slide.headline || slide.title;
                const sub = `${formatPrice(slide.price)}${slide.location ? ` · ${slide.location}` : ''}`;
                const tag = slide.label || (slide.sponsored ? 'PREMIUM' : 'HOT DEAL');

                return (
                  <Pressable
                    key={slide.placement_id || slide.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${heading}. ${slide.sponsored ? 'Sponsored listing.' : ''}`}
                    onPress={() => navigation.navigate('VehicleDetail', { carId: slide.id })}
                  >
                    <ImageBackground
                      source={photoSource(image, PHOTO.WIDE)}
                      style={styles.carouselSlide}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    >
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.75)']}
                        style={styles.slideScrim}
                      />

                      <View style={[styles.slideTag, slide.sponsored && styles.slideTagSponsored]}>
                        <Text style={[styles.slideTagText, slide.sponsored && styles.slideTagTextSponsored]}>
                          {tag}
                        </Text>
                      </View>

                      <View style={styles.slideText}>
                        <Text style={styles.slideBrand} numberOfLines={1}>{heading}</Text>
                        <Text style={styles.slideTagline} numberOfLines={1}>{sub}</Text>
                        {slide.inspection_score ? (
                          <View style={styles.slideScore}>
                            <Ionicons name="shield-checkmark" size={11} color="#fff" />
                            <Text style={styles.slideScoreText}>
                              {t('home.inspected', { score: slide.inspection_score })}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </ImageBackground>
                  </Pressable>
                );
              })}
            </ScrollView>

          {/* Dot pagination */}
          <View style={styles.dotsRow}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, carouselIndex === i + 1 && styles.dotActive]}
              />
            ))}
          </View>
        </View>
      ) : null}

        {/* ── TOOLS ROW ── */}
        <View style={styles.toolsRow}>
          {TOOLS.map((item, idx) => (
            <Pressable
              key={idx}
              style={styles.toolItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={styles.toolIconCircle}>
                <Ionicons name={item.icon} size={22} color={colors.textSecondary} />
              </View>
              <Text style={styles.toolLabel}>{t(`home.${item.labelKey}`)}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── GLOBAL IMPORT SHOWCASE — Korea, Dubai, China ── */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Import Direct: Korea · Dubai · China"
            actionLabel="Explore All"
            onAction={() => navigation.navigate('SearchResults', { mode: 'import' })}
          />
          <FlatList
            horizontal
            data={FALLBACK_IMPORT_CATALOG.slice(0, 8)}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListPadding}
            renderItem={({ item }) => {
              const vehicleValueRwf = (item.typicalFobUsd || 15000) * RWF_RATE;
              const freightRwf = (item.typicalFreightUsd || 2800) * RWF_RATE;
              const ageYears = Math.max(0, new Date().getFullYear() - (item.yearEnd || 2022));
              const duty = calcRwandaDuty(vehicleValueRwf, item.engineCc || 2000, ageYears);
              const estimatedLandedRwf = (duty ? duty.grandTotal : vehicleValueRwf) + freightRwf;
              const flag = item.originCountry === 'South Korea' ? '🇰🇷' : item.originCountry === 'China' ? '🇨🇳' : item.originCountry === 'United Arab Emirates' ? '🇦🇪' : '🇯🇵';

              return (
                <Pressable
                  style={styles.importHomeCard}
                  onPress={() => navigation.navigate('ImportVehicleDetail', { item })}
                >
                  <Photo uri={item.images[0]} width={PHOTO.CARD} style={styles.importHomePhoto} />
                  <View style={styles.importHomeOriginBadge}>
                    <Text style={styles.importHomeOriginText}>{flag} {item.originCountry}</Text>
                  </View>
                  <View style={styles.importHomeContent}>
                    <Text style={styles.importHomeTitle} numberOfLines={1}>
                      {item.yearStart}–{item.yearEnd} {item.make} {item.model}
                    </Text>
                    <Text style={styles.importHomeTrim} numberOfLines={1}>{item.trim || item.bodyType}</Text>
                    <View style={styles.importHomePriceRow}>
                      <Text style={styles.importHomePrice}>{formatRWF(estimatedLandedRwf)}</Text>
                      <View style={styles.importHomeTransitBadge}>
                        <Ionicons name="boat-outline" size={11} color="#1D4ED8" />
                        <Text style={styles.importHomeTransitText}>{item.estimatedTransitDays || 35}d</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />

          {/* Bank Escrow Reassurance Strip */}
          <Pressable
            style={styles.homeEscrowStrip}
            onPress={() => navigation.navigate('DutyCalculator')}
          >
            <View style={styles.homeEscrowIcon}>
              <Ionicons name="shield-checkmark" size={16} color="#166534" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.homeEscrowTitle}>100% Protected by Bank Escrow Guarantee</Text>
              <Text style={styles.homeEscrowSub}>50% deposit held securely with Bank of Kigali / I&M Bank until physical Kigali inspection.</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* ── SHOWROOMS — walk past the glass ── */}
        {showroomWindows.length > 0 && (
          <View style={styles.sectionContainer}>
            <SectionHeader title={t('home.showrooms')} />
            <FlatList
              horizontal
              data={showroomWindows}
              keyExtractor={(w) => w.brand}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListPadding}
              snapToInterval={SCREEN_WIDTH * 0.78 + 12}
              decelerationRate="fast"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.showroomWindow}
                  onPress={() => navigation.navigate('Showroom', {
                    title: item.brand,
                    subtitle: item.subtitle || t('home.carsInShowroom', { count: item.cars.length }),
                    cars: item.cars,
                  })}
                >
                  <Photo uri={item.cars[0].image} width={PHOTO.CARD} style={styles.showroomPhoto} resizeMode="contain" />
                  <LinearGradient
                    colors={['transparent', 'rgba(12,10,10,0.88)']}
                    style={styles.showroomFade}
                  />
                  <View style={styles.showroomCaption}>
                    <View style={styles.showroomBrandRow}>
                      <BrandMark
                        name={item.brand}
                        logoUrl={brandRow(item.brand)?.logo_url}
                        size={26}
                      />
                      <Text style={styles.showroomBrand}>{item.brand}</Text>
                    </View>
                    <Text style={styles.showroomCount}>
                      {item.subtitle || t('home.showroomCarsView', { count: item.cars.length })}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}

        {/* ── BROWSE BY ORIGIN (Encar-style) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.originRow}
        >
          {ORIGIN_TABS.map((tab) => {
            const on = originTab === tab;
            return (
              <Pressable
                key={tab}
                style={[styles.originChip, on && styles.originChipOn]}
                onPress={() => setOriginTab(tab)}
              >
                <Text style={[styles.originText, on && styles.originTextOn]}>{t(`home.${tab === 'EV·Hybrid' ? 'evHybrid' : tab.toLowerCase()}`)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {originTab !== 'All' ? (
          <View style={styles.sectionContainer}>
            <SectionHeader title={t('home.carsCount', { label: t(`home.${originTab === 'EV·Hybrid' ? 'evHybrid' : originTab.toLowerCase()}`), count: originCars.length })} />
            <View style={styles.twoColumnGrid}>
              {originCars.map((item) => (
                <View key={item.id} style={styles.gridCardWrapper}>
                  <CarCard
                    car={item}
                    onPress={() => navigation.navigate('VehicleDetail', { car: item })}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : (
        <>
        {/* ── RECENTLY VIEWED ── */}
        {recentlyViewed.length > 0 && (
          <View style={styles.sectionContainer}>
            <SectionHeader title={t('home.recentlyViewed')} />
            <FlatList
              horizontal
              data={recentlyViewed}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListPadding}
              renderItem={({ item }) => (
                <View style={styles.horizontalCardWrapper}>
                  <CarCard
                    car={item}
                    onPress={() => navigation.navigate(
                      item.listingType === 'rental' ? 'RentalDetail' : 'VehicleDetail',
                      { car: item }
                    )}
                  />
                </View>
              )}
            />
          </View>
        )}

        {/* ── MORE LIKE YOUR SAVED CARS ── */}
        {likeSaved.length > 0 && (
          <View style={styles.sectionContainer}>
            <SectionHeader
              title={t('home.moreLikeSaved')}
              actionLabel={t('home.saved')}
              onAction={() => navigation.navigate('Saved')}
            />
            <FlatList
              horizontal
              data={likeSaved}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListPadding}
              renderItem={({ item }) => (
                <View style={styles.horizontalCardWrapper}>
                  <CarCard
                    car={item}
                    onPress={() => navigation.navigate('VehicleDetail', { car: item })}
                  />
                </View>
              )}
            />
          </View>
        )}

        {/* ── FRESH THIS WEEK ── */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title={t('home.fresh')}
            actionLabel={t('home.more')}
            onAction={() => navigation.navigate('SearchResults')}
          />
          <View style={styles.twoColumnGrid}>
            {loading
              ? [0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.gridCardWrapper}>
                    <SkeletonCard />
                  </View>
                ))
              : freshCars.map((item) => (
                  <View key={item.id} style={styles.gridCardWrapper}>
                    <CarCard
                      car={item}
                      onPress={() => navigation.navigate('VehicleDetail', { car: item })}
                    />
                  </View>
                ))}
          </View>
        </View>

        {/* ── POPULAR IN KIGALI ── */}
        {popularCars.length ? (
        <View style={styles.sectionContainer}>
          <SectionHeader
            title={t('home.popular')}
            actionLabel={t('home.more')}
            onAction={() => navigation.navigate('SearchResults')}
          />
          <FlatList
            horizontal
            data={popularCars}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListPadding}
            renderItem={({ item, index }) => (
              <View style={styles.horizontalCardWrapper}>
                <CarCard
                  car={item}
                  rank={index + 1}
                  onPress={() => navigation.navigate('VehicleDetail', { car: item })}
                />
              </View>
            )}
          />
        </View>
        ) : null}
        </>
        )}
        </>
        )}

        {/* ── FOOTER ── */}
        <View style={styles.footerContainer}>
          <View style={styles.footerLinksRow}>
            <Pressable onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.footerLinkText}>{t('home.login')}</Text>
            </Pressable>
            <Text style={styles.footerDivider}>·</Text>
            <Pressable onPress={() => navigation.navigate('SawaPromise')}>
              <Text style={styles.footerLinkText}>{t('home.ourPromise')}</Text>
            </Pressable>
            <Text style={styles.footerDivider}>·</Text>
            <Pressable onPress={() => navigation.navigate('SawaPromise')}>
              <Text style={styles.footerLinkText}>{t('home.aboutUs')}</Text>
            </Pressable>
            <Text style={styles.footerDivider}>·</Text>
            <Pressable onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.footerLinkText}>{t('common.settings')}</Text>
            </Pressable>
          </View>
          <Text style={styles.copyrightText}>{t('home.copyright')}</Text>
        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ── Top Bar ──
  topBar: {
    minHeight: 64,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  hamburger: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  hamburgerLine: {
    width: 22,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textPrimary,
  },
  locationContainer: { flex: 1, justifyContent: 'center' },
  locationLabel: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  locationValueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.greenTint,
  },
  bellBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute', top: 9, right: 9,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.alertRed,
  },
  headerControlPressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },

  scrollContent: { paddingBottom: 40 },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.amberTint || '#FEF3C7',
    borderWidth: 1,
    borderColor: colors.amber,
  },
  offlineTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  offlineSub: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2 },
  offlineRetry: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.pill, backgroundColor: colors.primary,
  },
  offlineRetryText: { fontSize: 12, fontFamily: fonts.bold, color: '#fff' },

  // ── Buy/Rent mode switch ──
  modeSwitchWrap: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  modeBtnOn: { backgroundColor: colors.primary },
  modeBtnText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary },
  modeBtnTextOn: { color: '#fff' },

  // ── Rent mode ──
  rentHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.greenTint,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    marginHorizontal: 16,
    marginTop: 4,
    padding: 16,
  },
  rentHeroTitle: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.textPrimary, letterSpacing: -0.3 },
  rentHeroSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  rentHeroIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  tripCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.navyDeep,
    borderRadius: radius.xl,
    marginHorizontal: 16, marginTop: 4, marginBottom: 10,
    padding: 14,
  },
  tripIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  tripTitle: { fontFamily: fonts.extraBold, fontSize: 14, color: '#fff' },
  tripSub: { fontFamily: fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  rentFilterRow: { gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  rentFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill,
  },
  rentFilterChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  rentFilterText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textSecondary },
  rentFilterTextOn: { color: '#fff' },

  // ── Search ──
  searchWrapper: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBar: {
    minHeight: 48,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  searchPlaceholder: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted },

  // ── Carousel ──
  topDealsHead: { paddingHorizontal: 16, marginBottom: 10 },
  topDealsTitle: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.4 },
  topDealsSub: { marginTop: 2, fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  carouselContainer: { height: 210, position: 'relative' },
  carouselSlide: { width: SCREEN_WIDTH, height: 210 },
  slideScrim: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
  },
  slideTag: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  slideTagText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  // A paid placement is marked differently from an editorial pick, not just
  // worded differently — the two must not be mistakable at a glance, and the
  // glance is all a banner gets.
  slideTagSponsored: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderColor: 'rgba(255,255,255,0.55)',
  },
  slideTagTextSponsored: {
    letterSpacing: 0.8,
  },
  slideScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  slideScoreText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 10.5,
  },
  slideText: {
    position: 'absolute',
    bottom: 36,
    left: 18,
    right: 18,
  },
  slideBrand: {
    color: colors.white,
    fontFamily: fonts.extraBold,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  slideTagline: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 3,
  },
  // Dot pagination
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    width: 18, height: 6, borderRadius: 3,
    backgroundColor: colors.white,
  },

  // ── Tools Row ──
  toolsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolItem: { flex: 1, alignItems: 'center', gap: 6 },
  showroomWindow: {
    width: SCREEN_WIDTH * 0.78,
    aspectRatio: 16 / 10,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#1C1A1A',
  },
  showroomPhoto: { width: '100%', height: '100%' },
  showroomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  showroomCaption: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  showroomBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  showroomBrand: { fontSize: 19, fontFamily: fonts.black, color: '#fff', letterSpacing: -0.4 },
  showroomCount: { fontSize: 12, fontFamily: fonts.semiBold, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  originRow: { paddingHorizontal: 16, gap: 8, marginTop: 4, marginBottom: 4 },
  originChip: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
  },
  originChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  originText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  originTextOn: { color: '#fff' },
  toolIconCircle: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.greenTint,
  },
  toolLabel: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textPrimary },

  // ── Sections ──
  sectionContainer: { marginTop: 12, backgroundColor: colors.surface, paddingVertical: 12 },
  twoColumnGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  gridCardWrapper: { width: '50%' },
  horizontalListPadding: { paddingHorizontal: 8 },
  horizontalCardWrapper: { width: 145 },

  // ── Import Direct Showcase ──
  importHomeCard: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginRight: 12,
    position: 'relative',
  },
  importHomePhoto: {
    width: '100%',
    height: 125,
    backgroundColor: colors.surfaceAlt,
  },
  importHomeOriginBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(23, 18, 15, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  importHomeOriginText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  importHomeContent: {
    padding: 12,
  },
  importHomeTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  importHomeTrim: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  importHomePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  importHomePrice: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
    color: colors.primary,
  },
  importHomeTransitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  importHomeTransitText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#1D4ED8',
  },
  homeEscrowStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: radius.lg,
    padding: 12,
    marginTop: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  homeEscrowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeEscrowTitle: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: '#14532D',
  },
  homeEscrowSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#166534',
    marginTop: 1,
  },

  // ── Footer ──
  footerContainer: {
    paddingVertical: 24, paddingHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  footerLinksRow: {
    flexDirection: 'row', alignItems: 'center',
    flexWrap: 'wrap', gap: 8,
    marginBottom: 10,
  },
  footerLinkText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary },
  footerDivider: { fontSize: 12, color: colors.textDisabled },
  copyrightText: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
});
