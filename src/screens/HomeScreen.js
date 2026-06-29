import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, FlatList, Dimensions, Image, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import CarCard from '../components/CarCard';
import SkeletonCard from '../components/SkeletonCard';
import SectionHeader from '../components/SectionHeader';
import { colors, radius, shadows, typography, fonts } from '../theme';
import { useApp } from '../context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BANNER_SLIDES = [
  { id: 1, title: 'Inzozi Certified', subtitle: 'Honest used cars with zero false listings', image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80', tag: 'Trust' },
  { id: 2, title: '7-Day Home Trial!', subtitle: 'Test drive at home with custom delivery services', image: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=800&q=80', tag: 'Home Delivery' },
  { id: 3, title: 'Sell My Car directly', subtitle: 'Real-time bidding competitions for best offers', image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80', tag: 'Bidding' },
  { id: 4, title: '150-Point Inspection', subtitle: 'Guaranteed warranty check by certified inspectors', image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80', tag: 'Warranty' },
];

const QUICK_GRID = [
  { label: 'Trust Inspect', icon: 'shield-checkmark-outline', color: '#15803D' },
  { label: 'Sell My Car', icon: 'cash-outline', color: '#2D7D46' },
  { label: 'Home Delivery', icon: 'home-outline', color: '#FF6B00' },
  { label: 'No-Waste Guar.', icon: 'alert-circle-outline', color: '#D97706' },
  { label: 'Import Cars', icon: 'globe-outline', color: '#C23B2B' },
  { label: 'Price Check', icon: 'trending-up-outline', color: '#737373' },
];

const AGE_TABS = ['20s', '30s', '40s', '50s'];

export default function HomeScreen({ navigation }) {
  const { cars } = useApp();
  const [carouselIndex, setCarouselIndex] = useState(1);
  const [activeAgeTab, setActiveAgeTab] = useState('30s');
  const [loading, setLoading] = useState(true);

  const carouselRef = React.useRef(null);
  const scrollTimerRef = React.useRef(null);
  const [footerExpanded, setFooterExpanded] = useState(false);

  // Simulate data load — disappears after 700ms
  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  // Auto-scroll carousel
  React.useEffect(() => {
    scrollTimerRef.current = setInterval(() => {
      setCarouselIndex((prev) => {
        const next = prev >= BANNER_SLIDES.length ? 1 : prev + 1;
        carouselRef.current?.scrollTo({
          x: (next - 1) * SCREEN_WIDTH,
          animated: true,
        });
        return next;
      });
    }, 3500);

    return () => {
      if (scrollTimerRef.current) clearInterval(scrollTimerRef.current);
    };
  }, []);

  const handleCarouselScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / SCREEN_WIDTH) + 1;
    if (index !== carouselIndex) {
      setCarouselIndex(index);
    }
  };

  const section1Cars = cars.slice(0, 4);

  const getAgeFilteredCars = () => {
    if (activeAgeTab === '20s') return cars.filter(c => c.category === 'EV' || c.category === 'Coupe' || c.category === 'Supercar');
    if (activeAgeTab === '30s') return cars.filter(c => c.category === 'Sedan' || c.category === 'EV');
    if (activeAgeTab === '40s') return cars.filter(c => c.category === 'SUV' || c.category === 'Sedan');
    return cars.filter(c => c.category === 'SUV' || c.category === 'Truck');
  };

  const ageFilteredCars = getAgeFilteredCars();
  const featuredCar = cars.find(c => c.id === '7') || cars[0];
  const rankedCars = cars.slice(0, 5);

  return (
    <Screen background={colors.bg}>
      {/* Location Bar */}
      <View style={styles.topBar}>
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>LOCATION</Text>
          <View style={styles.locationValueRow}>
            <Text style={styles.locationText}>Kigali, Rwanda</Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable style={styles.mapBtn} onPress={() => navigation.navigate('MapView')}>
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

        {/* Hero Banner Carousel */}
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
                <View style={styles.slideOverlay} />
                <View style={styles.slideContent}>
                  <View style={styles.slideTagContainer}>
                    <Text style={styles.slideTagText}>{slide.tag}</Text>
                  </View>
                  <Text style={styles.slideTitle}>{slide.title}</Text>
                  <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
                </View>
              </ImageBackground>
            ))}
          </ScrollView>
          <View style={styles.carouselIndicator}>
            <Text style={styles.indicatorText}>{carouselIndex}/{BANNER_SLIDES.length}</Text>
          </View>
        </View>

        {/* Quick Access Grid */}
        <View style={styles.quickGridContainer}>
          {QUICK_GRID.map((item, idx) => (
            <Pressable key={idx} style={styles.quickGridItem} onPress={() => navigation.navigate('SearchResults')}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.quickGridLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Section 1: We Also Recommend — shows skeletons on first load */}
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
                    <CarCard car={item} onPress={() => navigation.navigate('VehicleDetail', { car: item })} />
                  </View>
                ))}
          </View>
        </View>

        {/* Section 2: Popular by Age Group */}
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
                <CarCard car={item} onPress={() => navigation.navigate('VehicleDetail', { car: item })} />
              </View>
            )}
          />
        </View>

        {/* Section 3: Editor's Choice */}
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
              <Text style={styles.featuredMeta}>Fully inspected — year, mileage, and options verified in pristine condition.</Text>
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

        {/* Section 4: Top Trending */}
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

        {/* Corporate Footer */}
        <View style={styles.footerContainer}>
          <View style={styles.footerLinksRow}>
            <Pressable onPress={() => {}}><Text style={styles.footerLinkText}>Log In</Text></Pressable>
            <Text style={styles.footerDivider}>|</Text>
            <Pressable onPress={() => {}}><Text style={styles.footerLinkText}>Inzozi Branches</Text></Pressable>
            <Text style={styles.footerDivider}>|</Text>
            <Pressable onPress={() => {}}><Text style={styles.footerLinkText}>Clean Inzozi</Text></Pressable>
            <Text style={styles.footerDivider}>|</Text>
            <Pressable onPress={() => {}}><Text style={styles.footerLinkText}>PC Version</Text></Pressable>
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
                <Pressable onPress={() => {}}><Text style={styles.companyLinkText}>Business Info</Text></Pressable>
                <Text style={styles.companyDivider}>·</Text>
                <Pressable onPress={() => {}}><Text style={[styles.companyLinkText, { fontFamily: fonts.bold }]}>Privacy Policy</Text></Pressable>
                <Text style={styles.companyDivider}>·</Text>
                <Pressable onPress={() => {}}><Text style={styles.companyLinkText}>Terms of Use</Text></Pressable>
              </View>
              <View style={styles.companyDetails}>
                <Text style={styles.detailText}>Address: 16-19th Floor, Kigali City Tower, Kigali, Rwanda</Text>
                <Text style={styles.detailText}>CEO: Inzozi Motors Ltd | RRA Reg No: 104-86-54476</Text>
                <Text style={styles.detailText}>Support: info@inzozimotors.rw | +250 788 000 000</Text>
              </View>
            </View>
          )}

          <Text style={styles.copyrightText}>
            © 2026 Inzozi Motors. All rights reserved.
          </Text>
        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 54,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  locationContainer: { justifyContent: 'center' },
  locationLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: '#FF3B30',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  locationValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 14, fontFamily: fonts.extraBold, color: '#1A1A1A' },
  mapBtn: {
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
  searchWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  carouselContainer: { height: 160, position: 'relative' },
  carouselSlide: { width: SCREEN_WIDTH, height: 160, position: 'relative' },
  slideOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  slideContent: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', zIndex: 2 },
  slideTagContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 3, marginBottom: 8,
  },
  slideTagText: { color: '#FFFFFF', fontSize: 10, fontFamily: fonts.bold },
  slideTitle: { color: '#FFFFFF', fontSize: 18, fontFamily: fonts.extraBold, marginBottom: 4 },
  slideSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: fonts.regular },
  carouselIndicator: {
    position: 'absolute', bottom: 12, right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  indicatorText: { color: '#FFFFFF', fontSize: 10, fontFamily: fonts.bold },
  quickGridContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E8ECEF',
  },
  quickGridItem: { width: '33.3%', alignItems: 'center', paddingVertical: 10 },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  quickGridLabel: { fontSize: 12, fontFamily: fonts.bold, color: '#1A1A1A' },
  sectionContainer: { marginTop: 12, backgroundColor: '#FFFFFF', paddingVertical: 12 },
  twoColumnGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  gridCardWrapper: { width: '50%' },
  ageTabsRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    gap: 8, marginBottom: 12, marginTop: 4,
  },
  ageTab: {
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 14, backgroundColor: '#F5F5F5',
  },
  ageTabActive: { backgroundColor: colors.primary },
  ageTabText: { fontSize: 12, fontFamily: fonts.bold, color: '#666666' },
  ageTabTextActive: { color: '#FFFFFF' },
  horizontalListPadding: { paddingHorizontal: 8 },
  horizontalCardWrapper: { width: 140 },
  featuredCardContainer: {
    marginHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8ECEF',
    ...shadows.card,
  },
  featuredImageWrap: { height: 180, position: 'relative' },
  featuredImage: { width: '100%', height: '100%' },
  featuredBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
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
  footerContainer: {
    backgroundColor: '#F5F5F4',
    paddingVertical: 20, paddingHorizontal: 20,
    borderTopWidth: 1, borderTopColor: '#E5E5E5',
    marginTop: 20,
  },
  footerLinksRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-start', marginBottom: 16,
    flexWrap: 'wrap', gap: 8,
  },
  footerLinkText: { fontSize: 12, fontFamily: fonts.bold, color: '#404040' },
  footerDivider: { fontSize: 12, color: '#CCCCCC' },
  accordionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#E5E5E5',
    borderBottomWidth: 1, borderBottomColor: '#E5E5E5',
    marginBottom: 12,
  },
  accordionTitle: { fontSize: 11, fontFamily: fonts.bold, color: '#666666' },
  collapsibleContent: { paddingVertical: 4, gap: 12 },
  companyLinksRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    alignItems: 'center', gap: 6,
  },
  companyLinkText: { fontSize: 11, fontFamily: fonts.regular, color: '#737373' },
  companyDivider: { fontSize: 11, color: '#DDDDDD' },
  companyDetails: { gap: 4 },
  detailText: { fontSize: 10, fontFamily: fonts.regular, color: '#999999', lineHeight: 14 },
  copyrightText: { fontSize: 10, fontFamily: fonts.medium, color: '#999999', marginTop: 12 },
});
