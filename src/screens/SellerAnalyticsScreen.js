import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, fonts } from '../theme';
import { formatPrice } from '../data/cars';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VIEWS_DATA = [
  { label: 'Mon', value: 6 },
  { label: 'Tue', value: 11 },
  { label: 'Wed', value: 9 },
  { label: 'Thu', value: 14 },
  { label: 'Fri', value: 18 },
  { label: 'Sat', value: 22 },
  { label: 'Sun', value: 15 },
];

const MOCK_LISTING_ANALYTICS = {
  sub1: { views: 47, viewsThisWeek: 22, saves: 12, inquiries: 5, daysLive: 3, categoryAvgDays: 14, trend: 'up' },
  sub2: { views: 23, viewsThisWeek: 8, saves: 4, inquiries: 2, daysLive: 8, categoryAvgDays: 14, trend: 'flat' },
  sub3: { views: 0, viewsThisWeek: 0, saves: 0, inquiries: 0, daysLive: 0, categoryAvgDays: 14, trend: 'flat' },
};

function BarChart({ data }) {
  const maxVal = Math.max(...data.map((d) => d.value));
  const CHART_H = 80;
  const CHART_W = SCREEN_WIDTH - 64;
  const BAR_GAP = 6;
  const barWidth = (CHART_W - BAR_GAP * (data.length - 1)) / data.length;

  return (
    <Svg width={CHART_W} height={CHART_H + 22}>
      {data.map((d, i) => {
        const barH = maxVal > 0 ? Math.max(4, (d.value / maxVal) * CHART_H) : 4;
        const x = i * (barWidth + BAR_GAP);
        const y = CHART_H - barH;
        const isMax = d.value === maxVal;
        return (
          <G key={d.label}>
            <Rect
              x={x} y={y} width={barWidth} height={barH}
              rx={3} fill={isMax ? colors.primary : colors.primary + '66'}
            />
            <SvgText
              x={x + barWidth / 2} y={CHART_H + 14}
              textAnchor="middle" fontSize="9" fill={colors.textMuted}
            >
              {d.label}
            </SvgText>
            {isMax && (
              <SvgText
                x={x + barWidth / 2} y={y - 4}
                textAnchor="middle" fontSize="9" fontWeight="bold" fill={colors.primary}
              >
                {d.value}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: (color || colors.primary) + '18' }]}>
        <Ionicons name={icon} size={18} color={color || colors.primary} />
      </View>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export default function SellerAnalyticsScreen({ navigation }) {
  const { submissions } = useApp();
  const liveSubmissions = submissions.filter((s) => s.status === 'live' || s.status === 'sold');
  const [selectedId, setSelectedId] = useState(liveSubmissions[0]?.id || 'sub1');

  const analytics = MOCK_LISTING_ANALYTICS[selectedId] || MOCK_LISTING_ANALYTICS.sub1;
  const selectedSub = liveSubmissions.find((s) => s.id === selectedId) || liveSubmissions[0];
  const allLive = submissions.filter((s) => s.status === 'live');
  const totalViews = Object.values(MOCK_LISTING_ANALYTICS).reduce((a, b) => a + b.views, 0);
  const totalSaves = Object.values(MOCK_LISTING_ANALYTICS).reduce((a, b) => a + b.saves, 0);

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Seller Analytics" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Hero stats */}
        <LinearGradient colors={[colors.navyMid, colors.navyDeep]} style={styles.hero}>
          <Text style={styles.heroLabel}>All listings · this month</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{totalViews}</Text>
              <Text style={styles.heroStatLabel}>Total views</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{totalSaves}</Text>
              <Text style={styles.heroStatLabel}>Saves</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{allLive.length}</Text>
              <Text style={styles.heroStatLabel}>Live</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>7</Text>
              <Text style={styles.heroStatLabel}>Inquiries</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Listing selector */}
        {liveSubmissions.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Listing performance</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
              {liveSubmissions.map((sub) => (
                <Pressable
                  key={sub.id}
                  style={[styles.selectorChip, selectedId === sub.id && styles.selectorChipActive]}
                  onPress={() => setSelectedId(sub.id)}
                >
                  <Text style={[styles.selectorText, selectedId === sub.id && styles.selectorTextActive]} numberOfLines={1}>
                    {sub.carTitle}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Views this week chart */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>Views this week</Text>
                  <Text style={styles.chartSub}>
                    <Text style={{ color: colors.primary, fontFamily: fonts.extraBold }}>{analytics.viewsThisWeek}</Text>
                    {' '}views · {analytics.trend === 'up' ? '↑ trending up' : 'stable'}
                  </Text>
                </View>
                <View style={[styles.trendChip, { backgroundColor: analytics.trend === 'up' ? colors.greenTint : colors.surfaceAlt }]}>
                  <Ionicons
                    name={analytics.trend === 'up' ? 'trending-up' : 'remove'}
                    size={14}
                    color={analytics.trend === 'up' ? colors.green : colors.textMuted}
                  />
                </View>
              </View>
              <BarChart data={VIEWS_DATA} />
            </View>

            {/* Metrics grid */}
            <View style={styles.metricsGrid}>
              <StatCard icon="eye-outline" label="Total Views" value={analytics.views} color={colors.statusScheduled} />
              <StatCard icon="heart-outline" label="Saves" value={analytics.saves} color="#EF4444" />
              <StatCard icon="chatbubble-outline" label="Inquiries" value={analytics.inquiries} color={colors.amber} />
              <StatCard
                icon="time-outline"
                label="Days Live"
                value={analytics.daysLive}
                sub={`Avg: ${analytics.categoryAvgDays}d`}
                color={analytics.daysLive > analytics.categoryAvgDays ? colors.amber : colors.green}
              />
            </View>

            {/* Time on market */}
            <View style={styles.tomCard}>
              <Text style={styles.tomTitle}>Time on market</Text>
              <View style={styles.tomBar}>
                <View style={[styles.tomFill, { width: `${Math.min(100, (analytics.daysLive / analytics.categoryAvgDays) * 100)}%` }]} />
              </View>
              <View style={styles.tomLabels}>
                <Text style={styles.tomLabel}>{analytics.daysLive} days live</Text>
                <Text style={styles.tomLabel}>Category avg: {analytics.categoryAvgDays} days</Text>
              </View>
              {analytics.daysLive < analytics.categoryAvgDays && (
                <View style={styles.tomHint}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                  <Text style={styles.tomHintText}>Selling faster than average — great sign!</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No analytics yet</Text>
            <Text style={styles.emptySub}>Analytics appear once your car goes live on the marketplace.</Text>
          </View>
        )}

        {/* Tips card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips to sell faster</Text>
          {[
            { icon: 'pricetag-outline', tip: 'Price within 5% of market average to attract more buyers' },
            { icon: 'chatbubble-outline', tip: 'Reply to inquiries within 2h — fast response = 2× more views' },
            { icon: 'star-outline', tip: 'Ask satisfied buyers for a review to boost your trust score' },
          ].map((item, i) => (
            <View key={i} style={[styles.tipRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSoft, marginTop: 10, paddingTop: 10 }]}>
              <View style={styles.tipIcon}>
                <Ionicons name={item.icon} size={14} color={colors.primary} />
              </View>
              <Text style={styles.tipText}>{item.tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { margin: 16, borderRadius: radius.xxl, padding: 20 },
  heroLabel: { fontSize: 11, fontFamily: fonts.bold, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 26, fontFamily: fonts.black, color: '#fff', letterSpacing: -0.5 },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  heroStatDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.15)' },
  sectionTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textMuted, paddingHorizontal: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  selectorRow: { paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  selectorChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    maxWidth: 180,
  },
  selectorChipActive: { borderColor: colors.primary, backgroundColor: colors.greenTint },
  selectorText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  selectorTextActive: { color: colors.primary, fontFamily: fonts.bold },
  chartCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, marginHorizontal: 16, marginBottom: 12,
    ...shadows.card,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  chartTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  chartSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  trendChip: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  statCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14, alignItems: 'center', gap: 4,
    ...shadows.card,
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontSize: 26, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted },
  statSub: { fontSize: 10, color: colors.textMuted },
  tomCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, marginHorizontal: 16, marginBottom: 16,
    ...shadows.card,
  },
  tomTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 12 },
  tomBar: { height: 8, backgroundColor: colors.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  tomFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  tomLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  tomLabel: { fontSize: 11, color: colors.textMuted },
  tomHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  tomHintText: { fontSize: 12, color: colors.green, fontFamily: fonts.semiBold },
  empty: { alignItems: 'center', paddingVertical: 50, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  tipsCard: {
    backgroundColor: colors.greenTint, borderWidth: 1, borderColor: colors.primary + '33',
    borderRadius: radius.xl, padding: 16, marginHorizontal: 16,
  },
  tipsTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.primary, marginBottom: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tipText: { flex: 1, fontSize: 12, color: colors.primary, lineHeight: 18 },
});
