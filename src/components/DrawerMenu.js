import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated,
  Dimensions, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LogoMark } from './Logo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../theme';
import { useApp } from '../context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);

const MENU_SECTIONS = [
  {
    title: 'Buy a Car',
    items: [
      { icon: 'search-outline', label: 'Browse All Cars', screen: 'SearchResults' },
      { icon: 'heart-outline', label: 'Saved Cars', screen: 'Saved' },
      { icon: 'git-compare-outline', label: 'Compare Cars', screen: 'Comparison', isNew: true },
      { icon: 'map-outline', label: 'Map View', screen: 'MapView', isNew: true },
    ],
  },
  {
    title: 'Rent',
    items: [
      { icon: 'key-outline', label: 'Browse Rentals', action: 'browseRentals' },
      { icon: 'calendar-outline', label: 'My Rentals', screen: 'MyRentals' },
    ],
  },
  {
    title: 'Finance & Services',
    items: [
      { icon: 'calculator-outline', label: 'Financing Calculator', screen: 'Financing' },
      { icon: 'globe-outline', label: 'Import Duty Calculator', screen: 'DutyCalculator' },
      { icon: 'ribbon-outline', label: 'Trust Score', screen: 'TrustScore' },
    ],
  },
  {
    title: 'Sell a Car',
    items: [
      { icon: 'car-outline', label: 'Submit My Car', screen: 'CarSubmission' },
      { icon: 'time-outline', label: 'My Submissions', screen: 'SellerDashboard' },
      { icon: 'bar-chart-outline', label: 'Seller Analytics', screen: 'SellerAnalytics' },
      { icon: 'people-outline', label: 'Referral Program', screen: 'Referral' },
    ],
  },
  {
    title: 'Trust & Safety',
    items: [
      { icon: 'notifications-outline', label: 'Notifications', screen: 'NotificationCenter' },
    ],
  },
];

export default function DrawerMenu({ visible, onClose, navigation }) {
  const insets = useSafeAreaInsets();
  const { currentUser, isLoggedIn, logoutUser, setHomeMode } = useApp();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const navigate = (screen) => {
    onClose();
    setTimeout(() => navigation.navigate(screen), 250);
  };

  const handleItemPress = (item) => {
    if (item.action === 'browseRentals') {
      setHomeMode('rent');
      navigate('Main');
    } else {
      navigate(item.screen);
    }
  };

  return (
    <View
      style={[styles.container, !visible && styles.hidden]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.navyLight, colors.navyMid]}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <LogoMark size={34} />
              <View>
                <Text style={styles.headerBrand}>INZOZI</Text>
                <Text style={styles.headerSub}>Rwanda's Certified Marketplace</Text>
              </View>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </View>

          {/* Account row */}
          {isLoggedIn ? (
            <Pressable style={styles.profileRow} onPress={() => navigate('Profile')}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{currentUser.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName} numberOfLines={1}>{currentUser.name}</Text>
                <Text style={styles.profileEmail} numberOfLines={1}>{currentUser.email}</Text>
              </View>
              <Pressable
                style={styles.accountBtn}
                onPress={() => {
                  logoutUser();
                  onClose();
                  setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] }), 250);
                }}
                hitSlop={8}
              >
                <Text style={styles.accountBtnText}>Log out</Text>
              </Pressable>
            </Pressable>
          ) : (
            <View style={styles.accountRow}>
              <Pressable
                style={styles.accountBtn}
                onPress={() => navigate('SignIn')}
              >
                <Ionicons name="person-outline" size={15} color={colors.greenLight} />
                <Text style={styles.accountBtnText}>Sign In</Text>
              </Pressable>
              <Pressable
                style={[styles.accountBtn, styles.accountBtnPrimary]}
                onPress={() => navigate('SignUp')}
              >
                <Text style={styles.accountBtnPrimaryText}>Register</Text>
              </Pressable>
            </View>
          )}
        </LinearGradient>

        {/* Menu items */}
        <ScrollView
          style={styles.menuScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          {MENU_SECTIONS.map((section, si) => (
            <View key={si} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map((item, ii) => (
                <Pressable
                  key={ii}
                  style={styles.menuItem}
                  onPress={() => handleItemPress(item)}
                >
                  <View style={styles.menuIconWrap}>
                    <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.isNew && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ))}

          {/* Footer links */}
          <View style={styles.footerLinks}>
            <Pressable onPress={() => navigate('AdminPanel')}>
              <Text style={styles.footerLink}>Team Portal</Text>
            </Pressable>
            <Text style={styles.footerDot}>·</Text>
            <Pressable onPress={() => navigate('Settings')}>
              <Text style={styles.footerLink}>Settings</Text>
            </Pressable>
          </View>
          <Text style={styles.version}>Inzozi Motors v1.0 · Kigali, Rwanda</Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  hidden: {
    // keep in tree for animation; pointerEvents="none" handles interaction
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerBrand: {
    fontFamily: fonts.black,
    fontSize: 22,
    letterSpacing: 2,
    color: '#fff',
  },
  headerSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    gap: 10,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontFamily: fonts.extraBold,
    color: '#fff',
    fontSize: 14,
  },
  profileName: {
    fontFamily: fonts.bold,
    color: '#fff',
    fontSize: 14,
  },
  profileEmail: {
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 1,
  },
  accountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  accountBtnText: {
    fontFamily: fonts.semiBold,
    color: '#fff',
    fontSize: 13,
  },
  accountBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  accountBtnPrimaryText: {
    fontFamily: fonts.bold,
    color: '#fff',
    fontSize: 13,
  },

  // Menu
  menuScroll: { flex: 1 },
  section: {
    paddingTop: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.textMuted,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  newBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 2,
  },
  newBadgeText: {
    fontFamily: fonts.black,
    fontSize: 9,
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Footer
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  footerLink: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  footerDot: { color: colors.border, fontSize: 14 },
  version: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.border,
    paddingHorizontal: 20,
  },
});
