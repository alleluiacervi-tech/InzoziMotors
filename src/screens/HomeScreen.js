import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  FlatList, Dimensions, Image, ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import CarCard from '../components/CarCard';
import SkeletonCard from '../components/SkeletonCard';
import SectionHeader from '../components/SectionHeader';
import DrawerMenu from '../components/DrawerMenu';
import { colors, radius, shadows, fonts } from '../theme';
import { useApp } from '../context/AppContext';

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
    brand: '7-Day Home Trial',
    tagline: 'Drive it home first. Return if it's not right.',
    tag: 'Guarantee',
    image: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    brand: 'Sell With Inzozi',
    tagline: 'We inspect, photograph, and list your car for you.',
    tag: 'Sell',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 4,
    brand: '150-Point Check',
    tagline: 'Certified mechanics. Full report before you buy.',
    tag: 'Inspection',
    image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 5,
    brand: 'Finance Ready',
    tagline: 'Compare BK, Equity, I&M and KCB monthly estimates.',
    tag: 'Finance',
    image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
  },
];

const QUICK_GRID = [
  { label: 'Trust Inspect', icon: 'shield-checkmark-outline', color: colors.primary, screen: 'SearchResults' },
  { label: 'Sell My Car', icon: 'car-outline', color: '#2D7D46', screen: 'CarSubmission' },
  { label: 'Map View', icon: 'map-outline', color: '#1D4ED8', screen: 'MapView' },
  { label: 'Price Check', icon: 'trending-up-outline', color: '#D97706', screen: 'SearchResults' },
  { label: 'Import Duty', icon: 'globe-outline', color: '#C23B2B', screen: 'DutyCalculator' },
  { label: 'Compare Cars', icon: 'git-compare-outline', color: '#7C3AED', screen: 'Comparison' },
];

const FINANCE_SERVICES = [
  { icon: 'calculator-outline', label: 'Financing', sub: 'Monthly estimate', color: '#1D4ED8', bg: '#EFF6FF', screen: 'Financing' },
  { icon: 'globe-outline', label: 'Import Duty', sub: 'RRA estimate', color: '#D97706', bg: '#FEF3C7', screen: 'DutyCalculator' },
  { icon: 'git-compare-outline', label: 'Compare', sub: 'Side by side', color: colors.primary, bg: colors.greenTint, screen: 'Comparison' },
  { icon: 'ribbon-outline', label: 'Trust Score', sub: 'Seller rating', color: '#7C3AED', bg: '#F5F3FF', screen: 'TrustScore' },
  { icon: 'bar-chart-outline', label: 'Analytics', sub: 'Market data', color: '#374237', bg: colors.surfaceAlt, screen: 'SellerAnalytics' },
];

const TRUST_BADGES = [
  { icon: 'shield-checkmark', label: '150-pt Inspection', color: colors.primary, bg: colors.greenTint },
  { icon: 'person-circle', label: 'Verified Sellers', color: '#1D4ED8', bg: '#EFF6FF' },
  { icon: 'refresh-circle', label: '7-Day Returns', color: '#D97706', bg: '#FEF3C7' },
  { icon: 'document-text', label: 'RRA Verified', color: colors.primary, bg: colors.greenTint },
  { icon: 'camera', label: '36-Angle Photos', color: '#374237', bg: colors.surfaceAlt },
];

const AGE_TABS = ['20s', '30s', '40s', '50s'];

export default function HomeScreen({ navigation }) {
  const { cars } = useApp();
  const [carouselIndex, setCarouselIndex] = useState(1);
  const [activeAgeTab, setActiveAgeTab] = useState('30s');
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [footerExpanded, setFooterExpanded] = useState(false);

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
    }, 3800);
    return () => { if (scrollTimerRef.current) clearInterval(scrollTimerRef.current); };
  }, []);

  const handleCarouselScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / SCREEN_WIDTH) + 1;
    if (index !== carouselIndex) setCarouselIndex(index);
  };

  const getAgeFilteredCars = () => {
    if (activeAgeTab === '20s') return cars.filter(c => c.category === 'EV' || c.category === 'Coupe' || c.category === 'Supercar');
    if (activeAgeTab === '30s') return cars.filter(c => c.category === 'Sedan' || c.category === 'EV');
    if (activeAgeTab === '40s') return cars.filter(c => c.category === 'SUV' || c.category === 'Sedan');
    return cars.filter(c => c.category === 'SUV' || c.category === 'Truck');
  };

  const section1Cars = cars.slice(0, 4);
  const ageFilteredCars = getAgeFilteredCars();
  const featuredCar = cars.find(c => c.id === '7') || cars[0];
  const rankedCars = cars.slice(0, 5);

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
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </View>
        </View>

        <View style={styles.topBarRight}>
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('MapView')}>
            <Ionicons name="map-outline" size={20} color={colors.primary} />
          </Pressable>
          <Pressable style={styles.bellBtn} onPress={() => navigation.navigate('NotificationCenter')}>
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            <View style={styles.bellBadge} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Pressable style={styles.searchBar} onPress={() => navigation.navigate('SearchResults')}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <Text style={styles.searchPlaceholder}>Search by brand, model, or keyword...</Text>
          </Pressable>
        </View>

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
                {/* Bottom gradient for text legibility */}
                <View style={styles.slideGradientTop} />
                <View style={styles.slideGradientBottom} />

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

        {/* ── QUICK ACCESS GRID ── */}
        <View style={styles.quickGridContainer}>
          {QUICK_GRID.map((item, idx) => (
            <Pressable
              key={idx}
              style={styles.quickGridItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.quickGridLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── TRUST BADGES ── */}
        <View style={styles.trustSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trustScroll}
          >
            {TRUST_BADGES.map((badge, i) => (
              <View key={i} style={[styles.trustBadge, { backgroundColor: badge.bg }]}>
                <Ionicons name={badge.icon} size={16} color={badge.color} />
                <Text style={[styles.trustBadgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── WE ALSO RECOMMEND — with skeleton loader ── */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="We Also Recommend"
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
              : section1Cars.map((item) => (
                  <View key={item.id} style={styles.gridCardWrapper}>
                    <CarCard
                      car={item}
                      onPress={() => navigation.navigate('VehicleDetail', { car: item })}
                    />
                  </View>
                ))}
          </View>
        </View>

        {/* ── FINANCE & SERVICES ── */}
        <View style={styles.sectionContainer}>
          <SectionHeader title="Finance & Services" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesScroll}
          >
            {FINANCE_SERVICES.map((svc, i) => (
              <Pressable
                key={i}
                style={[styles.serviceCard, { borderTopColor: svc.color }]}
                onPress={() => navigation.navigate(svc.screen)}
              >
                <View style={[styles.serviceIconWrap, { backgroundColor: svc.bg }]}>
                  <Ionicons name={svc.icon} size={22} color={svc.color} />
                </View>
                <Text style={styles.serviceLabel}>{svc.label}</Text>
                <Text style={styles.serviceSub}>{svc.sub}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── POPULAR BY AGE GROUP ── */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Popular by Age Group"
            actionLabel="More"
            onAction={() => navigation.navigate('SearchResults')}
          />
          <View style={styles.ageTabsRow}>
            {AGE_TABS.map((tab) => {
              const isActive = tab === activeAgeTab;
              return (
                <Pressable
                  key={tab}
                  style={[styles.ageTab, isActive && styles.ageTabActive]}
                  onPress={() => setActiveAgeTab(tab)}
                >
                  <Text style={[styles.ageTabText, isActive && styles.ageTabTextActive]}>
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <FlatList
            horizontal
            data={ageFilteredCars}
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

        {/* ── EDITOR'S CHOICE ── */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Editor's Choice This Month"
            actionLabel="More"
            onAction={() => navigation.navigate('SearchResults')}
          />
          <Pressable
            style={styles.featuredCardContainer}
            onPress={() => navigation.navigate('VehicleDetail', { car: featuredCar })}
          >
            <View style={styles.featuredImageWrap}>
              <Image source={{ uri: featuredCar.image }} style={styles.featuredImage} />
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Editor's Pick</Text>
              </View>
            </View>
            <View style={styles.featuredBody}>
              <Text style={styles.featuredTitle}>{featuredCar.title}</Text>
              <Text style={styles.featuredMeta}>
                Fully inspected — year, mileage, and options verified in pristine condition.
              </Text>
              <View style={styles.featuredPriceRow}>
                <Text style={styles.featuredPriceText}>
                  ${featuredCar.price.toLocaleString('en-US')}
                </Text>
                <Text style={styles.featuredMileageText}>
                  {featuredCar.mileage.toLocaleString('en-US')} mi · Certified
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* ── TOP TRENDING ── */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Top Trending Last Week"
            actionLabel="More"
            onAction={() => navigation.navigate('SearchResults')}
          />
          <FlatList
            horizontal
            data={rankedCars}
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

        {/* ── CORPORATE FOOTER ── */}
        <View style={styles.footerContainer}>
          <View style={styles.footerLinksRow}>
            <Pressable onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.footerLinkText}>Log In</Text>
            </Pressable>
            <Text style={styles.footerDivider}>|</Text>
            <Pressable onPress={() => {}}>
              <Text style={styles.footerLinkText}>Inzozi Branches</Text>
            </Pressable>
            <Text style={styles.footerDivider}>|</Text>
            <Pressable onPress={() => {}}>
              <Text style={styles.footerLinkText}>About Us</Text>
            </Pressable>
            <Text style={styles.footerDivider}>|</Text>
            <Pressable onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.footerLinkText}>Settings</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.accordionHeader}
            onPress={() => setFooterExpanded(!footerExpanded)}
          >
            <Text style={styles.accordionTitle}>Inzozi Motors Co., Ltd. Business Details</Text>
            <Ionicons
              name={footerExpanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#666666"
            />
          </Pressable>

          {footerExpanded && (
            <View style={styles.collapsibleContent}>
              <View style={styles.companyLinksRow}>
                <Pressable onPress={() => {}}>
                  <Text style={styles.companyLinkText}>Business Info</Text>
                </Pressable>
                <Text style={styles.companyDivider}>·</Text>
                <Pressable onPress={() => {}}>
                  <Text style={[styles.companyLinkText, { fontFamily: fonts.bold }]}>Privacy Policy</Text>
                </Pressable>
                <Text style={styles.companyDivider}>·</Text>
                <Pressable onPress={() => {}}>
                  <Text style={styles.companyLinkText}>Terms of Use</Text>
                </Pressable>
              </View>
              <View style={styles.companyDetails}>
                <Text style={styles.detailText}>Address: Kigali City Tower, Kigali, Rwanda</Text>
                <Text style={styles.detailText}>RRA Reg No: 104-86-54476 | Support: info@inzozimotors.rw</Text>
                <Text style={styles.detailText}>Phone: +250 788 000 000</Text>
              </View>
            </View>
          )}

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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
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
    fontFamily: fonts.bold,
    color: '#FF3B30',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  locationValueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 14, fontFamily: fonts.extraBold, color: '#1A1A1A' },
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
    backgroundColor: '#E74C3C',
  },

  scrollContent: { paddingBottom: 40 },

  // ── Search ──
  searchWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBar: {
    height: 40,
    backgroundColor: '#F5F5F5',
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
  slideGradientTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 70,
    backgroundColor: 'transparent',
    // subtle dark fade at top for tag legibility
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)',
  },
  slideGradientBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 110,
    backgroundColor: 'rgba(0,0,0,0)',
    // darker at bottom for text
    background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 22,
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  slideTagline: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    backgroundColor: '#FFFFFF',
  },

  // ── Quick Grid ──
  quickGridContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#E8ECEF',
  },
  quickGridItem: { width: '33.3%', alignItems: 'center', paddingVertical: 10 },
  iconCircle: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  quickGridLabel: { fontSize: 11, fontFamily: fonts.bold, color: '#1A1A1A' },

  // ── Trust Badges ──
  trustSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF',
    paddingVertical: 10,
  },
  trustScroll: { paddingHorizontal: 14, gap: 8 },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  trustBadgeText: { fontFamily: fonts.semiBold, fontSize: 11 },

  // ── Sections ──
  sectionContainer: { marginTop: 12, backgroundColor: '#FFFFFF', paddingVertical: 12 },
  twoColumnGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  gridCardWrapper: { width: '50%' },

  // ── Finance & Services ──
  servicesScroll: { paddingHorizontal: 14, gap: 10, paddingBottom: 4 },
  serviceCard: {
    width: 108,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderTopWidth: 3,
    padding: 14,
    gap: 6,
    ...shadows.card,
  },
  serviceIconWrap: {
    width: 42, height: 42, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  serviceLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary },
  serviceSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },

  // ── Age Tabs ──
  ageTabsRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    gap: 8, marginBottom: 12, marginTop: 4,
  },
  ageTab: {
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 14, backgroundColor: '#F5F5F5',
  },
  ageTabActive: { backgroundColor: colors.primary },
  ageTabText: { fontSize: 12, fontFamily: fonts.bold, color: '#666666' },
  ageTabTextActive: { color: '#FFFFFF' },
  horizontalListPadding: { paddingHorizontal: 8 },
  horizontalCardWrapper: { width: 145 },

  // ── Featured Card ──
  featuredCardContainer: {
    marginHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1, borderColor: '#E8ECEF',
    ...shadows.card,
  },
  featuredImageWrap: { height: 190, position: 'relative' },
  featuredImage: { width: '100%', height: '100%' },
  featuredBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 5,
  },
  featuredBadgeText: { color: '#FFFFFF', fontSize: 11, fontFamily: fonts.extraBold },
  featuredBody: { padding: 14 },
  featuredTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: '#1A1A1A', marginBottom: 4 },
  featuredMeta: { fontSize: 12, fontFamily: fonts.regular, color: '#666666', marginBottom: 8 },
  featuredPriceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 10,
  },
  featuredPriceText: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.primary },
  featuredMileageText: { fontSize: 12, fontFamily: fonts.regular, color: '#999999' },

  // ── Footer ──
  footerContainer: {
    backgroundColor: '#F5F5F4',
    paddingVertical: 20, paddingHorizontal: 20,
    borderTopWidth: 1, borderTopColor: '#E5E5E5',
    marginTop: 20,
  },
  footerLinksRow: {
    flexDirection: 'row', alignItems: 'center',
    flexWrap: 'wrap', marginBottom: 16, gap: 8,
  },
  footerLinkText: { fontSize: 12, fontFamily: fonts.bold, color: '#404040' },
  footerDivider: { fontSize: 12, color: '#CCCCCC' },
  accordionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#E5E5E5',
    borderBottomWidth: 1, borderBottomColor: '#E5E5E5',
    marginBottom: 12,
  },
  accordionTitle: { fontSize: 11, fontFamily: fonts.bold, color: '#666666' },
  collapsibleContent: { paddingVertical: 4, gap: 12 },
  companyLinksRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6,
  },
  companyLinkText: { fontSize: 11, fontFamily: fonts.regular, color: '#737373' },
  companyDivider: { fontSize: 11, color: '#DDDDDD' },
  companyDetails: { gap: 4 },
  detailText: { fontSize: 10, fontFamily: fonts.regular, color: '#999999', lineHeight: 14 },
  copyrightText: { fontSize: 10, fontFamily: fonts.medium, color: '#999999', marginTop: 12 },
});
