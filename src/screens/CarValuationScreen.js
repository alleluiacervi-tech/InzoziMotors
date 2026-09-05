import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { estimateValuation } from '../data/finance';
import { showToast } from '../components/Feedback';
import carsApi from '../api/cars';
import ChipSelect from '../components/ChipSelect';

const FALLBACK_MAKES = [
  'Toyota', 'Nissan', 'Mitsubishi', 'Suzuki', 'Isuzu', 'Honda', 'Mazda',
  'Subaru', 'Daihatsu', 'Lexus', 'Hyundai', 'Kia', 'Volkswagen',
  'Mercedes-Benz', 'BMW', 'Audi', 'Land Rover', 'Ford', 'Jeep', 'Toyota Hino',
];
const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

export default function CarValuationScreen({ navigation }) {
  const { cars, makes, t } = useApp();
  const MAKES = useMemo(
    () => (makes.length ? makes.map((m) => m.name) : FALLBACK_MAKES),
    [makes]
  );
  const [make, setMake] = useState(null);
  const [model, setModel] = useState('');
  const [year, setYear] = useState(null);
  const [mileage, setMileage] = useState('');
  const [result, setResult] = useState(null);
  const [estimating, setEstimating] = useState(false);

  const canEstimate = make && year && mileage;

  const handleEstimate = async () => {
    if (!canEstimate || estimating) return;
    setEstimating(true);
    const km = parseInt(mileage.replace(/\D/g, ''), 10) || 0;
    try {
      const est = await carsApi.getValuation({ make, year, mileage: km });
      if (est && est.comparables >= 2 && est.low && est.high) {
        setResult({ low: est.low, high: est.high, comparables: est.comparables });
        return;
      }
      setResult(localEstimate(km));
    } catch {
      setResult(localEstimate(km));
    } finally {
      setEstimating(false);
    }
  };

  const localEstimate = (km) => {
    const est = estimateValuation({ make, year, mileage: km }, cars);
    if (!est) {
      showToast(t('carValuation.notEnoughData'), 'error');
      return null;
    }
    return est;
  };

  // ── Result state ──
  if (result) {
    return (
      <Screen background={colors.bg}>
        <BackHeader title={t('carValuation.yourValuation')} onBack={() => setResult(null)} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          <View style={styles.resultCard}>
            <Text style={styles.resultEyebrow}>{t('carValuation.estimatedMarketValue')}</Text>
            <Text style={styles.resultCar}>{year} {make} {model || ''}</Text>
            <View style={styles.rangeRow}>
              <Text style={styles.rangeValue}>RWF {result.low.toLocaleString()}</Text>
              <Text style={styles.rangeDash}>—</Text>
              <Text style={styles.rangeValue}>RWF {result.high.toLocaleString()}</Text>
            </View>
            <Text style={styles.resultBasis}>
              {result.comparables >= 2
                ? t('carValuation.basedOnComparables', { count: result.comparables, make })
                : t('carValuation.basedOnMarket')}
            </Text>
          </View>

          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>{t('carValuation.getCertifiedPrice')}</Text>
            <Text style={styles.stepsSub}>{t('carValuation.certifiedPriceSub')}</Text>
            {[
              { icon: 'calendar-outline', text: t('carValuation.step1') },
              { icon: 'shield-checkmark-outline', text: t('carValuation.step2') },
              { icon: 'cash-outline', text: t('carValuation.step3') },
            ].map((s) => (
              <View key={s.text} style={styles.stepRow}>
                <View style={styles.stepIcon}>
                  <Ionicons name={s.icon} size={16} color={colors.primary} />
                </View>
                <Text style={styles.stepText}>{s.text}</Text>
              </View>
            ))}
          </View>

          <Button
            title={t('carValuation.submitForInspection')}
            icon="calendar-outline"
            onPress={() => navigation.navigate('CarSubmission', {
              prefill: {
                make,
                model,
                year,
                mileage: parseInt(mileage.replace(/\D/g, ''), 10) || 0,
              },
            })}
            style={{ marginTop: 20 }}
          />
          <Pressable onPress={() => setResult(null)} style={{ marginTop: 14 }}>
            <Text style={styles.tryAgain}>{t('carValuation.valueAnotherCar')}</Text>
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('carValuation.title')} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.lede}>{t('carValuation.lede')}</Text>

        {/* Make */}
        <Text style={styles.label}>{t('carValuation.make')}</Text>
        <ChipSelect
          options={MAKES}
          selected={make}
          onSelect={setMake}
          allowOther
          otherLabel={t('carValuation.otherBrand')}
          placeholder={t('carValuation.makePlaceholder')}
        />

        {/* Model */}
        <Text style={styles.label}>{t('carValuation.model')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('carValuation.modelPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={model}
          onChangeText={setModel}
        />

        {/* Year */}
        <Text style={styles.label}>{t('carValuation.year')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {YEARS.map((y) => {
            const on = year === y;
            return (
              <Pressable key={y} style={[styles.chip, on && styles.chipOn]} onPress={() => setYear(y)}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{y}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Mileage */}
        <Text style={styles.label}>{t('carValuation.mileage')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('carValuation.mileagePlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={mileage}
          onChangeText={setMileage}
          keyboardType="numeric"
        />

        <Button
          title={estimating ? t('carValuation.checkingMarket') : canEstimate ? t('carValuation.getValuation') : t('carValuation.fillRequired')}
          icon="trending-up-outline"
          onPress={handleEstimate}
          disabled={!canEstimate || estimating}
          style={{ marginTop: 24 }}
        />

        <View style={styles.privacyRow}>
          <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
          <Text style={styles.privacyText}>{t('carValuation.noAccountRequired')}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  lede: { fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 21, marginTop: 4 },
  label: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 20, marginBottom: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.pill,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  chipTextOn: { color: '#fff' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14, height: 48,
    fontSize: 14, fontFamily: fonts.medium, color: colors.textPrimary,
  },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14 },
  privacyText: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
  resultCard: {
    backgroundColor: colors.navyMid,
    borderRadius: radius.xxl, padding: 24,
    alignItems: 'center', marginTop: 4,
  },
  resultEyebrow: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 1.4, color: colors.greenLight },
  resultCar: { fontSize: 16, fontFamily: fonts.bold, color: 'rgba(255,255,255,0.9)', marginTop: 10 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  rangeValue: { fontSize: 28, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -0.8 },
  rangeDash: { fontSize: 20, color: 'rgba(255,255,255,0.5)' },
  resultBasis: { fontSize: 11, fontFamily: fonts.regular, color: 'rgba(226,232,240,0.7)', marginTop: 10 },
  stepsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 18, marginTop: 16,
    ...shadows.card,
  },
  stepsTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.3 },
  stepsSub: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 18, marginTop: 6, marginBottom: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stepIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: { flex: 1, fontSize: 12, fontFamily: fonts.medium, color: colors.textSecondary, lineHeight: 17 },
  tryAgain: { fontSize: 13, fontFamily: fonts.bold, color: colors.primary, textAlign: 'center' },
});
