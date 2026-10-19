import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { useApp } from '../context/AppContext';
import { formatDay, isIsoDay, kigaliToday } from '../utils/rentalDates';
import { colors, fonts, radius, shadows } from '../theme';

const tomorrowISO = () => {
  const day = new Date();
  day.setDate(day.getDate() + 1);
  return day.toISOString().slice(0, 10);
};


// The API's error text is English; its status and code are not. Map those so
// the renter reads the reason in their own language.
function inquiryErrorKey(err) {
  if (err?.isNetworkError) return 'rentalInquiry.errNetwork';
  switch (err?.code) {
    case 'INVALID_START_DATE': return 'rentalInquiry.errDate';
    case 'INVALID_DAYS': return 'rentalInquiry.errSend';
    case 'MARKETPLACE_TERMS_REQUIRED': return 'rentalInquiry.errAccept';
    case 'CONTACT_NOT_AVAILABLE': return 'rentalInquiry.channelUnavailable';
    case 'CONTACT_BLOCKED':
    case 'BLOCKED': return 'rentalInquiry.contactBlocked';
    case 'RENTAL_NOT_FOUND': return 'rentalInquiry.rentalGone';
    case 'OWN_RENTAL': return 'rentalInquiry.ownRental';
    case 'CONTENT_REJECTED': return 'rentalInquiry.contentRejected';
    default: break;
  }
  switch (err?.status) {
    case 404: return 'rentalInquiry.rentalGone';
    case 403: return 'rentalInquiry.contactBlocked';
    case 409: return 'rentalInquiry.channelUnavailable';
    case 428: return 'rentalInquiry.errAccept';
    case 429: return 'rentalInquiry.tooMany';
    default: return 'rentalInquiry.errSend';
  }
}

export default function RentalInquiryScreen({ navigation, route }) {
  const car = route.params?.car;
  const { isLoggedIn, sendRentalInquiry, t } = useApp();
  const available = car?.providerContactAvailable || { in_app: true, phone: false, whatsapp: false };
  const channels = useMemo(() => [
    { id: 'in_app', label: t('rentalInquiry.channelInApp'), icon: 'chatbubble-outline' },
    ...(available.whatsapp ? [{ id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' }] : []),
    ...(available.phone ? [{ id: 'phone', label: t('rentalInquiry.channelPhone'), icon: 'call-outline' }] : []),
  ], [available.phone, available.whatsapp, t]);
  const [startDate, setStartDate] = useState(tomorrowISO());
  const [days, setDays] = useState(String(car?.minDays || 1));
  const [pickupLocation, setPickupLocation] = useState('');
  const [message, setMessage] = useState('');
  const [preferredChannel, setPreferredChannel] = useState('in_app');
  const [acknowledged, setAcknowledged] = useState(false);
  // In-app alone keeps the renter's number private; choosing WhatsApp or
  // Phone shares it anyway (backend migration 0061).
  const [shareContact, setShareContact] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  if (!car) return <Screen background={colors.bg}><BackHeader title={t('rentalInquiry.title')} onBack={() => navigation.goBack()} /><View style={styles.center}><Text style={styles.title}>{t('rentalInquiry.unavailable')}</Text></View></Screen>;

  const submit = async () => {
    if (!isLoggedIn) return navigation.navigate('SignIn');
    const count = Number(days);
    // Today in Kigali is allowed, as on the server and the website; the
    // phone's own clock and time zone don't decide which day "today" is.
    if (!isIsoDay(startDate) || startDate < kigaliToday()) return setError(t('rentalInquiry.errDate'));
    if (!Number.isInteger(count) || count < (car.minDays || 1) || count > 365) return setError(t('rentalInquiry.errDays', { min: car.minDays || 1 }));
    if (!acknowledged) return setError(t('rentalInquiry.errAccept'));
    setLoading(true); setError('');
    try {
      const created = await sendRentalInquiry({ carId: car.id, carTitle: car.title, startDateISO: startDate, startDate, days: count, pickupLocation: pickupLocation.trim(), message: message.trim(), preferredChannel, shareContact });
      setResult({
        reference: created.inquiry_ref || created.inquiryRef, contact: created.contact || null,
        channel: preferredChannel,
        conversationId: created.conversation_id || null,
        whatsappText: created.whatsapp_text || null,
        busyOverlap: Array.isArray(created.busy_overlap) ? created.busy_overlap : [],
      });
    } catch (err) {
      setError(t(inquiryErrorKey(err)));
    } finally { setLoading(false); }
  };

  if (result) {
    const openContact = async () => {
      if (!result.contact) return;
      // WhatsApp opens with the message already written, reference included.
      const text = result.whatsappText ? `?text=${encodeURIComponent(result.whatsappText)}` : '';
      const url = result.channel === 'whatsapp' ? `https://wa.me/${String(result.contact).replace(/\D/g, '')}${text}` : `tel:${result.contact}`;
      await Linking.openURL(url).catch(() => {});
    };
    const overlap = result.busyOverlap
      .map((r) => (r.from === r.to ? formatDay(r.from) : `${formatDay(r.from)} – ${formatDay(r.to)}`))
      .join(', ');
    return <Screen background={colors.bg}><BackHeader title={t('rentalInquiry.sentTitle')} onBack={() => navigation.navigate('MyRentals')} /><ScrollView contentContainerStyle={styles.success}><View style={styles.successIcon}><Ionicons name="checkmark" size={34} color="#fff" /></View><Text style={styles.successTitle}>{t('rentalInquiry.sentHeading')}</Text><Text style={styles.successBody}>{t('rentalInquiry.sentBody', { ref: result.reference || '—' })}</Text>{!!overlap && <View style={styles.overlap}><Ionicons name="calendar-outline" size={18} color={colors.amberText} /><Text style={styles.overlapText}>{t('rentalCalendar.overlap', { dates: overlap })}</Text></View>}{result.contact && result.channel !== 'in_app' ? <Button title={result.channel === 'whatsapp' ? t('rentalInquiry.continueWhatsapp') : t('rentalInquiry.callContact', { contact: result.contact })} icon={result.channel === 'whatsapp' ? 'logo-whatsapp' : 'call-outline'} onPress={openContact} style={styles.successButton} /> : null}{result.conversationId ? <Button title={t('rentalInquiry.openChat')} icon="chatbubbles-outline" variant={result.contact && result.channel !== 'in_app' ? 'outline' : 'primary'} onPress={() => navigation.navigate('Chat', { convId: result.conversationId, name: car.providerName })} style={styles.successButton} /> : null}<Button title={t('rentalInquiry.viewInquiries')} variant="outline" onPress={() => navigation.replace('MyRentals')} style={styles.successButton} /><Text style={styles.noticeSmall}>{t('rentalInquiry.doneNotice')}</Text></ScrollView></Screen>;
  }

  return <Screen background={colors.bg}><BackHeader title={t('rentalInquiry.title')} onBack={() => navigation.goBack()} /><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.summary}><Ionicons name="key-outline" size={24} color={colors.primary} /><View style={{ flex: 1 }}><Text style={styles.title}>{car.title}</Text><Text style={styles.sub}>{car.providerName || t('rentalInquiry.verifiedProvider')}</Text></View></View>
    <Text style={styles.section}>{t('rentalInquiry.requestedDates')}</Text><Text style={styles.helper}>{t('rentalInquiry.datesHelper')}</Text>
    <View style={styles.row}><View style={styles.half}><Text style={styles.label}>{t('rentalInquiry.startDate')}</Text><TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" style={styles.input} /></View><View style={styles.half}><Text style={styles.label}>{t('rentalInquiry.days')}</Text><TextInput value={days} onChangeText={setDays} keyboardType="number-pad" style={styles.input} /></View></View>
    <Text style={styles.label}>{t('rentalInquiry.pickupArea')}</Text><TextInput value={pickupLocation} onChangeText={setPickupLocation} maxLength={200} placeholder={t('rentalInquiry.pickupPlaceholder')} placeholderTextColor={colors.textMuted} style={styles.input} />
    <Text style={[styles.label, { marginTop: 16 }]}>{t('rentalInquiry.message')}</Text><TextInput value={message} onChangeText={setMessage} maxLength={1500} multiline placeholder={t('rentalInquiry.messagePlaceholder')} placeholderTextColor={colors.textMuted} style={styles.textarea} />
    <Text style={styles.section}>{t('rentalInquiry.preferredReply')}</Text><View style={styles.channels}>{channels.map((item) => <Button key={item.id} title={item.label} icon={item.icon} fullWidth={false} variant={preferredChannel === item.id ? 'primary' : 'outline'} onPress={() => setPreferredChannel(item.id)} style={styles.channel} />)}</View>
    <Pressable onPress={() => setShareContact((v) => !v)} style={styles.share} accessibilityRole="checkbox" accessibilityState={{ checked: shareContact }}><Ionicons name={shareContact ? 'checkbox' : 'square-outline'} size={22} color={shareContact ? colors.primary : colors.textMuted} /><View style={{ flex: 1 }}><Text style={styles.shareText}>{t('rentalInquiry.shareContact')}</Text><Text style={styles.shareHint}>{t('rentalInquiry.shareContactHint')}</Text></View></Pressable>
    <View style={styles.notice}><Ionicons name="information-circle-outline" size={22} color={colors.primary} /><Text style={styles.noticeText}>{t('rentalInquiry.notice')}</Text></View>
    <Button title={acknowledged ? t('rentalInquiry.noticeAccepted') : t('rentalInquiry.accept')} icon={acknowledged ? 'checkmark-circle' : 'ellipse-outline'} variant={acknowledged ? 'secondary' : 'outline'} onPress={() => { setAcknowledged((value) => !value); setError(''); }} />
    {!!error && <View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View>}
    <Button title={isLoggedIn ? t('rentalInquiry.send') : t('rentalInquiry.signIn')} icon="arrow-forward-outline" loading={loading} onPress={submit} style={{ marginTop: 14 }} />
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
  share: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16, minHeight: 48 }, shareText: { fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold, color: colors.textPrimary }, shareHint: { marginTop: 3, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  overlap: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14, padding: 12, borderRadius: radius.lg, backgroundColor: colors.amberTint }, overlapText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.amberText },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, success: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }, successIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, successTitle: { marginTop: 20, fontSize: 22, fontFamily: fonts.extraBold, color: colors.textPrimary, textAlign: 'center' }, successBody: { marginTop: 10, fontSize: 14, lineHeight: 21, color: colors.textSecondary, textAlign: 'center' }, successButton: { marginTop: 14 }, noticeSmall: { marginTop: 18, fontSize: 12, lineHeight: 17, color: colors.textMuted, textAlign: 'center' },
});
