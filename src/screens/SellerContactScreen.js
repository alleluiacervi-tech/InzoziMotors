import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { showToast } from '../components/Feedback';
import carsApi from '../api/cars';
import { useApp } from '../context/AppContext';
import { colors, fonts, radius, shadows } from '../theme';

const CHANNELS = [
  { id: 'in_app', label: 'Message in Sawa', icon: 'chatbubble-outline' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { id: 'phone', label: 'Phone call', icon: 'call-outline' },
];

export default function SellerContactScreen({ navigation, route }) {
  const car = route.params?.car;
  const { isLoggedIn, getOrCreateConversation, sendMessage } = useApp();
  const availability = car?.sellerContactAvailable || { phone: false, whatsapp: false, in_app: true };
  const channels = useMemo(
    () => CHANNELS.filter((item) => item.id === 'in_app' || availability[item.id]),
    [availability.phone, availability.whatsapp, availability.in_app]
  );
  const [channel, setChannel] = useState(channels[0]?.id || 'in_app');
  const [message, setMessage] = useState('Hi, is this vehicle still available?');
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!car) {
    return <Screen background={colors.bg}><BackHeader title="Contact seller" onBack={() => navigation.goBack()} /><View style={styles.missing}><Text style={styles.missingTitle}>Vehicle unavailable</Text><Text style={styles.missingText}>Return to the listing and try again.</Text></View></Screen>;
  }

  const submit = async () => {
    if (!isLoggedIn) {
      navigation.navigate('SignIn');
      return;
    }
    if (!acknowledged) {
      setError('Read and accept the direct-deal notice to continue.');
      return;
    }
    if (channel === 'in_app' && message.trim().length < 2) {
      setError('Write a short message for the seller.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const disclosure = await carsApi.contactSeller(car.id, channel, true);
      if (channel === 'in_app') {
        const pendingConvId = await getOrCreateConversation(car.id, car.sellerId);
        const convId = await sendMessage(pendingConvId, message.trim(), car.id);
        navigation.replace('Chat', { convId, name: car.seller, car });
        return;
      }
      const contact = disclosure?.contact;
      if (!contact) throw new Error('The seller has not made this contact method available.');
      const url = channel === 'whatsapp'
        ? `https://wa.me/${String(contact).replace(/\D/g, '')}`
        : `tel:${contact}`;
      await Linking.openURL(url);
      showToast('Seller contact opened. Agree and document your transaction directly.', 'success');
    } catch (err) {
      setError(err?.message || 'We could not connect you to the seller. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Contact seller" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.summary}>
          <View style={styles.summaryIcon}><Ionicons name="car-sport-outline" size={23} color={colors.primary} /></View>
          <View style={{ flex: 1 }}><Text style={styles.carTitle}>{car.title}</Text><Text style={styles.sellerName}>{car.seller || 'Verified seller'}</Text></View>
        </View>

        <Text style={styles.heading}>Choose a contact method</Text>
        <View style={styles.channels}>
          {channels.map((item) => {
            const selected = item.id === channel;
            return <Button key={item.id} title={item.label} icon={item.icon} variant={selected ? 'primary' : 'outline'} onPress={() => { setChannel(item.id); setError(''); }} style={styles.channelButton} />;
          })}
        </View>

        {channel === 'in_app' && <View style={styles.field}><Text style={styles.label}>Your message</Text><TextInput value={message} onChangeText={setMessage} multiline maxLength={1000} style={styles.textarea} placeholder="Ask about availability or arrange a viewing" placeholderTextColor={colors.textMuted} /></View>}

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}><Text style={styles.noticeTitle}>Direct-deal marketplace notice</Text><Text style={styles.noticeText}>Sawa Cars provides listing, verification and inspection information. You and the seller independently agree the price, checks, contract, payment, delivery and ownership transfer. Sawa Cars does not hold funds, guarantee the transaction or decide an external dispute.</Text></View>
        </View>

        <Button title={acknowledged ? 'Notice accepted' : 'I understand and accept'} icon={acknowledged ? 'checkmark-circle' : 'ellipse-outline'} variant={acknowledged ? 'secondary' : 'outline'} onPress={() => { setAcknowledged((value) => !value); setError(''); }} />
        {!!error && <View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View>}
        <Button title={isLoggedIn ? 'Continue to seller' : 'Sign in to continue'} icon="arrow-forward-outline" loading={loading} onPress={submit} style={styles.submit} />
        <Text style={styles.privacy}>Contact details are shown only when the verified seller has chosen to make that channel visible.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, padding: 16, ...shadows.card },
  summaryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueTint },
  carTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  sellerName: { marginTop: 3, fontSize: 13, fontFamily: fonts.medium, color: colors.textSecondary },
  heading: { marginTop: 24, marginBottom: 10, fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  channels: { gap: 10 },
  channelButton: { minHeight: 50 },
  field: { marginTop: 20 },
  label: { marginBottom: 8, fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  textarea: { minHeight: 112, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: 14, textAlignVertical: 'top', fontSize: 15, fontFamily: fonts.regular, color: colors.textPrimary },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginVertical: 20, padding: 16, borderRadius: radius.xl, backgroundColor: colors.blueTint, borderWidth: 1, borderColor: colors.primary + '25' },
  noticeTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  noticeText: { marginTop: 5, fontSize: 12.5, lineHeight: 19, fontFamily: fonts.regular, color: colors.textSecondary },
  error: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14, padding: 12, borderRadius: radius.lg, backgroundColor: colors.danger + '10' },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: fonts.medium, color: colors.danger },
  submit: { marginTop: 14 },
  privacy: { marginTop: 12, textAlign: 'center', fontSize: 11.5, lineHeight: 17, fontFamily: fonts.regular, color: colors.textMuted },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  missingTitle: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary },
  missingText: { marginTop: 8, fontSize: 14, color: colors.textSecondary },
});
