import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Badge from '../components/Badge';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows } from '../theme';

const STATS = [
  { label: 'Submitted', value: '3' },
  { label: 'Live', value: '1' },
  { label: 'Trust', value: '92' },
];

const MENU_SELLER = [
  { icon: 'car-outline', label: 'My Submissions', screen: 'SellerDashboard' },
  { icon: 'add-circle-outline', label: 'Submit a Car for Sale', screen: 'CarSubmission' },
  { icon: 'shield-checkmark-outline', label: 'ID Verification', screen: 'IDVerification' },
  { icon: 'calendar-outline', label: 'Inspection Scheduling', screen: 'InspectionScheduling' },
];

const MENU_BUYER = [
  { icon: 'receipt-outline', label: 'Purchase History' },
  { icon: 'chatbubbles-outline', label: 'Messages', screen: 'Messages' },
  { icon: 'notifications-outline', label: 'Saved Searches' },
];

const MENU_ACCOUNT = [
  { icon: 'settings-outline', label: 'Settings', screen: 'Settings' },
  { icon: 'help-circle-outline', label: 'Help & Support' },
];

function MenuSection({ title, items, navigation }) {
  return (
    <View style={styles.menuSection}>
      <Text style={styles.menuSectionTitle}>{title}</Text>
      <View style={styles.menu}>
        {items.map((m, i) => (
          <Pressable
            key={m.label}
            style={[styles.menuItem, i < items.length - 1 && styles.menuBorder]}
            onPress={() => m.screen && navigation.navigate(m.screen)}
          >
            <View style={styles.menuIcon}>
              <Ionicons name={m.icon} size={20} color={colors.slate700} />
            </View>
            <Text style={styles.menuLabel}>{m.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { currentUser, submissions, logoutUser, idVerificationStatus } = useApp();

  const liveCount = submissions.filter((s) => s.status === 'live').length;

  return (
    <Screen background={colors.bg}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Profile header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{currentUser.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{currentUser.name}</Text>
              {idVerificationStatus === 'approved' && (
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              )}
            </View>
            <Text style={styles.email}>{currentUser.email}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Badge variant="success" label="Verified Seller" />
              <Badge variant="live" dot label="ID Verified" />
            </View>
          </View>
          <Pressable style={styles.editBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="create-outline" size={20} color={colors.slate700} />
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          {STATS.map((s, i) => (
            <View key={s.label} style={[styles.stat, i < 2 && styles.statBorder]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Seller Dashboard quick link */}
        <Pressable style={styles.dashBanner} onPress={() => navigation.navigate('SellerDashboard')}>
          <View style={styles.dashBannerIcon}>
            <Ionicons name="trending-up" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dashBannerTitle}>Seller Dashboard</Text>
            <Text style={styles.dashBannerSub}>
              {submissions.length} submissions · {liveCount} live on marketplace
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
        </Pressable>

        {/* Menu sections */}
        <MenuSection title="Selling" items={MENU_SELLER} navigation={navigation} />
        <MenuSection title="Buying" items={MENU_BUYER} navigation={navigation} />
        <MenuSection title="Account" items={MENU_ACCOUNT} navigation={navigation} />

        {/* Team Portal (Admin access) */}
        <Pressable style={styles.adminAccess} onPress={() => navigation.navigate('AdminPanel')}>
          <Ionicons name="grid-outline" size={16} color={colors.textMuted} />
          <Text style={styles.adminAccessText}>Team Portal</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </Pressable>

        {/* Logout */}
        <Pressable
          style={styles.logout}
          onPress={() => {
            logoutUser();
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.navyMid,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  email: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  editBtn: {
    width: 42, height: 42, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    marginHorizontal: 20, marginTop: 20,
    paddingVertical: 16,
    ...shadows.card,
  },
  stat: { flex: 1, alignItems: 'center' },
  statBorder: { borderRightWidth: 1, borderRightColor: colors.borderSoft },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  dashBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    marginHorizontal: 20, marginTop: 16,
    padding: 16,
  },
  dashBannerIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  dashBannerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  dashBannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  menuSection: { paddingHorizontal: 20, marginTop: 20 },
  menuSectionTitle: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  menu: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  menuIcon: { width: 36, alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  adminAccess: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 24, paddingVertical: 8,
  },
  adminAccessText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 10 },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
});
