import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { colors, radius } from '../theme';

const STEPS = [
  { icon: 'document-text-outline', title: 'Enter details', sub: 'Make, model, mileage & condition' },
  { icon: 'camera-outline', title: 'Add photos', sub: 'AI guides you to the best angles' },
  { icon: 'pricetag-outline', title: 'Set your price', sub: 'Direct sale or 48-hour auction' },
  { icon: 'rocket-outline', title: 'Go live', sub: 'Reach 2M+ verified buyers instantly' },
];

const OPTIONS = [
  { icon: 'flash-outline', title: 'Instant Cash Offer', sub: 'Get paid today', accent: colors.green },
  { icon: 'hammer-outline', title: 'Sell at Auction', sub: 'Maximize your price', accent: colors.amber },
  { icon: 'storefront-outline', title: 'List for Direct Sale', sub: 'Set your own price', accent: colors.primary },
];

export default function SellScreen({ navigation }) {
  return (
    <Screen background={colors.bg}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.head}>
          <Text style={styles.h1}>Sell your car</Text>
          <Pressable style={styles.dashBtn} onPress={() => navigation.navigate('SellerDashboard')}>
            <Ionicons name="grid-outline" size={20} color={colors.slate700} />
          </Pressable>
        </View>

        {/* Valuation hero */}
        <LinearGradient
          colors={['#0B2A6B', '#0A1A3F']}
          style={styles.valCard}
        >
          <Text style={styles.valEyebrow}>FREE INSTANT VALUATION</Text>
          <Text style={styles.valTitle}>What's your car worth?</Text>
          <Text style={styles.valSub}>Get a real market estimate in 30 seconds.</Text>
          <View style={styles.plate}>
            <Ionicons name="car-outline" size={20} color={colors.blueLight} />
            <Text style={styles.plateText}>Enter VIN or license plate</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </View>
        </LinearGradient>

        {/* Options */}
        <View style={styles.options}>
          {OPTIONS.map((o) => (
            <Pressable key={o.title} style={styles.option} onPress={() => navigation.navigate('ListingWizard')}>
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
          <Button title="Start a Listing" icon="add" onPress={() => navigation.navigate('ListingWizard')} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: colors.textPrimary },
  dashBtn: {
    width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  valCard: { margin: 20, marginTop: 16, borderRadius: radius.xxl, padding: 22 },
  valEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: colors.blueLight },
  valTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 10, letterSpacing: -0.5 },
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
  optionTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  optionSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, paddingHorizontal: 20, marginTop: 24 },
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
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stepIcon: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.blueTint,
    alignItems: 'center', justifyContent: 'center',
  },
  stepTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  stepSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
