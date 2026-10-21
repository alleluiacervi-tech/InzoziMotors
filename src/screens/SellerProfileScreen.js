import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import CarCard from '../components/CarCard';
import { LoadingState, ErrorState } from '../components/StateViews';
import { colors, radius, shadows, fonts } from '../theme';
import carsApi from '../api/cars';
import { useApp } from '../context/AppContext';

// ─────────────────────────────────────────────────────────────────────────────
// A private seller's public profile: who they are (identity verified by Sawa),
// how long they have been here, how quickly they reply, and the cars they have
// for sale. Mirrors web /sellers/[id].
//
// Only true facts. This screen used to show a trust score out of 100 with a
// letter grade, completed sales, a star rating and reviews. Sales and reviews
// came from the retired deal flow and could never move, so every verified
// seller sat at "50/100, grade D, 0 sales": unfair to them and meaningless to
// buyers. "Replies" is measured by the server from real conversations and is
// shown only once there is enough to measure.
//
// There is no contact button here on purpose: a buyer contacts a seller about
// a car, from that car's page, behind the direct-deal notice. (The old button
// opened an empty chat that was not attached to any conversation.)
//
// A showroom has its own storefront; opened with a showroom's id, this hands
// over to it, just as ShowroomScreen hands an individual's id over to here.
// ─────────────────────────────────────────────────────────────────────────────

const REPLY_KEYS = {
  within_hour: 'browse.replyWithinHour',
  within_hours: 'browse.replyWithinHours',
  within_day: 'browse.replyWithinDay',
};

export default function SellerProfileScreen({ navigation, route }) {
  const sellerName = route.params?.sellerName || '';
  const sellerId = route.params?.sellerId || route.params?.userId || null;
  const { mapCar, t } = useApp();
  const [profile, setProfile] = useState(null);
  const [cars, setCars] = useState(null);
  const [state, setState] = useState(sellerId ? 'loading' : 'gone'); // loading | ready | gone | error
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!sellerId) return undefined;
    let alive = true;
    setState('loading');
    Promise.all([
      // GET /sellers/:id answers only for a seller whose listings are public;
      // a 404 means this profile isn't public.
      carsApi.getSellerProfile(sellerId).catch((err) => (err?.status === 404 || err?.status === 400 ? 'gone' : null)),
      carsApi.getSellerListings(sellerId).catch(() => null),
    ]).then(([pub, rows]) => {
      if (!alive) return;
      if (pub === 'gone') { setState('gone'); return; }
      if (!pub) { setState('error'); return; }
      if (pub.is_showroom) {
        navigation.replace('Showroom', { sellerId, name: pub.name });
        return;
      }
      setProfile(pub);
      setCars(Array.isArray(rows) ? rows.map(mapCar) : []);
      setState('ready');
    });
    return () => { alive = false; };
  }, [sellerId, attempt, mapCar, navigation]);

  const avgScore = useMemo(() => {
    const scores = (cars || []).map((c) => Number(c.inspectionScore)).filter((s) => Number.isFinite(s) && s > 0);
    return scores.length ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : null;
  }, [cars]);

  if (state !== 'ready') {
    return (
      <Screen background={colors.bg}>
        <BackHeader title={t('sellerProfile.title')} onBack={() => navigation.goBack()} />
        {state === 'loading' ? (
          <LoadingState label={t('sellerProfile.loading')} />
        ) : (
          <ErrorState
            icon="person-circle-outline"
            title={t('sellerProfile.notAvailable')}
            sub={t('sellerProfile.notAvailableSub')}
            actionLabel={state === 'error' ? t('common.retry') : undefined}
            onAction={state === 'error' ? () => setAttempt((n) => n + 1) : undefined}
          />
        )}
      </Screen>
    );
  }

  const name = (profile.name || sellerName || t('sellerProfile.sellerFallback')).trim();
  const memberSince = profile.member_since
    ? new Date(profile.member_since).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : null;
  const replyKey = REPLY_KEYS[profile.reply_time];

  const header = (
    <View>
      <View style={styles.hero}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase() || '?'}</Text>
          </View>
        )}
        <View style={styles.heroBody}>
          <Text style={styles.name} accessibilityRole="header">{name}</Text>
          <Text style={styles.meta}>
            {t('sellerProfile.privateSeller')}
            {memberSince ? ` · ${t('sellerProfile.memberSince', { date: memberSince })}` : ''}
          </Text>
          <View style={styles.verified}>
            <Ionicons name="shield-checkmark" size={13} color={colors.greenText} />
            <Text style={styles.verifiedText}>{t('sellerProfile.identityVerified')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{cars.length}</Text>
          <Text style={styles.statLabel}>{t('sellerProfile.carsForSale')}</Text>
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
        {replyKey ? (
          <>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValueSmall} numberOfLines={2}>{t(replyKey)}</Text>
              <Text style={styles.statLabel}>{t('browse.statReplies')}</Text>
            </View>
          </>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>{t('sellerProfile.carsForSale')}</Text>
    </View>
  );

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('sellerProfile.title')} onBack={() => navigation.goBack()} />
      <FlatList
        data={cars}
        numColumns={2}
        keyExtractor={(c) => String(c.id)}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <View style={styles.gridCell}>
            <CarCard car={item} onPress={() => navigation.navigate('VehicleDetail', { car: item })} />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('sellerProfile.noCars')}</Text>}
        ListFooterComponent={<Text style={styles.note}>{t('sellerProfile.contactNote')}</Text>}
        initialNumToRender={6}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32 },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginTop: 8, padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSoft,
    ...shadows.card,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navyMid },
  avatarText: { fontSize: 24, fontFamily: fonts.extraBold, color: '#fff' },
  heroBody: { flex: 1, minWidth: 0 },
  name: { fontSize: 19, lineHeight: 24, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.3 },
  meta: { marginTop: 3, fontSize: 12.5, fontFamily: fonts.medium, color: colors.textSecondary },
  verified: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    marginTop: 8, paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: colors.greenTint, borderRadius: radius.pill,
  },
  verifiedText: { fontSize: 11.5, fontFamily: fonts.bold, color: colors.greenText },
  stats: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSoft,
  },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  statValue: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  statValueSmall: { fontSize: 13, lineHeight: 17, fontFamily: fonts.extraBold, color: colors.textPrimary, textAlign: 'center' },
  statOf: { fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted },
  statLabel: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: colors.borderSoft },
  sectionTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 20, marginBottom: 10, paddingHorizontal: 16 },
  gridRow: { paddingHorizontal: 8 },
  gridCell: { width: '50%' },
  empty: { paddingHorizontal: 16, paddingVertical: 24, fontSize: 13.5, color: colors.textMuted, textAlign: 'center' },
  note: { paddingHorizontal: 20, paddingTop: 16, fontSize: 12, lineHeight: 17, color: colors.textMuted, textAlign: 'center' },
});
