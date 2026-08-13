import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, radius, shadows, fonts } from '../theme';
import { calcRwandaDuty, formatRWF } from '../data/marketData';

const CC_OPTIONS = [
  { id: 'small', label: '< 1,500 cc', rate: '10%', desc: 'City cars, small hatchbacks' },
  { id: 'medium', label: '1,500 – 2,000 cc', rate: '20%', desc: 'Most sedans, crossovers' },
  { id: 'large', label: '2,000 – 3,000 cc', rate: '25%', desc: 'Mid-size SUVs, V6 engines' },
  { id: 'xl', label: '> 3,000 cc', rate: '35%', desc: 'Large SUVs, luxury, V8+' },
];

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
  const [carValue, setCarValue] = useState('');
  const [ccBracket, setCcBracket] = useState('medium');
  const [showResult, setShowResult] = useState(false);

  const valueNum = parseFloat(carValue.replace(/,/g, '')) || 0;

  const handleCalculate = () => {
    if (valueNum <= 0) return;
    setShowResult(true);
  };

  const duty = valueNum > 0 ? calcRwandaDuty(valueNum, ccBracket) : null;

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Import Duty Calculator" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Intro */}
        <View style={styles.introCard}>
          <Ionicons name="calculator-outline" size={24} color={colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Rwanda RRA Import Duty</Text>
            <Text style={styles.introSub}>
              Most cars in Rwanda are imported. This calculator estimates the total duty payable to Rwanda Revenue Authority based on 2026 rates.
            </Text>
          </View>
        </View>

        {/* Input: Car value */}
        <Text style={styles.fieldLabel}>Vehicle value (RWF)</Text>
        <View style={styles.inputRow}>
          <Text style={styles.inputCurrency}>RWF</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 20000"
            keyboardType="numeric"
            value={carValue}
            onChangeText={(t) => { setCarValue(t); setShowResult(false); }}
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <Text style={styles.fieldHint}>Enter the vehicle purchase price (FOB or CIF value)</Text>

        {/* Engine CC bracket */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Engine displacement</Text>
        <View style={styles.ccOptions}>
          {CC_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={[styles.ccOption, ccBracket === opt.id && styles.ccOptionActive]}
              onPress={() => { setCcBracket(opt.id); setShowResult(false); }}
            >
              <View style={styles.ccTop}>
                <Text style={[styles.ccLabel, ccBracket === opt.id && styles.ccLabelActive]}>{opt.label}</Text>
                <View style={[styles.ccRateBadge, ccBracket === opt.id && styles.ccRateBadgeActive]}>
                  <Text style={[styles.ccRateText, ccBracket === opt.id && styles.ccRateTextActive]}>
                    Excise {opt.rate}
                  </Text>
                </View>
              </View>
              <Text style={[styles.ccDesc, ccBracket === opt.id && styles.ccDescActive]}>{opt.desc}</Text>
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
          <Text style={styles.calcBtnText}>Calculate Import Duty</Text>
        </Pressable>

        {/* Results */}
        {showResult && duty && (
          <View style={styles.resultsCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Duty Breakdown</Text>
              <Text style={styles.resultVehicle}>{formatRWF(valueNum)} vehicle</Text>
            </View>

            {/* CIF value */}
            <DutyRow label="CIF Value (vehicle + freight + insurance)" amount={duty.cif} />

            <View style={styles.resultDivider} />

            <Text style={styles.resultSectionLabel}>DUTIES APPLIED</Text>
            <DutyRow label="Customs Duty (25% of CIF)" amount={duty.customs} />
            <DutyRow label={`Excise Duty (${CC_OPTIONS.find(o => o.id === ccBracket)?.rate} of CIF)`} amount={duty.excise} />
            <DutyRow label="VAT — 18% (on CIF + duties)" amount={duty.vat} />
            <DutyRow label="Infrastructure Levy (1.5% of CIF)" amount={duty.infra} />

            <View style={styles.resultDivider} />

            <DutyRow label="Total Duties" amount={duty.totalDuties} bold accent={colors.amber} />
            <DutyRow label="Grand Total (vehicle + duties)" amount={duty.grandTotal} bold accent={colors.primary} />

            {/* Effective rate */}
            <View style={styles.effectiveRateCard}>
              <Text style={styles.effectiveRateTitle}>Effective duty rate</Text>
              <Text style={styles.effectiveRateValue}>{duty.effectiveRate}%</Text>
              <Text style={styles.effectiveRateDesc}>
                Of the {formatRWF(valueNum)} vehicle value, {duty.effectiveRate}% is added as import duty when bringing this car into Rwanda.
              </Text>
            </View>

            {/* RWF summary */}
            <View style={styles.rwfCard}>
              <Ionicons name="swap-horizontal-outline" size={18} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rwfTitle}>Estimated landed cost</Text>
                <Text style={styles.rwfValue}>{formatRWF(duty.grandTotal)}</Text>
                <Text style={styles.rwfNote}>All figures are shown in Rwandan francs</Text>
              </View>
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
              <Text style={styles.disclaimerText}>
                This is an estimate based on standard 2026 Rwanda Revenue Authority rates. Actual duty may vary based on the vehicle's age, import origin, and RRA assessment. Consult a licensed clearing agent for a precise figure.
              </Text>
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
  dutyRWF: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
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
