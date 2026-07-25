import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { showToast, showConfirm } from '../components/Feedback';
import { captureImage } from '../utils/media';
import rentalsApi from '../api/rentals';
import { useApp } from '../context/AppContext';
import { CHECKIN_PHOTOS } from '../data/rentals';

// What the counter staff recorded, as stored on the booking's pickup_record /
// return_record. Falls back to a neutral record when the booking predates the
// digital walkaround (older demo bookings carry no record).
const FALLBACK_RECORD = {
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

  const stage = isReturn ? 'return' : 'pickup';
  const staffRecord = {
    ...FALLBACK_RECORD,
    ...(isReturn ? booking?.returnRecord : booking?.pickupRecord),
  };

  const [ownPhotos, setOwnPhotos] = useState({});
  const [showOwnPhotos, setShowOwnPhotos] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePhotoPress = async (slot) => {
    if (ownPhotos[slot.key]) {
      setOwnPhotos((p) => {
        const next = { ...p };
        delete next[slot.key];
        return next;
      });
      return;
    }
    const asset = await captureImage({
      preset: 'quick',
      title: slot.label,
      message: 'Your own record of the car at this moment — stored with the booking.',
    });
    if (asset) setOwnPhotos((p) => ({ ...p, [slot.key]: asset }));
  };

  const handleAgree = async () => {
    if (saving) return;
    setSaving(true);
    const shots = Object.entries(ownPhotos).map(([key, asset]) => ({ ...asset, slotKey: key }));
    try {
      // Photos first: they are the evidence the deposit check relies on, so a
      // failed upload must not be hidden behind an already-completed booking.
      if (shots.length) {
        await rentalsApi.uploadBookingPhotos(booking.id, shots, stage);
      }
      updateRentalBookingStatus(booking.id, isReturn ? 'completed' : 'active', {
        ...staffRecord,
        agreed_at: new Date().toISOString(),
        renter_photo_count: shots.length,
      });
      showToast(
        isReturn
          ? 'Return complete — your deposit is refunded after the center check.'
          : 'Check-in complete — enjoy the trip!',
        'success'
      );
      navigation.goBack();
    } catch (err) {
      showToast(err.message || 'Could not save your photos. Please try again.', 'error');
    } finally {
      setSaving(false);
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
            { icon: 'images-outline', label: 'Walkaround photos', value: `${staffRecord.photos} angles` },
            { icon: 'speedometer-outline', label: 'Odometer', value: staffRecord.odometer },
            { icon: 'water-outline', label: 'Fuel level', value: staffRecord.fuel },
            { icon: 'shield-checkmark-outline', label: 'Condition', value: staffRecord.condition },
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
            <Text style={styles.recordStampText}>{staffRecord.inspector}</Text>
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
                const asset = ownPhotos[slot.key];
                return (
                  <Pressable
                    key={slot.key}
                    style={[styles.slot, asset && styles.slotDone]}
                    onPress={() => handlePhotoPress(slot)}
                  >
                    {asset ? (
                      <>
                        <Image source={{ uri: asset.uri }} style={styles.slotImage} />
                        <Ionicons name="close-circle" size={20} color="#fff" style={styles.slotRemove} />
                      </>
                    ) : (
                      <>
                        <Ionicons name={slot.icon} size={22} color={colors.textMuted} />
                        <Text style={styles.slotLabel}>{slot.label}</Text>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Button
          title={
            saving
              ? 'Saving…'
              : isReturn ? 'I Agree — Complete Return' : 'I Agree — Start My Trip'
          }
          icon="checkmark-circle-outline"
          onPress={handleAgree}
          disabled={saving}
          style={{ marginTop: 24 }}
        />
        {saving && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 10 }} />}

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
  slotDone: {
    borderStyle: 'solid', borderColor: colors.green,
    height: 84, paddingVertical: 0, overflow: 'hidden',
  },
  slotImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  slotRemove: { position: 'absolute', top: 5, right: 5 },
  slotLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.textSecondary },
  privacyRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center',
    gap: 5, marginTop: 14, paddingHorizontal: 10,
  },
  privacyText: { flex: 1, fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 15 },
});
