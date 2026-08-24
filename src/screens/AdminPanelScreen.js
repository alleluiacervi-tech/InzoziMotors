import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { ErrorState } from '../components/StateViews';
import adminApi from '../api/admin';
import inspectionsApi from '../api/inspections';
import { colors, radius, shadows, fonts } from '../theme';
import { showToast, showConfirm } from '../components/Feedback';
import { useApp } from '../context/AppContext';

const TABS = ['Submissions', 'IDs', 'Inspections', 'Listings'];

const STAT_CARDS = ({ pendingCount, reviewCount, todayInspections, activeListings }) => [
  { label: 'To Review', value: String(reviewCount), icon: 'file-tray-full-outline', color: colors.amberText, bg: colors.amberTint },
  { label: 'Pending IDs', value: String(pendingCount), icon: 'person-outline', color: colors.amberText, bg: colors.amberTint },
  { label: "Today's Inspections", value: String(todayInspections), icon: 'scan-outline', color: colors.statusScheduled, bg: colors.statusScheduledBg },
  { label: 'Active Listings', value: String(activeListings), icon: 'car-outline', color: colors.primary, bg: colors.greenTint },
];

// Admin review of seller submissions — the first step of the pipeline
function SubmissionsTab({ submissions, onApprove, onReject }) {
  const toReview = submissions.filter((s) => s.status === 'under_review');
  const rest = submissions.filter((s) => s.status !== 'under_review');

  return (
    <View style={styles.tabContent}>
      {toReview.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-circle" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Queue is clear</Text>
          <Text style={styles.emptySub}>New seller submissions will appear here for review.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.subHeader}>Awaiting review ({toReview.length})</Text>
          {toReview.map((s) => (
            <View key={s.id} style={[styles.inspCard, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.inspDot, { backgroundColor: colors.amber }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inspSeller}>{s.carTitle}</Text>
                  <Text style={styles.inspCar}>
                    {Number(s.mileage || 0).toLocaleString()} km
                    {s.condition ? ` · ${s.condition}` : ''}
                    {s.askingPrice ? ` · Asking RWF ${Number(s.askingPrice).toLocaleString()}` : ''}
                  </Text>
                  <Text style={[styles.inspMetaText, { marginTop: 4 }]}>Submitted {s.submittedDate}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  style={[styles.verifyBtn, styles.verifyBtnApprove, { flex: 1 }]}
                  onPress={() => onApprove(s)}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.verifyBtnApproveText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.verifyBtn, styles.verifyBtnReject, { flex: 1 }]}
                  onPress={() => onReject(s)}
                >
                  <Ionicons name="close" size={16} color={colors.statusRejected} />
                  <Text style={styles.verifyBtnRejectText}>Request Changes</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}

      {rest.length > 0 && (
        <>
          <Text style={[styles.subHeader, { marginTop: 20 }]}>In pipeline ({rest.length})</Text>
          {rest.map((s) => (
            <View key={s.id} style={styles.inspCard}>
              <View style={[styles.inspDot, { backgroundColor: colors.border }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inspSeller}>{s.carTitle}</Text>
                <Text style={styles.inspCar}>{s.statusDetail || ''}</Text>
              </View>
              <StatusBadge status={s.status} />
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const STATUS_MAP = {
  under_review: { label: 'Under Review', color: colors.statusPending, bg: colors.statusPendingBg },
  approved: { label: 'Approved', color: colors.statusLive, bg: colors.statusLiveBg },
  scheduled: { label: 'Scheduled', color: colors.statusScheduled, bg: colors.statusScheduledBg },
  live: { label: 'Live', color: colors.statusLive, bg: colors.statusLiveBg },
  sold: { label: 'Sold', color: colors.statusSold, bg: colors.statusSoldBg },
  rejected: { label: 'Changes Requested', color: colors.statusRejected, bg: colors.statusRejectedBg },
};

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, color: colors.textMuted, bg: colors.surfaceAlt };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function QueueTab({ verifications, onApprove, onReject }) {
  const pending = verifications.filter((v) => v.status === 'pending');
  return (
    <View style={styles.tabContent}>
      {pending.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-circle" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>All clear!</Text>
          <Text style={styles.emptySub}>No pending ID verifications.</Text>
        </View>
      ) : (
        pending.map((v) => (
          <View key={v.id} style={styles.verifyCard}>
            <View style={styles.verifyAvatar}>
              <Text style={styles.verifyInitials}>{v.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyName}>{v.name}</Text>
              <Text style={styles.verifyTime}>Submitted {v.submitted}</Text>
              <View style={styles.verifyDocs}>
                {['National ID (front)', 'National ID (back)', 'Selfie with ID'].map((doc) => (
                  <Pressable
                    key={doc}
                    style={styles.verifyDocChip}
                    onPress={() => showToast('The full document viewer ships with the admin web dashboard.', 'info')}
                  >
                    <Ionicons name="document-text-outline" size={11} color={colors.primary} />
                    <Text style={styles.verifyDocText}>{doc}</Text>
                    <Ionicons name="eye-outline" size={11} color={colors.primary} />
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.verifyActions}>
              <Pressable
                style={[styles.verifyBtn, styles.verifyBtnApprove]}
                onPress={() => onApprove(v.id)}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.verifyBtnApproveText}>Approve</Text>
              </Pressable>
              <Pressable
                style={[styles.verifyBtn, styles.verifyBtnReject]}
                onPress={() => onReject(v.id)}
              >
                <Ionicons name="close" size={16} color={colors.statusRejected} />
                <Text style={styles.verifyBtnRejectText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function InspectionsTab({ inspections, navigation }) {
  const today = inspections.filter((i) => i.status === 'today');
  const upcoming = inspections.filter((i) => i.status !== 'today');

  const goToForm = async (inspection) => {
    try {
      const isDemoRow = !String(inspection.id || '').includes('-');
      const started = inspection.workflowStatus === 'scheduled' && !isDemoRow
        ? await inspectionsApi.start(inspection.id)
        : inspection;
      navigation.navigate('InspectionForm', { inspection: { ...inspection, ...started, workflowStatus: started.status || inspection.workflowStatus } });
    } catch (error) {
      showToast(error?.message || 'Could not start this inspection.', 'error');
    }
  };

  return (
    <View style={styles.tabContent}>
      {today.length > 0 && (
        <>
          <Text style={styles.subHeader}>Today ({today.length})</Text>
          {today.map((i) => (
            <Pressable key={i.id} style={[styles.inspCard, styles.inspCardToday]} onPress={() => goToForm(i)}>
              <View style={[styles.inspDot, { backgroundColor: colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inspSeller}>{i.seller}</Text>
                <Text style={styles.inspCar}>{i.car}</Text>
                <View style={styles.inspMeta}>
                  <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.inspMetaText, { color: colors.primary }]}>{i.time}</Text>
                  <View style={styles.inspMetaDot} />
                  <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.inspMetaText}>{i.center}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <View style={styles.inspBadge}>
                  <Text style={styles.inspBadgeText}>TODAY</Text>
                </View>
                <View style={styles.startInspBtn}>
                  <Text style={styles.startInspBtnText}>Start</Text>
                  <Ionicons name="chevron-forward" size={11} color={colors.primary} />
                </View>
              </View>
            </Pressable>
          ))}
        </>
      )}
      {upcoming.length > 0 && (
        <>
          <Text style={[styles.subHeader, { marginTop: 20 }]}>Upcoming ({upcoming.length})</Text>
          {upcoming.map((i) => (
            <View key={i.id} style={styles.inspCard}>
              <View style={[styles.inspDot, { backgroundColor: colors.border }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inspSeller}>{i.seller}</Text>
                <Text style={styles.inspCar}>{i.car}</Text>
                <View style={styles.inspMeta}>
                  <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.inspMetaText}>{i.time}</Text>
                  <View style={styles.inspMetaDot} />
                  <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.inspMetaText}>{i.center}</Text>
                </View>
              </View>
              <Pressable style={styles.confirmBtn} onPress={() => goToForm(i)}>
                <Text style={styles.confirmBtnText}>Open Form</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

// Admins browse every status, not just live — that is the whole point of the
// admin listings route versus the public /cars feed.
const LISTING_FILTERS = ['draft', 'under_review', 'scheduled', 'approved', 'live', 'paused', 'sold', 'rejected', 'archived'];
const FILTER_LABEL = {
  draft: 'Draft', live: 'Live', under_review: 'Review', scheduled: 'Scheduled', approved: 'Approved',
  paused: 'Paused', sold: 'Sold', rejected: 'Rejected', archived: 'Archived',
};

function ListingsTab({ navigation, cars }) {
  const [status, setStatus] = useState('live');
  const [listings, setListings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminApi.getListings({ status })
      .then((rows) => { if (alive) setListings(rows); })
      .catch((err) => {
        console.warn('Admin listings unreachable — falling back to browse data:', err.message);
        if (alive) setListings(null);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [status]);

  // Without the admin route, show whatever the app already loaded for that status
  const rows = listings || (cars || []).filter((c) => (c.status || 'live') === status);

  const openListing = (row) => {
    const car = cars?.find((c) => c.id === row.id);
    navigation.navigate('VehicleDetail', { car: car || row });
  };

  return (
    <View style={styles.tabContent}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listingFilters}
      >
        {LISTING_FILTERS.map((s) => (
          <Pressable
            key={s}
            style={[styles.listingFilter, status === s && styles.listingFilterOn]}
            onPress={() => setStatus(s)}
          >
            <Text style={[styles.listingFilterText, status === s && styles.listingFilterTextOn]}>
              {FILTER_LABEL[s]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 24 }} />
      ) : rows.length === 0 ? (
        <Text style={styles.listingEmpty}>No {FILTER_LABEL[status].toLowerCase()} listings.</Text>
      ) : (
        rows.map((l) => (
          <Pressable key={l.id} style={styles.listingCard} onPress={() => openListing(l)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listingTitle}>{l.title}</Text>
              <Text style={styles.listingPrice}>RWF {Number(l.price || 0).toLocaleString()}</Text>
              {(l.views > 0 || l.saves_count > 0) && (
                <View style={styles.listingMeta}>
                  <Ionicons name="eye-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.listingMetaText}>{l.views || 0} views</Text>
                  <View style={styles.inspMetaDot} />
                  <Ionicons name="heart-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.listingMetaText}>{l.saves_count ?? l.saves ?? 0} saves</Text>
                </View>
              )}
            </View>
            <StatusBadge status={l.status} />
          </Pressable>
        ))
      )}
    </View>
  );
}

export default function AdminPanelScreen({ navigation }) {
  const {
    pendingVerifications, adminInspections, adminApproveVerification, adminRejectVerification,
    submissions, updateSubmissionStatus, cars,
    currentUser, demoMode,
  } = useApp();
  const [activeTab, setActiveTab] = useState(0);

  // Defence in depth: the entry points are role-gated, every admin API is
  // server-gated, and this screen refuses to render for non-staff too. Without
  // this, anyone who reached the route saw what looked like a live KYC queue.
  const isAdmin = demoMode || currentUser?.role === 'admin';

  const pendingCount = pendingVerifications.filter((v) => v.status === 'pending').length;
  const reviewCount = submissions.filter((s) => s.status === 'under_review').length;
  const todayInspections = adminInspections.filter((i) => i.status === 'today').length;

  const handleApproveSubmission = (sub) => {
    showConfirm({
      title: 'Approve submission?',
      message: `${sub.carTitle} will be approved — the seller can then book an inspection slot.`,
      confirmLabel: 'Approve',
    }).then((ok) => {
      if (ok) updateSubmissionStatus(sub.id, 'approved', 'Approved — book your inspection at any Sawa center');
    });
  };

  const handleRejectSubmission = (sub) => {
    showConfirm({
      title: 'Request changes?',
      message: `The seller will be asked to update the ${sub.carTitle} submission and resubmit.`,
      confirmLabel: 'Request Changes', destructive: true,
    }).then((ok) => {
      if (ok) updateSubmissionStatus(sub.id, 'rejected', 'Please update your submission details and resubmit');
    });
  };

  const handleApprove = (id) => {
    showConfirm({
      title: 'Approve seller?',
      message: 'This seller will be notified and can submit cars for listing.',
      confirmLabel: 'Approve',
    }).then((ok) => { if (ok) adminApproveVerification(id); });
  };

  const handleReject = (id) => {
    showConfirm({
      title: 'Reject verification?',
      message: 'The seller will be asked to resubmit clearer documents.',
      confirmLabel: 'Reject', destructive: true,
    }).then((ok) => { if (ok) adminRejectVerification(id); });
  };

  if (!isAdmin) {
    return (
      <Screen background={colors.bg}>
        <BackHeader title="Team Portal" onBack={() => navigation.goBack()} />
        <ErrorState
          icon="lock-closed-outline"
          title="Sawa team access only"
          sub="This area is for Sawa staff. If you're on the team, sign in with your staff account."
        />
      </Screen>
    );
  }

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title="Admin Panel"
        onBack={() => navigation.goBack()}
        right={
          <Pressable style={styles.analyticsLink} onPress={() => navigation.navigate('AdminAnalytics')} accessibilityRole="button" accessibilityLabel="Analytics">
            <Ionicons name="stats-chart-outline" size={17} color={colors.textSecondary} />
          </Pressable>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Stats */}
        <LinearGradient colors={[colors.navyMid, colors.navyDeep]} style={styles.statsHero}>
          <Text style={styles.statsHeroTitle}>Platform Overview</Text>
          <Text style={styles.statsHeroSub}>
            Today — {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
          <View style={styles.statsGrid}>
            {STAT_CARDS({ pendingCount, reviewCount, todayInspections, activeListings: cars.length }).map((s) => (
              <View key={s.label} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon} size={18} color={s.color} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <Pressable style={styles.fullConsole} onPress={() => Linking.openURL('https://sawacars.com/admin-portal').catch(() => showToast('Could not open the full admin console.', 'error'))}>
          <View style={styles.fullConsoleIcon}><Ionicons name="desktop-outline" size={21} color={colors.primary} /></View>
          <View style={{ flex: 1 }}><Text style={styles.fullConsoleTitle}>Open full admin console</Text><Text style={styles.fullConsoleText}>Accounts, passwords, contact permissions, listings, rentals, settings and audit history.</Text></View>
          <Ionicons name="open-outline" size={18} color={colors.textMuted} />
        </Pressable>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {TABS.map((tab, idx) => {
            const badge = idx === 0 && reviewCount > 0 ? reviewCount
              : idx === 1 && pendingCount > 0 ? pendingCount : null;
            return (
              <Pressable
                key={tab}
                style={[styles.tab, activeTab === idx && styles.tabActive]}
                onPress={() => setActiveTab(idx)}
              >
                <Text style={[styles.tabText, activeTab === idx && styles.tabTextActive]}>{tab}</Text>
                {badge && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{badge}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {activeTab === 0 && (
          <SubmissionsTab
            submissions={submissions}
            onApprove={handleApproveSubmission}
            onReject={handleRejectSubmission}
          />
        )}
        {activeTab === 1 && (
          <QueueTab
            verifications={pendingVerifications}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
        {activeTab === 2 && <InspectionsTab inspections={adminInspections} navigation={navigation} />}
        {activeTab === 3 && <ListingsTab navigation={navigation} cars={cars} />}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  analyticsLink: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  adminBadge: {
    backgroundColor: colors.primary + '22',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  adminBadgeText: { fontSize: 11, fontFamily: fonts.extraBold, color: colors.primary, letterSpacing: 0.5 },
  statsHero: { margin: 16, borderRadius: radius.xxl, padding: 20 },
  fullConsole: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 4, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, backgroundColor: colors.surface, padding: 14, ...shadows.card },
  fullConsoleIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueTint },
  fullConsoleTitle: { fontSize: 14.5, fontFamily: fonts.extraBold, color: colors.textPrimary },
  fullConsoleText: { marginTop: 3, fontSize: 11.5, lineHeight: 16, color: colors.textSecondary },
  statsHeroTitle: { fontSize: 18, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -0.3 },
  statsHeroSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.xl,
    padding: 14,
    gap: 6,
  },
  statIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    paddingHorizontal: 16,
    gap: 0,
  },
  tab: {
    minHeight: 48,
    alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontFamily: fonts.bold },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 11, fontFamily: fonts.extraBold, color: '#fff' },
  tabContent: { padding: 16, gap: 10 },
  // Verification cards
  verifyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: 16,
    gap: 12,
    ...shadows.card,
  },
  verifyAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.navyMid,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  verifyInitials: { fontSize: 15, fontFamily: fonts.extraBold, color: '#fff' },
  verifyName: { fontSize: 15, fontFamily: fonts.bold, color: colors.textPrimary },
  verifyTime: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  verifyDocs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  verifyDocChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.blueTint,
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3,
  },
  verifyDocText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.primary },
  verifyActions: { flexDirection: 'row', gap: 8 },
  verifyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    minHeight: 48, gap: 6, paddingVertical: 10, borderRadius: radius.lg,
  },
  verifyBtnApprove: { backgroundColor: colors.primary },
  verifyBtnReject: { backgroundColor: colors.statusRejectedBg, borderWidth: 1, borderColor: colors.statusRejected + '44' },
  verifyBtnApproveText: { fontSize: 13, fontFamily: fonts.bold, color: '#fff' },
  verifyBtnRejectText: { fontSize: 13, fontFamily: fonts.bold, color: colors.statusRejected },
  // Inspection cards
  subHeader: { fontSize: 13, fontFamily: fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  inspCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14,
    ...shadows.card,
  },
  inspCardToday: { borderColor: colors.primary + '44', backgroundColor: colors.blueTint },
  inspDot: { width: 10, height: 10, borderRadius: 5 },
  inspSeller: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  inspCar: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  inspMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  inspMetaText: { fontSize: 11, color: colors.textMuted },
  inspMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border, marginHorizontal: 2 },
  inspBadge: {
    backgroundColor: colors.primary, borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  inspBadgeText: { fontSize: 10, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: 0.5 },
  confirmBtn: {
    minHeight: 48, justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  confirmBtnText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primary },
  startInspBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.greenTint,
    borderWidth: 1, borderColor: colors.primary + '44',
    borderRadius: radius.lg, paddingHorizontal: 8, paddingVertical: 4,
  },
  startInspBtnText: { fontSize: 11, fontFamily: fonts.bold, color: colors.primary },
  // Listing cards
  listingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14,
    ...shadows.card,
  },
  listingTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  listingPrice: { fontVariant: ['tabular-nums'], fontSize: 15, fontFamily: fonts.extraBold, color: colors.primary, marginTop: 2 },
  listingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  listingMetaText: { fontSize: 11, color: colors.textMuted },
  listingFilters: { gap: 8, paddingBottom: 4 },
  listingFilter: {
    minHeight: 48, justifyContent: 'center',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  listingFilterOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  listingFilterText: { fontSize: 12.5, fontFamily: fonts.semiBold, color: colors.textSecondary },
  listingFilterTextOn: { color: '#fff' },
  listingEmpty: {
    textAlign: 'center', paddingVertical: 28,
    fontSize: 13, color: colors.textMuted,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontFamily: fonts.bold },
  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: fonts.bold, color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textMuted },
});
