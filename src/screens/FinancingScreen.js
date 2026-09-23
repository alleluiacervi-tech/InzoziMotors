import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, radius, shadows, fonts } from '../theme';
import { formatRWF } from '../data/marketData';
import { useApp } from '../context/AppContext';

const TERMS = [12, 24, 36, 48, 60];

function calcMonthlyPayment(principal, annualRate, months) {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function BankCard({ bank, monthly, totalInterest, termMonths, isSelected, isBestRate, onSelect, t }) {
  return (
    <Pressable
      style={[styles.bankCard, isSelected && styles.bankCardActive]}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${bank.name}, ${(bank.rate * 100).toFixed(1)} percent per year`}
    >
      {isBestRate && (
        <View style={styles.bestChip}>
          <Ionicons name="trophy" size={9} color={colors.amberText} />
          <Text style={styles.bestChipText}>{t('financing.lowestRate')}</Text>
        </View>
      )}
      <View style={styles.bankHeader}>
        <View style={[styles.logoTile, isSelected && { borderColor: bank.brand }]}>
          <Image source={bank.logo} style={styles.logoImg} resizeMode="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bankName}>{bank.name}</Text>
          <Text style={styles.bankNote}>{bank.note}</Text>
        </View>
        <View style={styles.bankRate}>
          <Text style={[styles.bankRateText, isSelected && { color: colors.primary }]}>{(bank.rate * 100).toFixed(1)}%</Text>
          <Text style={styles.bankRateLabel}>{t('financing.perYear')}</Text>
        </View>
        <View style={[styles.radio, isSelected && styles.radioOn]}>
          {isSelected && <Ionicons name="checkmark" size={11} color="#fff" />}
        </View>
      </View>
      {monthly > 0 && (
        <View style={[styles.bankResult, isSelected && styles.bankResultActive]}>
          <View style={styles.bankResultCol}>
            <Text style={styles.bankMonthlyLabel}>{t('financing.monthly')}</Text>
            <Text style={[styles.bankMonthlyValue, isSelected && { color: colors.primary }]}>
              {formatRWF(Math.round(monthly))}
            </Text>
          </View>
          <View style={styles.resultDivider} />
          <View style={styles.bankResultCol}>
            <Text style={styles.bankMonthlyLabel}>{t('financing.totalInterest')}</Text>
            <Text style={styles.bankInterest}>{formatRWF(Math.round(totalInterest))}</Text>
          </View>
          <View style={styles.resultDivider} />
          <View style={styles.bankResultCol}>
            <Text style={styles.bankMonthlyLabel}>{t('financing.totalRepaid')}</Text>
            <Text style={styles.bankTotal}>{formatRWF(Math.round(monthly * termMonths))}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function FinancingScreen({ navigation, route }) {
  const { t } = useApp();
  const defaultPrice = route.params?.carPrice ? String(route.params.carPrice) : '';
  const [carPrice, setCarPrice] = useState(defaultPrice);
  const [downPayment, setDownPayment] = useState('');
  const [termMonths, setTermMonths] = useState(36);
  const [selectedBank, setSelectedBank] = useState('bok');

  const rwandaBanks = [
    { id: 'bok', name: 'Bank of Kigali', abbr: 'BK', rate: 0.17, note: t('financing.bankBKNote'), logo: require('../../assets/banks/bok.png'), brand: '#1E63B4' },
    { id: 'equity', name: 'Equity Bank Rwanda', abbr: 'EQ', rate: 0.185, note: t('financing.bankEquityNote'), logo: require('../../assets/banks/equity.png'), brand: '#9E2B25' },
    { id: 'im', name: 'I&M Bank Rwanda', abbr: 'I&M', rate: 0.165, note: t('financing.bankIMNote'), logo: require('../../assets/banks/im.png'), brand: '#0A5AA5' },
    { id: 'kcb', name: 'KCB Rwanda', abbr: 'KCB', rate: 0.175, note: t('financing.bankKCBNote'), logo: require('../../assets/banks/kcb.png'), brand: '#63B32E' },
  ];

  const banksByRate = [...rwandaBanks].sort((a, b) => a.rate - b.rate);

  const priceNum = parseFloat(carPrice.replace(/,/g, '')) || 0;
  const downNum = parseFloat(downPayment.replace(/,/g, '')) || 0;
  const principal = Math.max(0, priceNum - downNum);
  const downPct = priceNum > 0 ? Math.round((downNum / priceNum) * 100) : 0;

  const selectedBankObj = rwandaBanks.find((b) => b.id === selectedBank);
  const bestBank = banksByRate[0];

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('financing.title')} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {/* Intro */}
          <View style={styles.introCard}>
            <Ionicons name="cash-outline" size={22} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.introTitle}>{t('financing.introTitle')}</Text>
              <Text style={styles.introSub}>{t('financing.introSub')}</Text>
            </View>
          </View>

          {/* Inputs */}
          <Text style={styles.fieldLabel}>{t('financing.carPrice')}</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputPrefix}>RWF</Text>
            <TextInput
              style={styles.input}
              value={carPrice}
              onChangeText={setCarPrice}
              placeholder={t('financing.carPricePlaceholder')}
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{t('financing.downPayment')}</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputPrefix}>RWF</Text>
            <TextInput
              style={styles.input}
              value={downPayment}
              onChangeText={setDownPayment}
              placeholder={t('financing.downPaymentPlaceholder')}
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
            />
            {downPct > 0 && <Text style={styles.inputSuffix}>{downPct}%</Text>}
          </View>

          {/* Loan summary */}
          {principal > 0 && (
            <View style={styles.loanSummary}>
              <Text style={styles.loanLabel}>{t('financing.loanAmount')}</Text>
              <Text style={styles.loanValue}>{formatRWF(principal)}</Text>
            </View>
          )}

          {/* Term */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{t('financing.loanTerm')}</Text>
          <View style={styles.termRow}>
            {TERMS.map((tVal) => (
              <Pressable
                key={tVal}
                style={[styles.termChip, termMonths === tVal && styles.termChipActive]}
                onPress={() => setTermMonths(tVal)}
              >
                <Text style={[styles.termText, termMonths === tVal && styles.termTextActive]}>
                  {tVal < 12 ? `${tVal}m` : `${tVal / 12}yr`}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Bank comparison */}
          <View style={styles.compareHeader}>
            <Text style={styles.fieldLabel}>{t('financing.compareBanks')}</Text>
            <Text style={styles.compareSub}>{t('financing.sortedByRate')}</Text>
          </View>
          <View style={styles.bankList}>
            {banksByRate.map((bank) => {
              const monthly = calcMonthlyPayment(principal, bank.rate, termMonths);
              const totalPaid = monthly * termMonths;
              const totalInterest = totalPaid - principal;
              return (
                <BankCard
                  key={bank.id}
                  bank={bank}
                  monthly={monthly}
                  totalInterest={totalInterest}
                  termMonths={termMonths}
                  isSelected={selectedBank === bank.id}
                  isBestRate={bank.id === bestBank.id}
                  onSelect={() => setSelectedBank(bank.id)}
                  t={t}
                />
              );
            })}
          </View>

          {/* Selected summary */}
          {principal > 0 && selectedBankObj && (() => {
            const monthly = calcMonthlyPayment(principal, selectedBankObj.rate, termMonths);
            return (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHead}>
                  <View style={styles.summaryLogoTile}>
                    <Image source={selectedBankObj.logo} style={styles.summaryLogo} resizeMode="contain" />
                  </View>
                  <Text style={styles.summaryTitle}>{t('financing.yourEstimate', { bank: selectedBankObj.name })}</Text>
                </View>
                {[
                  { label: t('financing.loanAmount'), value: formatRWF(principal) },
                  { label: t('financing.loanTerm'), value: t('financing.months', { count: termMonths, years: termMonths / 12 }) },
                  { label: t('financing.annualRate'), value: `${(selectedBankObj.rate * 100).toFixed(1)}% p.a.` },
                  { label: t('financing.monthlyPayment'), value: formatRWF(Math.round(monthly)), bold: true, color: colors.primary },
                  { label: t('financing.totalInterest'), value: formatRWF(Math.round(monthly * termMonths - principal)) },
                  { label: t('financing.totalRepaid'), value: formatRWF(Math.round(monthly * termMonths)) },
                ].map((row, i) => (
                  <View key={i} style={[styles.summaryRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSoft }]}>
                    <Text style={styles.summaryLabel}>{row.label}</Text>
                    <Text style={[styles.summaryValue, row.bold && { fontFamily: fonts.extraBold, fontSize: 16 }, row.color && { color: row.color }]}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
            <Text style={styles.disclaimerText}>{t('financing.disclaimer')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  introCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: colors.greenTint, borderRadius: radius.xl, padding: 14, marginBottom: 20,
  },
  introTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 3 },
  introSub: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  fieldLabel: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl, paddingHorizontal: 16, height: 52,
  },
  inputPrefix: { fontSize: 16, fontFamily: fonts.bold, color: colors.textSecondary, marginRight: 6 },
  input: { flex: 1, fontSize: 18, fontFamily: fonts.bold, color: colors.textPrimary },
  inputSuffix: { fontSize: 13, fontFamily: fonts.bold, color: colors.textMuted },
  loanSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.greenTint, borderRadius: radius.lg, padding: 12, marginTop: 10,
  },
  loanLabel: { flex: 1, fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted },
  loanValue: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.primary },
  termRow: { flexDirection: 'row', gap: 8 },
  termChip: {
    flex: 1, paddingVertical: 10, borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  termChipActive: { borderColor: colors.primary, backgroundColor: colors.greenTint },
  termText: { fontSize: 13, fontFamily: fonts.bold, color: colors.textSecondary },
  termTextActive: { color: colors.primary },
  compareHeader: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: 16,
  },
  compareSub: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textMuted },
  bankList: { gap: 12 },
  bankCard: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14, ...shadows.card,
  },
  bankCardActive: { borderColor: colors.primary, backgroundColor: colors.surface },
  bestChip: {
    position: 'absolute', top: -9, right: 14, zIndex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.amberTint, borderWidth: 1, borderColor: colors.amber + '55',
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2.5,
  },
  bestChipText: { fontSize: 11, fontFamily: fonts.extraBold, color: colors.amberText, letterSpacing: 0.3, textTransform: 'uppercase' },
  bankHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoTile: {
    width: 48, height: 48, borderRadius: radius.lg,
    // Bank logos are third-party marks drawn for a white ground, in either theme.
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  logoImg: { width: 40, height: 34 },
  bankName: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  bankNote: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  bankRate: { alignItems: 'flex-end' },
  bankRateText: { fontVariant: ['tabular-nums'], fontSize: 18, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -0.3 },
  bankRateLabel: { fontSize: 11, color: colors.textMuted },
  radio: {
    width: 20, height: 20, borderRadius: 10, marginLeft: 2,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  bankResult: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: colors.surfaceAlt, borderRadius: radius.lg,
    paddingVertical: 10, paddingHorizontal: 12, marginTop: 12,
  },
  bankResultActive: { backgroundColor: colors.greenTint },
  bankResultCol: { flex: 1 },
  resultDivider: { width: 1, backgroundColor: colors.border, opacity: 0.6, marginHorizontal: 10 },
  bankMonthlyLabel: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textMuted, marginBottom: 2 },
  bankMonthlyValue: { fontVariant: ['tabular-nums'], fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  bankInterest: { fontVariant: ['tabular-nums'], fontSize: 14, fontFamily: fonts.bold, color: colors.amberText },
  bankTotal: { fontVariant: ['tabular-nums'], fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  summaryCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, marginTop: 16, overflow: 'hidden', ...shadows.card,
  },
  summaryHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  summaryLogoTile: {
    width: 30, height: 30, borderRadius: radius.md,
    // Bank logos are third-party marks drawn for a white ground, in either theme.
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  summaryLogo: { width: 24, height: 20 },
  summaryTitle: { flex: 1, fontSize: 13, fontFamily: fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  disclaimer: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    marginTop: 16,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: colors.textMuted, lineHeight: 16 },
});
