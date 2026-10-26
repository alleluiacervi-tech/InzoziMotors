import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  FlatList, Dimensions, Image, RefreshControl, AppState,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import CarCard from '../components/CarCard';
import StaggerEntrance from '../components/StaggerEntrance';
import SkeletonCard from '../components/SkeletonCard';
import SectionHeader from '../components/SectionHeader';
import BrandMark from '../components/BrandMark';
import DrawerMenu from '../components/DrawerMenu';
import { colors, radius, fonts, typography } from '../theme';
import { useApp } from '../context/AppContext';
import { getListedDaysAgo, getSavedCount, getDriveType } from '../data/marketData';
import { importCatalogMakes } from '../data/importCatalog';
import useKoreaAvailable from '../hooks/useKoreaAvailable';
import useKoreaMarket from '../hooks/useKoreaMarket';
import { PHOTO } from '../utils/photo';
import { cars as carsApi } from '../api/cars';
import Photo from '../components/Photo';
import FeaturedCard from '../components/FeaturedCard';
import ShowroomCard from '../components/ShowroomCard';
import { BrandName } from '../components/Logo';
import useReducedMotion from '../hooks/useReducedMotion';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Featured rail: each card leaves the next one peeking at the edge, which is
// what says "there is more".
const FEATURED_CARD_W = SCREEN_WIDTH - 48;
const FEATURED_GAP = 12;
// Auto-advance: one card every five seconds, and a touch holds it still for
// eight — long enough to read a price without the card moving under a thumb.
const FEATURED_INTERVAL_MS = 5000;
const FEATURED_TOUCH_PAUSE_MS = 8000;
// One or two showrooms: full-width cards. Three or more: a rail where the next
// card peeks in at the edge.
const SHOWROOM_RAIL_W = Math.round(SCREEN_WIDTH * 0.84);
const SHOWROOM_GAP = 12;

const TOOLS = [
  { labelKey: 'certifyCar', icon: 'car-outline', screen: 'CarSubmission' },
  { labelKey: 'importDuty', icon: 'globe-outline', screen: 'DutyCalculator' },
  { labelKey: 'financing', icon: 'calculator-outline', screen: 'Financing' },
  { labelKey: 'compare', icon: 'git-compare-outline', screen: 'Comparison' },
];

export default function HomeScreen({ navigation }) {
  const { cars, homeMode, setHomeMode, rentalCars, notifications, rentalInquiries, recentlyViewedIds, savedCarIds, backendReachable, refreshCatalogue, refreshing, makes, brandLogo, t } = useApp();
  const isFocused = useIsFocused();

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

  // ── Featured ──────────────────────────────────────────────────────────────
  // Whatever an operator placed (GET /cars/featured), in slot order. The server
  // takes paid slots in turns day by day, so nothing here reorders them.
  const reducedMotion = useReducedMotion();
  const [featured, setFeatured] = useState([]);
  React.useEffect(() => {
    let alive = true;
    carsApi.getFeatured(12)
      .then((rows) => { if (alive && Array.isArray(rows)) setFeatured(rows); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Only cars an operator actually placed. The fallback used to take the first
  // five ordinary listings and label one "PREMIUM" and the rest "HOT DEAL" —
  // a paid label on a car nobody paid for. With nothing placed, the section
  // simply isn't there.
  const slides = featured;

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  // The rail advances itself — the way a buyer expects a "featured" strip to
  // behave — but only while somebody could be looking at it, and never in
  // their way:
  //   · every five seconds, looping back to the first card after the last;
  //   · a touch or a drag holds it for eight seconds, so it never moves under
  //     a thumb or while a price is being read;
  //   · only while Home is the screen on top and the app is in the
  //     foreground — a rail nobody can see does not count impressions;
  //   · never with Reduce Motion on (the rail then only moves when swiped).
  // The segmented line under it still says where you are.
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);
  const railIndex = useRef(0);
  const railPausedUntil = useRef(0);
  const pauseRail = () => { railPausedUntil.current = Date.now() + FEATURED_TOUCH_PAUSE_MS; };
  React.useEffect(() => {
    if (reducedMotion || homeMode === 'rent' || slides.length < 2 || !isFocused || !appActive) return undefined;
    const timer = setInterval(() => {
      if (Date.now() < railPausedUntil.current) return;
      const next = (railIndex.current + 1) % slides.length;
      carouselRef.current?.scrollTo({ x: next * (FEATURED_CARD_W + FEATURED_GAP), animated: true });
    }, FEATURED_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides.length, reducedMotion, homeMode, isFocused, appActive]);

  const handleCarouselScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / (FEATURED_CARD_W + FEATURED_GAP)) + 1;
    railIndex.current = Math.max(0, index - 1);
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

  // ── Showrooms: real verified businesses, from GET /showrooms ──
  // This rail used to group the catalogue by make and call each group a
  // showroom ("Toyota", "Hyundai"), plus an invented "Sawa Center" window. A
  // showroom is a business that sells whatever brands it stocks; the brands
  // on each card are read off its live cars by the server.
  const [showrooms, setShowrooms] = useState([]);
  // Re-read every minute so a card's "Open · Closes at 21:00" turns over on time.
  const [clock, setClock] = useState(() => Date.now());
  React.useEffect(() => {
    if (!isFocused) return undefined;
    setClock(Date.now());
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [isFocused]);
  React.useEffect(() => {
    if (refreshing) return undefined; // fetch again once a pull-to-refresh lands
    let alive = true;
    carsApi.getShowrooms()
      .then((rows) => { if (alive && Array.isArray(rows)) setShowrooms(rows); })
      .catch(() => {});
    return () => { alive = false; };
  }, [refreshing]);

  // ── Shop by brand: what the old "showrooms" rail really was ──
  const brandsInStock = useMemo(() => Object.values(
    cars.reduce((acc, c) => {
      if (!c.make) return acc;
      const key = String(c.make).toLowerCase();
      (acc[key] = acc[key] || { make: c.make, count: 0 }).count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count || a.make.localeCompare(b.make)), [cars]);

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

  // Brands first, most models first: the marques with the deepest ranges are
  // the ones worth entering, and the strip is a doorway rather than a ranking.
  const importBrands = useMemo(
    () => importCatalogMakes().sort((a, b) => b.modelCount - a.modelCount).slice(0, 12),
    [],
  );

  // The Korean catalogue, once the operator has opened it, replaces the model
  // strip below: the makes with the most cars for sale in Korea. Until then the
  // strip is exactly what it was.
  const korea = useKoreaAvailable();
  // The Korea market guide (counts and asking prices from the provider's free
  // plan): a strip under the import brands while the full catalogue is off.
  const koreaMarket = useKoreaMarket();
  const importRail = korea.available
    ? korea.makes.slice(0, 12).map((m) => ({ make: m.make, count: m.count, korea: true }))
    : importBrands;

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

        {/* The app's name where big apps put theirs. It used to say
            "LOCATION Kigali, Rwanda", a setting nobody could change. */}
        <View style={styles.brandContainer}>
          <BrandName height={13} color={colors.textPrimary} />
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
                  color={on ? colors.textPrimary : colors.textSecondary}
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
                {filteredRentals.map((item, index) => (
                  <View key={item.id} style={styles.gridCardWrapper}>
                    <StaggerEntrance index={index}>
                      <CarCard
                        car={item}
                        onPress={() => navigation.navigate('RentalDetail', { car: item })}
                      />
                    </StaggerEntrance>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
        <>
        {/* ── FEATURED ── */}
        {/* Cars an operator placed. Calm on purpose: the photo, the price, the
            inspection score, and a label only where it means something —
            Sponsored always (it's a disclosure), Hot deal only when the price
            really fell. See FeaturedCard. */}
        {slides.length ? (
          <View style={styles.featured}>
            <View style={styles.featuredHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.featuredTitle}>{t('home.featuredTitle')}</Text>
                <Text style={styles.featuredSub}>{t('home.featuredSub')}</Text>
              </View>
              {slides.length > 1 ? (
                <Pressable
                  onPress={() => navigation.navigate('Featured')}
                  hitSlop={10}
                  accessibilityRole="link"
                >
                  <Text style={styles.featuredSeeAll}>{t('common.viewAll')}</Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              ref={carouselRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={FEATURED_CARD_W + FEATURED_GAP}
              decelerationRate="fast"
              contentContainerStyle={styles.featuredRail}
              onScroll={handleCarouselScroll}
              onScrollBeginDrag={pauseRail}
              onTouchStart={pauseRail}
              scrollEventThrottle={16}
            >
              {slides.map((slide) => (
                <FeaturedCard
                  key={slide.placement_id || slide.id}
                  slide={slide}
                  width={FEATURED_CARD_W}
                  reducedMotion={reducedMotion}
                  t={t}
                  onPress={() => navigation.navigate('VehicleDetail', { carId: slide.id })}
                />
              ))}
            </ScrollView>

            {slides.length > 1 ? (
              <View
                style={styles.featuredProgress}
                accessible
                accessibilityLabel={t('home.featuredPosition', { index: carouselIndex, total: slides.length })}
              >
                {slides.map((slide, i) => (
                  <View
                    key={slide.placement_id || slide.id}
                    style={[styles.featuredSegment, i + 1 === carouselIndex && styles.featuredSegmentOn]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── FRESH THIS WEEK ── the stock people came for, straight after
            Featured. The origin chips sit right above the cars they filter. */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title={originTab === 'All'
              ? t('home.fresh')
              : t('home.carsCount', { label: t(`home.${originTab === 'EV·Hybrid' ? 'evHybrid' : originTab.toLowerCase()}`), count: originCars.length })}
            actionLabel={t('home.more')}
            onAction={() => navigation.navigate('SearchResults')}
          />
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
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.originText, on && styles.originTextOn]}>{t(`home.${tab === 'EV·Hybrid' ? 'evHybrid' : tab.toLowerCase()}`)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.twoColumnGrid}>
            {loading
              ? [0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.gridCardWrapper}>
                    <SkeletonCard />
                  </View>
                ))
              : (originTab === 'All' ? freshCars : originCars).map((item, index) => (
                  <View key={item.id} style={styles.gridCardWrapper}>
                    <StaggerEntrance index={index}>
                      <CarCard
                        car={item}
                        onPress={() => navigation.navigate('VehicleDetail', { car: item })}
                      />
                    </StaggerEntrance>
                  </View>
                ))}
          </View>
        </View>

        {/* ── SHOWROOMS — verified businesses, open or closed right now ── */}
        {showrooms.length > 0 && (
          <View style={styles.sectionContainer}>
            <SectionHeader title={t('home.showrooms')} />
            {showrooms.length <= 2 ? (
              <View style={styles.showroomStack}>
                {showrooms.map((room) => (
                  <ShowroomCard
                    key={room.id}
                    room={room}
                    now={new Date(clock)}
                    brandLogo={brandLogo}
                    t={t}
                    onPress={() => navigation.navigate('Showroom', { sellerId: room.id, name: room.name })}
                  />
                ))}
              </View>
            ) : (
              <FlatList
                horizontal
                data={showrooms}
                keyExtractor={(w) => w.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.showroomRail}
                snapToInterval={SHOWROOM_RAIL_W + SHOWROOM_GAP}
                decelerationRate="fast"
                renderItem={({ item }) => (
                  <ShowroomCard
                    room={item}
                    width={SHOWROOM_RAIL_W}
                    now={new Date(clock)}
                    brandLogo={brandLogo}
                    t={t}
                    onPress={() => navigation.navigate('Showroom', { sellerId: item.id, name: item.name })}
                  />
                )}
              />
            )}
          </View>
        )}

        {/* ── SHOP BY BRAND — the brands in stock right now ── */}
        {brandsInStock.length > 0 && (
          <View style={styles.sectionContainer}>
            <SectionHeader title={t('browse.shopByBrand')} />
            <FlatList
              horizontal
              data={brandsInStock}
              keyExtractor={(b) => b.make}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListPadding}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.brandTile, pressed && { opacity: 0.85 }]}
                  onPress={() => navigation.navigate('SearchResults', { filters: { make: item.make } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.make}, ${t('browse.showroomCars', { count: item.count })}`}
                >
                  <BrandMark name={item.make} logoUrl={brandRow(item.make)?.logo_url} size={36} />
                  <Text style={styles.brandTileName} numberOfLines={1}>{item.make}</Text>
                  <Text style={styles.brandTileCount}>{t('browse.showroomCars', { count: item.count })}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

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

        {/* ── TOOLS ── shortcuts, after the stock rather than in front of it. */}
        <View style={styles.toolsRow}>
          {TOOLS.map((item) => (
            <Pressable
              key={item.labelKey}
              style={styles.toolItem}
              onPress={() => navigation.navigate(item.screen)}
              accessibilityRole="button"
            >
              <View style={styles.toolIconCircle}>
                <Ionicons name={item.icon} size={22} color={colors.textPrimary} />
              </View>
              <Text style={styles.toolLabel} numberOfLines={2}>{t(`home.${item.labelKey}`)}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── IMPORT, ENTERED THROUGH THE BRAND ── brands answer the question
            people arrive with ("what Hyundais can I get?") and need neither a
            price nor a photograph. Korea and duty follow as two quiet rows. */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title={t('browse.importEntryTitle')}
            actionLabel={t('browse.allBrands')}
            onAction={() => navigation.navigate(korea.available ? 'KoreaCars' : 'ImportBrands')}
          />
          <FlatList
            horizontal
            data={importRail}
            keyExtractor={(b) => b.make}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListPadding}
            renderItem={({ item }) => (
              <Pressable
                style={styles.importBrandCard}
                onPress={() => (item.korea
                  ? navigation.navigate('KoreaCars', { make: item.make })
                  : navigation.navigate('ImportBrandModels', { make: item.make }))}
                accessibilityRole="button"
                accessibilityLabel={item.korea ? `${item.make}, ${t('korea.carsCount', { count: item.count })}` : `${item.make}, ${t('browse.modelsCount', { count: item.modelCount })}`}
              >
                <BrandMark name={item.make} logoUrl={brandRow(item.make)?.logo_url} size={36} />
                <Text style={styles.importBrandName} numberOfLines={1}>{item.make}</Text>
                <Text style={styles.importBrandCount}>{item.korea ? t('korea.carsCount', { count: item.count.toLocaleString('en-US') }) : t('browse.modelsCount', { count: item.modelCount })}</Text>
              </Pressable>
            )}
          />

          <View style={styles.importRows}>
            {!korea.available && koreaMarket.available ? (
              <Pressable
                style={styles.importRow}
                onPress={() => navigation.navigate('KoreaMarket')}
                accessibilityRole="button"
              >
                <Ionicons name="stats-chart-outline" size={18} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.importNoteTitle}>{t('korea.market.homeTitle')}</Text>
                  <Text style={styles.importNoteSub} numberOfLines={1}>{t('korea.market.homeBody', { count: koreaMarket.total.toLocaleString('en-US') })}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.importRow, !korea.available && koreaMarket.available && styles.importRowDivided]}
              onPress={() => navigation.navigate('DutyCalculator')}
              accessibilityRole="button"
            >
              <Ionicons name="calculator-outline" size={18} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.importNoteTitle}>{t('browse.dutyNoteTitle')}</Text>
                <Text style={styles.importNoteSub} numberOfLines={2}>{t('browse.dutyNoteBody')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
        </>
        )}

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  importBrandCard: {
    width: 84,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginRight: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  importBrandName: { ...typography.cardTitle, fontSize: 12.5, lineHeight: 16, color: colors.textPrimary, marginTop: 6 },
  importBrandCount: { ...typography.micro, color: colors.textSecondary, marginTop: 2 },
  importRows: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, overflow: 'hidden',
  },
  importRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 12 },
  importRowDivided: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  importNoteTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  importNoteSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },

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
  brandContainer: { flex: 1, justifyContent: 'center', paddingLeft: 2 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
  // Fixed above the scroll view: a solid band with a hairline, so the content
  // never shows through or slides under a hard edge.
  modeSwitchWrap: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
  // Selected is ink on white, like iOS's segmented control: red stays for
  // prices and the one main action on a screen.
  modeBtnOn: {
    backgroundColor: colors.surface,
    shadowColor: '#14110F', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  modeBtnText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textSecondary },
  modeBtnTextOn: { color: colors.textPrimary, fontFamily: fonts.bold },

  // ── Rent mode ──
  rentHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surfaceAlt,
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
  rentFilterChipOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  rentFilterText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textSecondary },
  rentFilterTextOn: { color: colors.surface },

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
  searchPlaceholder: { fontSize: 15, fontFamily: fonts.regular, color: colors.textMuted },

  // ── Carousel ──
  // ── Featured rail ──
  featured: { marginBottom: 8 },
  featuredHead: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 20, marginBottom: 12,
  },
  featuredTitle: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.3 },
  featuredSub: { marginTop: 2, fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  featuredSeeAll: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary, marginLeft: 12 },
  featuredRail: { paddingHorizontal: 20, gap: FEATURED_GAP },
  featuredProgress: { flexDirection: 'row', gap: 4, paddingHorizontal: 20, marginTop: 12 },
  featuredSegment: { flex: 1, maxWidth: 40, height: 3, borderRadius: 2, backgroundColor: colors.border },
  featuredSegmentOn: { backgroundColor: colors.textPrimary },

  // ── Tools Row ──
  toolsRow: {
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  toolItem: { flex: 1, alignItems: 'center', gap: 8, minHeight: 44 },
  showroomStack: { paddingHorizontal: 16, gap: 12 },
  showroomRail: { paddingHorizontal: 16, gap: SHOWROOM_GAP },
  brandTile: {
    width: 84,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginRight: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandTileName: { ...typography.cardTitle, fontSize: 12.5, lineHeight: 16, color: colors.textPrimary, marginTop: 6 },
  brandTileCount: { ...typography.micro, color: colors.textSecondary, marginTop: 1 },
  originRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  originChip: {
    minHeight: 36, justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  originChipOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  originText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  originTextOn: { color: colors.surface },
  toolIconCircle: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  toolLabel: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textPrimary, textAlign: 'center' },

  // ── Sections ──
  sectionContainer: { marginTop: 12, backgroundColor: colors.surface, paddingVertical: 12 },
  twoColumnGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  gridCardWrapper: { width: '50%' },
  horizontalListPadding: { paddingHorizontal: 8 },
  horizontalCardWrapper: { width: 145 },

  // ── Import Direct Showcase ──

});
