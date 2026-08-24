import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { LogoMark } from '../components/Logo';
import { colors, fonts, radius, shadows } from '../theme';

const CONTROLS = [
  { icon: 'person-circle-outline', title: 'Verified access', text: 'Seller and rental-provider eligibility is reviewed before publication and can be revoked by the team.' },
  { icon: 'construct-outline', title: 'Inspection evidence', text: 'Inspection results describe recorded checks on the inspection date; they are evidence, not a future-condition warranty.' },
  { icon: 'eye-outline', title: 'Controlled publication', text: 'Only authorized administrators publish, pause, correct, reject or archive public vehicle listings.' },
  { icon: 'lock-closed-outline', title: 'Consent-based contacts', text: 'Phone and WhatsApp details are disclosed only when an approved seller or provider enables that channel.' },
  { icon: 'flag-outline', title: 'Platform safety', text: 'Users can report content and conversations. Sawa Cars can moderate accounts and preserve platform audit history.' },
];

export default function SawaPromiseScreen({ navigation }) {
  return <Screen background={colors.bg}><BackHeader title="Marketplace safety" onBack={() => navigation.goBack()} /><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.hero}><LogoMark size={78} /><Text style={styles.heroTitle}>Useful controls. Honest limits.</Text><Text style={styles.heroText}>Verification and evidence reduce avoidable marketplace risk. They do not make Sawa Cars a party to the users' sale or rental.</Text></View>
    <Text style={styles.sectionTitle}>What the platform controls</Text>{CONTROLS.map((item) => <View key={item.title} style={styles.card}><View style={styles.icon}><Ionicons name={item.icon} size={21} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardText}>{item.text}</Text></View></View>)}
    <View style={styles.directCard}><Text style={styles.directTitle}>What users control</Text><Text style={styles.directText}>Viewings, independent checks, price, written contract, payment, deposit, ownership transfer, insurance, delivery, pickup, return and resolution of an external transaction dispute.</Text></View>
    <View style={styles.noGuarantee}><Ionicons name="information-circle-outline" size={22} color={colors.amber} /><Text style={styles.noGuaranteeText}>There is no Sawa checkout, escrow, seven-day return guarantee, transaction warranty or rental-deposit guarantee. Any such term must come from the users' separate written agreement or applicable law.</Text></View>
    <Button title="How direct buying works" icon="book-outline" onPress={() => navigation.navigate('BuyingGuide')} style={{ marginTop: 16 }} />
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, paddingBottom: 46 }, hero: { alignItems: 'center', borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: 23, ...shadows.card }, heroTitle: { marginTop: 14, fontSize: 21, fontFamily: fonts.extraBold, color: colors.textPrimary, textAlign: 'center' }, heroText: { marginTop: 8, fontSize: 13.5, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' }, sectionTitle: { marginTop: 24, marginBottom: 10, fontSize: 17, fontFamily: fonts.extraBold, color: colors.textPrimary },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, marginBottom: 10, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: 15 }, icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' }, cardTitle: { fontSize: 14.5, fontFamily: fonts.extraBold, color: colors.textPrimary }, cardText: { marginTop: 4, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  directCard: { marginTop: 8, borderRadius: radius.xl, backgroundColor: colors.navyDeep, padding: 17 }, directTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: '#fff' }, directText: { marginTop: 6, fontSize: 12.5, lineHeight: 19, color: 'rgba(255,255,255,0.82)' }, noGuarantee: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12, borderRadius: radius.xl, backgroundColor: '#FFF8E8', padding: 15 }, noGuaranteeText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: colors.textSecondary },
});
