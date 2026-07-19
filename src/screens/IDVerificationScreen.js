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

const UPLOAD_STEPS = [
  {
    key: 'front',
    icon: 'card-outline',
    label: 'National ID — Front',
    hint: 'Clear photo showing your name, ID number, and photo',
  },
  {
    key: 'back',
    icon: 'card-outline',
    label: 'National ID — Back',
    hint: 'Clear photo of the back side of your ID card',
  },
  {
    key: 'selfie',
    icon: 'person-circle-outline',
    label: 'Selfie holding your ID',
    hint: 'Hold your ID next to your face — both must be clearly visible',
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
          color={isApproved ? colors.primary : colors.amber}
        />
      </View>
      <Text style={styles.statusTitle}>{isApproved ? 'Identity Verified' : 'Under Review'}</Text>
      <Text style={styles.statusSub}>
        {isApproved
          ? 'Your identity has been confirmed by our team. You can now submit cars for listing on Inzozi Motors.'
          : 'Our team is reviewing your documents. This usually takes less than 24 hours. You\'ll be notified once approved.'}
      </Text>
      <View style={styles.docList}>
        {UPLOAD_STEPS.map((s) => (
          <View key={s.key} style={styles.docRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={styles.docText}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function IDVerificationScreen({ navigation }) {
  const { idVerificationStatus, submitIDVerification } = useApp();
  const [uploads, setUploads] = useState({ front: false, back: false, selfie: false });

  const handleUpload = (key) => {
    setUploads((prev) => ({ ...prev, [key]: true }));
  };

  const allUploaded = Object.values(uploads).every(Boolean);

  const handleSubmit = () => {
    submitIDVerification();
    showToast('Documents submitted — we will verify your identity within 24 hours.', 'success');
    navigation.goBack();
  };

  if (idVerificationStatus === 'pending' || idVerificationStatus === 'approved') {
    return (
      <Screen background={colors.bg}>
        <BackHeader title="ID Verification" onBack={() => navigation.goBack()} />
        <StatusScreen status={idVerificationStatus} />
        {idVerificationStatus === 'approved' && (
          <View style={styles.approvedFooter}>
            <Button
              title="Submit a Car for Sale"
              icon="car-outline"
              onPress={() => navigation.navigate('CarSubmission')}
            />
          </View>
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
            {UPLOAD_STEPS.map((step, idx) => {
              const done = uploads[step.key];
              return (
                <Pressable
                  key={step.key}
                  style={[styles.uploadCard, done && styles.uploadCardDone]}
                  onPress={() => handleUpload(step.key)}
                >
                  <View style={[styles.uploadIconWrap, { backgroundColor: done ? colors.greenTint : colors.surfaceAlt }]}>
                    <Ionicons
                      name={done ? 'checkmark-circle' : step.icon}
                      size={26}
                      color={done ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.uploadLabel, done && { color: colors.primary }]}>{step.label}</Text>
                    <Text style={styles.uploadHint}>{done ? 'Uploaded successfully ✓' : step.hint}</Text>
                  </View>
                  {!done && (
                    <View style={styles.uploadBtn}>
                      <Ionicons name="camera-outline" size={14} color={colors.primary} />
                      <Text style={styles.uploadBtnText}>Upload</Text>
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
            style={{ opacity: allUploaded ? 1 : 0.45 }}
          />
          {!allUploaded && (
            <Text style={styles.uploadReminder}>
              Upload all 3 documents to continue
            </Text>
          )}
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
    fontSize: 26,
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
  approvedFooter: { paddingHorizontal: 20, paddingBottom: 32 },
});
