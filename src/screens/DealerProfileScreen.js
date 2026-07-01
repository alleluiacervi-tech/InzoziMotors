import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, fonts } from '../theme';
import { formatPrice, formatMiles } from '../data/cars';

const DEALERS = {
  'Carvana': {
    name: 'Carvana Rwanda',
    tagline: 'Premium certified vehicles · Kigali',
    description: 'Carvana Rwanda is an authorized dealer and one of Inzozi Motors\' founding partners. Specializing in Japanese imports and certified EVs with a 30-day return guarantee.',
    since: '2023',
    responseTime: '< 1 hour',
    rating: 4.8,
    reviews: 47,
    totalSales: 83,
    categories: ['SUV', 'EV', 'Sedan'],
    location: 'Nyarutarama, Kigali',
    phone: '+250 788 123 456',
    initials: 'CR',
  },
  'Bay Auto Group': {
    name: 'Bay Auto Group',
    tagline: 'Trusted dealer since 2019 · Remera',
    description: 'Bay Auto Group has been serving Kigali\'s growing auto market for over 5 years. Specializing in performance vehicles and luxury sedans sourced directly from Japan and Europe.',
    since: '2019',
    responseTime: '< 3 hours',
    rating: 4.6,
    reviews: 31,
    totalSales: 142,
    categories: ['Sedan', 'Coupe', 'SUV'],
    location: 'Remera, Kigali',
    phone: '+250 788 654 321',
    initials: 'BA',
  },
};

const DEFAULT_DEALER = {
  name: 'Inzozi Partner Dealer',
  tagline: 'Verified dealer · Kigali',
  description: 'A trusted Inzozi Motors partner dealer.',
  since: '2024',
  responseTime: '< 4 hours',
  rating: 4.5,
  reviews: 12,
  totalSales: 25,
  categories: ['SUV', 'Sedan'],
  location: 'Kigali, Rwanda',
  phone: '+250 788 000 000',
  initials: 'ID',
};

function ListingCard({ car, onPress }) {
  return (
    <Pressable style={styles.listingCard} onPress={onPress}>
      <Image source={{ uri: car.image }} style={styles.listingThumb} resizeMode="cover" />
      {car.inspected && (
        <View style={styles.listingCert}>
          <Ionicons name="shield-checkmark" size={10} color={colors.green} />
        </View>
      )}
      <View style={styles.listingBody}>
        <Text style={styles.listingTitle} numberOfLines={2}>{car.title}</Text>
        <Text style={styles.listingMeta}>{formatMiles(car.mileage)} · {car.year}</Text>
        <Text style={styles.listingPrice}>{formatPrice(car.type === 'auction' ? car.currentBid : car.price)}</Text>
      </View>
    </Pressable>
  );
}

export default function DealerProfileScreen({ navigation, route }) {
  const dealerName = route.params?.dealerName || 'Carvana';
  const dealer = DEALERS[dealerName] || DEFAULT_DEALER;
  const { cars } = useApp();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('All');

  const dealerCars = cars.filter((c) => c.seller === dealerName);
  const filteredCars = activeCategory === 'All' ? dealerCars : dealerCars.filter((c) => c.category === activeCategory);
  const categories = ['All', ...dealer.categories];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero */}
        <LinearGradient colors={[colors.navyDeep, colors.navyMid, colors.primary]} style={styles.hero}>
          <View style={[styles.backBtn, { top: insets.top + 8 }]}>
            <Pressable style={styles.backCircle} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color={colors.slate700} />
            </Pressable>
          </View>
          <View style={styles.heroBadges}>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={12} color={colors.greenLight} />
              <Text style={styles.verifiedText}>Verified Dealer</Text>
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Ionicons name="star" size={12} color={colors.amber} />
              <Text style={styles.verifiedText}>Inzozi Partner</Text>
            </View>
          </View>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroInitials}>{dealer.initials}</Text>
          </View>
          <Text style={styles.heroName}>{dealer.name}</Text>
          <Text style={styles.heroTagline}>{dealer.tagline}</Text>
          <View style={styles.heroStats}>
            {[
              { label: 'Sales', value: dealer.totalSales },
              { label: 'Rating', value: `⭐ ${dealer.rating}` },
              { label: 'Reviews', value: dealer.reviews },
              { label: 'Since', value: dealer.since },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.heroDivider} />}
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{s.value}</Text>
                  <Text style={styles.heroStatLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </LinearGradient>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoDesc}>{dealer.description}</Text>
          <View style={styles.infoRows}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={15} color={colors.textMuted} />
              <Text style={styles.infoText}>{dealer.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={15} color={colors.textMuted} />
              <Text style={styles.infoText}>Responds {dealer.responseTime}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={15} color={colors.textMuted} />
              <Text style={styles.infoText}>{dealer.phone}</Text>
            </View>
          </View>
        </View>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {categories.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.filterText, activeCategory === cat && styles.filterTextActive]}>
                {cat} {cat === 'All' ? `(${dealerCars.length})` : ''}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Listings */}
        <View style={styles.listingsSection}>
          <Text style={styles.sectionTitle}>
            {filteredCars.length} listing{filteredCars.length !== 1 ? 's' : ''}
          </Text>
          {filteredCars.length > 0 ? (
            <FlatList
              data={filteredCars}
              numColumns={2}
              scrollEnabled={false}
              keyExtractor={(c) => c.id}
              columnWrapperStyle={{ gap: 10 }}
              contentContainerStyle={{ gap: 10 }}
              renderItem={({ item }) => (
                <ListingCard
                  car={item}
                  onPress={() => navigation.navigate('VehicleDetail', { car: item })}
                />
              )}
            />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No {activeCategory !== 'All' ? activeCategory : ''} listings right now</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky contact */}
      <View style={[styles.stickyContact, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.contactBtn} onPress={() => navigation.navigate('Chat', { name: dealer.name })}>
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.contactBtnText}>Message {dealer.name.split(' ')[0]}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 80, paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center', gap: 6 },
  backBtn: { position: 'absolute', left: 16 },
  backCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
  },
  heroBadges: { flexDirection: 'row', gap: 8 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  verifiedText: { fontSize: 11, fontFamily: fonts.bold, color: '#fff' },
  heroAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    marginTop: 8,
  },
  heroInitials: { fontSize: 26, fontFamily: fonts.black, color: '#fff' },
  heroName: { fontSize: 22, fontFamily: fonts.black, color: '#fff', letterSpacing: -0.5, textAlign: 'center' },
  heroTagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: radius.xl, padding: 14, alignSelf: 'stretch' },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 16, fontFamily: fonts.extraBold, color: '#fff' },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },
  infoCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, margin: 16, ...shadows.card,
  },
  infoDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  infoRows: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: colors.textPrimary, fontFamily: fonts.semiBold },
  filterRow: { paddingHorizontal: 16, paddingVertical: 4, gap: 8, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, fontFamily: fonts.bold, color: colors.textSecondary },
  filterTextActive: { color: '#fff' },
  listingsSection: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 12 },
  listingCard: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, overflow: 'hidden', ...shadows.card, position: 'relative',
  },
  listingThumb: { width: '100%', height: 100, backgroundColor: colors.border },
  listingCert: {
    position: 'absolute', top: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center',
  },
  listingBody: { padding: 10, gap: 3 },
  listingTitle: { fontSize: 11, fontFamily: fonts.bold, color: colors.textPrimary, lineHeight: 15 },
  listingMeta: { fontSize: 10, color: colors.textMuted },
  listingPrice: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.primary },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 13, color: colors.textMuted },
  stickyContact: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft,
    ...shadows.floating,
  },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.xl, paddingVertical: 16,
  },
  contactBtnText: { color: '#fff', fontSize: 15, fontFamily: fonts.extraBold },
});
