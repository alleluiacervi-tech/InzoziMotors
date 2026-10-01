import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { LoadingState, ErrorState } from '../components/StateViews';
import { useApp } from '../context/AppContext';
import settingsApi from '../api/settings';
import { colors, fonts, radius, shadows } from '../theme';

// What Sawa Cars charges for its OWN services — never a fee on a sale or a
// rental, which are agreed between the people involved. Same endpoint and the
// same wording as the website's /tools/pricing.
const LINES = [
  { icon: 'shield-checkmark-outline', title: 'rateCard.inspectionTitle', body: 'rateCard.inspectionBody', field: 'inspection_fee_rwf' },
  { icon: 'document-text-outline', title: 'rateCard.reportTitle', body: 'rateCard.reportBody', field: 'report_resale_fee_rwf' },
  { icon: 'key-outline', title: 'rateCard.rentalTitle', body: 'rateCard.rentalBody', field: 'rental_subscription_monthly_rwf' },
];

export default function ServiceFeesScreen({ navigation }) {
  const { t } = useApp();
  const [rates, setRates] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    settingsApi.getRateCard()
      .then((data) => { if (alive) setRates(data); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('rateCard.title')} onBack={() => navigation.goBack()} />
      {failed && !rates ? (
        <ErrorState icon="pricetag-outline" title={t('rateCard.title')} sub={t('rateCard.unavailable')} />
      ) : !rates ? (
        <LoadingState label={t('common.loading')} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>{t('rateCard.heroTitle')}</Text>
          <Text style={styles.lede}>{t('rateCard.heroLede')}</Text>
          {LINES.map((line) => (
            <View key={line.field} style={styles.card}>
              <View style={styles.icon}><Ionicons name={line.icon} size={22} color={colors.textSecondary} /></View>
              <Text style={styles.cardTitle}>{t(line.title)}</Text>
              <Text style={styles.price}>{rates[line.field] != null ? `RWF ${Number(rates[line.field]).toLocaleString('en-US')}` : '—'}</Text>
              <Text style={styles.cardBody}>{t(line.body)}</Text>
            </View>
          ))}
          {rates.reviewed_on ? <Text style={styles.reviewed}>{t('rateCard.reviewedNote', { date: rates.reviewed_on })}</Text> : null}
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.noticeText}>{t('rateCard.disclaimer')}</Text>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, paddingBottom: 40, gap: 14 },
  heading: { fontSize: 22, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.3 },
  lede: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, padding: 18, gap: 6, ...shadows.card },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  price: { fontSize: 22, fontFamily: fonts.extraBold, color: colors.primary },
  cardBody: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  reviewed: { fontSize: 12, color: colors.textMuted },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.blueTint, borderRadius: radius.lg, padding: 14 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
});
