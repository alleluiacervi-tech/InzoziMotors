import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { showConfirm, showToast } from '../components/Feedback';
import { useApp } from '../context/AppContext';
import { colors, fonts, radius, shadows } from '../theme';

const STATUS = {
  new: { key: 'myRentals.statusNew', color: colors.primary, bg: colors.blueTint },
  contacted: { key: 'myRentals.statusContacted', color: colors.green, bg: colors.greenTint },
  closed: { key: 'myRentals.statusClosed', color: colors.textSecondary, bg: colors.surfaceAlt },
  cancelled: { key: 'myRentals.statusCancelled', color: colors.textMuted, bg: colors.surfaceAlt },
};
const CHANNEL_KEY = { in_app: 'myRentals.channelInApp', phone: 'myRentals.channelPhone', whatsapp: 'myRentals.channelWhatsapp' };

export default function MyRentalsScreen({ navigation }) {
  const { rentalInquiries, cancelRentalInquiry, setHomeMode, t } = useApp();
  const [busyId, setBusyId] = useState(null);

  const browse = () => {
    setHomeMode('rent');
    navigation.navigate('Main', { screen: 'Home' });
  };

  const cancel = async (item) => {
    const ok = await showConfirm({ title: t('myRentals.cancelTitle'), message: t('myRentals.cancelMessage'), confirmLabel: t('myRentals.cancel'), cancelLabel: t('myRentals.keep'), destructive: true });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await cancelRentalInquiry(item.id);
      showToast(t('myRentals.cancelled'), 'success');
    } catch (err) {
      showToast(err?.message || t('myRentals.cancelFailed'), 'error');
    } finally { setBusyId(null); }
  };

  return <Screen background={colors.bg}><BackHeader title={t('myRentals.title')} onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.info}><Ionicons name="information-circle-outline" size={21} color={colors.primary} /><Text style={styles.infoText}>{t('myRentals.info')}</Text></View>
      {rentalInquiries.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={34} color={colors.primary} /></View><Text style={styles.emptyTitle}>{t('myRentals.emptyTitle')}</Text><Text style={styles.emptyText}>{t('myRentals.emptyText')}</Text><Button title={t('myRentals.browse')} icon="key-outline" onPress={browse} style={styles.emptyButton} /></View> : rentalInquiries.map((item) => {
        const meta = STATUS[item.status] || STATUS.new;
        return <View key={item.id} style={styles.card}><View style={styles.cardHead}><View style={{ flex: 1 }}><Text style={styles.carTitle}>{item.carTitle || t('myRentals.rentalVehicle')}</Text><Text style={styles.reference}>{item.inquiryRef || t('myRentals.inquiry')} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : t('myRentals.recently')}</Text></View><View style={[styles.badge, { backgroundColor: meta.bg }]}><Text style={[styles.badgeText, { color: meta.color }]}>{t(meta.key)}</Text></View></View>
          <View style={styles.details}><Detail icon="calendar-outline" label={t('myRentals.requested')} value={`${item.startDate || t('myRentals.flexible')}${item.days ? ` · ${t('myRentals.daysCount', { count: item.days })}` : ''}`} /><Detail icon="business-outline" label={t('myRentals.provider')} value={item.providerName || t('myRentals.rentalProvider')} /><Detail icon="chatbubble-outline" label={t('myRentals.preferredReply')} value={t(CHANNEL_KEY[item.preferredChannel] || CHANNEL_KEY.in_app)} /></View>
          {!!item.message && <Text style={styles.message}>{item.message}</Text>}
          <View style={styles.actions}><Button title={t('myRentals.viewVehicle')} variant="outline" fullWidth={false} onPress={() => navigation.navigate('RentalDetail', { rentalId: item.carId })} style={styles.actionButton} />{['new', 'contacted'].includes(item.status) && <Button title={t('myRentals.cancel')} variant="secondary" fullWidth={false} loading={busyId === item.id} onPress={() => cancel(item)} style={styles.actionButton} />}</View>
        </View>;
      })}
    </ScrollView>
  </Screen>;
}

function Detail({ icon, label, value }) {
  return <View style={styles.detail}><Ionicons name={icon} size={17} color={colors.textMuted} /><View style={{ flex: 1 }}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, paddingBottom: 40, gap: 14 },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.blueTint, borderRadius: radius.xl, padding: 14 }, infoText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  empty: { marginTop: 36, alignItems: 'center', padding: 24 }, emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueTint }, emptyTitle: { marginTop: 17, fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary }, emptyText: { marginTop: 7, maxWidth: 300, textAlign: 'center', fontSize: 13, lineHeight: 20, color: colors.textSecondary }, emptyButton: { marginTop: 20 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, padding: 16, ...shadows.card }, cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, carTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary }, reference: { marginTop: 4, fontSize: 12, color: colors.textMuted }, badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }, badgeText: { fontSize: 11, fontFamily: fonts.extraBold },
  details: { marginTop: 14, gap: 10 }, detail: { flexDirection: 'row', alignItems: 'center', gap: 10 }, detailLabel: { fontSize: 11, color: colors.textMuted }, detailValue: { marginTop: 1, fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary, textTransform: 'capitalize' },
  message: { marginTop: 13, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, padding: 12, fontSize: 13, lineHeight: 18, color: colors.textSecondary }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 15 }, actionButton: { minHeight: 48, flexGrow: 1 },
});
