import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Badge from '../components/Badge';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, fonts } from '../theme';
import { showToast } from '../components/Feedback';
import { SAWA_WHATSAPP, SAWA_EMAIL, WHATSAPP_VERIFIED } from '../utils/whatsapp';

function buildMenuSeller(t) {
  return [
    { icon: 'shield-checkmark-outline', label: t('drawer.verifyIdentity'), screen: 'IDVerification' },
    { icon: 'call-outline', label: t('profile.menuContactVisibility'), screen: 'ContactSettings' },
    { icon: 'car-outline', label: t('drawer.submissions'), screen: 'SellerDashboard' },
    { icon: 'trending-up-outline', label: t('profile.menuCarValuation'), screen: 'CarValuation' },
  ];
}

function buildMenuAccount(t) {
  return [
    { icon: 'key-outline', label: t('drawer.rentalInquiries'), screen: 'MyRentals' },
    { icon: 'boat-outline', label: t('drawer.imports'), screen: 'ImportOrders' },
    { icon: 'chatbubbles-outline', label: t('profile.menuMessages'), screen: 'Messages' },
    { icon: 'shield-checkmark-outline', label: t('drawer.marketplaceSafety'), screen: 'SawaPromise' },
    { icon: 'book-outline', label: t('profile.menuHowBuyingWorks'), screen: 'BuyingGuide' },
    { icon: 'settings-outline', label: t('common.settings'), screen: 'Settings' },
    // This row was `screen: null` — it rendered a chevron and did nothing at all.
    // It now opens the business line, which is the whole point of a Help row.
    // Gated like every other contact surface: if the line is ever unverified, the
    // row falls back to the mailbox rather than going dead again.
    WHATSAPP_VERIFIED
      ? {
          icon: 'logo-whatsapp',
          label: t('profile.menuHelpSupport'),
          link: `https://wa.me/${SAWA_WHATSAPP}`,
        }
      : {
          icon: 'help-circle-outline',
          label: t('profile.menuHelpSupport'),
          link: `mailto:${SAWA_EMAIL}`,
        },
  ];
}

function MenuSection({ title, items, navigation, t }) {
  return (
    <View style={styles.menuSection}>
      <Text style={styles.menuSectionTitle}>{title}</Text>
      <View style={styles.menu}>
        {items.map((m, i) => (
          <Pressable
            key={m.label}
            style={[styles.menuItem, i < items.length - 1 && styles.menuBorder]}
            onPress={() => {
              if (m.screen) navigation.navigate(m.screen);
              else if (m.link) {
                Linking.openURL(m.link).catch(() =>
                  showToast(t('profile.openFailed'), 'error'),
                );
              }
            }}
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
  const { currentUser, submissions, logoutUser, idVerificationStatus, isLoggedIn, loginAsGuest, demoMode, t } = useApp();

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
          <Text style={styles.guestTitle}>{t('profile.guestTitle')}</Text>
          <Text style={styles.guestSub}>
            {t('profile.guestSub')}
          </Text>
          <Pressable style={styles.guestBtn} onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.guestBtnText}>{t('profile.guestSignIn')}</Text>
          </Pressable>
          {demoMode && (
            <Pressable onPress={() => loginAsGuest()} style={{ marginTop: 14 }}>
              <Text style={styles.guestSkip}>{t('profile.guestDemo')}</Text>
            </Pressable>
          )}
        </View>
      </Screen>
    );
  }

  const STATS = [
    { label: t('profile.statSubmitted'), value: String(submissions.length) },
    { label: t('profile.statLive'), value: String(liveCount) },
    { label: t('profile.statTrust'), value: `${trustScore}/100` },
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
                <Ionicons name="checkmark-circle" size={18} color={colors.green} />
              )}
            </View>
            <Text style={styles.email}>{currentUser.email}</Text>
            <View style={styles.badgeRow}>
              {idVerificationStatus === 'approved' ? (
                <>
                  <Badge variant="success" label={t('profile.badgeVerifiedSeller')} />
                  <Badge variant="live" dot label={t('profile.badgeIdVerified')} />
                </>
              ) : (
                <Pressable onPress={() => navigation.navigate('IDVerification')}>
                  <Badge
                    variant="tag"
                    label={
                      idVerificationStatus === 'pending'
                        ? t('profile.badgeIdPending')
                        : idVerificationStatus === 'rejected'
                        ? t('profile.badgeIdRejected')
                        : t('profile.badgeIdNone')
                    }
                  />
                </Pressable>
              )}
            </View>
          </View>
          <Pressable style={styles.editBtn} onPress={() => navigation.navigate('Settings')} accessibilityRole="button" accessibilityLabel={t('profile.editLabel')}>
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
            <Text style={styles.dashBannerTitle}>{t('profile.dashboardTitle')}</Text>
            <Text style={styles.dashBannerSub}>
              {t('profile.dashboardSub', { count: submissions.length, live: liveCount })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
        </Pressable>

        <MenuSection title={t('profile.sectionListings')} items={buildMenuSeller(t)} navigation={navigation} t={t} />
        <MenuSection title={t('profile.sectionAccount')} items={buildMenuAccount(t)} navigation={navigation} t={t} />

        {/* Team Portal — Sawa staff only. Visible in dev builds for testing;
            in release only an admin account ever sees the entry point (and
            AdminPanelScreen re-checks the role itself). */}
        {(demoMode || currentUser?.role === 'admin') && (
          <Pressable style={styles.adminAccess} onPress={() => navigation.navigate('AdminPanel')}>
            <Ionicons name="grid-outline" size={16} color={colors.textMuted} />
            <Text style={styles.adminAccessText}>{t('drawer.teamPortal')}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </Pressable>
        )}

        {/* Logout */}
        <Pressable
          style={styles.logout}
          onPress={() => {
            logoutUser();
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{t('common.logout')}</Text>
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
    width: 44, height: 44, borderRadius: radius.md,
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
