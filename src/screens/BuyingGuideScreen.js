import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, fonts, radius, shadows } from '../theme';
import { useApp } from '../context/AppContext';

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      style={styles.faq}
      onPress={() => setOpen((value) => !value)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
    >
      <View style={styles.faqRow}>
        <Text style={styles.faqQ}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </View>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </Pressable>
  );
}

export default function BuyingGuideScreen({ navigation }) {
  const { t } = useApp();

  const steps = [
    { icon: 'search-outline', title: t('buyingGuide.step1Title'), desc: t('buyingGuide.step1Desc') },
    { icon: 'chatbubble-outline', title: t('buyingGuide.step2Title'), desc: t('buyingGuide.step2Desc') },
    { icon: 'construct-outline', title: t('buyingGuide.step3Title'), desc: t('buyingGuide.step3Desc') },
    { icon: 'document-text-outline', title: t('buyingGuide.step4Title'), desc: t('buyingGuide.step4Desc') },
    { icon: 'swap-horizontal-outline', title: t('buyingGuide.step5Title'), desc: t('buyingGuide.step5Desc') },
  ];

  const faqs = [
    { q: t('buyingGuide.faq1Q'), a: t('buyingGuide.faq1A') },
    { q: t('buyingGuide.faq2Q'), a: t('buyingGuide.faq2A') },
    { q: t('buyingGuide.faq3Q'), a: t('buyingGuide.faq3A') },
    { q: t('buyingGuide.faq4Q'), a: t('buyingGuide.faq4A') },
    { q: t('buyingGuide.faq5Q'), a: t('buyingGuide.faq5A') },
  ];

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('buyingGuide.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Ionicons name="people-outline" size={28} color={colors.primary} />
          <Text style={styles.heroTitle}>{t('buyingGuide.heroTitle')}</Text>
          <Text style={styles.heroText}>{t('buyingGuide.heroText')}</Text>
        </View>
        {steps.map((step, index) => (
          <View key={step.title} style={styles.step}>
            <View style={styles.number}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepHead}>
                <Ionicons name={step.icon} size={18} color={colors.primary} />
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>
              <Text style={styles.stepText}>{step.desc}</Text>
            </View>
          </View>
        ))}
        <View style={styles.boundary}>
          <Text style={styles.boundaryTitle}>{t('buyingGuide.boundaryTitle')}</Text>
          <Text style={styles.boundaryText}>{t('buyingGuide.boundaryText')}</Text>
        </View>
        <Text style={styles.sectionTitle}>{t('buyingGuide.commonQuestions')}</Text>
        {faqs.map((item) => (
          <Faq key={item.q} {...item} />
        ))}
        <Button
          title={t('buyingGuide.readSafety')}
          icon="shield-checkmark-outline"
          variant="outline"
          onPress={() => navigation.navigate('SawaPromise')}
          style={{ marginTop: 10 }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, paddingBottom: 48 },
  hero: { borderRadius: radius.xxl, backgroundColor: colors.blueTint, padding: 20, marginBottom: 18 },
  heroTitle: { marginTop: 10, fontSize: 20, fontFamily: fonts.extraBold, color: colors.textPrimary },
  heroText: { marginTop: 7, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  step: { flexDirection: 'row', gap: 11 },
  number: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.navyDeep, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 12, fontFamily: fonts.extraBold, color: '#fff' },
  stepCard: { flex: 1, marginBottom: 12, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: 14, ...shadows.card },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  stepText: { marginTop: 6, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  boundary: { marginTop: 5, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.amber + '45', backgroundColor: '#FFF8E8', padding: 16 },
  boundaryTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  boundaryText: { marginTop: 6, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  sectionTitle: { marginTop: 24, marginBottom: 10, fontSize: 17, fontFamily: fonts.extraBold, color: colors.textPrimary },
  faq: { marginBottom: 9, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: 15 },
  faqRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 10 },
  faqQ: { flex: 1, fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  faqA: { marginTop: 10, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
});
