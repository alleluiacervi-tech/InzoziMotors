import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, radius, shadows, fonts } from '../theme';

// "How Buying Works" — Encar-style purchase guide: timeline + refund
// conditions + FAQ, so buyers know every step before they commit.
const STEPS = [
  { icon: 'paper-plane-outline', title: 'Request the car', desc: 'One tap, no payment. The car is reserved for you while we confirm with the seller. Cancelling before handover is always free.' },
  { icon: 'call-outline', title: 'We arrange everything', desc: 'Inzozi contacts you on WhatsApp within 24 hours to set a handover time at the center that suits you.' },
  { icon: 'shield-checkmark-outline', title: 'Handover at the center', desc: 'Meet at an Inzozi center. Payment happens there — in person, never in the app. We check documents with both of you.' },
  { icon: 'document-text-outline', title: 'Ownership transfer', desc: 'We process the RRA transfer with you at the center. New registration documents typically complete within 2–3 working days.' },
  { icon: 'car-outline', title: 'Insure before you drive', desc: "Third-party insurance is required before the car leaves the center. Bring a policy, or our team helps you arrange one on the spot." },
  { icon: 'time-outline', title: 'Drive it for 7 days', desc: "Your guarantee window. If the car doesn't match its inspection report, bring it back — see the conditions below." },
];

const REFUND_ROWS = [
  { when: 'Before handover', terms: 'Cancel any time — free, no questions asked', free: true },
  { when: 'Days 1–7 after handover', terms: 'Full refund if the car does not match its inspection report', free: true },
  { when: 'Reconditioning fee', terms: 'Deducted on change-of-mind returns (cleaning + re-inspection)', free: false },
  { when: 'Over 300 km driven', terms: 'Per-km usage charge applies to the refund', free: false },
  { when: 'After 7 days', terms: 'Sale is final — warranty claims go through Support', free: false },
];

const FAQS = [
  { q: 'Do I pay anything in the app?', a: 'Never. The app has no payment feature at all. Payment happens physically at the Inzozi center at handover — that is what protects both you and the seller.' },
  { q: 'What if the seller sells the car to someone else?', a: "Once you request a car it is reserved and removed from the marketplace. Only you can complete or release that reservation." },
  { q: 'Can I inspect the car myself before paying?', a: 'Yes — the handover happens at our center, where you can check the car against its 150-point report before any money changes hands. You can also ask for a WhatsApp video viewing first.' },
  { q: 'What documents do I need?', a: 'Your national ID, proof of insurance (or arrange it at the center), and payment. We handle the RRA paperwork with you.' },
  { q: 'How does the 7-day guarantee work exactly?', a: 'From the day of handover you have 7 days. If the car does not match its published inspection report, return it to any Inzozi center for a full refund. Change-of-mind returns are accepted with a reconditioning fee, and a per-km charge applies beyond 300 km.' },
];

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable style={styles.faq} onPress={() => setOpen(!open)}>
      <View style={styles.faqRow}>
        <Text style={styles.faqQ}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </View>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </Pressable>
  );
}

export default function BuyingGuideScreen({ navigation }) {
  return (
    <Screen background={colors.bg}>
      <BackHeader title="How Buying Works" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.lede}>
          Six steps, no surprises. Payment stays at the center, and every step is backed by the Inzozi Promise.
        </Text>

        {/* Timeline */}
        {STEPS.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <View style={styles.stepLeft}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              {i < STEPS.length - 1 && <View style={styles.stepLine} />}
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepHead}>
                <Ionicons name={s.icon} size={17} color={colors.textSecondary} />
                <Text style={styles.stepTitle}>{s.title}</Text>
              </View>
              <Text style={styles.stepDesc}>{s.desc}</Text>
            </View>
          </View>
        ))}

        {/* Refund conditions — transparent, Encar-style */}
        <Text style={styles.sectionTitle}>Refund conditions</Text>
        <View style={styles.table}>
          {REFUND_ROWS.map((r, i) => (
            <View key={r.when} style={[styles.tableRow, i < REFUND_ROWS.length - 1 && styles.tableRowBorder]}>
              <Ionicons
                name={r.free ? 'checkmark-circle' : 'information-circle-outline'}
                size={16}
                color={r.free ? colors.green : colors.amber}
                style={{ marginTop: 1 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.tableWhen}>{r.when}</Text>
                <Text style={styles.tableTerms}>{r.terms}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>Common questions</Text>
        {FAQS.map((f) => <Faq key={f.q} q={f.q} a={f.a} />)}

        <Pressable style={styles.promiseLink} onPress={() => navigation.navigate('InzoziPromise')}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
          <Text style={styles.promiseLinkText}>Read the full Inzozi Promise</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 48 },
  lede: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 20 },
  step: { flexDirection: 'row', gap: 12 },
  stepLeft: { alignItems: 'center', width: 28 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.navyDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 12, fontFamily: fonts.extraBold, color: '#fff' },
  stepLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4 },
  stepCard: {
    flex: 1, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14, marginBottom: 12,
    ...shadows.card,
  },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  stepTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  stepDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  sectionTitle: { fontSize: 17, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 16, marginBottom: 10 },
  table: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 4,
    ...shadows.card,
  },
  tableRow: { flexDirection: 'row', gap: 10, padding: 12 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  tableWhen: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  tableTerms: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  faq: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.lg, padding: 14, marginBottom: 8,
  },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  faqQ: { flex: 1, fontSize: 13.5, fontFamily: fonts.bold, color: colors.textPrimary },
  faqA: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: 9 },
  promiseLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 14, paddingVertical: 12,
  },
  promiseLinkText: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.primary },
});
