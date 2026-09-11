import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { colors, radius, fonts } from '../theme';
import { useSellerGate } from '../hooks/useSellerGate';
import { useApp } from '../context/AppContext';

export default function SellScreen({ navigation }) {
  const gate = useSellerGate(navigation);
  const { t, isLoggedIn, idVerificationStatus } = useApp();

  const verifyBanner = {
    none: {
      icon: 'shield-outline',
      title: t('sell.verifyBeforeLive'),
      body: t('sell.verifyBeforeLiveSub'),
      cta: t('sell.startVerification'),
    },
    pending: {
      icon: 'time-outline',
      title: t('sell.idCheckPending'),
      body: t('sell.idCheckPendingSub'),
      cta: t('sell.viewStatus'),
    },
    rejected: {
      icon: 'alert-circle-outline',
      title: t('sell.idCheckRejected'),
      body: t('sell.idCheckRejectedSub'),
      cta: t('sell.resubmitDocs'),
    },
  };

  const banner = isLoggedIn ? verifyBanner[idVerificationStatus] : null;

  const steps = [
    { icon: 'shield-checkmark-outline', title: t('sell.step1'), sub: t('sell.step1Sub') },
    { icon: 'scan-outline', title: t('sell.step2'), sub: t('sell.step2Sub') },
    { icon: 'ribbon-outline', title: t('sell.step3'), sub: t('sell.step3Sub') },
    { icon: 'people-outline', title: t('sell.step4'), sub: t('sell.step4Sub') },
  ];

  const options = [
    { icon: 'trending-up-outline', title: t('sell.optValuationTitle'), sub: t('sell.optValuationSub'), accent: colors.green, screen: 'CarValuation' },
    { icon: 'shield-checkmark-outline', title: t('sell.optCertificationTitle'), sub: t('sell.optCertificationSub'), accent: colors.primary, screen: 'CarSubmission', gated: true },
    { icon: 'grid-outline', title: t('sell.optSubmissionsTitle'), sub: t('sell.optSubmissionsSub'), accent: colors.amber, screen: 'SellerDashboard' },
  ];

  const go = (option) =>
    option.gated ? gate(option.screen) : navigation.navigate(option.screen);

  return (
    <Screen background={colors.bg}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.head}>
          <Pressable style={styles.dashBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <Ionicons name="chevron-back" size={20} color={colors.slate700} />
          </Pressable>
          <Text style={styles.h1}>{t('sell.sellMyCar')}</Text>
          <Pressable style={styles.dashBtn} onPress={() => navigation.navigate('SellerDashboard')} accessibilityRole="button" accessibilityLabel={t('sell.optSubmissionsTitle')}>
            <Ionicons name="grid-outline" size={20} color={colors.slate700} />
          </Pressable>
        </View>

        {/* Valuation hero */}
        <Pressable onPress={() => navigation.navigate('CarValuation')}>
          <LinearGradient
            colors={[colors.navyLight, colors.navyMid]}
            style={styles.valCard}
          >
            <Text style={styles.valEyebrow}>{t('sell.freeInstantValuation')}</Text>
            <Text style={styles.valTitle}>{t('sell.whatsMyCarWorth')}</Text>
            <Text style={styles.valSub}>{t('sell.instantEstimate30s')}</Text>
            <View style={styles.plate}>
              <Ionicons name="trending-up-outline" size={20} color={colors.blueLight} />
              <Text style={styles.plateText}>{t('sell.getMyFreeEstimate')}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Verification never blocks submission, but it is required for publication. */}
        {banner && (
          <Pressable style={styles.verifyCard} onPress={() => navigation.navigate('IDVerification')}>
            <View style={styles.verifyIcon}>
              <Ionicons name={banner.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyTitle}>{banner.title}</Text>
              <Text style={styles.verifyBody}>{banner.body}</Text>
              <Text style={styles.verifyCta}>{banner.cta} →</Text>
            </View>
          </Pressable>
        )}

        {/* Options */}
        <View style={styles.options}>
          {options.map((o) => (
            <Pressable key={o.title} style={styles.option} onPress={() => go(o)}>
              <View style={[styles.optionIcon, { backgroundColor: o.accent + '1A' }]}>
                <Ionicons name={o.icon} size={22} color={o.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{o.title}</Text>
                <Text style={styles.optionSub}>{o.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('sell.howItWorks')}</Text>
        <View style={styles.steps}>
          {steps.map((s, i) => (
            <View key={s.title} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <View style={styles.stepIcon}>
                <Ionicons name={s.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepSub}>{s.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Button title={t('sell.submitForInspection')} icon="shield-checkmark-outline" onPress={() => gate('CarSubmission')} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  h1: { fontSize: 24, fontFamily: fonts.extraBold, letterSpacing: -0.5, color: colors.textPrimary },
  dashBtn: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  valCard: { margin: 20, marginTop: 16, borderRadius: radius.xxl, padding: 22 },
  valEyebrow: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 1.4, color: colors.blueLight },
  valTitle: { fontSize: 24, fontFamily: fonts.extraBold, color: '#fff', marginTop: 10, letterSpacing: -0.5 },
  valSub: { fontSize: 14, color: 'rgba(226,232,240,0.8)', marginTop: 6 },
  plate: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg, paddingHorizontal: 14, height: 52, marginTop: 18,
  },
  plateText: { flex: 1, fontSize: 15, color: 'rgba(226,232,240,0.9)' },
  verifyCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.primary + '33',
    borderRadius: radius.xl, padding: 14,
  },
  verifyIcon: {
    width: 42, height: 42, borderRadius: radius.md,
    backgroundColor: colors.blueTint,
    alignItems: 'center', justifyContent: 'center',
  },
  verifyTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  verifyBody: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },
  verifyCta: { fontSize: 13, fontFamily: fonts.bold, color: colors.primary, marginTop: 8 },
  options: { paddingHorizontal: 20, gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14,
  },
  optionIcon: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  optionSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontFamily: fonts.extraBold, color: colors.textPrimary, paddingHorizontal: 20, marginTop: 24 },
  steps: { paddingHorizontal: 20, gap: 12, marginTop: 12 },
  step: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.lg, padding: 14,
  },
  stepNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.navyMid,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: '#fff', fontSize: 12, fontFamily: fonts.extraBold },
  stepIcon: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.blueTint,
    alignItems: 'center', justifyContent: 'center',
  },
  stepTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  stepSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
