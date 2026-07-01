import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, radius, shadows, fonts } from '../theme';
import { formatRWF, RWF_RATE } from '../data/marketData';

const RWANDA_BANKS = [
  { id: 'bok', name: 'Bank of Kigali', abbr: 'BK', rate: 0.17, note: 'Rwanda\'s largest bank' },
  { id: 'equity', name: 'Equity Bank Rwanda', abbr: 'EQ', rate: 0.185, note: 'Pan-African network' },
  { id: 'im', name: 'I&M Bank Rwanda', abbr: 'I&M', rate: 0.165, note: 'Competitive auto rates' },
  { id: 'kcb', name: 'KCB Rwanda', abbr: 'KCB', rate: 0.175, note: 'East Africa\'s top bank' },
];

const TERMS = [12, 24, 36, 48, 60];

function calcMonthlyPayment(principal, annualRate, months) {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function BankCard({ bank, monthly, totalInterest, isSelected, onSelect }) {
  return (
    <Pressable style={[styles.bankCard, isSelected && styles.bankCardActive]} onPress={onSelect}>
      <View style={styles.bankHeader}>
        <View style={[styles.bankAvatar, isSelected && styles.bankAvatarActive]}>
          <Text style={[styles.bankAbbr, isSelected && { color: '#fff' }]}>{bank.abbr}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bankName}>{bank.name}</Text>
          <Text style={styles.bankNote}>{bank.note}</Text>
        </View>
        <View style={styles.bankRate}>
          <Text style={[styles.bankRateText, isSelected && { color: colors.primary }]}>{(bank.rate * 100).toFixed(1)}%</Text>
          <Text style={styles.bankRateLabel}>p.a.</Text>
        </View>
      </View>
      {monthly > 0 && (
        <View style={styles.bankResult}>
          <View>
            <Text style={styles.bankMonthlyLabel}>Monthly</Text>
            <Text style={[styles.bankMonthlyValue, isSelected && { color: colors.primary }]}>
              ${Math.round(monthly).toLocaleString()}
            </Text>
          </View>
          <View>
            <Text style={styles.bankMonthlyLabel}>Total interest</Text>
            <Text style={styles.bankInterest}>${Math.round(totalInterest).toLocaleString()}</Text>
          </View>
          <View>
            <Text style={styles.bankMonthlyLabel}>Total cost</Text>
            <Text style={styles.bankTotal}>${Math.round(monthly * (TERMS[0]) + totalInterest).toLocaleString()}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function FinancingScreen({ navigation, route }) {
  const defaultPrice = route.params?.carPrice ? String(route.params.carPrice) : '';
  const [carPrice, setCarPrice] = useState(defaultPrice);
  const [downPayment, setDownPayment] = useState('');
  const [termMonths, setTermMonths] = useState(36);
  const [selectedBank, setSelectedBank] = useState('bok');

  const priceNum = parseFloat(carPrice.replace(/,/g, '')) || 0;
  const downNum = parseFloat(downPayment.replace(/,/g, '')) || 0;
  const principal = Math.max(0, priceNum - downNum);
  const downPct = priceNum > 0 ? Math.round((downNum / priceNum) * 100) : 0;

  const selectedBankObj = RWANDA_BANKS.find((b) => b.id === selectedBank);
  const bestBank = RWANDA_BANKS.reduce((a, b) => a.rate < b.rate ? a : b);

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Financing Calculator" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {/* Intro */}
        <View style={styles.introCard}>
          <Ionicons name="cash-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Estimate monthly payments</Text>
            <Text style={styles.introSub}>Based on Rwanda commercial bank auto loan rates for 2026. Actual rates may vary — contact your bank for a formal quote.</Text>
          </View>
        </View>

        {/* Inputs */}
        <Text style={styles.fieldLabel}>Car price (USD)</Text>
        <View style={styles.inputRow}>
          <Text style={styles.inputPrefix}>$</Text>
          <TextInput
            style={styles.input}
            value={carPrice}
            onChangeText={setCarPrice}
            placeholder="e.g. 24000"
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Down payment (USD)</Text>
        <View style={styles.inputRow}>
          <Text style={styles.inputPrefix}>$</Text>
          <TextInput
            style={styles.input}
            value={downPayment}
            onChangeText={setDownPayment}
            placeholder="e.g. 5000 (20%)"
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />
          {downPct > 0 && <Text style={styles.inputSuffix}>{downPct}%</Text>}
        </View>

        {/* Loan summary */}
        {principal > 0 && (
          <View style={styles.loanSummary}>
            <Text style={styles.loanLabel}>Loan amount</Text>
            <Text style={styles.loanValue}>${principal.toLocaleString()}</Text>
            <Text style={styles.loanRwf}>{formatRWF(principal)}</Text>
          </View>
        )}

        {/* Term */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Loan term</Text>
        <View style={styles.termRow}>
          {TERMS.map((t) => (
            <Pressable
              key={t}
              style={[styles.termChip, termMonths === t && styles.termChipActive]}
              onPress={() => setTermMonths(t)}
            >
              <Text style={[styles.termText, termMonths === t && styles.termTextActive]}>
                {t < 12 ? `${t}m` : `${t / 12}yr`}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Best rate highlight */}
        {principal > 0 && (
          <View style={styles.bestRateCard}>
            <Ionicons name="trophy-outline" size={16} color={colors.amber} />
            <Text style={styles.bestRateText}>
              Best rate: <Text style={{ fontFamily: fonts.extraBold, color: colors.amber }}>{(bestBank.rate * 100).toFixed(1)}%</Text> from {bestBank.name}
            </Text>
          </View>
        )}

        {/* Bank comparison */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Bank comparison</Text>
        <View style={styles.bankList}>
          {RWANDA_BANKS.map((bank) => {
            const monthly = calcMonthlyPayment(principal, bank.rate, termMonths);
            const totalPaid = monthly * termMonths;
            const totalInterest = totalPaid - principal;
            return (
              <BankCard
                key={bank.id}
                bank={bank}
                monthly={monthly}
                totalInterest={totalInterest}
                isSelected={selectedBank === bank.id}
                onSelect={() => setSelectedBank(bank.id)}
              />
            );
          })}
        </View>

        {/* Selected summary */}
        {principal > 0 && selectedBankObj && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Your estimate · {selectedBankObj.name}</Text>
            {[
              { label: 'Loan amount', value: `$${principal.toLocaleString()}` },
              { label: 'Loan term', value: `${termMonths} months (${termMonths / 12}yr)` },
              { label: 'Annual rate', value: `${(selectedBankObj.rate * 100).toFixed(1)}% p.a.` },
              { label: 'Monthly payment', value: `$${Math.round(calcMonthlyPayment(principal, selectedBankObj.rate, termMonths)).toLocaleString()}`, bold: true, color: colors.primary },
              { label: 'Total interest', value: `$${Math.round(calcMonthlyPayment(principal, selectedBankObj.rate, termMonths) * termMonths - principal).toLocaleString()}` },
            ].map((row, i) => (
              <View key={i} style={[styles.summaryRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSoft }]}>
                <Text style={styles.summaryLabel}>{row.label}</Text>
                <Text style={[styles.summaryValue, row.bold && { fontFamily: fonts.extraBold, fontSize: 16 }, row.color && { color: row.color }]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
          <Text style={styles.disclaimerText}>
            This is a rough estimate only. Actual rates, fees and eligibility depend on your credit profile, bank policies, and the specific vehicle. Contact your bank for a formal auto loan quote. Inzozi Motors does not facilitate loans.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  introCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: colors.greenTint, borderRadius: radius.xl, padding: 14, marginBottom: 20,
  },
  introTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.primary, marginBottom: 3 },
  introSub: { fontSize: 12, color: colors.primary, lineHeight: 18 },
  fieldLabel: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl, paddingHorizontal: 16, height: 52,
  },
  inputPrefix: { fontSize: 16, fontFamily: fonts.bold, color: colors.textSecondary, marginRight: 6 },
  input: { flex: 1, fontSize: 18, fontFamily: fonts.bold, color: colors.textPrimary },
  inputSuffix: { fontSize: 13, fontFamily: fonts.bold, color: colors.primary },
  loanSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.greenTint, borderRadius: radius.lg, padding: 12, marginTop: 10,
  },
  loanLabel: { flex: 1, fontSize: 12, fontFamily: fonts.bold, color: colors.primary },
  loanValue: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.primary },
  loanRwf: { fontSize: 10, color: colors.primary, opacity: 0.7 },
  termRow: { flexDirection: 'row', gap: 8 },
  termChip: {
    flex: 1, paddingVertical: 10, borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  termChipActive: { borderColor: colors.primary, backgroundColor: colors.greenTint },
  termText: { fontSize: 13, fontFamily: fonts.bold, color: colors.textSecondary },
  termTextActive: { color: colors.primary },
  bestRateCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3C7', borderRadius: radius.lg, padding: 10, marginTop: 12,
  },
  bestRateText: { fontSize: 13, color: '#92400E' },
  bankList: { gap: 10 },
  bankCard: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14, ...shadows.card,
  },
  bankCardActive: { borderColor: colors.primary },
  bankHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bankAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  bankAvatarActive: { backgroundColor: colors.primary },
  bankAbbr: { fontSize: 12, fontFamily: fonts.extraBold, color: colors.textPrimary },
  bankName: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  bankNote: { fontSize: 11, color: colors.textMuted },
  bankRate: { alignItems: 'flex-end' },
  bankRateText: { fontSize: 18, fontFamily: fonts.black, color: colors.textPrimary },
  bankRateLabel: { fontSize: 9, color: colors.textMuted },
  bankResult: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt, borderRadius: radius.lg,
    padding: 10, marginTop: 12,
  },
  bankMonthlyLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  bankMonthlyValue: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  bankInterest: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.amber },
  bankTotal: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  summaryCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, marginTop: 16, overflow: 'hidden', ...shadows.card,
  },
  summaryTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textMuted, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  disclaimer: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    marginTop: 16,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: colors.textMuted, lineHeight: 16 },
});
