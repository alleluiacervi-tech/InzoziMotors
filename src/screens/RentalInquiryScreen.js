import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { useApp } from '../context/AppContext';
import { colors, fonts, radius, shadows } from '../theme';

const tomorrowISO = () => {
  const day = new Date();
  day.setDate(day.getDate() + 1);
  return day.toISOString().slice(0, 10);
};

export default function RentalInquiryScreen({ navigation, route }) {
  const car = route.params?.car;
  const { isLoggedIn, sendRentalInquiry } = useApp();
  const available = car?.providerContactAvailable || { in_app: true, phone: false, whatsapp: false };
  const channels = useMemo(() => [
    { id: 'in_app', label: 'In-app', icon: 'chatbubble-outline' },
    ...(available.whatsapp ? [{ id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' }] : []),
    ...(available.phone ? [{ id: 'phone', label: 'Phone', icon: 'call-outline' }] : []),
  ], [available.phone, available.whatsapp]);
  const [startDate, setStartDate] = useState(tomorrowISO());
  const [days, setDays] = useState(String(car?.minDays || 1));
  const [pickupLocation, setPickupLocation] = useState('');
  const [message, setMessage] = useState('');
  const [preferredChannel, setPreferredChannel] = useState('in_app');
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  if (!car) return <Screen background={colors.bg}><BackHeader title="Request availability" onBack={() => navigation.goBack()} /><View style={styles.center}><Text style={styles.title}>Rental unavailable</Text></View></Screen>;

  const submit = async () => {
    if (!isLoggedIn) return navigation.navigate('SignIn');
    const count = Number(days);
    const requested = new Date(`${startDate}T00:00:00`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(requested.getTime()) || requested <= today) return setError('Enter a future date in YYYY-MM-DD format.');
    if (!Number.isInteger(count) || count < (car.minDays || 1) || count > 365) return setError(`Choose between ${car.minDays || 1} and 365 days.`);
    if (!acknowledged) return setError('Read and accept the direct-provider notice to continue.');
    setLoading(true); setError('');
    try {
      const created = await sendRentalInquiry({ carId: car.id, carTitle: car.title, startDateISO: startDate, startDate, days: count, pickupLocation: pickupLocation.trim(), message: message.trim(), preferredChannel });
      setResult({ reference: created.inquiry_ref || created.inquiryRef, contact: created.contact || null, notice: created.notice || car.directDealNotice, channel: preferredChannel });
    } catch (err) {
      setError(err?.message || 'The inquiry could not be sent. Please try again.');
    } finally { setLoading(false); }
  };

  if (result) {
    const openContact = async () => {
      if (!result.contact) return;
      const url = result.channel === 'whatsapp' ? `https://wa.me/${String(result.contact).replace(/\D/g, '')}` : `tel:${result.contact}`;
      await Linking.openURL(url);
    };
    return <Screen background={colors.bg}><BackHeader title="Inquiry sent" onBack={() => navigation.navigate('MyRentals')} /><View style={styles.success}><View style={styles.successIcon}><Ionicons name="checkmark" size={34} color="#fff" /></View><Text style={styles.successTitle}>Availability request sent</Text><Text style={styles.successBody}>Reference {result.reference || 'created'}. The provider will confirm availability, price, deposit, contract, pickup and return terms directly.</Text>{result.contact && result.channel !== 'in_app' ? <Button title={result.channel === 'whatsapp' ? 'Continue on WhatsApp' : `Call ${result.contact}`} icon={result.channel === 'whatsapp' ? 'logo-whatsapp' : 'call-outline'} onPress={openContact} style={styles.successButton} /> : null}<Button title="View my inquiries" variant="outline" onPress={() => navigation.replace('MyRentals')} style={styles.successButton} /><Text style={styles.noticeSmall}>{result.notice}</Text></View></Screen>;
  }

  return <Screen background={colors.bg}><BackHeader title="Request availability" onBack={() => navigation.goBack()} /><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.summary}><Ionicons name="key-outline" size={24} color={colors.primary} /><View style={{ flex: 1 }}><Text style={styles.title}>{car.title}</Text><Text style={styles.sub}>{car.providerName || 'Verified rental provider'}</Text></View></View>
    <Text style={styles.section}>Requested dates</Text><Text style={styles.helper}>The provider confirms availability. This request does not reserve the vehicle.</Text>
    <View style={styles.row}><View style={styles.half}><Text style={styles.label}>Start date</Text><TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" style={styles.input} /></View><View style={styles.half}><Text style={styles.label}>Days</Text><TextInput value={days} onChangeText={setDays} keyboardType="number-pad" style={styles.input} /></View></View>
    <Text style={styles.label}>Preferred pickup area</Text><TextInput value={pickupLocation} onChangeText={setPickupLocation} maxLength={200} placeholder="e.g. Kigali Airport" placeholderTextColor={colors.textMuted} style={styles.input} />
    <Text style={[styles.label, { marginTop: 16 }]}>Message (optional)</Text><TextInput value={message} onChangeText={setMessage} maxLength={1500} multiline placeholder="Tell the provider anything important" placeholderTextColor={colors.textMuted} style={styles.textarea} />
    <Text style={styles.section}>Preferred reply</Text><View style={styles.channels}>{channels.map((item) => <Button key={item.id} title={item.label} icon={item.icon} fullWidth={false} variant={preferredChannel === item.id ? 'primary' : 'outline'} onPress={() => setPreferredChannel(item.id)} style={styles.channel} />)}</View>
    <View style={styles.notice}><Ionicons name="information-circle-outline" size={22} color={colors.primary} /><Text style={styles.noticeText}>This is an inquiry, not a confirmed booking. The independent rental provider—not Sawa Cars—sets and manages the contract, payment, deposit, insurance, pickup, return and any dispute.</Text></View>
    <Button title={acknowledged ? 'Notice accepted' : 'I understand and accept'} icon={acknowledged ? 'checkmark-circle' : 'ellipse-outline'} variant={acknowledged ? 'secondary' : 'outline'} onPress={() => { setAcknowledged((value) => !value); setError(''); }} />
    {!!error && <View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View>}
    <Button title={isLoggedIn ? 'Send availability request' : 'Sign in to continue'} icon="arrow-forward-outline" loading={loading} onPress={submit} style={{ marginTop: 14 }} />
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, padding: 16, ...shadows.card },
  title: { fontSize: 17, fontFamily: fonts.extraBold, color: colors.textPrimary }, sub: { marginTop: 3, fontSize: 13, color: colors.textSecondary },
  section: { marginTop: 22, fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary }, helper: { marginTop: 5, marginBottom: 12, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 }, half: { flex: 1 }, label: { marginBottom: 7, fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  input: { height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: 13, fontSize: 15, color: colors.textPrimary },
  textarea: { minHeight: 96, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: 13, textAlignVertical: 'top', fontSize: 15, color: colors.textPrimary },
  channels: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, channel: { minWidth: 105, minHeight: 48 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 20, padding: 15, borderRadius: radius.xl, backgroundColor: colors.blueTint }, noticeText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  error: { flexDirection: 'row', gap: 8, marginTop: 14, padding: 12, borderRadius: radius.lg, backgroundColor: colors.danger + '10' }, errorText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.danger },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, success: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }, successIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, successTitle: { marginTop: 20, fontSize: 22, fontFamily: fonts.extraBold, color: colors.textPrimary, textAlign: 'center' }, successBody: { marginTop: 10, fontSize: 14, lineHeight: 21, color: colors.textSecondary, textAlign: 'center' }, successButton: { marginTop: 14 }, noticeSmall: { marginTop: 18, fontSize: 12, lineHeight: 17, color: colors.textMuted, textAlign: 'center' },
});
