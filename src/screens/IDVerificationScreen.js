import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import StickyFooter from '../components/StickyFooter';
import { colors, radius, shadows, fonts } from '../theme';
import { showToast, showConfirm } from '../components/Feedback';
import { captureImage } from '../utils/media';
import { useApp } from '../context/AppContext';

const UPLOAD_STEPS = [
  {
    key: 'front',
    icon: 'card-outline',
    label: 'National ID — Front',
    hint: 'Clear photo showing your name, ID number, and photo',
    preset: 'document',
  },
  {
    key: 'back',
    icon: 'card-outline',
    label: 'National ID — Back',
    hint: 'Clear photo of the back side of your ID card',
    preset: 'document',
  },
  {
    key: 'selfie',
    icon: 'person-circle-outline',
    label: 'Selfie holding your ID',
    hint: 'Hold your ID next to your face — both must be clearly visible',
    preset: 'selfie',
  },
];

function StatusScreen({ status }) {
  const isApproved = status === 'approved';
  return (
    <View style={styles.statusCenter}>
      <View style={[styles.statusIconWrap, { backgroundColor: isApproved ? colors.greenTint : colors.amberTint }]}>
        <Ionicons
          name={isApproved ? 'checkmark-circle' : 'time-outline'}
          size={52}
          color={isApproved ? colors.green : colors.amber}
        />
      </View>
      <Text style={styles.statusTitle}>{isApproved ? 'Identity Verified' : 'Under Review'}</Text>
      <Text style={styles.statusSub}>
        {isApproved
          ? 'Your identity has been confirmed by our team. You can now submit cars for listing on Sawa Cars.'
          : 'Our team is reviewing your documents. This usually takes less than 24 hours. You\'ll be notified once approved.'}
      </Text>
      <View style={styles.docList}>
        {UPLOAD_STEPS.map((s) => (
          <View key={s.key} style={styles.docRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <Text style={styles.docText}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function IDVerificationScreen({ navigation, route }) {
  const { idVerificationStatus, submitIDVerification } = useApp();
  // Each slot holds the picked asset ({ uri, mimeType, … }) or null
  const [docs, setDocs] = useState({ front: null, back: null, selfie: null });
  const [submitting, setSubmitting] = useState(false);

  // Where the seller was heading when the gate intercepted them, so submitting
  // documents returns them to what they actually wanted to do.
  const returnTo = route?.params?.returnTo;
  const returnParams = route?.params?.returnParams;

  const handleCapture = async (step) => {
    const asset = await captureImage({
      preset: step.preset,
      title: step.label,
      message: step.hint,
    });
    if (asset) setDocs((prev) => ({ ...prev, [step.key]: asset }));
  };

  const handleRemove = async (step) => {
    const ok = await showConfirm({
      title: `Remove ${step.label}?`,
      message: 'You will need to take this photo again before submitting.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) setDocs((prev) => ({ ...prev, [step.key]: null }));
  };

  const allUploaded = UPLOAD_STEPS.every((s) => docs[s.key]);

  const handleSubmit = async () => {
    if (!allUploaded || submitting) return;
    setSubmitting(true);
    try {
      await submitIDVerification(docs);
      showToast('Documents submitted — we will verify your identity within 24 hours.', 'success');
      // Submission only makes the seller 'pending', so returning them to the
      // gated screen would bounce them straight back. Send them to the
      // dashboard where the pipeline shows what happens next.
      if (returnTo) navigation.replace('SellerDashboard');
      else navigation.goBack();
    } catch (err) {
      showToast(err.message || 'Could not submit your documents. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (idVerificationStatus === 'pending' || idVerificationStatus === 'approved') {
    return (
      <Screen background={colors.bg}>
        <BackHeader title="ID Verification" onBack={() => navigation.goBack()} />
        <StatusScreen status={idVerificationStatus} />
        {idVerificationStatus === 'approved' && (
          <StickyFooter style={styles.approvedFooter}>
            <Button
              title="Submit a Car for Sale"
              icon="car-outline"
              onPress={() => navigation.replace(returnTo || 'CarSubmission', returnParams)}
            />
          </StickyFooter>
        )}
      </Screen>
    );
  }

  return (
    <Screen background={colors.bg}>
      <BackHeader title="ID Verification" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero */}
        <LinearGradient colors={[colors.navyMid, colors.navyDeep]} style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={32} color={colors.blueLight} />
          </View>
          <Text style={styles.heroTitle}>Verify your identity</Text>
          <Text style={styles.heroSub}>
            We verify every seller to protect all parties. This is a one-time process and takes less than 5 minutes.
          </Text>
        </LinearGradient>

        {/* Upload cards */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Required Documents</Text>
          <View style={styles.uploadList}>
            {UPLOAD_STEPS.map((step) => {
              const asset = docs[step.key];
              return (
                <Pressable
                  key={step.key}
                  style={[styles.uploadCard, asset && styles.uploadCardDone]}
                  onPress={() => handleCapture(step)}
                >
                  {asset ? (
                    <Image source={{ uri: asset.uri }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.uploadIconWrap, { backgroundColor: colors.surfaceAlt }]}>
                      <Ionicons name={step.icon} size={26} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.uploadLabel, asset && { color: colors.primary }]}>{step.label}</Text>
                    <Text style={styles.uploadHint}>
                      {asset ? 'Photo ready — tap to retake' : step.hint}
                    </Text>
                  </View>
                  {asset ? (
                    <Pressable onPress={() => handleRemove(step)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear">
                      <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                    </Pressable>
                  ) : (
                    <View style={styles.uploadBtn}>
                      <Ionicons name="camera-outline" size={14} color={colors.primary} />
                      <Text style={styles.uploadBtnText}>Add</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
          <Text style={styles.privacyText}>
            Your documents are end-to-end encrypted and reviewed only by our verification team. They are never shared with buyers or third parties.
          </Text>
        </View>

        <View style={styles.submitWrap}>
          <Button
            title="Submit for Verification"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!allUploaded}
            style={{ opacity: allUploaded ? 1 : 0.45 }}
          />
          {!allUploaded ? (
            <Text style={styles.uploadReminder}>
              Add all 3 photos to continue
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  hero: {
    margin: 16,
    borderRadius: radius.xxl,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: fonts.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  uploadList: { gap: 10 },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 16,
    ...shadows.card,
  },
  uploadCardDone: {
    borderColor: colors.primary,
    backgroundColor: colors.blueTint,
  },
  uploadIconWrap: {
    width: 50,
    height: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 50,
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  uploadLabel: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  uploadHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.blueTint,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  uploadBtnText: { fontSize: 11, fontFamily: fonts.bold, color: colors.primary },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
  },
  privacyText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  submitWrap: { paddingHorizontal: 16, marginTop: 20, gap: 10, alignItems: 'center' },
  uploadReminder: { fontSize: 12, color: colors.textMuted },
  // Status screen
  statusCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
  },
  statusIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 24,
    fontFamily: fonts.extraBold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  statusSub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  docList: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docText: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  approvedFooter: { paddingHorizontal: 20 },
});
