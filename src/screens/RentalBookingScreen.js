import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { RENTAL_CENTERS, DURATION_PRESETS, getRentalDates, calcTripCost } from '../data/rentals';
import { rentToOwnCredit, RENT_TO_OWN_WINDOW_DAYS } from '../data/finance';

export default function RentalBookingScreen({ navigation, route }) {
  const car = route.params?.car;
  const { bookRental } = useApp();

  const dates = getRentalDates(14);
  const durations = DURATION_PRESETS.filter((d) => d >= (car.minDays || 1));

  const [startIdx, setStartIdx] = useState(null);
  const [days, setDays] = useState(durations[0]);
  const [centerId, setCenterId] = useState(RENTAL_CENTERS[0].id);
  const [confirmed, setConfirmed] = useState(false);

  const cost = calcTripCost(car, days);
  const canBook = startIdx !== null && days && centerId;
  const startDate = startIdx !== null ? dates[startIdx] : null;
  const center = RENTAL_CENTERS.find((c) => c.id === centerId);

  const handleConfirm = () => {
    if (!canBook) return;
    bookRental({
      carId: car.id,
      carTitle: car.title,
      carImage: car.image,
      startDate: `${startDate.full}`,
      days,
      center: center.name,
      subtotal: cost.subtotal,
      deposit: cost.deposit,
      total: cost.total,
    });
    setConfirmed(true);
  };

  // ── Confirmation state ──
  if (confirmed) {
    return (
      <Screen background={colors.bg}>
        <View style={styles.confirmWrap}>
          <View style={styles.confirmIcon}>
            <Ionicons name="checkmark" size={44} color="#fff" />
          </View>
          <Text style={styles.confirmTitle}>Booking confirmed!</Text>
          <Text style={styles.confirmSub}>
            {car.title} is reserved for you from {startDate.full}.
          </Text>

          <View style={styles.confirmCard}>
            <ConfirmRow icon="car-outline" label="Vehicle" value={car.title} />
            <ConfirmRow icon="calendar-outline" label="Pickup" value={`${startDate.full} · 9:00 AM`} />
            <ConfirmRow icon="time-outline" label="Duration" value={`${days} day${days > 1 ? 's' : ''}`} />
            <ConfirmRow icon="location-outline" label="Center" value={center.name} />
            <ConfirmRow icon="cash-outline" label="Due at pickup" value={`$${cost.total} (incl. $${cost.deposit} deposit)`} last />
          </View>

          <View style={styles.rtoBanner}>
            <Ionicons name="swap-horizontal" size={16} color={colors.green} />
            <Text style={styles.rtoBannerText}>
              <Text style={{ fontFamily: fonts.extraBold }}>${rentToOwnCredit(cost.subtotal)} rent-to-own credit</Text>
              {' '}— applies if you buy any Inzozi certified car within {RENT_TO_OWN_WINDOW_DAYS} days.
            </Text>
          </View>

          <View style={styles.confirmNote}>
            <Ionicons name="document-text-outline" size={16} color={colors.amber} />
            <Text style={styles.confirmNoteText}>
              Bring your driving licence and national ID. Payment is at the center — nothing is charged now.
            </Text>
          </View>

          <Button title="Done" onPress={() => navigation.navigate('Main')} style={{ alignSelf: 'stretch' }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Book Rental" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Car summary */}
        <View style={styles.carCard}>
          <Image source={{ uri: car.image }} style={styles.carThumb} resizeMode="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.carTitle} numberOfLines={1}>{car.title}</Text>
            <Text style={styles.carMeta}>{car.seats} seats · {car.transmission} · {car.fuel}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
              <Text style={styles.carRate}>${car.dailyRate}</Text>
              <Text style={styles.carRateUnit}>/day</Text>
            </View>
          </View>
        </View>

        {/* 1. Pickup date */}
        <Text style={styles.sectionTitle}>Pickup date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
          {dates.map((d) => {
            const blocked = car.unavailableDays.includes(d.index);
            const on = startIdx === d.index;
            return (
              <Pressable
                key={d.index}
                disabled={blocked}
                style={[styles.dateChip, on && styles.dateChipOn, blocked && styles.dateChipBlocked]}
                onPress={() => setStartIdx(d.index)}
              >
                <Text style={[styles.dateDay, on && styles.dateTextOn, blocked && styles.dateTextBlocked]}>{d.day}</Text>
                <Text style={[styles.dateNum, on && styles.dateTextOn, blocked && styles.dateTextBlocked]}>{d.date}</Text>
                <Text style={[styles.dateMonth, on && styles.dateTextOn, blocked && styles.dateTextBlocked]}>{d.month}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 2. Duration */}
        <Text style={styles.sectionTitle}>Duration</Text>
        <View style={styles.durationRow}>
          {durations.map((d) => {
            const on = days === d;
            return (
              <Pressable
                key={d}
                style={[styles.durationChip, on && styles.durationChipOn]}
                onPress={() => setDays(d)}
              >
                <Text style={[styles.durationText, on && styles.durationTextOn]}>
                  {d === 14 ? '2 weeks' : d === 7 ? '1 week' : `${d} day${d > 1 ? 's' : ''}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 3. Pickup center */}
        <Text style={styles.sectionTitle}>Pickup center</Text>
        {RENTAL_CENTERS.map((c) => {
          const on = centerId === c.id;
          return (
            <Pressable
              key={c.id}
              style={[styles.centerCard, on && styles.centerCardOn]}
              onPress={() => setCenterId(c.id)}
            >
              <View style={[styles.centerRadio, on && styles.centerRadioOn]}>
                {on && <View style={styles.centerRadioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.centerName}>{c.name}</Text>
                <Text style={styles.centerArea}>{c.area}, Kigali · Open 8AM – 6PM</Text>
              </View>
              <Ionicons name="location-outline" size={18} color={on ? colors.primary : colors.textMuted} />
            </Pressable>
          );
        })}

        {/* Cost breakdown */}
        <Text style={styles.sectionTitle}>Trip cost</Text>
        <View style={styles.costCard}>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>
              {days >= 7
                ? `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''}${days % 7 ? ` + ${days % 7} day${days % 7 > 1 ? 's' : ''}` : ''}`
                : `$${car.dailyRate} × ${days} day${days > 1 ? 's' : ''}`}
            </Text>
            <Text style={styles.costValue}>${cost.subtotal}</Text>
          </View>
          <View style={styles.costRow}>
            <View>
              <Text style={styles.costLabel}>Refundable deposit</Text>
              <Text style={styles.costSub}>Returned after the vehicle check</Text>
            </View>
            <Text style={styles.costValue}>${cost.deposit}</Text>
          </View>
          <View style={styles.costDivider} />
          <View style={styles.costRow}>
            <Text style={styles.costTotalLabel}>Due at pickup</Text>
            <Text style={styles.costTotalValue}>${cost.total}</Text>
          </View>
          <View style={styles.noPayChip}>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.green} />
            <Text style={styles.noPayText}>No payment now — pay at the Inzozi center</Text>
          </View>
        </View>

        <Button
          title={canBook ? 'Confirm Booking' : 'Select a pickup date'}
          onPress={handleConfirm}
          style={{ marginTop: 20, opacity: canBook ? 1 : 0.5 }}
          disabled={!canBook}
        />
      </ScrollView>
    </Screen>
  );
}

function ConfirmRow({ icon, label, value, last }) {
  return (
    <View style={[styles.confirmRow, !last && styles.confirmRowBorder]}>
      <Ionicons name={icon} size={17} color={colors.primary} />
      <Text style={styles.confirmRowLabel}>{label}</Text>
      <Text style={styles.confirmRowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  carCard: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 12,
    ...shadows.card,
  },
  carThumb: { width: 92, height: 68, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  carTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.textPrimary },
  carMeta: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  carRate: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.primary },
  carRateUnit: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted, marginLeft: 2 },
  sectionTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 22, marginBottom: 10, letterSpacing: -0.2 },
  dateChip: {
    width: 54, paddingVertical: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center', gap: 2,
  },
  dateChipOn: { borderColor: colors.primary, backgroundColor: colors.greenTint },
  dateChipBlocked: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft },
  dateDay: { fontSize: 10, fontFamily: fonts.semiBold, color: colors.textMuted },
  dateNum: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  dateMonth: { fontSize: 10, fontFamily: fonts.medium, color: colors.textMuted },
  dateTextOn: { color: colors.primary },
  dateTextBlocked: { color: colors.border },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.pill,
  },
  durationChipOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  durationText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  durationTextOn: { color: '#fff' },
  centerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14, marginBottom: 10,
  },
  centerCardOn: { borderColor: colors.primary, backgroundColor: colors.greenTint },
  centerRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  centerRadioOn: { borderColor: colors.primary },
  centerRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  centerName: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  centerArea: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  costCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16,
    ...shadows.card,
  },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  costLabel: { fontSize: 13, fontFamily: fonts.medium, color: colors.textSecondary },
  costSub: { fontSize: 10, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 1 },
  costValue: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  costDivider: { height: 1, backgroundColor: colors.borderSoft, marginBottom: 12 },
  costTotalLabel: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  costTotalValue: { fontSize: 20, fontFamily: fonts.extraBold, color: colors.primary, letterSpacing: -0.4 },
  noPayChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.greenTint,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: radius.md,
  },
  noPayText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.green },
  // Confirmation state
  confirmWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 48 },
  confirmIcon: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.blueGlow,
  },
  confirmTitle: { fontSize: 24, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 20, letterSpacing: -0.5 },
  confirmSub: { fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  confirmCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, paddingHorizontal: 16,
    marginTop: 24,
    ...shadows.card,
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  confirmRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  confirmRowLabel: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted, width: 84 },
  confirmRowValue: { flex: 1, fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary, textAlign: 'right' },
  rtoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    alignSelf: 'stretch',
    backgroundColor: colors.greenTint,
    borderWidth: 1, borderColor: '#DCFCE7',
    borderRadius: radius.md, padding: 12,
    marginTop: 16,
  },
  rtoBannerText: { flex: 1, fontSize: 12, fontFamily: fonts.medium, color: colors.green, lineHeight: 17 },
  confirmNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    alignSelf: 'stretch',
    backgroundColor: colors.amberTint,
    borderRadius: radius.md, padding: 12,
    marginTop: 10, marginBottom: 24,
  },
  confirmNoteText: { flex: 1, fontSize: 12, fontFamily: fonts.medium, color: colors.amberText, lineHeight: 17 },
});
