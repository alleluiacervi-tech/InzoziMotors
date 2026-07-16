import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { CHECKIN_PHOTOS } from '../data/rentals';

const FUEL_LEVELS = ['Full', '3/4', '1/2', '1/4'];

export default function RentalCheckInScreen({ navigation, route }) {
  const booking = route.params?.booking;
  const isReturn = route.params?.mode === 'return';
  const { updateRentalBookingStatus } = useApp();

  const [photos, setPhotos] = useState({});
  const [fuel, setFuel] = useState(null);

  const photosDone = Object.keys(photos).length;
  const allDone = photosDone === CHECKIN_PHOTOS.length && fuel;

  const capture = (key) => {
    setPhotos((prev) => ({ ...prev, [key]: true }));
  };

  const simulateWalkaround = () => {
    const all = {};
    CHECKIN_PHOTOS.forEach((slot) => { all[slot.key] = true; });
    setPhotos(all);
  };

  const handleComplete = () => {
    if (!allDone) return;
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
        'Condition photos saved. Your deposit is protected — enjoy the trip!',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title={isReturn ? 'Return Check-Out' : 'Digital Check-In'} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Why */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="camera" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>{booking?.carTitle}</Text>
            <Text style={styles.introSub}>
              {isReturn
                ? 'Photograph the car at return. These photos document its condition so the center can process your deposit refund.'
                : 'Photograph the car before driving off. These photos document its condition and protect your deposit at return.'}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{photosDone} of {CHECKIN_PHOTOS.length} photos</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(photosDone / CHECKIN_PHOTOS.length) * 100}%` }]} />
          </View>
        </View>

        {/* Photo grid */}
        <View style={styles.grid}>
          {CHECKIN_PHOTOS.map((slot) => {
            const done = photos[slot.key];
            return (
              <Pressable
                key={slot.key}
                style={[styles.slot, done && styles.slotDone]}
                onPress={() => capture(slot.key)}
              >
                {done ? (
                  <View style={styles.slotCheck}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                ) : (
                  <Ionicons name={slot.icon} size={22} color={colors.textMuted} />
                )}
                <Text style={[styles.slotLabel, done && styles.slotLabelDone]}>{slot.label}</Text>
                <Text style={styles.slotHint}>{done ? 'Captured' : 'Tap to photograph'}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={simulateWalkaround} style={styles.simulateLink}>
          <Text style={styles.simulateText}>Simulate walkaround</Text>
        </Pressable>

        {/* Fuel level */}
        <Text style={styles.sectionTitle}>Fuel level at {isReturn ? 'return' : 'pickup'}</Text>
        <View style={styles.fuelRow}>
          {FUEL_LEVELS.map((f) => {
            const on = fuel === f;
            return (
              <Pressable
                key={f}
                style={[styles.fuelChip, on && styles.fuelChipOn]}
                onPress={() => setFuel(f)}
              >
                <Text style={[styles.fuelText, on && styles.fuelTextOn]}>{f}</Text>
              </Pressable>
            );
          })}
        </View>

        <Button
          title={allDone ? (isReturn ? 'Complete Check-Out' : 'Complete Check-In') : 'Capture all photos & fuel level'}
          icon="checkmark-circle-outline"
          onPress={handleComplete}
          style={{ marginTop: 24, opacity: allDone ? 1 : 0.5 }}
          disabled={!allDone}
        />

        <View style={styles.privacyRow}>
          <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
          <Text style={styles.privacyText}>
            Photos are stored with your booking and shared with the return inspector only.
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
    borderWidth: 1, borderColor: '#DCFCE7',
    borderRadius: radius.xl, padding: 14, marginTop: 4,
  },
  introIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  introTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  introSub: { fontSize: 11, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 3, lineHeight: 16 },
  progressRow: { marginTop: 18 },
  progressText: { fontSize: 12, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 8 },
  progressTrack: { height: 6, backgroundColor: colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  slot: {
    width: '47.8%',
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: radius.lg, paddingVertical: 18,
    alignItems: 'center', gap: 6,
  },
  slotDone: { borderStyle: 'solid', borderColor: colors.primary, backgroundColor: colors.greenTint },
  slotCheck: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  slotLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.textSecondary },
  slotLabelDone: { color: colors.textPrimary },
  slotHint: { fontSize: 10, fontFamily: fonts.regular, color: colors.textMuted },
  simulateLink: { alignSelf: 'center', marginTop: 12, paddingVertical: 4, paddingHorizontal: 8 },
  simulateText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primary },
  sectionTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 24, marginBottom: 10 },
  fuelRow: { flexDirection: 'row', gap: 8 },
  fuelChip: {
    flex: 1, paddingVertical: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, alignItems: 'center',
  },
  fuelChipOn: { borderColor: colors.primary, backgroundColor: colors.greenTint },
  fuelText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  fuelTextOn: { color: colors.primary },
  privacyRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center',
    gap: 5, marginTop: 14, paddingHorizontal: 10,
  },
  privacyText: { flex: 1, fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 15 },
});
