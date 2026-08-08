import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { LogoMark } from '../components/Logo';

const PROMISES = [
  {
    icon: 'shield-checkmark',
    title: '150-Point Certification',
    desc: 'Every car — for sale or for rent — passes our full mechanical, body, electronics and documentation inspection before it appears on Sawa. No exceptions, no seller shortcuts.',
  },
  {
    icon: 'refresh',
    title: 'Drive It for 7 Days',
    desc: "Every certified purchase comes with a 7-day decision window. Drive it, live with it — if it doesn't match its inspection report, return it at any Sawa center for a full refund.",
  },
  {
    icon: 'document-text',
    title: 'Verified History',
    desc: 'Ownership records, mileage verification and RRA duty status are checked and published on every listing. What you read is what we verified.',
  },
  {
    icon: 'cash',
    title: 'Deposit-Back Guarantee',
    desc: 'Rental deposits are returned in full after the return check — same day, at the center. Documented condition photos protect both sides.',
  },
  {
    icon: 'eye-off',
    title: 'Zero Fake Listings',
    desc: 'Only the Sawa team can publish listings, and only after physically inspecting the car. Every photo is shot by our photographers. If it looks real, it is.',
  },
];

export default function SawaPromiseScreen({ navigation }) {
  return (
    <Screen background={colors.bg}>
      <BackHeader title="The Sawa Promise" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero — the Sawa identity */}
        <View style={styles.hero}>
          <LogoMark size={84} />
          <Text style={styles.heroTitle}>Our promise to every customer</Text>
          <Text style={styles.heroSub}>
            Buying or renting a car is one of the biggest decisions you'll make.
            These five guarantees apply to every single vehicle on Sawa.
          </Text>
        </View>

        {/* Refund conditions — transparent, no fine print */}
        <View style={styles.refundCard}>
          <Text style={styles.refundTitle}>The 7-day window, in plain terms</Text>
          {[
            { free: true,  text: 'Cancel before handover — always free' },
            { free: true,  text: "Days 1–7: full refund if the car doesn't match its report" },
            { free: false, text: 'Change of mind: reconditioning fee is deducted' },
            { free: false, text: 'Over 300 km driven: per-km usage charge applies' },
          ].map((r) => (
            <View key={r.text} style={styles.refundRow}>
              <Ionicons
                name={r.free ? 'checkmark-circle' : 'information-circle-outline'}
                size={15}
                color={r.free ? colors.green : colors.amber}
              />
              <Text style={styles.refundText}>{r.text}</Text>
            </View>
          ))}
          <Pressable style={styles.guideLink} onPress={() => navigation.navigate('BuyingGuide')}>
            <Text style={styles.guideLinkText}>See the full buying guide</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </Pressable>
        </View>

        {/* Promises */}
        {PROMISES.map((p, i) => (
          <View key={p.title} style={styles.card}>
            <View style={styles.cardIcon}>
              <Ionicons name={p.icon} size={20} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardNum}>{String(i + 1).padStart(2, '0')}</Text>
                <Text style={styles.cardTitle}>{p.title}</Text>
              </View>
              <Text style={styles.cardDesc}>{p.desc}</Text>
            </View>
          </View>
        ))}

        {/* Fine print */}
        <Text style={styles.finePrint}>
          The 7-day return guarantee applies to purchases handed over at a Sawa center.
          Deposit refunds follow the documented return check. Full terms available at any center.
        </Text>

        <Button
          title="Browse Certified Cars"
          icon="car-outline"
          onPress={() => navigation.navigate('Main')}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  hero: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xxl, padding: 24,
    alignItems: 'center', marginTop: 4, marginBottom: 16,
    ...shadows.card,
  },
  heroTitle: {
    fontSize: 21, fontFamily: fonts.extraBold, color: colors.textPrimary,
    textAlign: 'center', letterSpacing: -0.4, marginTop: 16,
  },
  refundCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, marginBottom: 16,
    ...shadows.card,
  },
  refundTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 10 },
  refundRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  refundText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  guideLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  guideLinkText: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.primary },
  heroSub: {
    fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary,
    textAlign: 'center', marginTop: 8, lineHeight: 19,
  },
  card: {
    flexDirection: 'row', gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, marginBottom: 10,
    ...shadows.card,
  },
  cardIcon: {
    width: 42, height: 42, borderRadius: radius.md,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardNum: { fontSize: 11, fontFamily: fonts.extraBold, color: colors.primary, letterSpacing: 0.5 },
  cardTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.2 },
  cardDesc: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 5, lineHeight: 18 },
  finePrint: {
    fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted,
    lineHeight: 16, marginTop: 8, marginBottom: 16, textAlign: 'center',
  },
});
