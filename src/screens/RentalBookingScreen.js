import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { DURATION_PRESETS, getRentalDates, calcTripCost, getPickupCenter, AIRPORT_PICKUP, PICKUP_WINDOWS } from '../data/rentals';
import { formatRWF } from '../data/marketData';
import { openWhatsApp, SAWA_WHATSAPP } from '../utils/whatsapp';


export default function RentalBookingScreen({ navigation, route }) {
  const car = route.params?.car;
  const { bookRental } = useApp();

  const dates = getRentalDates(14);
  const durations = DURATION_PRESETS.filter((d) => d >= (car.minDays || 1));

  // Every day in [start, start + numDays) must be free. Indexes beyond the
  // 14-day window are assumed free (they can't appear in unavailableDays).
  const rangeIsFree = (start, numDays) => {
    for (let i = start; i < start + numDays; i++) {
      if (car.unavailableDays.includes(i)) return false;
    }
    return true;
  };

  const [startIdx, setStartIdx] = useState(() => {
    const first = dates.find((d) => !car.unavailableDays.includes(d.index));
    return first ? first.index : null;
  });
  const [days, setDays] = useState(durations[0]);
  const [time, setTime] = useState(PICKUP_WINDOWS[0]);
  const [airportPickup, setAirportPickup] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const cost = calcTripCost(car, days);
  const rangeFree = startIdx !== null && days ? rangeIsFree(startIdx, days) : true;
  const canBook = startIdx !== null && days && rangeFree;
  const startDate = startIdx !== null ? dates[startIdx] : null;
  const homeCenter = getPickupCenter(car);
  const center = airportPickup ? AIRPORT_PICKUP : homeCenter;
  const pickupFee = airportPickup ? AIRPORT_PICKUP.fee : 0;
  const totalDue = cost.total + pickupFee;

  const handleConfirm = () => {
    if (!canBook) return;
    const iso = new Date();
    iso.setDate(iso.getDate() + startIdx);
    bookRental({
      carId: car.id,
      carTitle: car.title,
      carImage: car.image,
      startDate: `${startDate.full}`,
      startDateISO: iso.toISOString().slice(0, 10),
      airportPickup,
      time,
      days,
      center: center.name,
      subtotal: cost.subtotal,
      deposit: cost.deposit,
      pickupFee,
      total: totalDue,
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
            <ConfirmRow icon="calendar-outline" label="Pickup" value={`${startDate.full} · ${time}`} />
            <ConfirmRow icon="time-outline" label="Duration" value={`${days} day${days > 1 ? 's' : ''}`} />
            <ConfirmRow icon="location-outline" label="Center" value={center.name} />
            <ConfirmRow icon="cash-outline" label="Due at pickup" value={`$${totalDue} (incl. $${cost.deposit} deposit)`} last />
          </View>

          <View style={styles.confirmNote}>
            <Ionicons name="document-text-outline" size={16} color={colors.amber} />
            <Text style={styles.confirmNoteText}>
              Bring your driving licence and national ID. Payment is at the center — nothing is charged now.
            </Text>
          </View>

          <Button title="View My Rentals" onPress={() => navigation.navigate('MyRentals')} style={{ alignSelf: 'stretch' }} />
          <Pressable
            style={styles.waRow}
            onPress={() => openWhatsApp(
              SAWA_WHATSAPP,
              `Hi, I just booked the ${car.title} for ${startDate.full} (${time}) at ${center.name}. Booking question:`
            )}
          >
            <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
            <Text style={styles.waRowText}>Questions? WhatsApp the center</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Main')} style={{ marginTop: 14 }}>
            <Text style={styles.viewRentals}>Back to Home</Text>
          </Pressable>
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
          <Image source={{ uri: car.image }} style={styles.carThumb} resizeMode="contain" />
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

        {/* 2. Pickup window — staff confirm the exact time on WhatsApp */}
        <Text style={styles.sectionTitle}>Pickup window</Text>
        <View style={styles.durationRow}>
          {PICKUP_WINDOWS.map((t) => {
            const on = time === t;
            return (
              <Pressable
                key={t}
                style={[styles.durationChip, on && styles.durationChipOn]}
                onPress={() => setTime(t)}
              >
                <Text style={[styles.durationText, on && styles.durationTextOn]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* 3. Duration */}
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

        {!rangeFree && (
          <View style={styles.rangeWarning}>
            <Ionicons name="information-circle-outline" size={14} color={colors.amber} />
            <Text style={styles.rangeWarningText}>
              Selected dates include unavailable days — choose another start date or shorter duration
            </Text>
          </View>
        )}

        {/* 4. Pickup location — fixed to the car's home center */}
        <Text style={styles.sectionTitle}>Pickup location</Text>
        <View style={styles.centerCard}>
          <View style={styles.centerIcon}>
            <Ionicons name="location" size={16} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.centerName}>{homeCenter.name}</Text>
            <Text style={styles.centerArea}>{homeCenter.area}, Kigali · Open 8AM – 6PM · This car is kept here</Text>
          </View>
        </View>
        <Pressable style={styles.airportRow} onPress={() => setAirportPickup(!airportPickup)}>
          <View style={[styles.airportCheck, airportPickup && styles.airportCheckOn]}>
            {airportPickup && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
          <Ionicons name="airplane-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.airportText}>Airport meet & greet instead</Text>
          <Text style={styles.airportFee}>+${AIRPORT_PICKUP.fee}</Text>
        </Pressable>

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
          {pickupFee > 0 && (
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Airport meet & greet</Text>
              <Text style={styles.costValue}>${pickupFee}</Text>
            </View>
          )}
          <View style={styles.costDivider} />
          <View style={styles.costRow}>
            <Text style={styles.costTotalLabel}>Due at pickup</Text>
            <Text style={styles.costTotalValue}>${totalDue}</Text>
          </View>
          <Text style={styles.costRwf}>≈ {formatRWF(totalDue)}</Text>
          <View style={styles.noPayChip}>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.green} />
            <Text style={styles.noPayText}>No payment now — pay at the Sawa center</Text>
          </View>
        </View>

        <Button
          title={canBook ? 'Confirm Booking' : rangeFree ? 'Select a pickup date' : 'Selected dates unavailable'}
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
      <Ionicons name={icon} size={17} color={colors.textSecondary} />
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
  rangeWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: colors.amberTint,
    borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8,
    marginTop: 12,
  },
  rangeWarningText: { flex: 1, fontSize: 12, fontFamily: fonts.semiBold, color: colors.amberText, lineHeight: 17 },
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
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14, marginBottom: 10,
    ...shadows.card,
  },
  centerIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  airportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl,
  },
  airportCheck: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  airportCheckOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  airportText: { flex: 1, fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary },
  airportFee: { fontSize: 13, fontFamily: fonts.bold, color: colors.textSecondary },
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
  costRwf: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted, textAlign: 'right', marginTop: -8, marginBottom: 12 },
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
  confirmNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    alignSelf: 'stretch',
    backgroundColor: colors.amberTint,
    borderRadius: radius.md, padding: 12,
    marginTop: 16, marginBottom: 24,
  },
  confirmNoteText: { flex: 1, fontSize: 12, fontFamily: fonts.medium, color: colors.amberText, lineHeight: 17 },
  viewRentals: { fontSize: 13, fontFamily: fonts.bold, color: colors.primary, textAlign: 'center' },
  waRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    alignSelf: 'stretch', paddingVertical: 13, marginTop: 10,
    backgroundColor: '#E9F9EF', borderRadius: radius.xl,
  },
  waRowText: { fontSize: 13, fontFamily: fonts.bold, color: '#1DA851' },
});
