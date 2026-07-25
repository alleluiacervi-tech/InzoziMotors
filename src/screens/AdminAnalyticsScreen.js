import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import adminApi from '../api/admin';
import { colors, radius, shadows, fonts } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Shown until /admin/analytics answers, and when the backend is unreachable.
const DEMO_FUNNEL = [
  { label: 'Submitted', value: 48, icon: 'document-outline' },
  { label: 'Scheduled', value: 41, icon: 'calendar-outline' },
  { label: 'Inspected', value: 36, icon: 'scan-outline' },
  { label: 'Live', value: 31, icon: 'storefront-outline' },
  { label: 'Sold', value: 22, icon: 'checkmark-done-outline' },
];

const DEMO_TOP_MAKES = [
  { make: 'Toyota', count: 12 },
  { make: 'Honda', count: 8 },
  { make: 'Nissan', count: 6 },
  { make: 'Subaru', count: 5 },
  { make: 'BMW', count: 3 },
];

const DEMO_CENTERS = [
  { name: 'Nyarutarama', scheduled: 8, capacity: 12 },
  { name: 'Kicukiro', scheduled: 5, capacity: 10 },
  { name: 'Kimihurura', scheduled: 3, capacity: 8 },
];

// The funnel is cumulative: a car that is live also passed every earlier stage,
// but the submissions table only stores its CURRENT status. Roll the counts
// forward so the chart reads as a funnel instead of a status histogram.
const FUNNEL_ORDER = [
  { key: 'under_review', label: 'Submitted', icon: 'document-outline' },
  { key: 'scheduled',    label: 'Scheduled', icon: 'calendar-outline' },
  { key: 'inspected',    label: 'Inspected', icon: 'scan-outline' },
  { key: 'live',         label: 'Live',      icon: 'storefront-outline' },
  { key: 'sold',         label: 'Sold',      icon: 'checkmark-done-outline' },
];

function buildFunnel(pipelineRows) {
  if (!pipelineRows?.length) return null;
  const counts = {};
  pipelineRows.forEach((r) => { counts[r.status] = parseInt(r.count, 10) || 0; });
  return FUNNEL_ORDER.map((stage, i) => ({
    label: stage.label,
    icon: stage.icon,
    // Everything at or beyond this stage reached this stage
    value: FUNNEL_ORDER.slice(i).reduce((sum, s) => sum + (counts[s.key] || 0), 0),
  }));
}

// Center capacity lives in the inspection_centers table; the analytics payload
// reports scheduled/completed per center. Pair them where we know the capacity.
const CENTER_CAPACITY = { Nyarutarama: 12, Kicukiro: 8, Kimironko: 5, Kimihurura: 8 };

function MakeBarChart({ data }) {
  const maxVal = Math.max(...data.map((d) => d.count));
  const CHART_H = 70;
  const CHART_W = SCREEN_WIDTH - 64;
  const BAR_GAP = 8;
  const barWidth = (CHART_W - BAR_GAP * (data.length - 1)) / data.length;

  return (
    <Svg width={CHART_W} height={CHART_H + 24}>
      {data.map((d, i) => {
        const barH = Math.max(6, (d.count / maxVal) * CHART_H);
        const x = i * (barWidth + BAR_GAP);
        const y = CHART_H - barH;
        return (
          <G key={d.make}>
            <Rect x={x} y={y} width={barWidth} height={barH} rx={4} fill={colors.primary + (i === 0 ? 'FF' : '99')} />
            <SvgText x={x + barWidth / 2} y={CHART_H + 16} textAnchor="middle" fontSize="9" fill={colors.textMuted}>{d.make}</SvgText>
            <SvgText x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize="9" fontWeight="bold" fill={colors.primary}>{d.count}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function FunnelStep({ step, total, next, isLast }) {
  const pct = total > 0 ? Math.round((step.value / total) * 100) : 0;
  const dropPct = isLast || !step.value || !next
    ? null
    : Math.round(((step.value - next.value) / step.value) * 100);
  return (
    <View style={styles.funnelStep}>
      <View style={styles.funnelLeft}>
        <View style={styles.funnelIcon}>
          <Ionicons name={step.icon} size={16} color={colors.primary} />
        </View>
        <View style={styles.funnelConnector} />
      </View>
      <View style={styles.funnelRight}>
        <View style={styles.funnelBar}>
          <View style={[styles.funnelFill, { width: `${pct}%` }]} />
        </View>
        <View style={styles.funnelMeta}>
          <Text style={styles.funnelLabel}>{step.label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.funnelValue}>{step.value}</Text>
            {!isLast && dropPct != null && (
              <Text style={styles.funnelDrop}>−{dropPct}%</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const money = (n) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Number(n || 0).toLocaleString()}`;

export default function AdminAnalyticsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      adminApi.getAnalytics().catch(() => null),
      adminApi.getStats().catch(() => null),
    ]).then(([analytics, statsRes]) => {
      if (!alive) return;
      setData(analytics);
      setStats(statsRes);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const funnel = buildFunnel(data?.pipelineFunnel) || DEMO_FUNNEL;
  const topMakes = data?.topMakes?.length
    ? data.topMakes.slice(0, 5).map((m) => ({ make: m.make, count: parseInt(m.count, 10) || 0 }))
    : DEMO_TOP_MAKES;
  const centers = data?.centers?.length
    ? data.centers.map((c) => ({
        name: c.center,
        scheduled: parseInt(c.scheduled, 10) || 0,
        capacity: CENTER_CAPACITY[c.center] || 10,
      }))
    : DEMO_CENTERS;

  const submitted = funnel[0]?.value || 0;
  const sold = funnel[funnel.length - 1]?.value || 0;
  const conversionRate = submitted > 0 ? Math.round((sold / submitted) * 100) : 0;

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const heroStats = stats
    ? [
        { label: 'Fee revenue', value: money(stats.totalRevenue) },
        { label: 'In pipeline', value: String(stats.pendingSubmissions) },
        { label: 'Active listings', value: String(stats.liveListings) },
        { label: 'Sold', value: String(stats.totalSold) },
      ]
    : [
        { label: 'Revenue est.', value: '$4.2k' },
        { label: 'Submissions', value: '48' },
        { label: 'Active listings', value: '31' },
        { label: 'Sellers', value: '19' },
      ];

  if (loading) {
    return (
      <Screen background={colors.bg}>
        <BackHeader title="Platform Analytics" onBack={() => navigation.goBack()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Platform Analytics" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Hero */}
        <LinearGradient colors={[colors.navyMid, colors.navyDeep]} style={styles.hero}>
          <Text style={styles.heroTitle}>{monthLabel}</Text>
          <View style={styles.heroStats}>
            {heroStats.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.heroDivider} />}
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{s.value}</Text>
                  <Text style={styles.heroStatLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
          <View style={styles.conversionBadge}>
            <Ionicons name="trending-up" size={14} color={colors.greenLight} />
            <Text style={styles.conversionText}>{conversionRate}% submission-to-sale conversion</Text>
          </View>
        </LinearGradient>

        {/* Pipeline funnel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Listing Pipeline</Text>
          <Text style={styles.cardSub}>Drop-off at each stage this month</Text>
          <View style={styles.funnel}>
            {funnel.map((step, i) => (
              <FunnelStep
                key={step.label}
                step={step}
                total={funnel[0].value}
                next={funnel[i + 1]}
                isLast={i === funnel.length - 1}
              />
            ))}
          </View>
        </View>

        {/* Top makes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Makes</Text>
          <Text style={styles.cardSub}>Cars submitted this month</Text>
          <View style={{ marginTop: 12 }}>
            <MakeBarChart data={topMakes} />
          </View>
        </View>

        {/* Inspection center utilization */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inspection Center Utilization</Text>
          <Text style={styles.cardSub}>Appointments booked vs capacity</Text>
          <View style={styles.centersGrid}>
            {centers.map((center) => {
              const pct = Math.round((center.scheduled / center.capacity) * 100);
              return (
                <View key={center.name} style={styles.centerCard}>
                  <Text style={styles.centerName}>{center.name}</Text>
                  <View style={styles.centerBar}>
                    <View style={[styles.centerFill, {
                      width: `${pct}%`,
                      backgroundColor: pct >= 80 ? colors.amber : colors.primary,
                    }]} />
                  </View>
                  <Text style={styles.centerMeta}>{center.scheduled}/{center.capacity} booked · {pct}%</Text>
                  {pct >= 80 && (
                    <View style={styles.capacityWarn}>
                      <Ionicons name="warning-outline" size={11} color={colors.amber} />
                      <Text style={styles.capacityWarnText}>Near capacity</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Recent activity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          {[
            { icon: 'car-outline', text: 'Toyota RAV4 went live', time: '2h ago', color: colors.green },
            { icon: 'person-outline', text: 'New seller: Jean Pierre H.', time: '4h ago', color: colors.statusScheduled },
            { icon: 'scan-outline', text: 'Honda CR-V inspection completed', time: '6h ago', color: colors.primary },
            { icon: 'checkmark-done-outline', text: 'BMW 3 Series marked sold', time: 'Yesterday', color: colors.textMuted },
            { icon: 'alert-circle-outline', text: 'Subaru Forester — needs re-submit', time: 'Yesterday', color: colors.amber },
          ].map((item, i) => (
            <View key={i} style={[styles.activityRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 10, marginTop: 10 }]}>
              <View style={[styles.activityIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={15} color={item.color} />
              </View>
              <Text style={styles.activityText}>{item.text}</Text>
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { margin: 16, borderRadius: radius.xxl, padding: 20 },
  heroTitle: { fontSize: 12, fontFamily: fonts.bold, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  heroStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 22, fontFamily: fonts.black, color: '#fff', letterSpacing: -0.5 },
  heroStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.55)', marginTop: 2, textAlign: 'center' },
  heroDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' },
  conversionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start',
  },
  conversionText: { fontSize: 12, fontFamily: fonts.bold, color: colors.greenLight },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, marginHorizontal: 16, marginBottom: 12,
    ...shadows.card,
  },
  cardTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 4 },
  funnel: { marginTop: 12, gap: 0 },
  funnelStep: { flexDirection: 'row', gap: 10, minHeight: 54 },
  funnelLeft: { alignItems: 'center', width: 32 },
  funnelIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center',
  },
  funnelConnector: { flex: 1, width: 2, backgroundColor: colors.borderSoft, marginTop: 2 },
  funnelRight: { flex: 1, paddingBottom: 12 },
  funnelBar: { height: 8, backgroundColor: colors.surfaceAlt, borderRadius: 4, overflow: 'hidden', marginTop: 12 },
  funnelFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  funnelMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  funnelLabel: { fontSize: 12, fontFamily: fonts.bold, color: colors.textPrimary },
  funnelValue: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.primary },
  funnelDrop: { fontSize: 11, color: colors.amber, fontFamily: fonts.semiBold },
  centersGrid: { gap: 10, marginTop: 10 },
  centerCard: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: 12,
  },
  centerName: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 8 },
  centerBar: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  centerFill: { height: '100%', borderRadius: 3 },
  centerMeta: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  capacityWarn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  capacityWarnText: { fontSize: 10, fontFamily: fonts.bold, color: colors.amber },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activityText: { flex: 1, fontSize: 13, color: colors.textPrimary, fontFamily: fonts.semiBold },
  activityTime: { fontSize: 11, color: colors.textMuted },
});
