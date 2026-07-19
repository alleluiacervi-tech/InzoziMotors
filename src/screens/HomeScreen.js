import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  FlatList, Dimensions, ImageBackground, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import CarCard from '../components/CarCard';
import SkeletonCard from '../components/SkeletonCard';
import SectionHeader from '../components/SectionHeader';
import DrawerMenu from '../components/DrawerMenu';
import { colors, radius, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { getListedDaysAgo, getSavedCount, getDriveType } from '../data/marketData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BANNER_SLIDES = [
  {
    id: 1,
    brand: 'Inzozi Certified',
    tagline: 'Every car inspected before listing. No exceptions.',
    tag: 'Trust',
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    brand: '150-Point Check',
    tagline: 'Certified mechanics. Full report before you buy.',
    tag: 'Inspection',
    image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    brand: 'Certify Your Car',
    tagline: 'Submit for our 150-point inspection. We list it for you.',
    tag: 'Sell',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
  },
];

const CAROUSEL_INTERVAL = 6000;

const TOOLS = [
  { label: 'Certify My Car', icon: 'car-outline', screen: 'CarSubmission' },
  { label: 'Import Duty', icon: 'globe-outline', screen: 'DutyCalculator' },
  { label: 'Financing', icon: 'calculator-outline', screen: 'Financing' },
  { label: 'Compare', icon: 'git-compare-outline', screen: 'Comparison' },
];

export default function HomeScreen({ navigation }) {
  const { cars, homeMode, setHomeMode, rentalCars, notifications, rentalBookings, recentlyViewedIds, savedCarIds } = useApp();
  const hasUnread = notifications.some((n) => !n.read);
  const upcomingTrip = rentalBookings.find((b) => b.status === 'confirmed' || b.status === 'active');
  const [carouselIndex, setCarouselIndex] = useState(1);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rentFilter, setRentFilter] = useState('All');

  const RENT_FILTERS = ['All', 'Safari-Ready', 'SUV', 'Sedan', 'Truck'];
  const filteredRentals = rentalCars.filter((c) => {
    if (rentFilter === 'All') return true;
    if (rentFilter === 'Safari-Ready') return c.safariReady;
    return c.category === rentFilter;
  });

  const carouselRef = useRef(null);
  const scrollTimerRef = useRef(null);

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    scrollTimerRef.current = setInterval(() => {
      setCarouselIndex((prev) => {
        const next = prev >= BANNER_SLIDES.length ? 1 : prev + 1;
        carouselRef.current?.scrollTo({ x: (next - 1) * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, CAROUSEL_INTERVAL);
    return () => { if (scrollTimerRef.current) clearInterval(scrollTimerRef.current); };
  }, []);

  const handleCarouselScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / SCREEN_WIDTH) + 1;
    if (index !== carouselIndex) setCarouselIndex(index);
  };

  // Fresh = most recently listed; Popular = most saved — two genuinely different sections
  const freshCars = [...cars].sort((a, b) => getListedDaysAgo(a.id) - getListedDaysAgo(b.id)).slice(0, 4);

  // ── Origin tabs (Encar-style: browse the way buyers think) ──
  const [originTab, setOriginTab] = useState('All');
  const ORIGIN_TABS = ['All', 'Imported', 'Local', 'EV·Hybrid'];
  const originCars = cars.filter((c) => {
    if (originTab === 'Imported') return getDriveType(c.id) === 'RHD';
    if (originTab === 'Local') return getDriveType(c.id) === 'LHD';
    if (originTab === 'EV·Hybrid') return ['Electric', 'Hybrid'].includes(c.fuel);
    return true;
  });

  // ── Brand showrooms: only brands with 2+ cars earn a window ──
  const showrooms = Object.values(
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
    .slice(0, 6);
  const centerWindow = {
    brand: 'Inzozi Center',
    subtitle: 'On display in Nyarutarama this week',
    cars: [...cars].sort((a, b) => getListedDaysAgo(a.id) - getListedDaysAgo(b.id)).slice(0, 5),
  };

  // ── Personalization rails ──
  const allInventory = [...cars, ...rentalCars];
  const recentlyViewed = recentlyViewedIds
    .map((id) => allInventory.find((c) => c.id === id))
    .filter(Boolean)
    .slice(0, 8);
  const savedCars = cars.filter((c) => savedCarIds.includes(c.id));
  const likeSaved = savedCars.length
    ? cars.filter((c) =>
        !savedCarIds.includes(c.id) &&
        savedCars.some((s) => s.make === c.make || s.category === c.category)
      ).slice(0, 6)
    : [];
  const popularCars = [...cars].sort((a, b) => getSavedCount(b.id) - getSavedCount(a.id)).slice(0, 5);

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
        <Pressable style={styles.hamburger} onPress={() => setDrawerOpen(true)} hitSlop={6}>
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, { width: 16 }]} />
          <View style={styles.hamburgerLine} />
        </Pressable>

        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>LOCATION</Text>
          <View style={styles.locationValueRow}>
            <Text style={styles.locationText}>Kigali, Rwanda</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('MapView')}>
            <Ionicons name="map-outline" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable style={styles.bellBtn} onPress={() => navigation.navigate('NotificationCenter')}>
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
              >
                <Ionicons
                  name={m === 'buy' ? 'pricetag-outline' : 'key-outline'}
                  size={15}
                  color={on ? '#fff' : colors.textSecondary}
                />
                <Text style={[styles.modeBtnText, on && styles.modeBtnTextOn]}>
                  {m === 'buy' ? 'Buy' : 'Rent'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

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
              {homeMode === 'rent' ? 'Search rental cars...' : 'Search by brand, model, or keyword...'}
            </Text>
          </Pressable>
        </View>

        {homeMode === 'rent' ? (
          <>
            {/* ── RENT MODE ── */}
            {upcomingTrip && (
              <Pressable style={styles.tripCard} onPress={() => navigation.navigate('MyRentals')}>
                <View style={styles.tripIcon}>
                  <Ionicons name={upcomingTrip.status === 'active' ? 'car' : 'calendar'} size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripTitle}>
                    {upcomingTrip.status === 'active' ? 'Trip in progress' : 'Upcoming trip'}
                  </Text>
                  <Text style={styles.tripSub} numberOfLines={1}>
                    {upcomingTrip.carTitle} · {upcomingTrip.startDate}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
              </Pressable>
            )}

            <View style={styles.rentHero}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rentHeroTitle}>Certified rentals</Text>
                <Text style={styles.rentHeroSub}>
                  Every car 150-point inspected. Insurance & roadside assistance included.
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
                const on = rentFilter === f;
                return (
                  <Pressable
                    key={f}
                    style={[styles.rentFilterChip, on && styles.rentFilterChipOn]}
                    onPress={() => setRentFilter(f)}
                  >
                    {f === 'Safari-Ready' && (
                      <Ionicons name="trail-sign-outline" size={13} color={on ? '#fff' : colors.textSecondary} />
                    )}
                    <Text style={[styles.rentFilterText, on && styles.rentFilterTextOn]}>{f}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.sectionContainer}>
              <SectionHeader title={rentFilter === 'Safari-Ready' ? 'Safari-Ready 4×4s' : 'Available in Kigali'} />
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
        {/* ── HERO BANNER CAROUSEL ── */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleCarouselScroll}
            scrollEventThrottle={16}
          >
            {BANNER_SLIDES.map((slide) => (
              <ImageBackground
                key={slide.id}
                source={{ uri: slide.image }}
                style={styles.carouselSlide}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.72)']}
                  style={styles.slideScrim}
                />

                {/* Tag chip — top left */}
                <View style={styles.slideTag}>
                  <Text style={styles.slideTagText}>{slide.tag}</Text>
                </View>

                {/* Text — bottom left */}
                <View style={styles.slideText}>
                  <Text style={styles.slideBrand}>{slide.brand}</Text>
                  <Text style={styles.slideTagline}>{slide.tagline}</Text>
                </View>
              </ImageBackground>
            ))}
          </ScrollView>

          {/* Dot pagination */}
          <View style={styles.dotsRow}>
            {BANNER_SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, carouselIndex === i + 1 && styles.dotActive]}
              />
            ))}
          </View>
        </View>

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
              <Text style={styles.toolLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── SHOWROOMS — walk past the glass ── */}
        <View style={styles.sectionContainer}>
          <SectionHeader title="Showrooms" />
          <FlatList
            horizontal
            data={[centerWindow, ...showrooms]}
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
                  subtitle: item.subtitle || `${item.cars.length} cars in the showroom`,
                  cars: item.cars,
                })}
              >
                <Image source={{ uri: item.cars[0].image }} style={styles.showroomPhoto} resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(12,10,10,0.88)']}
                  style={styles.showroomFade}
                />
                <View style={styles.showroomCaption}>
                  <Text style={styles.showroomBrand}>{item.brand}</Text>
                  <Text style={styles.showroomCount}>
                    {item.subtitle || `${item.cars.length} cars · view the collection`}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>

        {/* ── BROWSE BY ORIGIN (Encar-style) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.originRow}
        >
          {ORIGIN_TABS.map((t) => {
            const on = originTab === t;
            return (
              <Pressable
                key={t}
                style={[styles.originChip, on && styles.originChipOn]}
                onPress={() => setOriginTab(t)}
              >
                <Text style={[styles.originText, on && styles.originTextOn]}>{t}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {originTab !== 'All' ? (
          <View style={styles.sectionContainer}>
            <SectionHeader title={`${originTab} · ${originCars.length} cars`} />
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
            <SectionHeader title="Recently Viewed" />
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
              title="More Like Your Saved Cars"
              actionLabel="Saved"
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
            title="Fresh This Week"
            actionLabel="More"
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
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Popular in Kigali"
            actionLabel="More"
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
        </>
        )}
        </>
        )}

        {/* ── FOOTER ── */}
        <View style={styles.footerContainer}>
          <View style={styles.footerLinksRow}>
            <Pressable onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.footerLinkText}>Log In</Text>
            </Pressable>
            <Text style={styles.footerDivider}>·</Text>
            <Pressable onPress={() => navigation.navigate('InzoziPromise')}>
              <Text style={styles.footerLinkText}>Our Promise</Text>
            </Pressable>
            <Text style={styles.footerDivider}>·</Text>
            <Pressable onPress={() => navigation.navigate('InzoziPromise')}>
              <Text style={styles.footerLinkText}>About Us</Text>
            </Pressable>
            <Text style={styles.footerDivider}>·</Text>
            <Pressable onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.footerLinkText}>Settings</Text>
            </Pressable>
          </View>
          <Text style={styles.copyrightText}>© 2026 Inzozi Motors. All rights reserved.</Text>
        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ── Top Bar ──
  topBar: {
    height: 54,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  hamburger: {
    width: 36,
    height: 36,
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
    fontSize: 9,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  locationValueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.greenTint,
  },
  bellBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.alertRed,
  },

  scrollContent: { paddingBottom: 40 },

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
    paddingVertical: 8,
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
    height: 40,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  searchPlaceholder: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted },

  // ── Carousel ──
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
    fontSize: 10,
    letterSpacing: 0.5,
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
  footerDivider: { fontSize: 12, color: colors.border },
  copyrightText: { fontSize: 10, fontFamily: fonts.regular, color: colors.textMuted },
});
