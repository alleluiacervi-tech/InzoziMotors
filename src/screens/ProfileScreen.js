import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Badge from '../components/Badge';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, fonts } from '../theme';

const MENU_SELLER = [
  { icon: 'car-outline', label: 'My Submissions', screen: 'SellerDashboard' },
  { icon: 'trending-up-outline', label: "What's My Car Worth?", screen: 'CarValuation' },
];

const MENU_ACCOUNT = [
  { icon: 'key-outline', label: 'My Rentals', screen: 'MyRentals' },
  { icon: 'chatbubbles-outline', label: 'Messages', screen: 'Messages' },
  { icon: 'shield-checkmark-outline', label: 'The Inzozi Promise', screen: 'InzoziPromise' },
  { icon: 'settings-outline', label: 'Settings', screen: 'Settings' },
  { icon: 'help-circle-outline', label: 'Help & Support', screen: null },
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
              <Ionicons name={m.icon} size={20} color={colors.textSecondary} />
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
  const { currentUser, submissions, logoutUser, idVerificationStatus, isLoggedIn, loginAsGuest } = useApp();

  const liveCount = submissions.filter((s) => s.status === 'live').length;
  const soldCount = submissions.filter((s) => s.status === 'sold').length;

  const idPts = idVerificationStatus === 'approved' ? 30 : 0;
  const salesPts = Math.min(30, soldCount * 3);
  const trustScore = idPts + salesPts + 17 + 18; // response + reviews are estimates until backend

  // Guest state — prompt to sign in instead of showing a fake verified profile
  if (!isLoggedIn) {
    return (
      <Screen background={colors.bg}>
        <View style={styles.guestWrap}>
          <View style={styles.guestAvatar}>
            <Ionicons name="person-outline" size={36} color={colors.textMuted} />
          </View>
          <Text style={styles.guestTitle}>You're browsing as a guest</Text>
          <Text style={styles.guestSub}>
            Sign in to save cars, message sellers, track bookings, and sell your car.
          </Text>
          <Pressable style={styles.guestBtn} onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.guestBtnText}>Sign In</Text>
          </Pressable>
          <Pressable onPress={() => loginAsGuest()} style={{ marginTop: 14 }}>
            <Text style={styles.guestSkip}>Continue with a demo account</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const STATS = [
    { label: 'Submitted', value: String(submissions.length) },
    { label: 'Live', value: String(liveCount) },
    { label: 'Trust Score', value: `${trustScore}/100` },
  ];

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
            <View style={styles.badgeRow}>
              {idVerificationStatus === 'approved' ? (
                <>
                  <Badge variant="success" label="Verified Seller" />
                  <Badge variant="live" dot label="ID Verified" />
                </>
              ) : (
                <Badge variant="tag" label="ID verified at your first inspection" />
              )}
            </View>
          </View>
          <Pressable style={styles.editBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          {STATS.map((s, i) => (
            <View key={s.label} style={[styles.stat, i < STATS.length - 1 && styles.statBorder]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Seller dashboard quick-link */}
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

        <MenuSection title="My Listings" items={MENU_SELLER} navigation={navigation} />
        <MenuSection title="Account" items={MENU_ACCOUNT} navigation={navigation} />

        {/* Team Portal */}
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
  header: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.navyMid,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontFamily: fonts.extraBold },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name: { fontSize: 20, fontFamily: fonts.extraBold, color: colors.textPrimary },
  email: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
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
  statValue: { fontSize: 20, fontFamily: fonts.extraBold, color: colors.textPrimary },
  statLabel: { fontSize: 11, fontFamily: fonts.medium, color: colors.textSecondary, marginTop: 2 },

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
  dashBannerTitle: { color: '#fff', fontSize: 16, fontFamily: fonts.extraBold },
  dashBannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: fonts.regular, marginTop: 2 },

  menuSection: { paddingHorizontal: 20, marginTop: 24 },
  menuSectionTitle: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  menu: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, overflow: 'hidden',
    ...shadows.card,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  menuIcon: { width: 36, alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: fonts.semiBold, color: colors.textPrimary },

  adminAccess: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 28, paddingVertical: 8,
  },
  adminAccessText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textMuted },

  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 12, paddingVertical: 10,
  },
  logoutText: { color: '#EF4444', fontSize: 15, fontFamily: fonts.bold },
  guestWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  guestAvatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  guestTitle: { fontSize: 19, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.3 },
  guestSub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  guestBtn: {
    alignSelf: 'stretch', backgroundColor: colors.primary,
    paddingVertical: 15, borderRadius: radius.xl,
    alignItems: 'center', marginTop: 22,
  },
  guestBtnText: { color: '#fff', fontSize: 15, fontFamily: fonts.bold },
  guestSkip: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.primary },
});
