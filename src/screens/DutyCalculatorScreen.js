import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, radius, shadows, fonts } from '../theme';
import { calcRwandaDuty, formatRWF, getDutyRates } from '../data/marketData';
import { useApp } from '../context/AppContext';

function DutyRow({ label, amount, accent, bold }) {
  return (
    <View style={[styles.dutyRow, bold && styles.dutyRowBold]}>
      <Text style={[styles.dutyLabel, bold && styles.dutyLabelBold]}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.dutyUSD, bold && styles.dutyUSDBold, accent && { color: accent }]}>
          {formatRWF(amount)}
        </Text>
      </View>
    </View>
  );
}

export default function DutyCalculatorScreen({ navigation }) {
  const { t } = useApp();
  const rates = getDutyRates();

  const ccDescriptions = [
    t('dutyCalculator.ccCity'),
    t('dutyCalculator.ccSedan'),
    t('dutyCalculator.ccSuv'),
  ];

  const ageOptions = [
    { years: 0, label: t('dutyCalculator.ageUnder2') },
    { years: 3, label: t('dutyCalculator.age2to4') },
    { years: 5, label: t('dutyCalculator.age4to6') },
    { years: 7, label: t('dutyCalculator.age6to8') },
    { years: 9, label: t('dutyCalculator.age8to10') },
    { years: 11, label: t('dutyCalculator.ageOver10') },
  ];

  const ccOptions = rates.excise_brackets.map((bracket, index) => ({
    id: bracket.max_cc ?? Number.MAX_SAFE_INTEGER,
    label: bracket.label,
    rate: `${bracket.rate_pct}%`,
    desc: ccDescriptions[index] || '',
  }));

  const [carValue, setCarValue] = useState('');
  const [ccBracket, setCcBracket] = useState(ccOptions[0]?.id ?? 1500);
  const [ageYears, setAgeYears] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const valueNum = parseFloat(carValue.replace(/,/g, '')) || 0;

  const handleCalculate = () => {
    if (valueNum <= 0) return;
    setShowResult(true);
  };

  const duty = valueNum > 0 ? calcRwandaDuty(valueNum, ccBracket, ageYears, rates) : null;

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('dutyCalculator.title')} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {/* Intro */}
          <View style={styles.introCard}>
            <Ionicons name="calculator-outline" size={24} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.introTitle}>{t('dutyCalculator.introTitle')}</Text>
              <Text style={styles.introSub}>
                {t('dutyCalculator.introSub')}
                {rates.reviewed_on ? ` ${t('dutyCalculator.lastReviewed', { date: rates.reviewed_on })}` : ''}
              </Text>
            </View>
          </View>

          {/* Input: Car value */}
          <Text style={styles.fieldLabel}>{t('dutyCalculator.vehicleValue')}</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputCurrency}>RWF</Text>
            <TextInput
              style={styles.input}
              placeholder={t('dutyCalculator.valuePlaceholder')}
              keyboardType="numeric"
              value={carValue}
              onChangeText={(val) => { setCarValue(val); setShowResult(false); }}
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <Text style={styles.fieldHint}>{t('dutyCalculator.valueHint')}</Text>

          {/* Engine CC bracket */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t('dutyCalculator.engineDisplacement')}</Text>
          <View style={styles.ccOptions}>
            {ccOptions.map((opt) => (
              <Pressable
                key={opt.id}
                style={[styles.ccOption, ccBracket === opt.id && styles.ccOptionActive]}
                onPress={() => { setCcBracket(opt.id); setShowResult(false); }}
              >
                <View style={styles.ccTop}>
                  <Text style={[styles.ccLabel, ccBracket === opt.id && styles.ccLabelActive]}>{opt.label}</Text>
                  <View style={[styles.ccRateBadge, ccBracket === opt.id && styles.ccRateBadgeActive]}>
                    <Text style={[styles.ccRateText, ccBracket === opt.id && styles.ccRateTextActive]}>
                      {t('dutyCalculator.exciseBadge', { rate: opt.rate })}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.ccDesc, ccBracket === opt.id && styles.ccDescActive]}>{opt.desc}</Text>
              </Pressable>
            ))}
          </View>

          {/* Vehicle age */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t('dutyCalculator.vehicleAge')}</Text>
          <View style={styles.ccOptions}>
            {ageOptions.map((opt) => (
              <Pressable
                key={opt.years}
                style={[styles.ccOption, ageYears === opt.years && styles.ccOptionActive]}
                onPress={() => { setAgeYears(opt.years); setShowResult(false); }}
              >
                <View style={styles.ccTop}>
                  <Text style={[styles.ccLabel, ageYears === opt.years && styles.ccLabelActive]}>{opt.label}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Calculate button */}
          <Pressable
            style={[styles.calcBtn, valueNum <= 0 && styles.calcBtnDisabled]}
            onPress={handleCalculate}
            disabled={valueNum <= 0}
          >
            <Ionicons name="calculator" size={18} color="#fff" />
            <Text style={styles.calcBtnText}>{t('dutyCalculator.calcBtn')}</Text>
          </Pressable>

          {/* Results */}
          {showResult && duty && (
            <View style={styles.resultsCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>{t('dutyCalculator.dutyBreakdown')}</Text>
                <Text style={styles.resultVehicle}>{t('dutyCalculator.vehicleSummary', { val: formatRWF(valueNum) })}</Text>
              </View>

              {/* CIF value */}
              {duty.depreciationPct > 0 ? (
                <DutyRow label={t('dutyCalculator.assessedValue', { pct: duty.depreciationPct })} amount={duty.dutiableValue} />
              ) : null}
              <DutyRow label={t('dutyCalculator.cifValue')} amount={duty.cif} />

              <View style={styles.resultDivider} />

              <Text style={styles.resultSectionLabel}>{t('dutyCalculator.dutiesApplied')}</Text>
              <DutyRow label={t('dutyCalculator.customsDuty')} amount={duty.customs} />
              <DutyRow label={t('dutyCalculator.exciseDuty', { rate: duty.exciseRatePct })} amount={duty.excise} />
              <DutyRow label={t('dutyCalculator.vat', { rate: rates.vat_pct })} amount={duty.vat} />
              <DutyRow label={t('dutyCalculator.withholdingTax', { rate: rates.withholding_pct })} amount={duty.withholding} />
              <DutyRow label={t('dutyCalculator.infraLevy', { rate: rates.infrastructure_pct })} amount={duty.infra} />

              <View style={styles.resultDivider} />

              <DutyRow label={t('dutyCalculator.totalDuties')} amount={duty.totalDuties} bold accent={colors.amber} />
              <DutyRow label={t('dutyCalculator.grandTotal')} amount={duty.grandTotal} bold accent={colors.primary} />

              {/* Effective rate */}
              <View style={styles.effectiveRateCard}>
                <Text style={styles.effectiveRateTitle}>{t('dutyCalculator.effectiveRate')}</Text>
                <Text style={styles.effectiveRateValue}>{duty.effectiveRate}%</Text>
                <Text style={styles.effectiveRateDesc}>
                  {t('dutyCalculator.effectiveRateDesc', { val: formatRWF(valueNum), rate: duty.effectiveRate })}
                </Text>
              </View>

              {/* Landed summary */}
              <View style={styles.rwfCard}>
                <Ionicons name="swap-horizontal-outline" size={18} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rwfTitle}>{t('dutyCalculator.estimatedLandedCost')}</Text>
                  <Text style={styles.rwfValue}>{formatRWF(duty.grandTotal)}</Text>
                  <Text style={styles.rwfNote}>{t('dutyCalculator.rwfNote')}</Text>
                </View>
              </View>

              {/* Disclaimer */}
              <View style={styles.disclaimer}>
                <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                <Text style={styles.disclaimerText}>{t('dutyCalculator.disclaimer')}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  introCard: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    backgroundColor: colors.greenTint,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 16, marginBottom: 22,
  },
  introTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 4 },
  introSub: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, flex: 1 },
  fieldLabel: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 8 },
  fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl, paddingHorizontal: 16, height: 54,
  },
  inputCurrency: { fontSize: 18, fontFamily: fonts.bold, color: colors.textSecondary, marginRight: 8 },
  input: { flex: 1, fontSize: 20, fontFamily: fonts.bold, color: colors.textPrimary },
  ccOptions: { gap: 8 },
  ccOption: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14, gap: 4,
  },
  ccOptionActive: { borderColor: colors.primary, backgroundColor: colors.greenTint },
  ccTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ccLabel: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  ccLabelActive: { color: colors.primary },
  ccRateBadge: {
    backgroundColor: colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
  },
  ccRateBadgeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ccRateText: { fontSize: 11, fontFamily: fonts.bold, color: colors.textSecondary },
  ccRateTextActive: { color: '#fff' },
  ccDesc: { fontSize: 12, color: colors.textMuted },
  ccDescActive: { color: colors.textSecondary },
  calcBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primary,
    borderRadius: radius.xl, paddingVertical: 16, marginTop: 22,
  },
  calcBtnDisabled: { opacity: 0.4 },
  calcBtnText: { color: '#fff', fontSize: 16, fontFamily: fonts.extraBold },
  resultsCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xxl, marginTop: 20, overflow: 'hidden', ...shadows.card,
  },
  resultHeader: {
    backgroundColor: colors.primary,
    padding: 16, paddingBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  resultTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: '#fff' },
  resultVehicle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontFamily: fonts.semiBold },
  resultSectionLabel: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted,
    letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4,
  },
  dutyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  dutyRowBold: { backgroundColor: colors.surfaceAlt },
  dutyLabel: { flex: 1, fontSize: 13, color: colors.textSecondary, paddingRight: 10, lineHeight: 18 },
  dutyLabelBold: { fontFamily: fonts.bold, color: colors.textPrimary },
  dutyUSD: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  dutyUSDBold: { fontSize: 16, fontFamily: fonts.extraBold },
  resultDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  effectiveRateCard: {
    margin: 16, backgroundColor: '#FEF3C7',
    borderRadius: radius.xl, padding: 16, alignItems: 'center', gap: 4,
  },
  effectiveRateTitle: { fontSize: 12, fontFamily: fonts.bold, color: colors.amberText, textTransform: 'uppercase', letterSpacing: 0.4 },
  effectiveRateValue: { fontSize: 36, fontFamily: fonts.black, color: colors.amberText },
  effectiveRateDesc: { fontSize: 12, color: '#92400E', textAlign: 'center', lineHeight: 18 },
  rwfCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: colors.greenTint, borderRadius: radius.xl, padding: 14,
  },
  rwfTitle: { fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted },
  rwfValue: { fontSize: 22, fontFamily: fonts.black, color: colors.textPrimary, marginTop: 2 },
  rwfNote: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  disclaimer: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: colors.textMuted, lineHeight: 16 },
});
