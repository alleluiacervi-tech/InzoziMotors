import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Linking, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { showToast } from '../components/Feedback';
import { rentals as rentalsApi } from '../api/rentals';
import { DURATION_PRESETS, getRentalDates, calcTripCost, getPickupCenter, AIRPORT_PICKUP, PICKUP_WINDOWS } from '../data/rentals';
import { formatRWF } from '../data/marketData';
import { openWhatsApp, SAWA_WHATSAPP, WHATSAPP_VERIFIED } from '../utils/whatsapp';

// Payment amounts arrive from the server already in the booking's own
// currency — unlike the screen's local estimates, they must never be
// re-converted, only formatted. Rental rows are RWF by default; retaining a
// named fallback keeps an old non-RWF row from silently acquiring a dollar
// sign that means something it does not.
const fmtAmount = (amount, currency = 'RWF') =>
  currency === 'RWF'
    ? formatRWF(amount)
    : `${currency} ${Number(amount).toLocaleString()}`;


export default function RentalBookingScreen({ navigation, route }) {
  // Only reachable from RentalDetail, which guarantees a car — but a restored
  // navigation state or future deep link must not crash the booking flow.
  const car = route.params?.car || {};
  const unavailableDays = car.unavailableDays || [];
  const { bookRental, updateRentalBookingStatus } = useApp();

  const dates = getRentalDates(14);
  const durations = DURATION_PRESETS.filter((d) => d >= (car.minDays || 1));

  // Every day in [start, start + numDays) must be free. Indexes beyond the
  // 14-day window are assumed free (they can't appear in unavailableDays).
  const rangeIsFree = (start, numDays) => {
    for (let i = start; i < start + numDays; i++) {
      if (unavailableDays.includes(i)) return false;
    }
    return true;
  };

  const [startIdx, setStartIdx] = useState(() => {
    const first = dates.find((d) => !unavailableDays.includes(d.index));
    return first ? first.index : null;
  });
  const [days, setDays] = useState(durations[0]);
  const [time, setTime] = useState(PICKUP_WINDOWS[0]);
  const [airportPickup, setAirportPickup] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [booking, setBooking] = useState(false);
  // Online payment — opt-in per booking. `payment` holds the gateway leg
  // ({ merchant_ref, amount, currency, redirect_url, bookingId }) while the
  // renter is out on the hosted checkout page.
  const [payOnline, setPayOnline] = useState(false);
  const [payment, setPayment] = useState(null);
  const [payStatus, setPayStatus] = useState('pending'); // pending | failed
  const [checking, setChecking] = useState(false);

  const cost = calcTripCost(car, days);
  const rangeFree = startIdx !== null && days ? rangeIsFree(startIdx, days) : true;
  const canBook = startIdx !== null && days && rangeFree;
  const startDate = startIdx !== null ? dates[startIdx] : null;
  const homeCenter = getPickupCenter(car);
  const center = airportPickup ? AIRPORT_PICKUP : homeCenter;
  const pickupFee = airportPickup ? AIRPORT_PICKUP.fee : 0;
  const totalDue = cost.total + pickupFee;
  const currency = car.currency || 'RWF';
  const localAmount = (amount) => fmtAmount(amount, currency);

  const handleConfirm = async () => {
    if (!canBook || booking) return;
    setBooking(true);
    const iso = new Date();
    iso.setDate(iso.getDate() + startIdx);
    try {
      // Awaited, with the failure surfaced. This used to fire-and-forget and
      // show "Booking confirmed!" while the API was rejecting — a phantom
      // reservation nobody at the center was expecting.
      const result = await bookRental({
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
        payOnline,
      });
      if (payOnline && result?.payment?.redirect_url) {
        setPayStatus('pending');
        setPayment({ ...result.payment, bookingId: result.bookingId });
      } else {
        if (payOnline) {
          // Demo fallback or a server that quietly ignored the flag — the
          // booking exists as pay-at-center, so say so rather than pretend.
          showToast('Online payment is not available right now — pay at the center at pickup.', 'info');
        }
        setConfirmed(true);
      }
    } catch (err) {
      const msg =
        err?.code === 'PAYMENTS_NOT_CONFIGURED'
          ? 'Online payment is not available yet — choose "Pay at the center" instead.'
          : err?.code === 'PAYMENT_CURRENCY'
            ? 'This car cannot be paid online yet — choose "Pay at the center" instead.'
            : err?.status === 409
              ? 'Those dates were just taken — pick different ones.'
              : err?.status === 502 || err?.status === 503
                ? 'The payment service is unreachable. Nothing was charged — try again, or pay at the center.'
                : "The booking didn't go through. Check your connection and try again.";
      showToast(msg, 'error');
    } finally {
      setBooking(false);
    }
  };

  // While the renter is on the hosted checkout page, keep asking the server
  // whether money arrived: every few seconds, plus immediately whenever the
  // app returns to the foreground (the moment they come back from the
  // browser). The server verifies against the gateway itself — this poll is
  // also the safety net for a missed payment callback.
  useEffect(() => {
    if (!payment || confirmed || payStatus === 'failed') return undefined;
    let live = true;
    const check = async () => {
      try {
        const s = await rentalsApi.getPaymentStatus(payment.merchant_ref);
        if (!live) return;
        if (s.status === 'completed') setConfirmed(true);
        else if (['failed', 'expired', 'reversed'].includes(s.status)) setPayStatus('failed');
      } catch {
        // Transient — the next tick retries.
      }
    };
    const interval = setInterval(check, 5000);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') check(); });
    return () => { live = false; clearInterval(interval); sub.remove(); };
  }, [payment, confirmed, payStatus]);

  const checkNow = async () => {
    if (!payment || checking) return;
    setChecking(true);
    try {
      const s = await rentalsApi.getPaymentStatus(payment.merchant_ref);
      if (s.status === 'completed') setConfirmed(true);
      else if (['failed', 'expired', 'reversed'].includes(s.status)) setPayStatus('failed');
      else showToast('Not confirmed yet — finish the payment in the browser, then check again.', 'info');
    } catch {
      showToast('Could not reach the server — check your connection.', 'error');
    } finally {
      setChecking(false);
    }
  };

  // Walk away from an unpaid hold: release the dates, land back on the form.
  const abandonPayment = async () => {
    const id = payment?.bookingId;
    setPayment(null);
    setPayStatus('pending');
    if (id) {
      try { await updateRentalBookingStatus(id, 'cancelled'); } catch { /* hold ages out on its own */ }
    }
  };

  // ── Confirmation state ──
  if (confirmed) {
    const paidOnline = Boolean(payment);
    return (
      <Screen background={colors.bg}>
        <View style={styles.confirmWrap}>
          <View style={styles.confirmIcon}>
            <Ionicons name="checkmark" size={44} color="#fff" />
          </View>
          <Text style={styles.confirmTitle}>{paidOnline ? 'Paid & confirmed!' : 'Booking confirmed!'}</Text>
          <Text style={styles.confirmSub}>
            {car.title} is reserved for you from {startDate.full}.
          </Text>

          <View style={styles.confirmCard}>
            <ConfirmRow icon="car-outline" label="Vehicle" value={car.title} />
            <ConfirmRow icon="calendar-outline" label="Pickup" value={`${startDate.full} · ${time}`} />
            <ConfirmRow icon="time-outline" label="Duration" value={`${days} day${days > 1 ? 's' : ''}`} />
            <ConfirmRow icon="location-outline" label="Center" value={center.name} />
            {paidOnline ? (
              <>
                <ConfirmRow icon="card-outline" label="Paid online" value={fmtAmount(payment.amount, payment.currency)} />
                <ConfirmRow icon="cash-outline" label="Due at pickup" value={`${localAmount(cost.deposit)} refundable deposit`} last />
              </>
            ) : (
              <ConfirmRow icon="cash-outline" label="Due at pickup" value={`${localAmount(totalDue)} (incl. ${localAmount(cost.deposit)} deposit)`} last />
            )}
          </View>

          <View style={styles.confirmNote}>
            <Ionicons name="document-text-outline" size={16} color={colors.amber} />
            <Text style={styles.confirmNoteText}>
              {paidOnline
                ? 'Rental paid — a receipt is on its way to your email. Bring your driving licence and national ID; only the refundable deposit is handled at the center.'
                : 'Bring your driving licence and national ID. Payment is at the center — nothing is charged now.'}
            </Text>
          </View>

          <Button title="View My Rentals" onPress={() => navigation.navigate('MyRentals')} style={{ alignSelf: 'stretch' }} />
          {/* Honesty gate: hidden until the business line is real — this used
              to open a chat to the placeholder number. */}
          {WHATSAPP_VERIFIED && (
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
          )}
          <Pressable onPress={() => navigation.navigate('Main')} style={{ marginTop: 14 }}>
            <Text style={styles.viewRentals}>Back to Home</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // ── Payment state — the renter is out on the hosted checkout page ──
  if (payment) {
    const failed = payStatus === 'failed';
    return (
      <Screen background={colors.bg}>
        <BackHeader title={failed ? 'Payment failed' : 'Complete payment'} onBack={abandonPayment} />
        <View style={styles.confirmWrap}>
          <View style={[styles.confirmIcon, { backgroundColor: failed ? colors.alertRed : colors.amber }]}>
            <Ionicons name={failed ? 'close' : 'card-outline'} size={40} color="#fff" />
          </View>
          <Text style={styles.confirmTitle}>{failed ? "Payment didn't go through" : 'Complete your payment'}</Text>
          <Text style={styles.confirmSub}>
            {failed
              ? 'Nothing was charged. You can book again and retry, or book and pay at the center instead.'
              : `${car.title} is held for you for 35 minutes. Pay securely with a card, MTN MoMo or Airtel Money — the refundable deposit is not charged now.`}
          </Text>

          <View style={styles.confirmCard}>
            <ConfirmRow icon="car-outline" label="Vehicle" value={car.title} />
            <ConfirmRow icon="calendar-outline" label="Pickup" value={`${startDate.full} · ${time}`} />
            <ConfirmRow icon="card-outline" label="Pay now" value={fmtAmount(payment.amount, payment.currency)} />
            <ConfirmRow icon="cash-outline" label="At the center" value={`${localAmount(cost.deposit)} refundable deposit`} last />
          </View>

          {failed ? (
            <Button
              title="Back to booking"
              onPress={abandonPayment}
              style={{ alignSelf: 'stretch', marginTop: 20 }}
            />
          ) : (
            <>
              <Button
                title="Pay securely"
                onPress={() => Linking.openURL(payment.redirect_url).catch(() =>
                  showToast('Could not open the payment page — try again.', 'error')
                )}
                style={{ alignSelf: 'stretch', marginTop: 20 }}
              />
              <Pressable style={styles.checkStatusBtn} onPress={checkNow} disabled={checking}>
                <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                <Text style={styles.checkStatusText}>{checking ? 'Checking…' : "I've paid — check status"}</Text>
              </Pressable>
              <Pressable onPress={abandonPayment} style={{ marginTop: 18 }}>
                <Text style={styles.abandonText}>Cancel — I'll pay at the center instead</Text>
              </Pressable>
            </>
          )}
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
              <Text style={styles.carRate}>{localAmount(car.dailyRate)}</Text>
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
          <Text style={styles.airportFee}>+{localAmount(AIRPORT_PICKUP.fee)}</Text>
        </Pressable>

        {/* Cost breakdown */}
        <Text style={styles.sectionTitle}>Trip cost</Text>
        <View style={styles.costCard}>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>
              {days >= 7
                ? `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''}${days % 7 ? ` + ${days % 7} day${days % 7 > 1 ? 's' : ''}` : ''}`
                : `${localAmount(car.dailyRate)} × ${days} day${days > 1 ? 's' : ''}`}
            </Text>
            <Text style={styles.costValue}>{localAmount(cost.subtotal)}</Text>
          </View>
          <View style={styles.costRow}>
            <View>
              <Text style={styles.costLabel}>Refundable deposit</Text>
              <Text style={styles.costSub}>Returned after the vehicle check</Text>
            </View>
            <Text style={styles.costValue}>{localAmount(cost.deposit)}</Text>
          </View>
          {pickupFee > 0 && (
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Airport meet & greet</Text>
              <Text style={styles.costValue}>{localAmount(pickupFee)}</Text>
            </View>
          )}
          <View style={styles.costDivider} />
          <View style={styles.costRow}>
            <Text style={styles.costTotalLabel}>Due at pickup</Text>
            <Text style={styles.costTotalValue}>{localAmount(totalDue)}</Text>
          </View>
          <Text style={styles.costRwf}>All amounts are in {currency}</Text>
        </View>

        {/* How you'll pay — the deposit is NEVER part of the online charge */}
        <Text style={styles.sectionTitle}>How you'll pay</Text>
        <Pressable style={[styles.payOption, !payOnline && styles.payOptionOn]} onPress={() => setPayOnline(false)}>
          <View style={[styles.payRadio, !payOnline && styles.payRadioOn]}>
            {!payOnline && <View style={styles.payRadioDot} />}
          </View>
          <Ionicons name="storefront-outline" size={18} color={!payOnline ? colors.primary : colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.payOptionTitle}>Pay at the center</Text>
            <Text style={styles.payOptionSub}>Cash or mobile money when you collect the car</Text>
          </View>
        </Pressable>
        <Pressable style={[styles.payOption, payOnline && styles.payOptionOn]} onPress={() => setPayOnline(true)}>
          <View style={[styles.payRadio, payOnline && styles.payRadioOn]}>
            {payOnline && <View style={styles.payRadioDot} />}
          </View>
          <Ionicons name="card-outline" size={18} color={payOnline ? colors.primary : colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.payOptionTitle}>Pay online now</Text>
            <Text style={styles.payOptionSub}>Card · MTN MoMo · Airtel Money — secure checkout</Text>
          </View>
        </Pressable>
        <View style={styles.depositChip}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.green} />
          <Text style={styles.depositChipText}>
            {payOnline
              ? `Online you pay the rental only — the ${localAmount(cost.deposit)} refundable deposit stays at the center`
              : 'No payment now — everything is handled at the Sawa center'}
          </Text>
        </View>

        <Button
          title={booking
            ? (payOnline ? 'Starting payment…' : 'Booking…')
            : canBook ? (payOnline ? 'Book & Pay Online' : 'Confirm Booking')
              : rangeFree ? 'Select a pickup date' : 'Selected dates unavailable'}
          onPress={handleConfirm}
          style={{ marginTop: 20, opacity: canBook && !booking ? 1 : 0.5 }}
          disabled={!canBook || booking}
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
  dateDay: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textMuted },
  dateNum: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  dateMonth: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted },
  dateTextOn: { color: colors.primary },
  dateTextBlocked: { color: colors.textDisabled },
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
  costSub: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 1 },
  costValue: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  costDivider: { height: 1, backgroundColor: colors.borderSoft, marginBottom: 12 },
  costTotalLabel: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  costTotalValue: { fontSize: 20, fontFamily: fonts.extraBold, color: colors.primary, letterSpacing: -0.4 },
  costRwf: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted, textAlign: 'right', marginTop: -8, marginBottom: 12 },
  // Payment method
  payOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14, marginBottom: 8,
  },
  payOptionOn: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  payRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  payRadioOn: { borderColor: colors.primary },
  payRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  payOptionTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  payOptionSub: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 1 },
  depositChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.greenTint,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: radius.md, marginTop: 2,
  },
  depositChipText: { flex: 1, fontSize: 11, fontFamily: fonts.semiBold, color: colors.greenText },
  // Payment pending / failed state
  checkStatusBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    alignSelf: 'stretch', paddingVertical: 13, marginTop: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.xl,
  },
  checkStatusText: { fontSize: 13, fontFamily: fonts.bold, color: colors.primary },
  abandonText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textMuted, textAlign: 'center' },
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
