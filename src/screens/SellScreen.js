import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { colors, radius, fonts } from '../theme';

const STEPS = [
  { icon: 'shield-checkmark-outline', title: 'Verify Ownership', sub: 'Upload ID & Title documents securely' },
  { icon: 'scan-outline', title: '150-Point Curation', sub: 'Get certified by Inzozi inspection specialists' },
  { icon: 'ribbon-outline', title: 'Showcase Premium Status', sub: 'Position your car as high-intent certified property' },
  { icon: 'people-outline', title: 'Nationwide Client Match', sub: 'Direct connection with verified buyers across Kigali' },
];

const OPTIONS = [
  { icon: 'flash-outline', title: 'Instant Dealer Buyout', sub: 'Vetted instant exchange offer', accent: colors.green },
  { icon: 'hammer-outline', title: 'Certified Bid Event', sub: 'Maximize nationwide buyer demand', accent: colors.amber },
  { icon: 'storefront-outline', title: 'Concierge Showroom', sub: 'Vetted private sale listing', accent: colors.primary },
];

export default function SellScreen({ navigation }) {
  return (
    <Screen background={colors.bg}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.head}>
          <Text style={styles.h1}>Certify & Showcase</Text>
          <Pressable style={styles.dashBtn} onPress={() => navigation.navigate('SellerDashboard')}>
            <Ionicons name="grid-outline" size={20} color={colors.slate700} />
          </Pressable>

        </View>

        {/* Valuation hero */}
        <Pressable onPress={() => navigation.navigate('CarValuation')}>
          <LinearGradient
            colors={[colors.navyLight, colors.navyMid]}
            style={styles.valCard}
          >
            <Text style={styles.valEyebrow}>FREE INSTANT VALUATION</Text>
            <Text style={styles.valTitle}>What's my car worth?</Text>
            <Text style={styles.valSub}>Instant market estimate in 30 seconds. No account needed.</Text>
            <View style={styles.plate}>
              <Ionicons name="trending-up-outline" size={20} color={colors.blueLight} />
              <Text style={styles.plateText}>Get my free estimate</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Options */}
        <View style={styles.options}>
          {OPTIONS.map((o) => (
            <Pressable key={o.title} style={styles.option} onPress={() => navigation.navigate('CarSubmission')}>
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

        <Text style={styles.sectionTitle}>How it works</Text>
        <View style={styles.steps}>
          {STEPS.map((s, i) => (
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
          <Button title="Submit Your Car" icon="shield-checkmark-outline" onPress={() => navigation.navigate('CarSubmission')} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  h1: { fontSize: 24, fontFamily: fonts.extraBold, letterSpacing: -0.5, color: colors.textPrimary },
  dashBtn: {
    width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.surface,
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
