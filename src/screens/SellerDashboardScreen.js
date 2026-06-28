import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows } from '../theme';

const PIPELINE_STAGES = [
  { key: 'under_review', label: 'Review', icon: 'time-outline' },
  { key: 'scheduled', label: 'Scheduled', icon: 'calendar-outline' },
  { key: 'inspected', label: 'Inspected', icon: 'scan-outline' },
  { key: 'live', label: 'Live', icon: 'storefront-outline' },
  { key: 'sold', label: 'Sold', icon: 'checkmark-done-outline' },
];

const STATUS_CONFIG = {
  under_review: { label: 'Under Review', color: colors.statusPending, bg: colors.statusPendingBg, icon: 'time-outline' },
  scheduled: { label: 'Inspection Booked', color: colors.statusScheduled, bg: colors.statusScheduledBg, icon: 'calendar-outline' },
  inspected: { label: 'Inspection Done', color: colors.primary, bg: colors.greenTint, icon: 'scan-outline' },
  live: { label: 'Live', color: colors.statusLive, bg: colors.statusLiveBg, icon: 'radio-outline' },
  sold: { label: 'Sold', color: colors.statusSold, bg: colors.statusSoldBg, icon: 'checkmark-done-circle-outline' },
  rejected: { label: 'Changes Needed', color: colors.statusRejected, bg: colors.statusRejectedBg, icon: 'alert-circle-outline' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.under_review;
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.color} />
      <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function PipelineDiagram({ currentStatus }) {
  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === currentStatus);
  return (
    <View style={styles.pipeline}>
      {PIPELINE_STAGES.map((stage, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const upcoming = idx > currentIdx;
        return (
          <React.Fragment key={stage.key}>
            <View style={styles.pipelineStep}>
              <View style={[
                styles.pipelineDot,
                done && styles.pipelineDotDone,
                active && styles.pipelineDotActive,
                upcoming && styles.pipelineDotUpcoming,
              ]}>
                {done ? (
                  <Ionicons name="checkmark" size={10} color="#fff" />
                ) : active ? (
                  <Ionicons name={stage.icon} size={10} color="#fff" />
                ) : (
                  <View style={styles.pipelineDotInner} />
                )}
              </View>
              <Text style={[
                styles.pipelineLabel,
                active && { color: colors.primary, fontWeight: '700' },
                done && { color: colors.primary },
                upcoming && { color: colors.border },
              ]}>{stage.label}</Text>
            </View>
            {idx < PIPELINE_STAGES.length - 1 && (
              <View style={[styles.pipelineLine, (done || active) && idx < currentIdx && styles.pipelineLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function SellerDashboardScreen({ navigation }) {
  const { submissions } = useApp();

  const liveCount = submissions.filter((s) => s.status === 'live').length;
  const soldCount = submissions.filter((s) => s.status === 'sold').length;
  const totalViews = 47;

  const handleSubmissionAction = (sub) => {
    if (sub.status === 'live' && sub.listingId) {
      navigation.navigate('VehicleDetail', { carId: sub.listingId });
    } else if (sub.status === 'scheduled') {
      navigation.navigate('InspectionScheduling', { carName: sub.carTitle });
    } else if (sub.status === 'under_review') {
      // no action
    }
  };

  const getActionLabel = (status) => {
    switch (status) {
      case 'live': return 'View Listing';
      case 'scheduled': return 'View Schedule';
      default: return null;
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title="My Submissions"
        onBack={() => navigation.goBack()}
        right={
          <Pressable style={styles.addBtn} onPress={() => navigation.navigate('CarSubmission')}>
            <Ionicons name="add" size={22} color={colors.slate700} />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Stats banner */}
        <LinearGradient colors={[colors.navyMid, colors.navyDeep]} style={styles.statsBanner}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{submissions.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{liveCount}</Text>
              <Text style={styles.statLabel}>Live</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalViews}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{soldCount}</Text>
              <Text style={styles.statLabel}>Sold</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Submissions</Text>
          <Pressable style={styles.submitNewBtn} onPress={() => navigation.navigate('CarSubmission')}>
            <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.submitNewText}>Submit Another</Text>
          </Pressable>
        </View>

        {/* Submission cards */}
        {submissions.map((sub) => {
          const actionLabel = getActionLabel(sub.status);
          return (
            <View key={sub.id} style={styles.subCard}>
              {/* Card Header */}
              <View style={styles.subCardTop}>
                <Image source={{ uri: sub.image }} style={styles.subThumb} resizeMode="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.subTitle}>{sub.carTitle}</Text>
                  <Text style={styles.subDate}>Submitted {sub.submittedDate}</Text>
                  <StatusBadge status={sub.status} />
                </View>
                {sub.askingPrice > 0 && (
                  <Text style={styles.subPrice}>${sub.askingPrice.toLocaleString()}</Text>
                )}
              </View>

              {/* Pipeline diagram */}
              <View style={styles.pipelineWrap}>
                <PipelineDiagram currentStatus={sub.status} />
              </View>

              {/* Status detail */}
              {sub.statusDetail ? (
                <View style={styles.statusDetail}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.statusDetailText}>{sub.statusDetail}</Text>
                </View>
              ) : null}

              {/* Action button */}
              {actionLabel && (
                <Pressable style={styles.subAction} onPress={() => handleSubmissionAction(sub)}>
                  <Text style={styles.subActionText}>{actionLabel}</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                </Pressable>
              )}
            </View>
          );
        })}

        {/* Submit CTA */}
        <Pressable style={styles.submitCta} onPress={() => navigation.navigate('CarSubmission')}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          <Text style={styles.submitCtaText}>Submit another car for sale</Text>
        </Pressable>

        {/* How it works */}
        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>How Inzozi Works for Sellers</Text>
          {[
            { icon: 'shield-checkmark-outline', text: 'Submit your car — takes 5 minutes' },
            { icon: 'time-outline', text: 'Our team reviews in under 24 hours' },
            { icon: 'scan-outline', text: 'Professional 150-point inspection' },
            { icon: 'camera-outline', text: '36-angle photos taken by our team' },
            { icon: 'storefront-outline', text: 'Listed and matched with verified buyers' },
          ].map((item, i) => (
            <View key={i} style={styles.howRow}>
              <View style={styles.howDot}>
                <Ionicons name={item.icon} size={14} color={colors.primary} />
              </View>
              <Text style={styles.howText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  addBtn: {
    width: 42, height: 42, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  statsBanner: { margin: 16, borderRadius: radius.xxl, padding: 18 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  submitNewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.blueTint,
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6,
  },
  submitNewText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  subCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xxl,
    marginHorizontal: 16, marginBottom: 14,
    overflow: 'hidden',
    ...shadows.card,
  },
  subCardTop: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
  subThumb: { width: 80, height: 64, borderRadius: radius.lg, backgroundColor: colors.border },
  subTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  subDate: { fontSize: 11, color: colors.textMuted, marginTop: 2, marginBottom: 6 },
  subPrice: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  pipelineWrap: {
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: colors.surfaceAlt,
  },
  pipeline: { flexDirection: 'row', alignItems: 'flex-start' },
  pipelineStep: { alignItems: 'center', gap: 4, flex: 0 },
  pipelineDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.border,
  },
  pipelineDotDone: { backgroundColor: colors.primary },
  pipelineDotActive: { backgroundColor: colors.primary },
  pipelineDotUpcoming: { backgroundColor: colors.border },
  pipelineDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },
  pipelineLabel: { fontSize: 9, color: colors.textMuted, textAlign: 'center', maxWidth: 52 },
  pipelineLine: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 10, marginHorizontal: 2 },
  pipelineLineDone: { backgroundColor: colors.primary },
  statusDetail: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
  },
  statusDetailText: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  subAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    backgroundColor: colors.blueTint,
  },
  subActionText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  submitCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: colors.primary + '66', borderStyle: 'dashed',
    borderRadius: radius.xxl, paddingVertical: 18,
    marginHorizontal: 16, marginTop: 4,
  },
  submitCtaText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  howItWorks: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xxl,
    padding: 16, marginHorizontal: 16, marginTop: 16,
    gap: 10,
  },
  howTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center',
  },
  howText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
});
