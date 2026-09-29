import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import CarCard from '../components/CarCard';
import BrandMark from '../components/BrandMark';
import Photo from '../components/Photo';
import { LoadingState, ErrorState } from '../components/StateViews';
import { colors, radius, fonts, shadows } from '../theme';
import { PHOTO } from '../utils/photo';
import carsApi from '../api/cars';
import { useApp } from '../context/AppContext';

// ─────────────────────────────────────────────────────────────────────────────
// A showroom's storefront.
//
// A showroom is a verified business that sells whatever it stocks — Toyota,
// Hyundai and Mercedes side by side — so its brands are not a label somebody
// chose: they are read off its live cars, with a count each, and double as the
// filter. Everything here comes from endpoints that already decide what is
// public: GET /sellers/:id answers only for an eligible seller (404 otherwise),
// and the cars are the catalogue query narrowed to this seller. No contact
// detail is shown; a buyer asks about a car from that car's page, behind the
// direct-deal notice.
//
// Opened with an individual seller's id (a shared /sellers/<id> link), it hands
// over to the person's profile instead.
// ─────────────────────────────────────────────────────────────────────────────

export default function ShowroomScreen({ navigation, route }) {
  const { sellerId, name: passedName } = route.params || {};
  const { mapCar, brandLogo, t } = useApp();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [cars, setCars] = useState(null);
  const [state, setState] = useState(sellerId ? 'loading' : 'gone'); // loading | ready | gone | error
  const [brand, setBrand] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!sellerId) return undefined;
    let alive = true;
    setState('loading');
    Promise.all([
      carsApi.getSellerProfile(sellerId).catch((err) => (err?.status === 404 || err?.status === 400 ? 'gone' : null)),
      carsApi.getSellerListings(sellerId).catch(() => null),
    ]).then(([pub, rows]) => {
      if (!alive) return;
      if (pub === 'gone') { setState('gone'); return; }
      if (!pub) { setState('error'); return; }
      if (!pub.is_showroom) {
        navigation.replace('SellerProfile', { sellerId, sellerName: pub.name });
        return;
      }
      setProfile(pub);
      setCars(Array.isArray(rows) ? rows.map(mapCar) : []);
      setState('ready');
    });
    return () => { alive = false; };
  }, [sellerId, attempt, mapCar, navigation]);

  const name = (profile?.business_name || '').trim() || profile?.name || passedName || t('home.showrooms');

  const brands = useMemo(() => Object.values(
    (cars || []).reduce((acc, c) => {
      const key = String(c.make || '').toLowerCase();
      if (!key) return acc;
      (acc[key] = acc[key] || { make: c.make, count: 0 }).count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count || a.make.localeCompare(b.make)), [cars]);

  const shown = useMemo(
    () => (brand ? (cars || []).filter((c) => String(c.make).toLowerCase() === brand.toLowerCase()) : (cars || [])),
    [cars, brand]
  );

  const cover = cars?.find((c) => c.image)?.image || null;
  const memberSince = profile?.member_since
    ? new Date(profile.member_since).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : null;
  const location = useMemo(() => {
    const counts = {};
    (cars || []).forEach((c) => { if (c.location) counts[c.location] = (counts[c.location] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [cars]);

  const backButton = (
    <Pressable
      style={[styles.backBtn, { top: insets.top + 8 }]}
      onPress={() => navigation.goBack()}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
    >
      <Ionicons name="chevron-back" size={20} color={colors.slate700} />
    </Pressable>
  );

  if (state !== 'ready') {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 64 }]}>
        <StatusBar style="dark" />
        {backButton}
        {state === 'loading' ? (
          <LoadingState label={t('browse.loadingShowroom')} />
        ) : (
          <ErrorState
            icon="storefront-outline"
            title={t('browse.showroomUnavailable')}
            sub={state === 'gone' ? t('browse.showroomUnavailableSub') : t('browse.showroomErrorSub')}
            actionLabel={state === 'error' ? t('common.retry') : undefined}
            onAction={state === 'error' ? () => setAttempt((n) => n + 1) : undefined}
          />
        )}
      </View>
    );
  }

  const header = (
    <View>
      <View style={styles.cover}>
        {cover ? <Photo uri={cover} width={PHOTO.WIDE} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <LinearGradient colors={['rgba(12,10,10,0.35)', 'rgba(12,10,10,0.1)', 'rgba(12,10,10,0.55)']} style={StyleSheet.absoluteFill} />
      </View>

      <View style={styles.identity}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name} accessibilityRole="header">{name}</Text>
        <View style={styles.badgeRow}>
          {profile.business_verified ? (
            <View style={styles.verified}>
              <Ionicons name="shield-checkmark" size={13} color={colors.greenText} />
              <Text style={styles.verifiedText}>{t('browse.verifiedBusiness')}</Text>
            </View>
          ) : null}
          {location ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
            </View>
          ) : null}
          {memberSince ? (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>{t('browse.memberSince', { date: memberSince })}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{cars.length}</Text>
            <Text style={styles.statLabel}>{t('browse.statCars')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{brands.length}</Text>
            <Text style={styles.statLabel}>{t('browse.statBrands')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{cars.filter((c) => c.inspected).length}</Text>
            <Text style={styles.statLabel}>{t('browse.statInspected')}</Text>
          </View>
        </View>
      </View>

      {brands.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{t('browse.brandsHere')}</Text>
          <FlatList
            horizontal
            data={[{ make: null, count: cars.length }, ...brands]}
            keyExtractor={(b) => b.make || '__all'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.brandRow}
            renderItem={({ item }) => {
              const on = (item.make || null) === brand;
              return (
                <Pressable
                  style={[styles.brandChip, on && styles.brandChipOn]}
                  onPress={() => setBrand(item.make)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${item.make || t('browse.allBrandsChip')}, ${item.count}`}
                >
                  {item.make ? (
                    <BrandMark name={item.make} logoUrl={brandLogo(item.make)} size={24} />
                  ) : (
                    <Ionicons name="apps-outline" size={16} color={on ? colors.primary : colors.textSecondary} />
                  )}
                  <Text style={[styles.brandChipText, on && styles.brandChipTextOn]} numberOfLines={1}>
                    {item.make || t('browse.allBrandsChip')}
                  </Text>
                  <Text style={[styles.brandChipCount, on && styles.brandChipTextOn]}>{item.count}</Text>
                </Pressable>
              );
            }}
          />
        </>
      ) : null}

      <Text style={styles.sectionTitle}>
        {brand ? t('browse.brandCarsHere', { make: brand }) : t('browse.allCarsHere')}
      </Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <FlatList
        data={shown}
        numColumns={2}
        keyExtractor={(c) => String(c.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <View style={styles.gridCell}>
            <CarCard car={item} onPress={() => navigation.navigate('VehicleDetail', { car: item })} />
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{t('browse.showroomEmpty')}</Text>
        }
        ListFooterComponent={
          <Text style={styles.note}>{t('browse.showroomNote')}</Text>
        }
        initialNumToRender={6}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
      />
      {backButton}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  backBtn: {
    position: 'absolute', left: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.card,
  },
  cover: { height: 170, backgroundColor: '#1C1A1A' },
  identity: {
    marginTop: -40,
    marginHorizontal: 16,
    padding: 16,
    paddingTop: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.card,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    marginTop: -38,
    borderWidth: 3, borderColor: colors.surface,
    backgroundColor: colors.surface,
  },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navyMid },
  avatarText: { fontSize: 28, fontFamily: fonts.extraBold, color: '#fff' },
  name: { marginTop: 10, fontSize: 22, lineHeight: 28, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 8 },
  verified: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.greenTint,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill,
  },
  verifiedText: { fontSize: 11.5, fontFamily: fonts.bold, color: colors.greenText },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  metaText: { fontSize: 12, fontFamily: fonts.medium, color: colors.textSecondary },
  stats: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.borderSoft },
  sectionTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 20, marginBottom: 10, paddingHorizontal: 16 },
  brandRow: { gap: 8, paddingHorizontal: 16 },
  brandChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    height: 40, paddingLeft: 8, paddingRight: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  brandChipOn: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  brandChipText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary, maxWidth: 120 },
  brandChipTextOn: { color: colors.primary },
  brandChipCount: { fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted },
  gridRow: { paddingHorizontal: 8 },
  gridCell: { width: '50%' },
  empty: { paddingHorizontal: 16, paddingVertical: 24, fontSize: 13.5, color: colors.textMuted, textAlign: 'center' },
  note: { paddingHorizontal: 20, paddingTop: 16, fontSize: 12, lineHeight: 17, color: colors.textMuted, textAlign: 'center' },
});
