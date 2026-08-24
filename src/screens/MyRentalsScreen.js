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
  new: { label: 'Sent', color: colors.primary, bg: colors.blueTint },
  contacted: { label: 'Provider contacted', color: colors.green, bg: colors.greenTint },
  closed: { label: 'Closed', color: colors.textSecondary, bg: colors.surfaceAlt },
  cancelled: { label: 'Cancelled', color: colors.textMuted, bg: colors.surfaceAlt },
};

export default function MyRentalsScreen({ navigation }) {
  const { rentalInquiries, cancelRentalInquiry, setHomeMode } = useApp();
  const [busyId, setBusyId] = useState(null);

  const browse = () => {
    setHomeMode('rent');
    navigation.navigate('Main', { screen: 'Home' });
  };

  const cancel = async (item) => {
    const ok = await showConfirm({ title: 'Cancel this inquiry?', message: 'This closes the availability request. It does not cancel any separate agreement you may already have made with the provider.', confirmLabel: 'Cancel inquiry', cancelLabel: 'Keep inquiry', destructive: true });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await cancelRentalInquiry(item.id);
      showToast('Inquiry cancelled.', 'success');
    } catch (err) {
      showToast(err?.message || 'Could not cancel the inquiry.', 'error');
    } finally { setBusyId(null); }
  };

  return <Screen background={colors.bg}><BackHeader title="Rental inquiries" onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.info}><Ionicons name="information-circle-outline" size={21} color={colors.primary} /><Text style={styles.infoText}>These are availability requests—not bookings. The provider confirms dates and manages any contract, payment, deposit, pickup and return directly with you.</Text></View>
      {rentalInquiries.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={34} color={colors.primary} /></View><Text style={styles.emptyTitle}>No rental inquiries yet</Text><Text style={styles.emptyText}>Browse verified provider vehicles and request the dates you need.</Text><Button title="Browse rentals" icon="key-outline" onPress={browse} style={styles.emptyButton} /></View> : rentalInquiries.map((item) => {
        const meta = STATUS[item.status] || STATUS.new;
        return <View key={item.id} style={styles.card}><View style={styles.cardHead}><View style={{ flex: 1 }}><Text style={styles.carTitle}>{item.carTitle || 'Rental vehicle'}</Text><Text style={styles.reference}>{item.inquiryRef || 'Inquiry'} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently'}</Text></View><View style={[styles.badge, { backgroundColor: meta.bg }]}><Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text></View></View>
          <View style={styles.details}><Detail icon="calendar-outline" label="Requested" value={`${item.startDate || 'Flexible'}${item.days ? ` · ${item.days} days` : ''}`} /><Detail icon="business-outline" label="Provider" value={item.providerName || 'Rental provider'} /><Detail icon="chatbubble-outline" label="Preferred reply" value={(item.preferredChannel || 'in_app').replace('_', ' ')} /></View>
          {!!item.message && <Text style={styles.message}>{item.message}</Text>}
          <View style={styles.actions}><Button title="View vehicle" variant="outline" fullWidth={false} onPress={() => navigation.navigate('RentalDetail', { rentalId: item.carId })} style={styles.actionButton} />{['new', 'contacted'].includes(item.status) && <Button title="Cancel inquiry" variant="secondary" fullWidth={false} loading={busyId === item.id} onPress={() => cancel(item)} style={styles.actionButton} />}</View>
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
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.blueTint, borderRadius: radius.xl, padding: 14 }, infoText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  empty: { marginTop: 36, alignItems: 'center', padding: 24 }, emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueTint }, emptyTitle: { marginTop: 17, fontSize: 19, fontFamily: fonts.extraBold, color: colors.textPrimary }, emptyText: { marginTop: 7, maxWidth: 300, textAlign: 'center', fontSize: 13.5, lineHeight: 20, color: colors.textSecondary }, emptyButton: { marginTop: 20 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, padding: 16, ...shadows.card }, cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, carTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary }, reference: { marginTop: 4, fontSize: 11.5, color: colors.textMuted }, badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }, badgeText: { fontSize: 11, fontFamily: fonts.extraBold },
  details: { marginTop: 14, gap: 10 }, detail: { flexDirection: 'row', alignItems: 'center', gap: 10 }, detailLabel: { fontSize: 11, color: colors.textMuted }, detailValue: { marginTop: 1, fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary, textTransform: 'capitalize' },
  message: { marginTop: 13, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, padding: 12, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 15 }, actionButton: { minHeight: 48, flexGrow: 1 },
});
