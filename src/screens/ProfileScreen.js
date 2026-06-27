import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Badge from '../components/Badge';
import { useApp } from '../context/AppContext';
import { colors, radius } from '../theme';

const STATS = [
  { label: 'Listings', value: '5' },
  { label: 'Purchases', value: '2' },
  { label: 'Trust score', value: '92' },
];

const MENU = [
  { icon: 'car-outline', label: 'My listings', screen: 'SellerDashboard' },
  { icon: 'receipt-outline', label: 'Purchase history' },
  { icon: 'chatbubbles-outline', label: 'Messages', screen: 'Messages' },
  { icon: 'card-outline', label: 'Payment methods' },
  { icon: 'shield-checkmark-outline', label: 'Trust & verification' },
  { icon: 'settings-outline', label: 'Settings', screen: 'Settings' },
  { icon: 'help-circle-outline', label: 'Help & support' },
];

export default function ProfileScreen({ navigation }) {
  const { currentUser, sellerListings, logoutUser } = useApp();
  const activeCount = sellerListings.filter((l) => l.status === 'live').length;
  const totalBids = sellerListings.reduce((sum, l) => sum + (l.bids || 0), 0);
  return (
    <Screen background={colors.bg}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{currentUser.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{currentUser.name}</Text>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            </View>
            <Text style={styles.email}>{currentUser.email}</Text>
            <Badge variant="success" label="Verified buyer & seller" style={{ marginTop: 8 }} />
          </View>
          <Pressable style={styles.editBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="create-outline" size={20} color={colors.slate700} />
          </Pressable>
        </View>

        <View style={styles.stats}>
          {STATS.map((s, i) => (
            <View key={s.label} style={[styles.stat, i < 2 && styles.statBorder]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.sellBanner} onPress={() => navigation.navigate('SellerDashboard')}>
          <View style={styles.sellBannerIcon}>
            <Ionicons name="trending-up" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sellBannerTitle}>Seller Dashboard</Text>
            <Text style={styles.sellBannerSub}>{activeCount} active auctions · {totalBids} total bids</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
        </Pressable>

        <View style={styles.menu}>
          {MENU.map((m, i) => (
            <Pressable
              key={m.label}
              style={[styles.menuItem, i < MENU.length - 1 && styles.menuBorder]}
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

        <Pressable style={styles.logout} onPress={() => { logoutUser(); navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] }); }}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  email: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  editBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statBorder: { borderRightWidth: 1, borderRightColor: colors.borderSoft },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sellBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
  },
  sellBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellBannerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sellBannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  menu: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    marginHorizontal: 20,
    marginTop: 16,
    overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  menuIcon: { width: 36, alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22 },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
});
