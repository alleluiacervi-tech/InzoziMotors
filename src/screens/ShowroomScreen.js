import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, Platform, Linking } from 'react-native';
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
import { WEEK, DAY_KEYS, kigaliClock, openStatus, openStatusText } from '../utils/showroomHours';

// How quickly the showroom replies, measured by the server (null until it can say).
const REPLY_KEYS = {
  within_hour: 'browse.replyWithinHour',
  within_hours: 'browse.replyWithinHours',
  within_day: 'browse.replyWithinDay',
};

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
  // The week's hours stay folded away: the status line answers the question.
  const [showHours, setShowHours] = useState(false);
  // Re-read the clock every minute so "Open now" turns into "Closed now" on time.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  // Only a photo of the showroom itself. A car photo here made the storefront
  // look like a listing; without one the header is a quiet band.
  const cover = profile?.cover_url || null;
  const avgScore = useMemo(() => {
    const scores = (cars || []).map((c) => Number(c.inspectionScore)).filter((s) => Number.isFinite(s) && s > 0);
    return scores.length ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : null;
  }, [cars]);
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

  // Opening hours, read in Kigali time whatever zone the phone is in.
  const hours = profile.hours || null;
  const status = openStatus(hours, new Date(clock));
  const statusText = openStatusText(status, t);
  const today = kigaliClock(new Date(clock)).day;
  const TONE_DOT = { open: colors.green, soon: colors.amber, closed: colors.textMuted };
  const openMaps = () => {
    const query = encodeURIComponent(`${profile.address}, Rwanda`);
    const url = Platform.OS === 'ios'
      ? `https://maps.apple.com/?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() => {});
  };

  const header = (
    <View>
      <View style={[styles.cover, !cover && styles.coverPlain]}>
        {cover ? (
          <>
            <Photo uri={cover} width={PHOTO.WIDE} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <LinearGradient colors={['rgba(12,10,10,0.35)', 'rgba(12,10,10,0.1)', 'rgba(12,10,10,0.45)']} style={StyleSheet.absoluteFill} />
          </>
        ) : null}
      </View>

      <View style={styles.identity}>
        {/* The logo fitted inside a white square: cropping it into a circle
            cut a word-mark logo down to a few letters. */}
        <View style={[styles.avatar, !profile.avatar_url && styles.avatarEmpty]}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} resizeMode="contain" accessibilityIgnoresInvertColors />
          ) : (
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <Text style={styles.name} accessibilityRole="header">{name}</Text>

        {/* Can I go now, and if not, when. The week is one tap away. */}
        {statusText ? (
          <Pressable
            style={styles.statusRow}
            onPress={() => setShowHours((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showHours }}
            accessibilityHint={t('browse.seeAllHours')}
          >
            <View style={[styles.statusDot, { backgroundColor: TONE_DOT[status.tone] }]} />
            <Text style={styles.statusText}>{statusText}</Text>
            <Text style={styles.statusLink}>{t('browse.seeAllHours')}</Text>
            <Ionicons name={showHours ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
          </Pressable>
        ) : null}
        {hours && showHours ? (
          <View style={styles.hoursList}>
            {WEEK.map((day) => {
              const slot = hours[day];
              const isToday = today === day;
              return (
                <View key={day} style={styles.hoursRow}>
                  <Text style={[styles.hoursDay, isToday && styles.hoursToday]}>
                    {t(DAY_KEYS[day])}{isToday ? ` · ${t('browse.todayLabel')}` : ''}
                  </Text>
                  <Text style={[styles.hoursTime, isToday && styles.hoursToday]}>
                    {slot ? `${slot.open} – ${slot.close}` : t('browse.closedDay')}
                  </Text>
                </View>
              );
            })}
            <Text style={styles.hoursNote}>{t('browse.kigaliTime')}</Text>
          </View>
        ) : null}
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
          {REPLY_KEYS[profile.reply_time] ? (
            <View style={styles.metaItem}>
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>{t('browse.statReplies')}: {t(REPLY_KEYS[profile.reply_time])}</Text>
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
          {avgScore ? (
            <>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{avgScore}<Text style={styles.statOf}>/150</Text></Text>
                <Text style={styles.statLabel}>{t('browse.statAvgInspection')}</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      {/* Sawa Cars is not a party to any deal; its own stock is sold by this
          separate company, and the storefront says so before anything else. */}
      {profile.sawa_affiliated ? (
        <View style={[styles.infoCard, styles.affiliateCard]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <View style={styles.addressBody}>
            <Text style={styles.affiliateTitle}>{t('browse.sawaAffiliated')}</Text>
            <Text style={styles.aboutText}>{t('browse.sawaAffiliatedBody', { name })}</Text>
          </View>
        </View>
      ) : null}

      {profile.about ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('browse.aboutShowroom')}</Text>
          <Text style={styles.aboutText}>{profile.about}</Text>
        </View>
      ) : null}

      {profile.address ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('browse.visitShowroomTitle')}</Text>
          <Pressable
            style={styles.addressRow}
            onPress={openMaps}
            accessibilityRole="link"
            accessibilityLabel={`${profile.address}. ${t('browse.openInMaps')}`}
          >
            <Ionicons name="location-outline" size={17} color={colors.textMuted} />
            <View style={styles.addressBody}>
              <Text style={styles.addressText}>{profile.address}</Text>
              <Text style={styles.mapsLink}>{t('browse.openInMaps')}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

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
                    <Ionicons name="apps-outline" size={16} color={on ? colors.textPrimary : colors.textSecondary} />
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
  coverPlain: { height: 112, backgroundColor: colors.surfaceAlt },
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
    width: 76, height: 76, borderRadius: 18,
    marginTop: -38, padding: 4,
    borderWidth: 1, borderColor: colors.borderSoft,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarEmpty: { backgroundColor: '#FFFFFF' },
  avatarText: { fontSize: 28, fontFamily: fonts.extraBold, color: '#14110F' },
  statusRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, minHeight: 32 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  statusLink: { marginLeft: 4, fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary, textDecorationLine: 'underline' },
  hoursList: { marginTop: 8, marginBottom: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSoft },
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
  statOf: { fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted },
  infoCard: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  infoTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 8 },
  affiliateCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  affiliateTitle: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 3 },
  aboutText: { fontSize: 13.5, lineHeight: 20, fontFamily: fonts.regular, color: colors.textSecondary },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 44 },
  addressBody: { flex: 1 },
  addressText: { fontSize: 13.5, lineHeight: 19, fontFamily: fonts.semiBold, color: colors.textPrimary },
  mapsLink: { marginTop: 2, fontSize: 12.5, fontFamily: fonts.bold, color: colors.primary },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  hoursDay: { fontSize: 13, fontFamily: fonts.medium, color: colors.textSecondary },
  hoursTime: { fontSize: 13, fontFamily: fonts.medium, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  hoursToday: { fontFamily: fonts.bold, color: colors.textPrimary },
  hoursNote: { marginTop: 6, fontSize: 11, color: colors.textMuted },
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
  brandChipOn: { borderColor: colors.textPrimary, backgroundColor: colors.surface },
  brandChipText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary, maxWidth: 120 },
  brandChipTextOn: { color: colors.textPrimary },
  brandChipCount: { fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted },
  gridRow: { paddingHorizontal: 8 },
  gridCell: { width: '50%' },
  empty: { paddingHorizontal: 16, paddingVertical: 24, fontSize: 13.5, color: colors.textMuted, textAlign: 'center' },
  note: { paddingHorizontal: 20, paddingTop: 16, fontSize: 12, lineHeight: 17, color: colors.textMuted, textAlign: 'center' },
});
