import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { formatPrice } from '../data/cars';
import { useApp } from '../context/AppContext';

const CENTERS = [
  { id: 'nyarutarama', name: 'Nyarutarama Center', address: 'KG 9 Ave, Nyarutarama' },
  { id: 'kicukiro', name: 'Kicukiro Center', address: 'KN 5 Rd, Kicukiro' },
  { id: 'kimironko', name: 'Kimironko Center', address: 'KG 28 St, Kimironko' },
];

const getDates = () => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date(2026, 5, 28);
  return Array.from({ length: 10 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i + 1);
    return {
      label: days[d.getDay()],
      date: d.getDate(),
      display: `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`,
      full: `${months[d.getMonth()]} ${d.getDate()}, 2026`,
      available: d.getDay() !== 0,
      key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
    };
  });
};

const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
];

const HOW_IT_WORKS = [
  { icon: 'calendar-outline', title: 'Pick a slot at our center', sub: 'Choose a date, time, and Inzozi center near you.' },
  { icon: 'lock-closed-outline', title: 'Car reserved instantly', sub: 'Removed from the marketplace the moment you book.' },
  { icon: 'people-outline', title: 'Meet at the Inzozi center', sub: 'Bring the seller. We verify everything together.' },
  { icon: 'shield-checkmark-outline', title: 'Handover confirmed', sub: 'Ownership transferred. 7-day return guarantee starts.' },
];

// ─── Review phase ────────────────────────────────────────────────────────────
function ReviewState({ car, price, onNext }) {
  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.carCard}>
          <Image source={{ uri: car.image }} style={styles.carThumb} resizeMode="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.carTitle}>{car.title}</Text>
            <Text style={styles.carSeller}>{car.seller}</Text>
            <Text style={styles.carPrice}>{formatPrice(price)}</Text>
          </View>
        </View>

        {car.inspected && (
          <View style={styles.certBadge}>
            <Ionicons name="shield-checkmark" size={15} color={colors.green} />
            <Text style={styles.certBadgeText}>Inzozi Certified · 150-point inspection passed</Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.statusScheduled} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>How the handover works</Text>
            <Text style={styles.infoSub}>
              No money changes hands in the app. Payment, documents, and ownership transfer all happen at the Inzozi center — where we protect both you and the seller.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>What happens step by step</Text>
        <View style={styles.stepsCard}>
          {HOW_IT_WORKS.map((s, i) => (
            <View key={s.title} style={[styles.step, i < HOW_IT_WORKS.length - 1 && styles.stepBorder]}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <View style={styles.stepIcon}>
                <Ionicons name={s.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepSub}>{s.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sellerCard}>
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerInitial}>{car.seller?.[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sellerName}>{car.seller}</Text>
            <View style={styles.sellerMeta}>
              <Ionicons name="star" size={12} color={colors.amber} />
              <Text style={styles.sellerMetaText}>{car.rating} · Verified seller</Text>
            </View>
          </View>
          <View style={styles.sellerVerified}>
            <Ionicons name="checkmark-circle" size={14} color={colors.green} />
            <Text style={styles.sellerVerifiedText}>ID Verified</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Asking price</Text>
          <Text style={styles.footerValue}>{formatPrice(price)}</Text>
        </View>
        <Button title="Book a Handover Slot" icon="calendar-outline" onPress={onNext} style={{ flex: 1 }} />
      </View>
    </>
  );
}

// ─── Booking phase ───────────────────────────────────────────────────────────
function BookingState({ onConfirm, onBack }) {
  const DATES = getDates();
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const canConfirm = selectedCenter && selectedDate && selectedTime;

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.bookingSection}>Choose a center</Text>
        {CENTERS.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.centerCard, selectedCenter?.id === c.id && styles.centerCardSelected]}
            onPress={() => setSelectedCenter(c)}
          >
            <View style={[styles.centerDot, selectedCenter?.id === c.id && styles.centerDotSelected]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.centerName, selectedCenter?.id === c.id && styles.centerNameSelected]}>{c.name}</Text>
              <Text style={styles.centerAddress}>{c.address}</Text>
            </View>
            {selectedCenter?.id === c.id && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </Pressable>
        ))}

        <Text style={[styles.bookingSection, { marginTop: 20 }]}>Choose a date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
          {DATES.map((d) => (
            <Pressable
              key={d.key}
              style={[
                styles.dateChip,
                !d.available && styles.dateChipDisabled,
                selectedDate?.key === d.key && styles.dateChipSelected,
              ]}
              onPress={() => d.available && setSelectedDate(d)}
              disabled={!d.available}
            >
              <Text style={[styles.dateDow, selectedDate?.key === d.key && styles.dateDowSelected]}>{d.label}</Text>
              <Text style={[styles.dateNum, selectedDate?.key === d.key && styles.dateNumSelected]}>{d.date}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {selectedDate && (
          <>
            <Text style={[styles.bookingSection, { marginTop: 20 }]}>Choose a time</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.timeChip, selectedTime === t && styles.timeChipSelected]}
                  onPress={() => setSelectedTime(t)}
                >
                  <Text style={[styles.timeText, selectedTime === t && styles.timeTextSelected]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {canConfirm && (
          <View style={styles.summaryBox}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={styles.summaryText}>
              {selectedCenter.name} · {selectedDate.display} · {selectedTime}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Confirm Booking"
          icon="shield-checkmark-outline"
          onPress={() => canConfirm && onConfirm(selectedCenter.name, selectedDate.full, selectedTime)}
          style={{ opacity: canConfirm ? 1 : 0.45 }}
        />
      </View>
    </>
  );
}

// ─── Confirmed phase ─────────────────────────────────────────────────────────
function ConfirmedState({ car, bookingId, center, date, time, onTrack, onMessage }) {
  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <LinearGradient colors={[colors.navyMid, colors.navyDeep]} style={styles.successHero}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={44} color={colors.greenLight} />
          </View>
          <Text style={styles.successTitle}>Handover Booked!</Text>
          <Text style={styles.successSub}>
            The {car.title} is now reserved for you. No one else can book it.
          </Text>
        </LinearGradient>

        <View style={styles.bookingCard}>
          <Text style={styles.bookingCardTitle}>Your booking</Text>
          {[
            { icon: 'bookmark-outline', label: 'Booking ID', value: bookingId },
            { icon: 'business-outline', label: 'Center', value: center },
            { icon: 'calendar-outline', label: 'Date', value: date },
            { icon: 'time-outline', label: 'Time', value: time },
          ].map((row) => (
            <View key={row.label} style={styles.bookingRow}>
              <Ionicons name={row.icon} size={15} color={colors.textMuted} />
              <Text style={styles.bookingRowLabel}>{row.label}</Text>
              <Text style={styles.bookingRowValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.guaranteeCard}>
          <Ionicons name="shield-checkmark" size={16} color={colors.green} />
          <Text style={styles.guaranteeText}>
            7-day return guarantee applies when handover is completed at the Inzozi center.
          </Text>
        </View>

        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>While you wait</Text>
          {[
            { icon: 'chatbubble-outline', text: 'Message the seller — confirm they know the date and center.' },
            { icon: 'document-text-outline', text: 'Re-read the 150-point inspection report for this car.' },
            { icon: 'earth-outline', text: 'Check the Vehicle History for import origin and RRA duty records.' },
          ].map((item, i) => (
            <View key={i} style={styles.nextRow}>
              <View style={styles.nextIcon}><Ionicons name={item.icon} size={14} color={colors.primary} /></View>
              <Text style={styles.nextText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Track Booking" icon="navigate-outline" onPress={onTrack} />
        <Button
          title="Message Seller"
          variant="secondary"
          icon="chatbubble-outline"
          onPress={onMessage}
          style={{ marginTop: 10 }}
        />
      </View>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function CheckoutScreen({ navigation, route }) {
  const car = route.params?.car;
  const price = car.type === 'auction' ? car.currentBid : car.price;
  const { bookHandover } = useApp();

  const [phase, setPhase] = useState('review');
  const [bookingId, setBookingId] = useState(null);
  const [booking, setBooking] = useState({ center: '', date: '', time: '' });

  const handleConfirm = (center, date, time) => {
    const id = bookHandover(car, { center, date, time });
    setBookingId(id);
    setBooking({ center, date, time });
    setPhase('confirmed');
  };

  const titles = { review: 'Book a Handover', booking: 'Choose a Slot', confirmed: 'Booking Confirmed' };

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title={titles[phase]}
        onBack={() => {
          if (phase === 'booking') setPhase('review');
          else if (phase === 'confirmed') navigation.navigate('Main');
          else navigation.goBack();
        }}
      />
      {phase === 'review' && (
        <ReviewState car={car} price={price} onNext={() => setPhase('booking')} />
      )}
      {phase === 'booking' && (
        <BookingState
          onConfirm={handleConfirm}
          onBack={() => setPhase('review')}
        />
      )}
      {phase === 'confirmed' && (
        <ConfirmedState
          car={car}
          bookingId={bookingId}
          center={booking.center}
          date={booking.date}
          time={booking.time}
          onTrack={() => navigation.navigate('OrderTracking', { orderId: bookingId, car })}
          onMessage={() => navigation.navigate('Chat', { name: car.seller, car })}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingTop: 8, paddingBottom: 120 },

  // Car summary
  carCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 12, marginBottom: 10, ...shadows.card,
  },
  carThumb: { width: 80, height: 60, borderRadius: radius.lg, backgroundColor: colors.border },
  carTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary, lineHeight: 19 },
  carSeller: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2 },
  carPrice: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.primary, marginTop: 4 },

  certBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.greenTint, borderWidth: 1, borderColor: colors.primary + '33',
    borderRadius: radius.lg, padding: 12, marginBottom: 10,
  },
  certBadgeText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primary, flex: 1 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EFF6FF', borderRadius: radius.lg, padding: 14, marginBottom: 16,
  },
  infoTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.statusScheduled },
  infoSub: { fontSize: 12, fontFamily: fonts.regular, color: colors.statusScheduled, lineHeight: 17, marginTop: 3 },

  sectionTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 10 },

  stepsCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, overflow: 'hidden', marginBottom: 12,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  stepNum: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  stepNumText: { fontSize: 10, fontFamily: fonts.extraBold, color: '#fff' },
  stepIcon: {
    width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  stepSub: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },

  sellerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14,
  },
  sellerAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.navyMid,
    alignItems: 'center', justifyContent: 'center',
  },
  sellerInitial: { color: '#fff', fontFamily: fonts.extraBold, fontSize: 16 },
  sellerName: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  sellerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  sellerMetaText: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary },
  sellerVerified: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.greenTint, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill,
  },
  sellerVerifiedText: { fontSize: 11, fontFamily: fonts.bold, color: colors.green },

  // Booking phase
  bookingSection: { fontSize: 13, fontFamily: fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  centerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14, marginBottom: 8,
  },
  centerCardSelected: { borderColor: colors.primary, backgroundColor: colors.greenTint },
  centerDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  centerDotSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  centerName: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  centerNameSelected: { color: colors.primary },
  centerAddress: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },

  dateRow: { gap: 8, paddingBottom: 4 },
  dateChip: {
    width: 52, paddingVertical: 10, alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg,
  },
  dateChipDisabled: { opacity: 0.35 },
  dateChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateDow: { fontSize: 10, fontFamily: fonts.semiBold, color: colors.textMuted, marginBottom: 4 },
  dateDowSelected: { color: 'rgba(255,255,255,0.75)' },
  dateNum: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary },
  dateNumSelected: { color: '#fff' },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg,
  },
  timeChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  timeTextSelected: { color: '#fff' },

  summaryBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16,
    backgroundColor: colors.greenTint, borderWidth: 1, borderColor: colors.primary + '44',
    borderRadius: radius.xl, padding: 14,
  },
  summaryText: { flex: 1, fontSize: 13, fontFamily: fonts.semiBold, color: colors.primary },

  // Confirmed phase
  successHero: { margin: 16, marginBottom: 10, borderRadius: radius.xxl, padding: 28, alignItems: 'center', gap: 10 },
  successIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: 24, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -0.5 },
  successSub: { fontSize: 14, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },

  bookingCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, gap: 12, ...shadows.card,
  },
  bookingCardTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 4 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookingRowLabel: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted, width: 70 },
  bookingRowValue: { flex: 1, fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary },

  guaranteeCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 16, marginBottom: 10,
    backgroundColor: colors.greenTint, borderWidth: 1, borderColor: colors.primary + '33',
    borderRadius: radius.xl, padding: 14,
  },
  guaranteeText: { flex: 1, fontSize: 12, fontFamily: fonts.medium, color: colors.navyMid, lineHeight: 18 },

  nextCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, gap: 12, ...shadows.card,
  },
  nextTitle: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.textPrimary },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nextIcon: {
    width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  nextText: { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 18 },

  // Shared footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    backgroundColor: colors.surface, ...shadows.floating,
  },
  footerLabel: { fontSize: 12, fontFamily: fonts.medium, color: colors.textSecondary, marginBottom: 2 },
  footerValue: { fontSize: 20, fontFamily: fonts.extraBold, color: colors.textPrimary },
});
