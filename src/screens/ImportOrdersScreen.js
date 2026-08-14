import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import importsApi from '../api/imports';
import { colors, radius, shadows, fonts } from '../theme';
import { formatRWF } from '../data/marketData';

const LABELS = {
  enquiry: 'Enquiry received', quoted: 'Quotation ready', agreement_pending: 'Agreement review',
  deposit_due: 'First 50% due', deposit_review: 'Verifying first payment', ordered: 'Vehicle ordered',
  inspected_abroad: 'Inspection complete', shipping_booked: 'Shipping booked', in_transit: 'In transit',
  arrived: 'Arrived in Kigali', kigali_inspection: 'Kigali inspection', balance_due: 'Final 50% due',
  balance_review: 'Verifying final payment', customs_clearance: 'Customs clearance',
  ready_for_handover: 'Ready for handover', completed: 'Completed', cancelled: 'Cancelled',
};

export default function ImportOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try { setOrders(await importsApi.mine()); }
    catch (e) { setError(e.message || 'Could not load your import orders.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return <Screen background={colors.bg}>
    <BackHeader title="My Imports" onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); load(); }} />}>
      <View style={styles.hero}><Ionicons name="boat-outline" size={24} color={colors.primary} /><View style={{ flex: 1 }}><Text style={styles.heroTitle}>From supplier to Kigali</Text><Text style={styles.heroBody}>Your verified quotation, 50/50 payments and shipping milestones stay together.</Text></View></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !orders.length ? <View style={styles.empty}><Ionicons name="globe-outline" size={38} color={colors.textMuted} /><Text style={styles.emptyTitle}>No import orders yet</Text><Text style={styles.emptyBody}>Sawa Cars creates an official order after confirming your vehicle and landed-price quotation.</Text></View> : null}
      {orders.map((order) => <Pressable key={order.id} style={styles.card} onPress={() => navigation.navigate('ImportOrderDetail',{id:order.id})} accessibilityRole="button">
        <View style={styles.row}><Text style={styles.ref}>{order.order_ref}</Text><View style={styles.pill}><Text style={styles.pillText}>{LABELS[order.status] || order.status}</Text></View></View>
        <Text style={styles.title}>{order.year || ''} {order.make} {order.model}</Text>
        <Text style={styles.meta}>Importing from {order.origin_country}</Text>
        {order.quoted_total_rwf ? <Text style={styles.amount}>{formatRWF(Number(order.quoted_total_rwf))}</Text> : <Text style={styles.awaiting}>Awaiting verified quotation</Text>}
        <View style={styles.notice}><Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} /><Text style={styles.noticeText}>Pay only to the corporate account on your official Sawa order.</Text></View>
        <Text style={styles.open}>Open order →</Text>
      </Pressable>)}
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 48 }, hero: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.borderSoft },
  heroTitle: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.textPrimary }, heroBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 3 },
  error: { marginTop: 16, color: colors.primary, fontFamily: fonts.bold }, empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 24 }, emptyTitle: { marginTop: 12, fontFamily: fonts.extraBold, fontSize: 18, color: colors.textPrimary }, emptyBody: { marginTop: 6, textAlign: 'center', fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 19 },
  card: { marginTop: 14, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.borderSoft, ...shadows.card }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ref: { fontFamily: fonts.extraBold, fontSize: 11, color: colors.primary }, pill: { backgroundColor: colors.statusScheduledBg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 }, pillText: { fontFamily: fonts.bold, fontSize: 10, color: colors.statusScheduled },
  title: { marginTop: 12, fontFamily: fonts.extraBold, fontSize: 17, color: colors.textPrimary }, meta: { marginTop: 3, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }, amount: { marginTop: 12, fontFamily: fonts.extraBold, fontSize: 20, color: colors.textPrimary }, awaiting: { marginTop: 12, fontFamily: fonts.bold, fontSize: 13, color: colors.textSecondary },
  notice: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft, flexDirection: 'row', gap: 8, alignItems: 'center' }, noticeText: { flex: 1, fontFamily: fonts.medium, fontSize: 11, color: colors.textSecondary },
  open: { marginTop: 12, fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
});
