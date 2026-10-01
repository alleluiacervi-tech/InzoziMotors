import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { useApp } from '../context/AppContext';
import carsApi from '../api/cars';
import { useSellerGate } from '../hooks/useSellerGate';
import { colors, radius, shadows, fonts } from '../theme';
import { showToast, showConfirm } from '../components/Feedback';
import Photo from '../components/Photo';
import { PHOTO } from '../utils/photo';

const PIPELINE_STAGES = [
  { key: 'under_review', labelKey: 'sellerDashboard.stageReview', icon: 'time-outline' },
  { key: 'scheduled', labelKey: 'sellerDashboard.stageScheduled', icon: 'calendar-outline' },
  { key: 'inspected', labelKey: 'sellerDashboard.stageInspected', icon: 'scan-outline' },
  { key: 'live', labelKey: 'sellerDashboard.stageLive', icon: 'storefront-outline' },
  { key: 'sold', labelKey: 'sellerDashboard.stageSold', icon: 'checkmark-done-outline' },
];

const STATUS_CONFIG = {
  under_review: { labelKey: 'sellerDashboard.statusUnderReview', color: colors.statusPending, bg: colors.statusPendingBg, icon: 'time-outline' },
  approved: { labelKey: 'sellerDashboard.statusApproved', color: colors.statusLive, bg: colors.statusLiveBg, icon: 'checkmark-circle-outline' },
  scheduled: { labelKey: 'sellerDashboard.statusScheduled', color: colors.statusScheduled, bg: colors.statusScheduledBg, icon: 'calendar-outline' },
  inspected: { labelKey: 'sellerDashboard.statusInspected', color: colors.statusScheduled, bg: colors.statusScheduledBg, icon: 'scan-outline' },
  live: { labelKey: 'sellerDashboard.statusLive', color: colors.statusLive, bg: colors.statusLiveBg, icon: 'radio-outline' },
  paused: { labelKey: 'sellerDashboard.statusPaused', color: colors.statusPending, bg: colors.statusPendingBg, icon: 'pause-circle-outline' },
  sold: { labelKey: 'sellerDashboard.statusSold', color: colors.statusSold, bg: colors.statusSoldBg, icon: 'checkmark-done-circle-outline' },
  rejected: { labelKey: 'sellerDashboard.statusRejected', color: colors.statusRejected, bg: colors.statusRejectedBg, icon: 'alert-circle-outline' },
};

function StatusBadge({ status }) {
  const { t } = useApp();
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.under_review;
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.color} />
      <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
    </View>
  );
}

function PipelineDiagram({ currentStatus }) {
  const { t } = useApp();
  // 'approved' sits between review (done) and scheduled (next up); a paused
  // listing has reached Live and is simply hidden for now.
  const normalized = currentStatus === 'approved' ? 'scheduled' : currentStatus === 'paused' ? 'live' : currentStatus;
  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === normalized);
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
                active && { color: colors.primary, fontFamily: fonts.bold },
                done && { color: colors.primary },
                upcoming && { color: colors.textDisabled },
              ]}>{t(stage.labelKey)}</Text>
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
  const { submissions, updateSubmissionPrice, cars, t } = useApp();
  const [relistId, setRelistId] = useState(null);
  const [relistPrice, setRelistPrice] = useState('');
  // listing id -> { status, views } from GET /cars/seller/mine. A submission
  // stays 'live' after the listing is paused or sold, so the listing's own
  // status is what the card shows and what the controls act on.
  const [listings, setListings] = useState({});
  const gate = useSellerGate(navigation);

  const loadListings = useCallback(async () => {
    try {
      const rows = await carsApi.getMyListings();
      setListings(Object.fromEntries((rows || []).map((c) => [c.id, { status: c.status, views: c.views || 0 }])));
    } catch {
      // Without it the counts show zero and the controls stay hidden — never invented.
    }
  }, []);
  useEffect(() => { loadListings(); }, [loadListings, submissions]);

  const statusOf = (sub) => {
    const listing = sub.listingId && listings[sub.listingId];
    return listing && ['paused', 'sold'].includes(listing.status) ? listing.status : sub.status;
  };

  const liveCount = submissions.filter((s) => statusOf(s) === 'live').length;
  const soldCount = submissions.filter((s) => statusOf(s) === 'sold').length;
  // The real total from the seller's own listings (B7). This used to be
  // 47 × (live + sold), a number that looked like data and wasn't.
  const totalViews = Object.values(listings).reduce((sum, l) => sum + l.views, 0);

  const LISTING_ACTIONS = {
    paused: { title: t('sellerDashboard.pauseTitle'), message: t('sellerDashboard.pauseMessage'), confirmLabel: t('sellerDashboard.pauseConfirm'), done: t('sellerDashboard.pausedToast') },
    live: { title: t('sellerDashboard.liveAgainTitle'), message: t('sellerDashboard.liveAgainMessage'), confirmLabel: t('sellerDashboard.liveAgainConfirm'), done: t('sellerDashboard.liveAgainToast') },
    sold: { title: t('sellerDashboard.soldTitle'), message: t('sellerDashboard.soldMessage'), confirmLabel: t('sellerDashboard.soldConfirm'), destructive: true, done: t('sellerDashboard.soldToast') },
  };

  const changeListingStatus = async (sub, target) => {
    const { done, ...copy } = LISTING_ACTIONS[target];
    const ok = await showConfirm({ ...copy, cancelLabel: t('sellerDashboard.cancel') });
    if (!ok) return;
    try {
      await carsApi.setSellerStatus(sub.listingId, target);
      showToast(done, 'success');
      loadListings();
    } catch (err) {
      showToast(err.message || t('sellerDashboard.saveFailed'), 'error');
    }
  };

  const handleSubmissionAction = (sub) => {
    if (sub.status === 'live' && sub.listingId) {
      const listedCar = cars.find((c) => c.id === sub.listingId);
      if (listedCar) navigation.navigate('VehicleDetail', { car: listedCar });
    } else if (sub.status === 'approved') {
      navigation.navigate('InspectionScheduling', { carName: sub.carTitle, submissionId: sub.id });
    } else if (sub.status === 'scheduled') {
      showToast(sub.statusDetail || t('sellerDashboard.inspectionConfirmed', { title: sub.carTitle }), 'info');
    } else if (sub.status === 'rejected') {
      gate('CarSubmission', {
        prefill: { make: sub.make, model: sub.model, year: sub.year, mileage: sub.mileage },
      });
    }
  };

  // Live listings only. The old sold-car "Relist" only changed local state and
  // promised a review that never happened (B8); a sold listing is final.
  const handleRelist = async (sub) => {
    if (relistId === sub.id) {
      // Whole francs: the server stores an integer and refuses anything else.
      const price = Math.round(parseFloat(relistPrice));
      if (!price || price <= 0) {
        showToast(t('sellerDashboard.validPriceToast'), 'error');
        return;
      }
      try {
        await updateSubmissionPrice(sub.id, price);
      } catch (err) {
        showToast(err?.message || t('sellerDashboard.priceUpdateFailed'), 'error');
        return;
      }
      showToast(t('sellerDashboard.priceUpdatedToast'), 'success');
      setRelistId(null);
      setRelistPrice('');
    } else {
      setRelistId(sub.id);
      setRelistPrice(sub.askingPrice ? String(sub.askingPrice) : '');
    }
  };

  const getActionLabel = (status) => {
    switch (status) {
      case 'live': return t('sellerDashboard.viewListing');
      case 'approved': return t('sellerDashboard.bookInspection');
      case 'scheduled': return t('sellerDashboard.viewInspection');
      case 'rejected': return t('sellerDashboard.updateResubmit');
      default: return null;
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title={t('sellerDashboard.title')}
        onBack={() => navigation.goBack()}
        right={
          <Pressable style={styles.addBtn} onPress={() => gate('CarSubmission')} accessibilityRole="button" accessibilityLabel={t('sellerDashboard.add')}>
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
              <Text style={styles.statLabel}>{t('sellerDashboard.statTotal')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{liveCount}</Text>
              <Text style={styles.statLabel}>{t('sellerDashboard.statLive')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalViews}</Text>
              <Text style={styles.statLabel}>{t('sellerDashboard.statViews')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{soldCount}</Text>
              <Text style={styles.statLabel}>{t('sellerDashboard.statSold')}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('sellerDashboard.allSubmissions')}</Text>
          <Pressable style={styles.submitNewBtn} onPress={() => gate('CarSubmission')}>
            <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.submitNewText}>{t('sellerDashboard.submitAnother')}</Text>
          </Pressable>
        </View>

        {/* Submission cards */}
        {submissions.map((sub) => {
          const status = statusOf(sub);
          const actionLabel = getActionLabel(status);
          return (
            <View key={sub.id} style={styles.subCard}>
              {/* Card Header */}
              <View style={styles.subCardTop}>
                <Photo uri={sub.image} width={PHOTO.THUMB} style={styles.subThumb} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.subTitle}>{sub.carTitle}</Text>
                  <Text style={styles.subDate}>{t('sellerDashboard.submittedOn', { date: sub.submittedDate })}</Text>
                  <StatusBadge status={status} />
                </View>
                {sub.askingPrice > 0 && (
                  <Text style={styles.subPrice}>RWF {sub.askingPrice.toLocaleString()}</Text>
                )}
              </View>

              {/* Pipeline diagram */}
              <View style={styles.pipelineWrap}>
                <PipelineDiagram currentStatus={status} />
              </View>

              {/* Status detail */}
              {sub.statusDetail ? (
                <View style={styles.statusDetail}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.statusDetailText}>{sub.statusDetail}</Text>
                </View>
              ) : null}

              {/* Action row */}
              <View style={styles.subActions}>
                {actionLabel && (
                  <Pressable style={styles.subAction} onPress={() => handleSubmissionAction(sub)}>
                    <Text style={styles.subActionText}>{actionLabel}</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                  </Pressable>
                )}
                {status === 'live' && (
                  <Pressable style={styles.analyticsBtn} onPress={() => navigation.navigate('SellerAnalytics', { subId: sub.id })}>
                    <Ionicons name="bar-chart-outline" size={13} color={colors.primary} />
                    <Text style={styles.analyticsBtnText}>{t('sellerDashboard.analytics')}</Text>
                  </Pressable>
                )}
              </View>

              {/* Pause / make live again / mark sold (B1) */}
              {sub.listingId && (status === 'live' || status === 'paused') ? (
                <View style={styles.listingControls}>
                  <Pressable
                    style={styles.controlBtn}
                    onPress={() => changeListingStatus(sub, status === 'live' ? 'paused' : 'live')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.controlText}>{status === 'live' ? t('sellerDashboard.pauseListing') : t('sellerDashboard.makeLiveAgain')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.controlBtn, styles.controlBtnDanger]}
                    onPress={() => changeListingStatus(sub, 'sold')}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.controlText, styles.controlTextDanger]}>{t('sellerDashboard.markAsSold')}</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Change price (live listings only) */}
              {status === 'live' && (
                <View style={styles.relistSection}>
                  {relistId === sub.id ? (
                    <View style={styles.relistExpanded}>
                      <TextInput
                        style={styles.relistInput}
                        value={relistPrice}
                        onChangeText={setRelistPrice}
                        placeholder={t('sellerDashboard.newPricePlaceholder')}
                        keyboardType="numeric"
                        placeholderTextColor={colors.textMuted}
                      />
                      <View style={styles.relistBtns}>
                        <Pressable style={styles.relistCancel} onPress={() => setRelistId(null)}>
                          <Text style={styles.relistCancelText}>{t('sellerDashboard.cancel')}</Text>
                        </Pressable>
                        <Pressable style={styles.relistConfirm} onPress={() => handleRelist(sub)}>
                          <Text style={styles.relistConfirmText}>{t('sellerDashboard.relistBtn')}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable style={styles.relistBtn} onPress={() => handleRelist(sub)}>
                      <Ionicons name="pricetag-outline" size={13} color={colors.amber} />
                      <Text style={styles.relistBtnText}>{t('sellerDashboard.changePrice')}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Submit CTA */}
        <Pressable style={styles.submitCta} onPress={() => gate('CarSubmission')}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          <Text style={styles.submitCtaText}>{t('sellerDashboard.submitAnotherCta')}</Text>
        </Pressable>

        {/* How it works */}
        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>{t('sellerDashboard.howSawaWorks')}</Text>
          {[
            { icon: 'shield-checkmark-outline', text: t('sellerDashboard.step1') },
            { icon: 'time-outline', text: t('sellerDashboard.step2') },
            { icon: 'scan-outline', text: t('sellerDashboard.step3') },
            { icon: 'camera-outline', text: t('sellerDashboard.step4') },
            { icon: 'storefront-outline', text: t('sellerDashboard.step5') },
          ].map((item, i) => (
            <View key={i} style={styles.howRow}>
              <View style={styles.howDot}>
                <Ionicons name={item.icon} size={14} color={colors.textSecondary} />
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
  listingControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  controlBtn: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  controlBtnDanger: { borderColor: colors.statusRejected },
  controlText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.slate700 },
  controlTextDanger: { color: colors.statusRejected },
  scroll: { paddingBottom: 40 },
  addBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  statsBanner: { margin: 16, borderRadius: radius.xxl, padding: 18 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontFamily: fonts.extraBold, color: colors.textPrimary },
  submitNewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.blueTint,
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6,
  },
  submitNewText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primary },
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
  subTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  subDate: { fontSize: 11, color: colors.textMuted, marginTop: 2, marginBottom: 6 },
  subPrice: { fontVariant: ['tabular-nums'], fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusBadgeText: { fontSize: 11, fontFamily: fonts.bold },
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
  pipelineLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center', maxWidth: 52 },
  pipelineLine: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 10, marginHorizontal: 2 },
  pipelineLineDone: { backgroundColor: colors.primary },
  statusDetail: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
  },
  statusDetailText: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  subActions: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.borderSoft,
  },
  subAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12,
    backgroundColor: colors.blueTint,
  },
  subActionText: { fontSize: 13, fontFamily: fonts.bold, color: colors.primary },
  analyticsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 12,
    borderLeftWidth: 1, borderLeftColor: colors.borderSoft,
    backgroundColor: colors.greenTint,
  },
  analyticsBtnText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primary },
  relistSection: {
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
  },
  relistBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  relistBtnText: { fontSize: 12, fontFamily: fonts.bold, color: colors.amberText },
  relistExpanded: { padding: 12, gap: 8 },
  relistInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, fontFamily: fonts.medium, color: colors.textPrimary,
  },
  relistBtns: { flexDirection: 'row', gap: 8 },
  relistCancel: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.lg,
  },
  relistCancelText: { fontSize: 13, fontFamily: fonts.bold, color: colors.textSecondary },
  relistConfirm: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: colors.amber, borderRadius: radius.lg,
  },
  relistConfirmText: { fontSize: 13, fontFamily: fonts.bold, color: '#fff' },
  submitCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: colors.primary + '66', borderStyle: 'dashed',
    borderRadius: radius.xxl, paddingVertical: 18,
    marginHorizontal: 16, marginTop: 4,
  },
  submitCtaText: { fontSize: 15, fontFamily: fonts.bold, color: colors.primary },
  howItWorks: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xxl,
    padding: 16, marginHorizontal: 16, marginTop: 16,
    gap: 10,
  },
  howTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 4 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center',
  },
  howText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
});
