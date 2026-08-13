import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { formatRWF } from '../data/marketData';

const STATUS_CONFIG = {
  // pending_payment: dates held while checkout completes; the hold expires on
  // its own if the payment never lands.
  pending_payment: { label: 'Awaiting Payment', color: colors.amber, bg: colors.statusPendingBg, icon: 'card-outline' },
  confirmed: { label: 'Confirmed', color: colors.statusScheduled, bg: colors.statusScheduledBg, icon: 'calendar-outline' },
  active: { label: 'On Trip', color: colors.statusLive, bg: colors.statusLiveBg, icon: 'car-outline' },
  completed: { label: 'Completed', color: colors.statusSold, bg: colors.statusSoldBg, icon: 'checkmark-circle-outline' },
  // Falling through to "Confirmed" used to give a CANCELLED booking a live
  // check-in button.
  cancelled: { label: 'Cancelled', color: colors.textMuted, bg: colors.surfaceAlt, icon: 'close-circle-outline' },
  expired: { label: 'Expired', color: colors.textMuted, bg: colors.surfaceAlt, icon: 'time-outline' },
};

export default function MyRentalsScreen({ navigation }) {
  const { rentalBookings, setHomeMode } = useApp();

  if (rentalBookings.length === 0) {
    return (
      <Screen background={colors.bg}>
        <BackHeader title="My Rentals" onBack={() => navigation.goBack()} />
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="key-outline" size={40} color={colors.border} />
          </View>
          <Text style={styles.emptyTitle}>No rentals yet</Text>
          <Text style={styles.emptySub}>
            Browse our certified rental fleet — insurance and roadside assistance included.
          </Text>
          <Button
            title="Browse Rentals"
            icon="key-outline"
            onPress={() => { setHomeMode('rent'); navigation.navigate('Main'); }}
            style={{ marginTop: 20, alignSelf: 'stretch' }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen background={colors.bg}>
      <BackHeader title="My Rentals" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {rentalBookings.map((b) => {
          const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.confirmed;
          return (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Image source={{ uri: b.carImage }} style={styles.thumb} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.carTitle} numberOfLines={1}>{b.carTitle}</Text>
                  <Text style={styles.meta}>
                    {b.startDate} · {b.days} day{b.days > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.meta}>{b.center}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={11} color={cfg.color} />
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.totalLabel}>Due at pickup</Text>
                  <Text style={styles.totalValue}>{formatRWF(b.total)}</Text>
                </View>

                {b.status === 'confirmed' && (
                  <Pressable
                    style={styles.checkinBtn}
                    onPress={() => navigation.navigate('RentalCheckIn', { booking: b })}
                  >
                    <Ionicons name="camera-outline" size={15} color="#fff" />
                    <Text style={styles.checkinBtnText}>Digital Check-In</Text>
                  </Pressable>
                )}
                {b.status === 'active' && (
                  <Pressable
                    style={styles.checkoutBtn}
                    onPress={() => navigation.navigate('RentalCheckIn', { booking: b, mode: 'return' })}
                  >
                    <Ionicons name="camera-outline" size={15} color={colors.primary} />
                    <Text style={styles.checkoutBtnText}>Return Check-Out</Text>
                  </Pressable>
                )}
                {b.status === 'completed' && (
                  <Text style={styles.completedNote}>Deposit refunded after center check ✓</Text>
                )}
              </View>
            </View>
          );
        })}

        <Text style={styles.hint}>
          Complete the digital check-in at pickup — condition photos protect your deposit.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary },
  emptySub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14, marginTop: 12,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', gap: 12 },
  thumb: { width: 76, height: 58, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  carTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  meta: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.pill, alignSelf: 'flex-start',
  },
  statusText: { fontSize: 11, fontFamily: fonts.extraBold },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    marginTop: 12, paddingTop: 12,
  },
  totalLabel: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted },
  totalValue: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 1 },
  checkinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.pill,
  },
  checkinBtnText: { fontSize: 12, fontFamily: fonts.extraBold, color: '#fff' },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.pill,
  },
  checkoutBtnText: { fontSize: 12, fontFamily: fonts.extraBold, color: colors.primary },
  completedNote: { flex: 1, fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted, textAlign: 'right', marginLeft: 12 },
  totalRwf: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 1 },
  hint: {
    fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted,
    textAlign: 'center', marginTop: 16, lineHeight: 16,
  },
});
