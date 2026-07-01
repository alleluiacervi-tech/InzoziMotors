import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { PHOTO_GROUPS } from '../data/inspectionData';

const TOTAL_REQUIRED = PHOTO_GROUPS.reduce((s, g) => {
  // Defect group is optional — only first 28 are required
  if (g.group === 'Defects (if any)') return s;
  return s + g.slots.length;
}, 0);

const TOTAL_SLOTS = PHOTO_GROUPS.reduce((s, g) => s + g.slots.length, 0);

function SlotCard({ slot, uploaded, onPress, optional }) {
  return (
    <Pressable
      style={[styles.slot, uploaded && styles.slotUploaded, optional && styles.slotOptional]}
      onPress={onPress}
    >
      {uploaded ? (
        <>
          <View style={styles.slotCheckCircle}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
          <Text style={styles.slotLabelUploaded} numberOfLines={2}>{slot.label}</Text>
        </>
      ) : (
        <>
          <View style={[styles.slotAddIcon, optional && styles.slotAddIconOptional]}>
            <Ionicons name="camera-outline" size={18} color={optional ? colors.textMuted : colors.primary} />
          </View>
          <Text style={[styles.slotLabel, optional && styles.slotLabelOptional]} numberOfLines={2}>
            {slot.label}
          </Text>
          {optional && <Text style={styles.optionalTag}>optional</Text>}
        </>
      )}
    </Pressable>
  );
}

export default function PhotoUploadScreen({ navigation, route }) {
  const { inspection, score } = route.params || {};
  const [uploaded, setUploaded] = useState({});
  const uploadedCount = Object.values(uploaded).filter(Boolean).length;
  const requiredUploaded = PHOTO_GROUPS.filter((g) => g.group !== 'Defects (if any)')
    .reduce((s, g) => s + g.slots.filter((sl) => uploaded[sl.id]).length, 0);

  const handleSlotPress = (slotId) => {
    Alert.alert(
      'Upload Photo',
      'In the full app, this opens the device camera. Mark as uploaded for demo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Uploaded',
          onPress: () => setUploaded((prev) => ({ ...prev, [slotId]: true })),
        },
        uploaded[slotId] && {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setUploaded((prev) => ({ ...prev, [slotId]: false })),
        },
      ].filter(Boolean),
    );
  };

  const handleMarkAll = () => {
    const all = {};
    PHOTO_GROUPS.forEach((g) => g.slots.forEach((s) => { all[s.id] = true; }));
    setUploaded(all);
  };

  const handleSubmit = () => {
    if (requiredUploaded < TOTAL_REQUIRED) {
      Alert.alert(
        'Missing Required Photos',
        `${TOTAL_REQUIRED - requiredUploaded} required photo(s) missing. All non-defect slots must be filled before publishing.`,
        [
          { text: 'Continue Anyway', onPress: proceed },
          { text: 'Keep Uploading', style: 'cancel' },
        ],
      );
    } else {
      proceed();
    }
  };

  const proceed = () => {
    Alert.alert(
      'Photos Submitted!',
      'This listing will now be reviewed and published to the marketplace within 2 hours.',
      [{ text: 'Back to Admin Panel', onPress: () => navigation.navigate('Main') }],
    );
  };

  const pct = Math.round((uploadedCount / TOTAL_SLOTS) * 100);

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title="Photo Upload"
        onBack={() => navigation.goBack()}
        right={
          <Pressable onPress={handleMarkAll}>
            <Text style={styles.markAllBtn}>Demo: Fill All</Text>
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>{inspection?.car || '2019 Toyota RAV4'}</Text>
              <Text style={styles.headerSub}>
                Inspection score: <Text style={{ color: colors.primary, fontFamily: fonts.extraBold }}>{score || 143}/150</Text>
              </Text>
            </View>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreCirclePct}>{pct}%</Text>
              <Text style={styles.scoreCircleLabel}>uploaded</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressMetaText}>{uploadedCount} / {TOTAL_SLOTS} photos</Text>
            <Text style={styles.progressMetaReq}>{requiredUploaded}/{TOTAL_REQUIRED} required</Text>
          </View>
        </View>

        {/* Standard info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.infoBannerText}>
            36 standardized angles — identical format for every listing. Defect photos are optional but recommended.
          </Text>
        </View>

        {/* Photo groups */}
        {PHOTO_GROUPS.map((group) => {
          const isOptional = group.group === 'Defects (if any)';
          const groupUploaded = group.slots.filter((s) => uploaded[s.id]).length;
          return (
            <View key={group.group} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.group}</Text>
                <Text style={styles.groupCount}>
                  {groupUploaded}/{group.slots.length}
                  {isOptional && <Text style={styles.groupOptional}> · optional</Text>}
                </Text>
              </View>
              <View style={styles.slotsGrid}>
                {group.slots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    uploaded={!!uploaded[slot.id]}
                    onPress={() => handleSlotPress(slot.id)}
                    optional={isOptional}
                  />
                ))}
              </View>
            </View>
          );
        })}

        {/* Quality tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Photo Quality Guidelines</Text>
          {[
            'Use natural light or studio lighting — no flash shadows',
            'Shoot from consistent angles per the slot guide above',
            'Close-up shots must be in focus — no blurry images',
            'Defect photos must show honest damage with no hiding',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.cta}>
        <Button
          title={requiredUploaded >= TOTAL_REQUIRED ? 'Submit for Listing' : `Upload ${TOTAL_REQUIRED - requiredUploaded} More Required`}
          icon={requiredUploaded >= TOTAL_REQUIRED ? 'cloud-upload-outline' : 'camera-outline'}
          onPress={handleSubmit}
        />
        <Text style={styles.ctaSub}>
          {requiredUploaded >= TOTAL_REQUIRED
            ? 'All required photos ready · Listing will go live within 2 hours'
            : `${TOTAL_REQUIRED} required · Defect shots optional`}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    margin: 16, marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16,
    ...shadows.card,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  headerTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  scoreCircle: {
    width: 62, height: 62, borderRadius: 31,
    borderWidth: 3, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreCirclePct: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.primary },
  scoreCircleLabel: { fontSize: 9, color: colors.textMuted, marginTop: -2 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressMetaText: { fontSize: 12, color: colors.textSecondary },
  progressMetaReq: { fontSize: 12, fontFamily: fonts.bold, color: colors.primary },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.greenTint, borderRadius: radius.lg, padding: 12,
  },
  infoBannerText: { flex: 1, fontSize: 12, color: colors.primary, lineHeight: 18 },
  group: { marginHorizontal: 16, marginBottom: 16 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  groupTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  groupCount: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textMuted },
  groupOptional: { color: colors.textMuted, fontStyle: 'italic' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    width: '30.5%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    padding: 8, gap: 6,
    borderStyle: 'dashed',
  },
  slotUploaded: {
    borderColor: colors.primary,
    backgroundColor: colors.greenTint,
    borderStyle: 'solid',
  },
  slotOptional: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    opacity: 0.75,
  },
  slotAddIcon: {
    width: 34, height: 34, borderRadius: radius.md,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center',
  },
  slotAddIconOptional: { backgroundColor: colors.surfaceAlt },
  slotLabel: { fontSize: 9, fontFamily: fonts.semiBold, color: colors.textSecondary, textAlign: 'center', lineHeight: 13 },
  slotLabelUploaded: { fontSize: 9, fontFamily: fonts.bold, color: colors.primary, textAlign: 'center', lineHeight: 13 },
  slotLabelOptional: { color: colors.textMuted },
  slotCheckCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  optionalTag: { fontSize: 8, color: colors.textMuted, fontStyle: 'italic' },
  markAllBtn: { fontSize: 12, fontFamily: fonts.bold, color: colors.primary },
  tipsCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.amberTint,
    borderRadius: radius.xl, padding: 16, gap: 10,
  },
  tipsTitle: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.amberText },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.amberText, marginTop: 6 },
  tipText: { flex: 1, fontSize: 12, color: colors.amberText, lineHeight: 18 },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 28,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    ...shadows.floating,
  },
  ctaSub: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
