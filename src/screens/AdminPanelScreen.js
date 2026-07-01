import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, radius, shadows } from '../theme';
import { useApp } from '../context/AppContext';

const TABS = ['Queue', 'Inspections', 'Handovers', 'Listings'];

const STAT_CARDS = (pendingCount) => [
  { label: 'Pending IDs', value: String(pendingCount), icon: 'person-outline', color: colors.amber, bg: colors.amberTint },
  { label: "Today's Inspections", value: '2', icon: 'scan-outline', color: colors.statusScheduled, bg: colors.statusScheduledBg },
  { label: 'Active Listings', value: '25', icon: 'car-outline', color: colors.primary, bg: colors.greenTint },
  { label: 'This Month', value: '$14.2k', icon: 'trending-up-outline', color: colors.primary, bg: colors.greenTint },
];

function HandoversTab({ handovers, onConfirm }) {
  const pending = handovers.filter((h) => h.status === 'pending');
  const done = handovers.filter((h) => h.status === 'complete');

  if (handovers.length === 0) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={colors.primary} />
          <Text style={styles.emptyTitle}>No handovers yet</Text>
          <Text style={styles.emptySub}>Booked handover slots will appear here.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {pending.length > 0 && (
        <>
          <Text style={styles.subHeader}>Upcoming ({pending.length})</Text>
          {pending.map((h) => (
            <View key={h.id} style={[styles.inspCard, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.inspDot, { backgroundColor: colors.statusReserved }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inspSeller}>{h.car}</Text>
                  <Text style={styles.inspCar}>Buyer: {h.buyer} · Seller: {h.seller}</Text>
                  <View style={styles.inspMeta}>
                    <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.inspMetaText}>{h.date} · {h.time}</Text>
                    <View style={styles.inspMetaDot} />
                    <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.inspMetaText}>{h.center}</Text>
                  </View>
                </View>
                <View style={[styles.inspBadge, { backgroundColor: colors.statusReservedBg }]}>
                  <Text style={[styles.inspBadgeText, { color: colors.statusReserved }]}>BOOKED</Text>
                </View>
              </View>
              <Pressable
                style={styles.confirmHandoverBtn}
                onPress={() => onConfirm(h.id, h.car)}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={styles.confirmHandoverBtnText}>Confirm Handover → Mark Sold</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}
      {done.length > 0 && (
        <>
          <Text style={[styles.subHeader, { marginTop: 20 }]}>Completed ({done.length})</Text>
          {done.map((h) => (
            <View key={h.id} style={[styles.inspCard, { opacity: 0.6 }]}>
              <View style={[styles.inspDot, { backgroundColor: colors.statusSold }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inspSeller}>{h.car}</Text>
                <Text style={styles.inspCar}>{h.buyer} → {h.seller}</Text>
                <Text style={[styles.inspMetaText, { marginTop: 4 }]}>{h.date} · {h.center}</Text>
              </View>
              <View style={[styles.inspBadge, { backgroundColor: colors.statusSoldBg }]}>
                <Text style={[styles.inspBadgeText, { color: colors.statusSold }]}>SOLD</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const STATUS_MAP = {
  under_review: { label: 'Under Review', color: colors.statusPending, bg: colors.statusPendingBg },
  scheduled: { label: 'Scheduled', color: colors.statusScheduled, bg: colors.statusScheduledBg },
  live: { label: 'Live', color: colors.statusLive, bg: colors.statusLiveBg },
  sold: { label: 'Sold', color: colors.statusSold, bg: colors.statusSoldBg },
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
          <Ionicons name="checkmark-done-circle" size={48} color={colors.primary} />
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
                  <View key={doc} style={styles.verifyDocChip}>
                    <Ionicons name="document-text-outline" size={11} color={colors.primary} />
                    <Text style={styles.verifyDocText}>{doc}</Text>
                  </View>
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

  const goToForm = (inspection) => {
    navigation.navigate('InspectionForm', { inspection });
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
                  <Ionicons name="time-outline" size={12} color={colors.primary} />
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

const MOCK_LISTINGS = [
  { id: '1', title: '2022 BMW 4 Series', price: '$42,500', status: 'live', views: 234, inquiries: 12 },
  { id: '2', title: '2021 Mercedes C-Class', price: '$38,000', status: 'live', views: 187, inquiries: 8 },
  { id: '3', title: '2020 Toyota RAV4', price: '$26,000', status: 'live', views: 156, inquiries: 6 },
  { id: '4', title: '2019 Honda Civic', price: '$18,500', status: 'under_review', views: 0, inquiries: 0 },
  { id: '5', title: '2018 Subaru Forester', price: '$22,000', status: 'scheduled', views: 0, inquiries: 0 },
];

function ListingsTab({ navigation }) {
  return (
    <View style={styles.tabContent}>
      {MOCK_LISTINGS.map((l) => (
        <Pressable key={l.id} style={styles.listingCard} onPress={() => navigation.navigate('VehicleDetail', { carId: l.id })}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listingTitle}>{l.title}</Text>
            <Text style={styles.listingPrice}>{l.price}</Text>
            {l.views > 0 && (
              <View style={styles.listingMeta}>
                <Ionicons name="eye-outline" size={12} color={colors.textMuted} />
                <Text style={styles.listingMetaText}>{l.views} views</Text>
                <View style={styles.inspMetaDot} />
                <Ionicons name="chatbubble-outline" size={12} color={colors.textMuted} />
                <Text style={styles.listingMetaText}>{l.inquiries} inquiries</Text>
              </View>
            )}
          </View>
          <StatusBadge status={l.status} />
        </Pressable>
      ))}
    </View>
  );
}

export default function AdminPanelScreen({ navigation }) {
  const { pendingVerifications, adminInspections, adminApproveVerification, adminRejectVerification, handovers, confirmHandover } = useApp();
  const [activeTab, setActiveTab] = useState(0);

  const pendingCount = pendingVerifications.filter((v) => v.status === 'pending').length;
  const pendingHandovers = handovers.filter((h) => h.status === 'pending').length;

  const handleApprove = (id) => {
    Alert.alert('Approve Seller?', 'This seller will be notified and can submit cars for listing.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve', style: 'default',
        onPress: () => adminApproveVerification(id),
      },
    ]);
  };

  const handleReject = (id) => {
    Alert.alert('Reject Verification?', 'The seller will be asked to resubmit clearer documents.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => adminRejectVerification(id) },
    ]);
  };

  const handleConfirmHandover = (handoverId, carName) => {
    Alert.alert(
      'Confirm Handover?',
      `This will mark the ${carName} as sold and remove it from the marketplace. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm & Mark Sold', style: 'default', onPress: () => confirmHandover(handoverId) },
      ],
    );
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title="Admin Panel"
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>INZOZI TEAM</Text>
          </View>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Stats */}
        <LinearGradient colors={[colors.navyMid, colors.navyDeep]} style={styles.statsHero}>
          <Text style={styles.statsHeroTitle}>Platform Overview</Text>
          <Text style={styles.statsHeroSub}>Today — Jun 28, 2026</Text>
          <View style={styles.statsGrid}>
            {STAT_CARDS(pendingCount).map((s) => (
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

        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map((tab, idx) => {
            const badge = idx === 0 && pendingCount > 0 ? pendingCount
              : idx === 2 && pendingHandovers > 0 ? pendingHandovers : null;
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
        </View>

        {activeTab === 0 && (
          <QueueTab
            verifications={pendingVerifications}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
        {activeTab === 1 && <InspectionsTab inspections={adminInspections} navigation={navigation} />}
        {activeTab === 2 && <HandoversTab handovers={handovers} onConfirm={handleConfirmHandover} />}
        {activeTab === 3 && <ListingsTab navigation={navigation} />}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  adminBadge: {
    backgroundColor: colors.primary + '22',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  adminBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  statsHero: { margin: 16, borderRadius: radius.xxl, padding: 20 },
  statsHeroTitle: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
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
  statValue: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
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
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
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
  verifyInitials: { fontSize: 15, fontWeight: '800', color: '#fff' },
  verifyName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  verifyTime: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  verifyDocs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  verifyDocChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.blueTint,
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3,
  },
  verifyDocText: { fontSize: 10, fontWeight: '600', color: colors.primary },
  verifyActions: { flexDirection: 'row', gap: 8 },
  verifyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: radius.lg,
  },
  verifyBtnApprove: { backgroundColor: colors.primary },
  verifyBtnReject: { backgroundColor: colors.statusRejectedBg, borderWidth: 1, borderColor: colors.statusRejected + '44' },
  verifyBtnApproveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  verifyBtnRejectText: { fontSize: 13, fontWeight: '700', color: colors.statusRejected },
  // Inspection cards
  subHeader: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  inspCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14,
    ...shadows.card,
  },
  inspCardToday: { borderColor: colors.primary + '44', backgroundColor: colors.blueTint },
  inspDot: { width: 10, height: 10, borderRadius: 5 },
  inspSeller: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  inspCar: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  inspMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  inspMetaText: { fontSize: 11, color: colors.textMuted },
  inspMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border, marginHorizontal: 2 },
  inspBadge: {
    backgroundColor: colors.primary, borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  inspBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  confirmBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  confirmBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  startInspBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.greenTint,
    borderWidth: 1, borderColor: colors.primary + '44',
    borderRadius: radius.lg, paddingHorizontal: 8, paddingVertical: 4,
  },
  startInspBtnText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  // Listing cards
  listingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14,
    ...shadows.card,
  },
  listingTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  listingPrice: { fontSize: 15, fontWeight: '800', color: colors.primary, marginTop: 2 },
  listingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  listingMetaText: { fontSize: 11, color: colors.textMuted },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontWeight: '700' },
  confirmHandoverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 11,
  },
  confirmHandoverBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textMuted },
});
