import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { showToast, showConfirm } from '../components/Feedback';
import { useApp } from '../context/AppContext';

const CENTERS = [
  {
    id: 'nyarutarama',
    name: 'Nyarutarama Center',
    address: 'KG 9 Ave, Nyarutarama, Kigali',
    hours: 'Mon–Sat, 8:00 AM – 5:00 PM',
    slots: 12,
    icon: 'business-outline',
  },
  {
    id: 'kicukiro',
    name: 'Kicukiro Center',
    address: 'KN 5 Rd, Kicukiro, Kigali',
    hours: 'Mon–Sat, 8:00 AM – 5:00 PM',
    slots: 8,
    icon: 'business-outline',
  },
  {
    id: 'kimironko',
    name: 'Kimironko Center',
    address: 'KG 28 St, Kimironko, Kigali',
    hours: 'Mon–Fri, 9:00 AM – 4:00 PM',
    slots: 5,
    icon: 'business-outline',
  },
];

const getDates = () => {
  const dates = [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  for (let i = 1; i <= 10; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay();
    const available = dow !== 0; // No Sundays
    dates.push({
      label: days[dow],
      date: d.getDate(),
      month: months[d.getMonth()],
      available,
      key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
    });
  }
  return dates;
};

const TIME_SLOTS = [
  { label: '8:00 AM', available: true },
  { label: '9:00 AM', available: true },
  { label: '10:00 AM', available: false },
  { label: '11:00 AM', available: true },
  { label: '12:00 PM', available: true },
  { label: '1:00 PM', available: false },
  { label: '2:00 PM', available: true },
  { label: '3:00 PM', available: true },
  { label: '4:00 PM', available: true },
];

const DATES = getDates();

export default function InspectionSchedulingScreen({ navigation, route }) {
  const carName = route?.params?.carName || 'Your Car';
  const submissionId = route?.params?.submissionId || null;
  const { scheduleInspection } = useApp();
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const canBook = selectedCenter && selectedDate && selectedTime;

  const handleBook = () => {
    const center = CENTERS.find((c) => c.id === selectedCenter);
    const date = DATES.find((d) => d.key === selectedDate);
    // Write the booking back to the submission (API when reachable, local otherwise)
    if (submissionId) {
      scheduleInspection(submissionId, {
        center: center.name,
        date: `${date.month} ${date.date}`,
        time: selectedTime,
      });
    }
    showToast(`Inspection booked — ${date.month} ${date.date} at ${selectedTime}, ${center.name}.`, 'success');
    navigation.navigate('SellerDashboard');
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Book Inspection" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header info */}
        <LinearGradient colors={[colors.navyMid, colors.navyDeep]} style={styles.hero}>
          <Ionicons name="checkmark-circle" size={28} color={colors.blueLight} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>
              {submissionId ? 'Your submission was approved!' : 'Book a 150-point inspection'}
            </Text>
            <Text style={styles.heroTitle}>{carName}</Text>
            <Text style={styles.heroSub}>Book a 150-point inspection to go live on the platform.</Text>
          </View>
        </LinearGradient>

        {/* Section: Centers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Inspection Center</Text>
          <View style={styles.centerList}>
            {CENTERS.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.centerCard, selectedCenter === c.id && styles.centerCardActive]}
                onPress={() => setSelectedCenter(c.id)}
              >
                <View style={[styles.centerIcon, { backgroundColor: selectedCenter === c.id ? colors.primary : colors.surfaceAlt }]}>
                  <Ionicons name={c.icon} size={22} color={selectedCenter === c.id ? '#fff' : colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.centerName, selectedCenter === c.id && { color: colors.primary }]}>{c.name}</Text>
                  <Text style={styles.centerAddress}>{c.address}</Text>
                  <View style={styles.centerMeta}>
                    <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.centerMetaText}>{c.hours}</Text>
                    <View style={styles.dot} />
                    <Text style={[styles.centerMetaText, { color: colors.primary }]}>{c.slots} slots left</Text>
                  </View>
                </View>
                {selectedCenter === c.id && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Section: Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
            {DATES.map((d) => (
              <Pressable
                key={d.key}
                style={[
                  styles.dateCard,
                  !d.available && styles.dateCardUnavailable,
                  selectedDate === d.key && styles.dateCardActive,
                ]}
                onPress={() => d.available && setSelectedDate(d.key)}
                disabled={!d.available}
              >
                <Text style={[
                  styles.dateDay,
                  !d.available && { color: colors.border },
                  selectedDate === d.key && { color: '#fff' },
                ]}>{d.label}</Text>
                <Text style={[
                  styles.dateNum,
                  !d.available && { color: colors.border },
                  selectedDate === d.key && { color: '#fff' },
                ]}>{d.date}</Text>
                <Text style={[
                  styles.dateMonth,
                  !d.available && { color: colors.border },
                  selectedDate === d.key && { color: 'rgba(255,255,255,0.8)' },
                ]}>{d.month}</Text>
                {!d.available && <Text style={styles.dateUnavailableText}>Closed</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Section: Times */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose a Time Slot</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((t) => (
                <Pressable
                  key={t.label}
                  style={[
                    styles.timeSlot,
                    !t.available && styles.timeSlotUnavailable,
                    selectedTime === t.label && styles.timeSlotActive,
                  ]}
                  onPress={() => t.available && setSelectedTime(t.label)}
                  disabled={!t.available}
                >
                  <Text style={[
                    styles.timeLabel,
                    !t.available && { color: colors.border },
                    selectedTime === t.label && { color: '#fff' },
                  ]}>{t.label}</Text>
                  {!t.available && <Text style={styles.timeUnavail}>Booked</Text>}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Summary */}
        {canBook && (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Booking Summary</Text>
            <View style={styles.confirmRows}>
              <ConfirmRow icon="business-outline" label="Center" value={CENTERS.find((c) => c.id === selectedCenter)?.name} />
              {(() => {
                const d = DATES.find((x) => x.key === selectedDate);
                return d ? <ConfirmRow icon="calendar-outline" label="Date" value={`${d.label}, ${d.month} ${d.date}`} /> : null;
              })()}
              <ConfirmRow icon="time-outline" label="Time" value={selectedTime} />
            </View>
            <View style={styles.confirmNote}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.confirmNoteText}>Please arrive 10 minutes early. Bring all available service records.</Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Button
            title="Confirm Booking"
            onPress={handleBook}
            style={{ opacity: canBook ? 1 : 0.4 }}
          />
          {!canBook && <Text style={styles.footerHint}>Select center, date, and time to confirm</Text>}
        </View>
      </ScrollView>
    </Screen>
  );
}

function ConfirmRow({ icon, label, value }) {
  return (
    <View style={styles.confirmRow}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Text style={styles.confirmRowLabel}>{label}</Text>
      <Text style={styles.confirmRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  hero: {
    margin: 16,
    borderRadius: radius.xxl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  heroLabel: { fontSize: 11, fontFamily: fonts.bold, color: colors.blueLight, letterSpacing: 0.5 },
  heroTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: '#fff', marginTop: 2 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 12 },
  centerList: { gap: 10 },
  centerCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14,
    ...shadows.card,
  },
  centerCardActive: { borderColor: colors.primary, backgroundColor: colors.blueTint },
  centerIcon: {
    width: 46, height: 46, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  centerName: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  centerAddress: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  centerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  centerMetaText: { fontSize: 11, color: colors.textMuted },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border, marginHorizontal: 2 },
  dateScroll: { paddingLeft: 0, gap: 8, paddingRight: 8 },
  dateCard: {
    width: 64, alignItems: 'center', paddingVertical: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl, gap: 2,
  },
  dateCardUnavailable: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft },
  dateCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateDay: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textMuted },
  dateNum: { fontSize: 20, fontFamily: fonts.extraBold, color: colors.textPrimary },
  dateMonth: { fontSize: 11, color: colors.textMuted },
  dateUnavailableText: { fontSize: 10, color: colors.border, fontFamily: fonts.semiBold, marginTop: 2 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg, alignItems: 'center',
  },
  timeSlotUnavailable: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft },
  timeSlotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  timeUnavail: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  confirmCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...shadows.card,
  },
  confirmTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 12 },
  confirmRows: { gap: 10, marginBottom: 12 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmRowLabel: { fontSize: 13, color: colors.textMuted, width: 50 },
  confirmRowValue: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary, flex: 1 },
  confirmNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: colors.blueTint, borderRadius: radius.md, padding: 10,
  },
  confirmNoteText: { flex: 1, fontSize: 11, color: colors.textSecondary, lineHeight: 16 },
  footer: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  footerHint: { fontSize: 12, color: colors.textMuted },
});
