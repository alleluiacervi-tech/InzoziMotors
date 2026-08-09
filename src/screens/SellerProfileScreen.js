import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import StickyFooter from '../components/StickyFooter';
import { LoadingState, ErrorState } from '../components/StateViews';
import { colors, radius, shadows, fonts } from '../theme';
import { SELLER_PROFILES, DEFAULT_SELLER_PROFILE } from '../data/inspectionData';
import reviewsApi from '../api/reviews';
import { showToast, showActionSheet } from '../components/Feedback';

// Same vocabulary as the chat's report sheet — one reporting language app-wide.
const REPORT_REASONS = [
  { label: 'Scam or fraud', icon: 'warning-outline' },
  { label: 'Harassment or abuse', icon: 'sad-outline' },
  { label: 'Spam', icon: 'megaphone-outline' },
  { label: 'Something else', icon: 'chatbox-ellipses-outline' },
];
import { useApp } from '../context/AppContext';

function formatReviewDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const SCORE_COMPONENTS = [
  {
    key: 'idVerified',
    label: 'ID Verified',
    icon: 'id-card-outline',
    max: 30,
    color: colors.primary,
    bg: colors.greenTint,
    calcPts: (p) => p.idVerified ? 30 : 0,
    desc: (p) => p.idVerified ? 'National ID confirmed by Sawa Cars' : 'ID not yet verified',
  },
  {
    key: 'completedSales',
    label: 'Completed Sales',
    icon: 'bag-check-outline',
    max: 30,
    color: colors.primary,
    bg: colors.greenTint,
    calcPts: (p) => Math.min(p.completedSales, 30),
    desc: (p) => `${p.completedSales} successful sale${p.completedSales !== 1 ? 's' : ''} (1 pt each, max 30)`,
  },
  {
    key: 'responseRate',
    label: 'Response Rate',
    icon: 'chatbubble-outline',
    max: 20,
    color: colors.amberText,
    bg: colors.amberTint,
    calcPts: (p) => Math.round((p.responseRate / 100) * 20),
    desc: (p) => `${p.responseRate}% messages replied within 24h`,
  },
  {
    key: 'reviews',
    label: 'Buyer Reviews',
    icon: 'star-outline',
    max: 20,
    color: colors.amberText,
    bg: '#FFFBEB',
    calcPts: (p) => Math.round((p.avgRating / 5) * 20),
    desc: (p) => `${p.avgRating}★ avg from ${p.totalReviews} review${p.totalReviews !== 1 ? 's' : ''}`,
  },
];

function TrustScoreCircle({ score }) {
  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D';
  const color = score >= 80 ? colors.green : score >= 65 ? colors.primary : score >= 50 ? colors.amber : colors.statusRejected;
  return (
    <View style={styles.trustCircleWrap}>
      <View style={[styles.trustCircle, { borderColor: color }]}>
        <Text style={[styles.trustScore, { color }]}>{score}</Text>
        <Text style={styles.trustMax}>/100</Text>
      </View>
      <View style={[styles.gradeChip, { backgroundColor: color + '18', borderColor: color + '44' }]}>
        <Text style={[styles.gradeText, { color }]}>Grade {grade}</Text>
      </View>
    </View>
  );
}

function ScoreBar({ component, profile }) {
  const pts = component.calcPts(profile);
  const pct = pts / component.max;
  return (
    <View style={styles.scoreBarRow}>
      <View style={[styles.scoreBarIcon, { backgroundColor: component.bg }]}>
        <Ionicons name={component.icon} size={16} color={component.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.scoreBarTop}>
          <Text style={styles.scoreBarLabel}>{component.label}</Text>
          <Text style={[styles.scoreBarPts, { color: component.color }]}>{pts}<Text style={styles.scoreBarMax}>/{component.max}</Text></Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: component.color }]} />
        </View>
        <Text style={styles.scoreBarDesc}>{component.desc(profile)}</Text>
      </View>
    </View>
  );
}

function StarRating({ value, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= value ? 'star' : 'star-outline'}
          size={size}
          color={i <= value ? colors.amber : colors.textDisabled}
        />
      ))}
    </View>
  );
}

export default function SellerProfileScreen({ navigation, route }) {
  const sellerName = route.params?.sellerName || '';
  // Real seller id (UUID) when navigated from an API-backed listing; absent in demo mode
  const sellerId = route.params?.sellerId || route.params?.userId || null;
  const { demoMode } = useApp();

  // The canned SELLER_PROFILES / DEFAULT_SELLER_PROFILE fixtures exist for the
  // bundled demo catalogue in dev builds ONLY. A real seller's profile is built
  // entirely from the trust-score and reviews APIs — a fabricated "72/100,
  // review from Happy Buyer" default must never be presented as a real person.
  const demoProfile = demoMode
    ? (SELLER_PROFILES[sellerName] || { ...DEFAULT_SELLER_PROFILE, name: sellerName || 'Seller' })
    : null;

  const [apiProfile, setApiProfile] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!sellerId) return undefined;
    let cancelled = false;
    Promise.all([
      reviewsApi.getTrustScore(sellerId).catch(() => null),
      reviewsApi.getSellerReviews(sellerId).catch(() => null),
    ]).then(([trust, revData]) => {
      if (cancelled) return;
      if (!trust && !revData) { setFailed(true); return; }
      const b = trust?.breakdown || {};
      const reviews = Array.isArray(revData?.reviews)
        ? revData.reviews.map((r) => ({
            id: r.id,
            buyer: r.reviewer_name || 'Buyer',
            rating: r.rating,
            text: r.comment || (r.car_title ? `Purchased: ${r.car_title}` : ''),
            date: formatReviewDate(r.created_at),
          }))
        : [];
      const avg = revData?.average_rating != null
        ? Number(revData.average_rating)
        : Number(b.reviews?.avg || 0);
      setApiProfile({
        name: sellerName || 'Seller',
        initials: (sellerName || 'S').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
        memberSince: null, // not exposed by the API yet — hidden, not invented
        location: null,
        bio: null,
        idVerified: (b.id_verified?.points || 0) > 0,
        completedSales: b.completed_sales?.count ?? 0,
        responseRate: b.response_rate?.rate ?? 0,
        avgRating: Number.isFinite(avg) ? avg : 0,
        totalReviews: revData?.total != null ? Number(revData.total) : Number(b.reviews?.count || 0),
        activeListings: [],
        reviews,
      });
    });
    return () => { cancelled = true; };
  }, [sellerId, sellerName]);

  const profile = apiProfile || demoProfile;

  if (!profile) {
    const loading = Boolean(sellerId) && !failed;
    return (
      <Screen background={colors.bg}>
        <BackHeader title="Seller Profile" onBack={() => navigation.goBack()} />
        {loading ? (
          <LoadingState label="Loading seller profile…" />
        ) : (
          <ErrorState
            icon="person-circle-outline"
            title="Profile not available"
            sub="We couldn't load this seller's profile. Check your connection and try again."
          />
        )}
      </Screen>
    );
  }

  const totalScore = SCORE_COMPONENTS.reduce((s, c) => s + c.calcPts(profile), 0);

  const handleContact = () => {
    navigation.navigate('Chat', { name: profile.name });
  };

  const handleReportReview = async (review) => {
    const reasonIdx = await showActionSheet({
      title: 'Report this review',
      message: 'Our team reviews every report. The author is not told.',
      options: REPORT_REASONS,
    });
    if (reasonIdx === -1) return;
    try {
      await reviewsApi.reportReview(review.id, REPORT_REASONS[reasonIdx].label);
      showToast('Thanks — our team will take a look.', 'success');
    } catch (err) {
      showToast(err?.message || "The report didn't send. Check your connection and try again.", 'error');
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Seller Profile" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <LinearGradient colors={[colors.navyMid, colors.navyDeep]} style={styles.hero}>
          <View style={styles.heroContent}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{profile.name}</Text>
              {profile.location ? (
                <View style={styles.heroMeta}>
                  <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.heroMetaText}>{profile.location}</Text>
                </View>
              ) : null}
              {profile.memberSince ? (
                <View style={styles.heroMeta}>
                  <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.heroMetaText}>Member since {profile.memberSince}</Text>
                </View>
              ) : null}
              <View style={styles.heroBadges}>
                {profile.idVerified && (
                  <View style={styles.heroBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.greenLight} />
                    <Text style={styles.heroBadgeText}>Verified Seller</Text>
                  </View>
                )}
              </View>
            </View>
            <TrustScoreCircle score={totalScore} />
          </View>
          {profile.bio ? (
            <Text style={styles.heroBio}>{profile.bio}</Text>
          ) : null}
        </LinearGradient>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Sales', value: String(profile.completedSales), icon: 'bag-check-outline', color: colors.primary },
            { label: 'Response', value: `${profile.responseRate}%`, icon: 'chatbubble-outline', color: colors.primary },
            { label: 'Rating', value: `${profile.avgRating}★`, icon: 'star', color: colors.amberText },
            { label: 'Reviews', value: String(profile.totalReviews), icon: 'people-outline', color: colors.amberText },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={18} color={s.color} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Trust Score breakdown */}
        <View style={styles.trustCard}>
          <Text style={styles.cardTitle}>Trust Score Breakdown</Text>
          <Text style={styles.cardSub}>How the {totalScore}/100 score is calculated</Text>
          <View style={styles.scoreComponents}>
            {SCORE_COMPONENTS.map((comp) => (
              <ScoreBar key={comp.key} component={comp} profile={profile} />
            ))}
          </View>
        </View>

        {/* Active listings */}
        {profile.activeListings && profile.activeListings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Listings ({profile.activeListings.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
              <View style={{ flexDirection: 'row', gap: 12, paddingRight: 16 }}>
                {profile.activeListings.map((listing) => (
                  <Pressable
                    key={listing.id}
                    style={styles.listingCard}
                    onPress={() => {
                      /* navigate to car detail */
                    }}
                  >
                    <Image source={{ uri: listing.image }} style={styles.listingImage} resizeMode="contain" />
                    <Text style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
                    <Text style={styles.listingPrice}>{listing.price}</Text>
                    <View style={styles.listingBadge}>
                      <Ionicons name="shield-checkmark" size={9} color={colors.green} />
                      <Text style={styles.listingBadgeText}>Inspected</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Reviews ({profile.totalReviews})</Text>
            <View style={styles.avgRatingRow}>
              <StarRating value={Math.round(profile.avgRating)} />
              <Text style={styles.avgRatingText}>{profile.avgRating}</Text>
            </View>
          </View>
          <View style={styles.reviews}>
            {profile.reviews.length === 0 && (
              <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted }}>
                No reviews yet — reviews appear after completed handovers.
              </Text>
            )}
            {profile.reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{review.buyer[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewBuyer}>{review.buyer}</Text>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                  <StarRating value={review.rating} size={13} />
                  {/* Reviews are UGC, so they carry the same report path as
                      chat. Only API reviews (UUID ids) can reach the queue —
                      dev-build fixtures have nothing server-side to report. */}
                  {String(review.id).includes('-') ? (
                    <Pressable
                      onPress={() => handleReportReview(review)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Report review by ${review.buyer}`}
                      style={styles.reviewFlag}
                    >
                      <Ionicons name="flag-outline" size={14} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky contact CTA */}
      <StickyFooter style={styles.cta}>
        <Button title={`Contact ${profile.name.split(' ')[0]}`} icon="chatbubble-outline" onPress={handleContact} />
      </StickyFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { margin: 16, borderRadius: radius.xxl, padding: 18, gap: 12 },
  heroContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    flexShrink: 0,
  },
  avatarText: { fontSize: 20, fontFamily: fonts.extraBold, color: '#fff' },
  heroName: { fontSize: 17, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -0.2 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  heroMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  heroBadges: { flexDirection: 'row', gap: 6, marginTop: 8 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  heroBadgeText: { fontSize: 11, fontFamily: fonts.bold, color: colors.greenLight },
  heroBio: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  trustCircleWrap: { alignItems: 'center', gap: 6 },
  trustCircle: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  trustScore: { fontSize: 22, fontFamily: fonts.extraBold },
  trustMax: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: -3 },
  gradeChip: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: radius.pill, borderWidth: 1,
  },
  gradeText: { fontSize: 11, fontFamily: fonts.extraBold },
  statsRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 16, marginBottom: 8,
  },
  statCard: {
    flex: 1, alignItems: 'center', gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, paddingVertical: 14,
    ...shadows.card,
  },
  statValue: { fontSize: 15, fontFamily: fonts.extraBold },
  statLabel: { fontSize: 11, color: colors.textMuted },
  trustCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16,
    ...shadows.card,
  },
  cardTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 3, marginBottom: 14 },
  scoreComponents: { gap: 14 },
  scoreBarRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  scoreBarIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scoreBarTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  scoreBarLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  scoreBarPts: { fontSize: 14, fontFamily: fonts.extraBold },
  scoreBarMax: { fontSize: 11, color: colors.textMuted, fontFamily: fonts.semiBold },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: colors.border },
  barFill: { height: 4, borderRadius: 2 },
  scoreBarDesc: { fontSize: 11, color: colors.textMuted, marginTop: 5 },
  section: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  avgRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avgRatingText: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  listingCard: {
    width: 160,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, overflow: 'hidden',
    ...shadows.card,
  },
  listingImage: { width: '100%', height: 100 },
  listingTitle: { fontSize: 12, fontFamily: fonts.bold, color: colors.textPrimary, paddingHorizontal: 10, paddingTop: 8 },
  listingPrice: { fontVariant: ['tabular-nums'], fontSize: 14, fontFamily: fonts.extraBold, color: colors.primary, paddingHorizontal: 10, marginTop: 3 },
  listingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    margin: 10, marginTop: 6,
    backgroundColor: colors.greenTint, alignSelf: 'flex-start',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill,
  },
  listingBadgeText: { fontSize: 10, fontFamily: fonts.bold, color: colors.greenText },
  reviews: { gap: 10 },
  reviewCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14, gap: 10,
    ...shadows.card,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewFlag: { padding: 4, marginLeft: 2 },
  reviewAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.navyMid,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 12, fontFamily: fonts.extraBold, color: '#fff' },
  reviewBuyer: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  reviewDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  reviewText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    ...shadows.floating,
  },
});
