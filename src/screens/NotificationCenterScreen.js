import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, radius, shadows, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { resolveNotificationRoute } from '../utils/notificationRouting';

function NotificationRow({ notification, onPress, onMarkRead, t }) {
  const typeConfig = {
    price_drop: {
      icon: 'trending-down-outline',
      color: colors.primary,
      bg: colors.greenTint,
      label: t('notifications.filterPriceDrops'),
    },
    message: {
      icon: 'chatbubble-outline',
      color: colors.statusScheduled,
      bg: '#EFF6FF',
      label: t('notifications.filterMessages'),
    },
    listing_update: {
      icon: 'megaphone-outline',
      color: colors.amberText,
      bg: colors.amberTint,
      label: t('notifications.filterUpdates'),
    },
    search_match: {
      icon: 'search-outline',
      color: colors.primary,
      bg: colors.greenTint,
      label: t('notifications.filterMatches'),
    },
  };

  const cfg = typeConfig[notification.type] || typeConfig.listing_update;

  return (
    <Pressable
      style={[styles.notifCard, notification.read && styles.notifCardRead]}
      onPress={() => {
        if (!notification.read) onMarkRead(notification.id);
        onPress(notification);
      }}
    >
      {!notification.read && <View style={styles.unreadDot} />}
      <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.notifTopRow}>
          <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.notifTime}>{notification.time}</Text>
        </View>
        <Text style={[styles.notifTitle, !notification.read && styles.notifTitleUnread]}>
          {notification.title}
        </Text>
        <Text style={styles.notifBody} numberOfLines={2}>{notification.body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} />
    </Pressable>
  );
}

function DateSection({ date, notifications, onPress, onMarkRead, t }) {
  return (
    <View style={styles.dateSection}>
      <Text style={styles.dateLabel}>{date}</Text>
      <View style={styles.notifList}>
        {notifications.map((n) => (
          <NotificationRow
            key={n.id}
            notification={n}
            onPress={onPress}
            onMarkRead={onMarkRead}
            t={t}
          />
        ))}
      </View>
    </View>
  );
}

export default function NotificationCenterScreen({ navigation }) {
  const { t, notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [activeFilter, setActiveFilter] = useState(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filters = [
    { label: t('notifications.filterAll'), type: null },
    { label: t('notifications.filterPriceDrops'), type: 'price_drop' },
    { label: t('notifications.filterMessages'), type: 'message' },
    { label: t('notifications.filterUpdates'), type: 'listing_update' },
    { label: t('notifications.filterMatches'), type: 'search_match' },
  ];

  const filtered = activeFilter
    ? notifications.filter((n) => n.type === activeFilter)
    : notifications;

  const grouped = filtered.reduce((acc, n) => {
    const key = n.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  const handlePress = (notification) => {
    if (!notification.read) markNotificationRead(notification.id);
    const { screen, params } = resolveNotificationRoute(notification);
    navigation.navigate(screen, params);
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title={t('notifications.title')}
        onBack={() => navigation.goBack()}
        right={
          unreadCount > 0 ? (
            <Pressable onPress={markAllNotificationsRead}>
              <Text style={styles.markAllBtn}>{t('notifications.markAllRead')}</Text>
            </Pressable>
          ) : null
        }
      />

      {/* Unread badge */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <View style={styles.unreadCountBadge}>
            <Text style={styles.unreadCountText}>{unreadCount}</Text>
          </View>
          <Text style={styles.unreadBannerText}>
            {t('notifications.unreadCount', { count: unreadCount, plural: unreadCount !== 1 ? 's' : '' })}
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Filter row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter) => {
            const active = activeFilter === filter.type;
            return (
              <Pressable
                key={filter.label}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.type)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={56} color={colors.border} />
            <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
            <Text style={styles.emptySub}>{t('notifications.emptySub')}</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <DateSection
              key={date}
              date={date}
              notifications={items}
              onPress={handlePress}
              onMarkRead={markNotificationRead}
              t={t}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  markAllBtn: { fontSize: 13, fontFamily: fonts.bold, color: colors.primary },
  unreadBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: colors.greenTint,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 10,
  },
  unreadCountBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadCountText: { fontSize: 11, fontFamily: fonts.extraBold, color: '#fff' },
  unreadBannerText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.primary },
  filtersScroll: { marginBottom: 4 },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  dateSection: { paddingHorizontal: 16, marginBottom: 8 },
  dateLabel: {
    fontSize: 11, fontFamily: fonts.extraBold, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 8,
  },
  notifList: { gap: 8 },
  notifCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14,
    ...shadows.card,
  },
  notifCardRead: { opacity: 0.7 },
  unreadDot: {
    position: 'absolute', top: 14, left: 6,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  notifIcon: {
    width: 42, height: 42, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typePill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill,
  },
  typePillText: { fontSize: 10, fontFamily: fonts.extraBold, textTransform: 'uppercase', letterSpacing: 0.3 },
  notifTime: { fontSize: 11, color: colors.textMuted },
  notifTitle: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary },
  notifTitleUnread: { fontFamily: fonts.extraBold },
  notifBody: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 19 },
});
