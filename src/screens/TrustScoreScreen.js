import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, radius, shadows } from '../theme';
import { SELLER_PROFILES, DEFAULT_SELLER_PROFILE } from '../data/inspectionData';

const SCORE_COMPONENTS = [
  {
    id: 'id',
    label: 'ID Verified',
    maxPts: 30,
    icon: 'finger-print-outline',
    color: colors.primary,
    getPts: (p) => p.idVerified ? 30 : 0,
    description: 'Confirmed government ID + selfie',
    improve: 'Submit your National ID and selfie in ID Verification to earn 30 pts instantly.',
  },
  {
    id: 'sales',
    label: 'Completed Sales',
    maxPts: 30,
    icon: 'car-outline',
    color: colors.statusScheduled,
    getPts: (p) => Math.min(30, p.completedSales || 0),
    description: '1 point per completed sale, max 30',
    improve: 'Each verified sale adds 1 point. Respond quickly and arrange smooth handovers.',
  },
  {
    id: 'response',
    label: 'Response Rate',
    maxPts: 20,
    icon: 'chatbubble-outline',
    color: colors.amber,
    getPts: (p) => Math.round(((p.responseRate || 0) / 100) * 20),
    description: 'Messages replied to within 24 hours',
    improve: 'Reply to every buyer inquiry within 24h. Consistent response earns full 20 pts.',
  },
  {
    id: 'reviews',
    label: 'Buyer Reviews',
    maxPts: 20,
    icon: 'star-outline',
    color: '#F59E0B',
    getPts: (p) => Math.round(((p.avgRating || 0) / 5) * 20),
    description: 'Average star rating × 4',
    improve: 'Ask satisfied buyers to leave a review after handover. 5-star average = 20 pts.',
  },
];

function getGrade(score) {
  if (score >= 85) return { letter: 'A', label: 'Excellent', color: colors.green };
  if (score >= 70) return { letter: 'B', label: 'Good', color: colors.statusScheduled };
  if (score >= 55) return { letter: 'C', label: 'Fair', color: colors.amber };
  return { letter: 'D', label: 'Needs work', color: colors.alertRed };
}

function TrustGauge({ score, grade }) {
  const SIZE = 160;
  const R = 64;
  const C = 2 * Math.PI * R;
  const filled = (score / 100) * C * 0.75; // 270° arc = 75% of circumference
  const empty = C - filled;
  const rotation = 135; // start from bottom-left

  return (
    <Svg width={SIZE} height={SIZE}>
      {/* Track */}
      <Circle
        cx={SIZE / 2} cy={SIZE / 2} r={R}
        fill="none" stroke={colors.border} strokeWidth={14}
        strokeDasharray={`${C * 0.75} ${C * 0.25}`}
        strokeDashoffset={C * 0.25 / 2}
        strokeLinecap="round"
        transform={`rotate(${rotation} ${SIZE / 2} ${SIZE / 2})`}
      />
      {/* Progress */}
      <Circle
        cx={SIZE / 2} cy={SIZE / 2} r={R}
        fill="none" stroke={grade.color} strokeWidth={14}
        strokeDasharray={`${filled} ${C - filled}`}
        strokeDashoffset={C * 0.25 / 2}
        strokeLinecap="round"
        transform={`rotate(${rotation} ${SIZE / 2} ${SIZE / 2})`}
      />
      {/* Score */}
      <SvgText x={SIZE / 2} y={SIZE / 2 - 6} textAnchor="middle" fontSize="32" fontWeight="bold" fill={colors.textPrimary}>
        {score}
      </SvgText>
      <SvgText x={SIZE / 2} y={SIZE / 2 + 14} textAnchor="middle" fontSize="11" fill={colors.textMuted}>
        / 100
      </SvgText>
      <SvgText x={SIZE / 2} y={SIZE / 2 + 30} textAnchor="middle" fontSize="13" fontWeight="bold" fill={grade.color}>
        {grade.letter} · {grade.label}
      </SvgText>
    </Svg>
  );
}

function ComponentRow({ comp, profile, expanded, onToggle }) {
  const pts = comp.getPts(profile);
  const pct = Math.round((pts / comp.maxPts) * 100);

  return (
    <View style={styles.compRow}>
      <Pressable style={styles.compHeader} onPress={onToggle}>
        <View style={[styles.compIcon, { backgroundColor: comp.color + '18' }]}>
          <Ionicons name={comp.icon} size={18} color={comp.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.compLabel}>{comp.label}</Text>
          <View style={styles.compBarWrap}>
            <View style={styles.compBar}>
              <View style={[styles.compBarFill, { width: `${pct}%`, backgroundColor: comp.color }]} />
            </View>
            <Text style={[styles.compPts, { color: comp.color }]}>{pts} / {comp.maxPts}</Text>
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>
      {expanded && (
        <View style={styles.compDetail}>
          <Text style={styles.compDesc}>{comp.description}</Text>
          {pts < comp.maxPts && (
            <View style={styles.improveCard}>
              <Ionicons name="bulb-outline" size={14} color={colors.amber} />
              <Text style={styles.improveText}>{comp.improve}</Text>
            </View>
          )}
          {pts === comp.maxPts && (
            <View style={[styles.improveCard, { backgroundColor: colors.greenTint }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.green} />
              <Text style={[styles.improveText, { color: colors.green }]}>Maximum score reached!</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function TrustScoreScreen({ navigation, route }) {
  const sellerName = route.params?.sellerName;
  const profile = SELLER_PROFILES[sellerName] || DEFAULT_SELLER_PROFILE;
  const [expandedId, setExpandedId] = useState(null);

  const score = SCORE_COMPONENTS.reduce((sum, c) => sum + c.getPts(profile), 0);
  const grade = getGrade(score);

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Trust Score" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Gauge hero */}
        <View style={styles.gaugeSection}>
          <TrustGauge score={score} grade={grade} />
          {sellerName && (
            <Text style={styles.sellerName}>{sellerName}</Text>
          )}
          <Text style={styles.gaugeDesc}>
            Trust score out of 100 points across 4 verified categories
          </Text>
          {profile.idVerified && (
            <View style={styles.verifiedRow}>
              <View style={styles.verifiedPill}>
                <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                <Text style={styles.verifiedText}>ID Verified</Text>
              </View>
              <View style={[styles.verifiedPill, { backgroundColor: colors.greenTint }]}>
                <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                <Text style={[styles.verifiedText, { color: colors.primary }]}>Verified Seller</Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick stats */}
        <View style={styles.quickStats}>
          {[
            { icon: 'car-outline', label: 'Sales', value: profile.completedSales || 0, color: colors.statusScheduled },
            { icon: 'chatbubble-outline', label: 'Response', value: `${profile.responseRate || 0}%`, color: colors.amber },
            { icon: 'star', label: 'Rating', value: `${(profile.avgRating || 0).toFixed(1)} ⭐`, color: '#F59E0B' },
            { icon: 'chatbox-outline', label: 'Reviews', value: profile.totalReviews || profile.reviewCount || 0, color: colors.primary },
          ].map((s, i) => (
            <View key={s.label} style={[styles.quickStat, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.borderSoft }]}>
              <Text style={[styles.quickStatValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.quickStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Component breakdown */}
        <Text style={styles.sectionTitle}>Score breakdown</Text>
        <View style={styles.components}>
          {SCORE_COMPONENTS.map((comp, i) => (
            <View key={comp.id} style={i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSoft }}>
              <ComponentRow
                comp={comp}
                profile={profile}
                expanded={expandedId === comp.id}
                onToggle={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
              />
            </View>
          ))}
        </View>

        {/* How trust score works */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How trust score works</Text>
          <Text style={styles.howBody}>
            Your trust score signals reliability to buyers. A higher score means more visibility in search results, priority scheduling for inspections, and greater buyer confidence — all leading to faster sales.
          </Text>
          <View style={styles.howGrid}>
            {[
              { range: '85–100', grade: 'A', label: 'Excellent · Priority listing' },
              { range: '70–84', grade: 'B', label: 'Good · Standard listing' },
              { range: '55–69', grade: 'C', label: 'Fair · Limited visibility' },
              { range: '< 55', grade: 'D', label: 'Needs work · Review required' },
            ].map((g) => (
              <View key={g.grade} style={styles.gradeRow}>
                <Text style={styles.gradeText}>{g.grade}</Text>
                <Text style={styles.gradeRange}>{g.range}</Text>
                <Text style={styles.gradeLabel}>{g.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gaugeSection: {
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
    gap: 8,
  },
  sellerName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
  gaugeDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  verifiedRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
  },
  verifiedText: { fontSize: 12, fontWeight: '700', color: colors.green },
  quickStats: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
    paddingVertical: 16,
  },
  quickStat: { flex: 1, alignItems: 'center' },
  quickStatValue: { fontSize: 18, fontWeight: '800' },
  quickStatLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.4,
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8,
  },
  components: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, marginHorizontal: 16, overflow: 'hidden', ...shadows.card,
  },
  compRow: { paddingHorizontal: 14 },
  compHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  compIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  compLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  compBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compBar: { flex: 1, height: 6, backgroundColor: colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  compBarFill: { height: '100%', borderRadius: 3 },
  compPts: { fontSize: 12, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  compDetail: { paddingBottom: 14, gap: 8 },
  compDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  improveCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#FEF3C7', borderRadius: radius.lg, padding: 10,
  },
  improveText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },
  howCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, margin: 16, padding: 16, ...shadows.card,
  },
  howTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  howBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 14 },
  howGrid: { gap: 8 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gradeText: { width: 18, fontSize: 15, fontWeight: '900', color: colors.primary },
  gradeRange: { width: 70, fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  gradeLabel: { flex: 1, fontSize: 12, color: colors.textSecondary },
});
