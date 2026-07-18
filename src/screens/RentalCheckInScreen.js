import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { CHECKIN_PHOTOS } from '../data/rentals';

// Mock of what staff record at the counter — becomes API data in Phase 6
const STAFF_RECORD = {
  photos: 12,
  odometer: '21,408 km',
  fuel: 'Full',
  condition: 'No new damage noted',
  inspector: 'Inzozi staff · Center walkaround',
};

export default function RentalCheckInScreen({ navigation, route }) {
  const booking = route.params?.booking;
  const isReturn = route.params?.mode === 'return';
  const { updateRentalBookingStatus } = useApp();

  const [ownPhotos, setOwnPhotos] = useState({});
  const [showOwnPhotos, setShowOwnPhotos] = useState(false);

  const handleAgree = () => {
    updateRentalBookingStatus(booking.id, isReturn ? 'completed' : 'active');
    if (isReturn) {
      Alert.alert(
        'Return complete ✓',
        'Your deposit will be refunded after the center check.',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert(
        'Check-in complete ✓',
        'Condition record saved to your booking. Enjoy the trip!',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title={isReturn ? 'Return Check-Out' : 'Digital Check-In'} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Car + context */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>{booking?.carTitle}</Text>
            <Text style={styles.introSub}>
              {isReturn
                ? 'Our staff recorded the car’s condition at return. Review and confirm — your deposit refund follows.'
                : 'Our staff recorded the car’s condition at pickup. Review and confirm to start your trip.'}
            </Text>
          </View>
        </View>

        {/* Staff condition record */}
        <Text style={styles.sectionTitle}>Condition recorded at the center</Text>
        <View style={styles.recordCard}>
          {[
            { icon: 'images-outline', label: 'Walkaround photos', value: `${STAFF_RECORD.photos} angles` },
            { icon: 'speedometer-outline', label: 'Odometer', value: STAFF_RECORD.odometer },
            { icon: 'water-outline', label: 'Fuel level', value: STAFF_RECORD.fuel },
            { icon: 'shield-checkmark-outline', label: 'Condition', value: STAFF_RECORD.condition },
          ].map((row, i, arr) => (
            <View key={row.label} style={[styles.recordRow, i < arr.length - 1 && styles.recordRowBorder]}>
              <View style={styles.recordIcon}>
                <Ionicons name={row.icon} size={16} color={colors.textSecondary} />
              </View>
              <Text style={styles.recordLabel}>{row.label}</Text>
              <Text style={styles.recordValue}>{row.value}</Text>
            </View>
          ))}
          <View style={styles.recordStamp}>
            <Ionicons name="checkmark-circle" size={13} color={colors.green} />
            <Text style={styles.recordStampText}>{STAFF_RECORD.inspector}</Text>
          </View>
        </View>

        {/* Optional own photos */}
        {!showOwnPhotos ? (
          <Pressable style={styles.ownPhotosLink} onPress={() => setShowOwnPhotos(true)}>
            <Ionicons name="camera-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.ownPhotosLinkText}>Add my own photos (optional)</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </Pressable>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Your photos (optional)</Text>
            <View style={styles.grid}>
              {CHECKIN_PHOTOS.slice(0, 4).map((slot) => {
                const done = ownPhotos[slot.key];
                return (
                  <Pressable
                    key={slot.key}
                    style={[styles.slot, done && styles.slotDone]}
                    onPress={() => setOwnPhotos((p) => ({ ...p, [slot.key]: true }))}
                  >
                    <Ionicons
                      name={done ? 'checkmark-circle' : slot.icon}
                      size={22}
                      color={done ? colors.green : colors.textMuted}
                    />
                    <Text style={[styles.slotLabel, done && { color: colors.textPrimary }]}>{slot.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Button
          title={isReturn ? 'I Agree — Complete Return' : 'I Agree — Start My Trip'}
          icon="checkmark-circle-outline"
          onPress={handleAgree}
          style={{ marginTop: 24 }}
        />

        <View style={styles.privacyRow}>
          <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
          <Text style={styles.privacyText}>
            The condition record is stored with your booking and used only for the deposit check.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  introCard: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: colors.greenTint,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14, marginTop: 4,
  },
  introIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  introTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  introSub: { fontSize: 11, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 3, lineHeight: 16 },
  sectionTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 22, marginBottom: 10 },
  recordCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, paddingHorizontal: 16,
    ...shadows.card,
  },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  recordRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  recordIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  recordLabel: { flex: 1, fontSize: 13, fontFamily: fonts.medium, color: colors.textSecondary },
  recordValue: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  recordStamp: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft,
  },
  recordStampText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textMuted },
  ownPhotosLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    marginTop: 16, paddingVertical: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: radius.lg,
  },
  ownPhotosLinkText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: {
    width: '47.8%',
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: radius.lg, paddingVertical: 16,
    alignItems: 'center', gap: 6,
  },
  slotDone: { borderStyle: 'solid', borderColor: colors.green, backgroundColor: colors.statusLiveBg },
  slotLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.textSecondary },
  privacyRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center',
    gap: 5, marginTop: 14, paddingHorizontal: 10,
  },
  privacyText: { flex: 1, fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 15 },
});
