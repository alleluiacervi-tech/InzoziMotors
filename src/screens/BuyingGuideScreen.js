import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, fonts, radius, shadows } from '../theme';

const STEPS = [
  { icon: 'search-outline', title: 'Review the listing', desc: 'Compare the vehicle details, available images, seller verification and published inspection evidence.' },
  { icon: 'chatbubble-outline', title: 'Contact the seller', desc: 'Choose an available in-app, WhatsApp or phone channel after accepting the direct-deal notice.' },
  { icon: 'construct-outline', title: 'Do your own checks', desc: 'View the vehicle, verify ownership and documents, and arrange any independent mechanical or legal review you need.' },
  { icon: 'document-text-outline', title: 'Agree in writing', desc: 'Buyer and seller decide the price, included items, payment method, delivery, transfer and any remedies directly.' },
  { icon: 'swap-horizontal-outline', title: 'Complete the transaction', desc: 'Pay only the verified recipient and complete ownership transfer, insurance and delivery in the manner the parties agreed.' },
];

const FAQS = [
  { q: 'Does contacting a seller reserve the car?', a: 'No. A message, phone disclosure or WhatsApp contact is an inquiry only. Availability remains subject to direct confirmation by the seller.' },
  { q: 'Does Sawa Cars receive the purchase money?', a: 'No. There is no marketplace checkout, escrow or payment gateway for car sales or rentals. Users decide payment directly and should keep written records.' },
  { q: 'Is the inspection a warranty?', a: 'No. It records observations made on the inspection date. It does not guarantee future condition or replace your own inspection, ownership checks or legal advice.' },
  { q: 'Does Sawa Cars provide a seven-day return?', a: 'No. Any return, warranty or cancellation right must be agreed directly between buyer and seller in writing, subject to rights that applicable law provides.' },
  { q: 'What if an external transaction goes wrong?', a: 'Use platform reporting for unsafe accounts, messages or listing content. Contract, payment, ownership or delivery disputes remain between the users and may need their bank, insurer, lawyer, regulator, court or law enforcement.' },
];

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return <Pressable style={styles.faq} onPress={() => setOpen((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: open }}><View style={styles.faqRow}><Text style={styles.faqQ}>{q}</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} /></View>{open && <Text style={styles.faqA}>{a}</Text>}</Pressable>;
}

export default function BuyingGuideScreen({ navigation }) {
  return <Screen background={colors.bg}><BackHeader title="How buying works" onBack={() => navigation.goBack()} /><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.hero}><Ionicons name="people-outline" size={28} color={colors.primary} /><Text style={styles.heroTitle}>Verified information. Direct agreement.</Text><Text style={styles.heroText}>Sawa Cars controls account checks, listing publication and platform safety. The buyer and seller control the actual transaction.</Text></View>
    {STEPS.map((step, index) => <View key={step.title} style={styles.step}><View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View><View style={styles.stepCard}><View style={styles.stepHead}><Ionicons name={step.icon} size={18} color={colors.primary} /><Text style={styles.stepTitle}>{step.title}</Text></View><Text style={styles.stepText}>{step.desc}</Text></View></View>)}
    <View style={styles.boundary}><Text style={styles.boundaryTitle}>Sawa Cars is not a party to the deal</Text><Text style={styles.boundaryText}>Sawa Cars does not hold transaction funds, issue the users' contract, promise delivery, guarantee the vehicle or payment, process ownership transfer, or decide an external dispute.</Text></View>
    <Text style={styles.sectionTitle}>Common questions</Text>{FAQS.map((item) => <Faq key={item.q} {...item} />)}
    <Button title="Read marketplace safety" icon="shield-checkmark-outline" variant="outline" onPress={() => navigation.navigate('SawaPromise')} style={{ marginTop: 10 }} />
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, paddingBottom: 48 }, hero: { borderRadius: radius.xxl, backgroundColor: colors.blueTint, padding: 20, marginBottom: 18 }, heroTitle: { marginTop: 10, fontSize: 20, fontFamily: fonts.extraBold, color: colors.textPrimary }, heroText: { marginTop: 7, fontSize: 13.5, lineHeight: 20, color: colors.textSecondary },
  step: { flexDirection: 'row', gap: 11 }, number: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.navyDeep, alignItems: 'center', justifyContent: 'center' }, numberText: { fontSize: 12, fontFamily: fonts.extraBold, color: '#fff' }, stepCard: { flex: 1, marginBottom: 12, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: 14, ...shadows.card }, stepHead: { flexDirection: 'row', alignItems: 'center', gap: 8 }, stepTitle: { fontSize: 14.5, fontFamily: fonts.extraBold, color: colors.textPrimary }, stepText: { marginTop: 6, fontSize: 12.5, lineHeight: 19, color: colors.textSecondary },
  boundary: { marginTop: 5, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.amber + '45', backgroundColor: '#FFF8E8', padding: 16 }, boundaryTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary }, boundaryText: { marginTop: 6, fontSize: 12.5, lineHeight: 19, color: colors.textSecondary }, sectionTitle: { marginTop: 24, marginBottom: 10, fontSize: 17, fontFamily: fonts.extraBold, color: colors.textPrimary },
  faq: { marginBottom: 9, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: 15 }, faqRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 10 }, faqQ: { flex: 1, fontSize: 13.5, fontFamily: fonts.bold, color: colors.textPrimary }, faqA: { marginTop: 10, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
});
