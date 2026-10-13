import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Linking, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews';
import { showConfirm, showToast } from '../components/Feedback';
import { useApp } from '../context/AppContext';
import rentalsApi from '../api/rentals';
import { formatRWF } from '../data/marketData';
import { formatDay } from '../utils/rentalDates';
import { colors, fonts, radius, shadows } from '../theme';

// What a rental provider sees: the requests people sent about their vehicles,
// and the state of those vehicles. It is the app's half of the website's
// /dashboard/rentals/inbox and /fleet — same endpoints, same rules. Sawa Cars
// takes no part in the rental, so the actions here are only "I replied" and
// "this one is done"; the provider agrees everything else with the renter.

const INQUIRY_STATUS = {
  new: { key: 'rentalInbox.statusNew', color: colors.primary, bg: colors.blueTint },
  contacted: { key: 'rentalInbox.statusContacted', color: colors.green, bg: colors.greenTint },
  closed: { key: 'rentalInbox.statusClosed', color: colors.textSecondary, bg: colors.surfaceAlt },
  cancelled: { key: 'rentalInbox.statusCancelled', color: colors.textMuted, bg: colors.surfaceAlt },
};

const FLEET_STATUS = {
  active: { key: 'rentalInbox.fleetActive', color: colors.green, bg: colors.greenTint },
  maintenance: { key: 'rentalInbox.fleetMaintenance', color: colors.amberText, bg: colors.amberTint },
  pending_review: { key: 'rentalInbox.fleetPending', color: colors.primary, bg: colors.blueTint },
  retired: { key: 'rentalInbox.fleetRetired', color: colors.textMuted, bg: colors.surfaceAlt },
};

const digits = (value) => String(value || '').replace(/[^\d]/g, '');

// Rental Check state, as the server derives it (rentalCheckStatus).
const CHECK_STATUS = {
  requested: { color: colors.primary },
  none: { color: colors.danger },
  legacy: { color: colors.textMuted },
  failed: { color: colors.danger },
  expired: { color: colors.danger },
  expiring: { color: colors.amberText },
  passed: { color: colors.greenText || colors.green },
};

export default function RentalInboxScreen({ navigation }) {
  const { t } = useApp();
  const [tab, setTab] = useState('requests');
  const [inquiries, setInquiries] = useState(null);
  const [fleet, setFleet] = useState(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [inbox, mine] = await Promise.all([
        rentalsApi.getReceivedInquiries(),
        rentalsApi.getMyFleet().catch(() => []),
      ]);
      setInquiries(Array.isArray(inbox) ? inbox : []);
      setFleet(Array.isArray(mine) ? mine : []);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const setStatus = async (item, status) => {
    if (status === 'closed') {
      const ok = await showConfirm({
        title: t('rentalInbox.closeTitle'), message: t('rentalInbox.closeText'),
        confirmLabel: t('rentalInbox.close'), cancelLabel: t('common.cancel'),
      });
      if (!ok) return;
    }
    setBusyId(item.id);
    try {
      const updated = await rentalsApi.setInquiryStatus(item.id, status);
      setInquiries((list) => list.map((row) => (row.id === item.id ? { ...row, ...updated } : row)));
    } catch {
      showToast(t('rentalInbox.updateFailed'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const open = (url) => Linking.openURL(url).catch(() => showToast(t('rentalInbox.updateFailed'), 'error'));

  // "Rented out for these dates": the provider agreed it with the renter, so
  // the dates go on the car's calendar and the request closes. The calendar
  // keeps no link to the renter (backend migration 0061).
  const rentedOut = async (item) => {
    setBusyId(item.id);
    try {
      await rentalsApi.rentedOut(item.id);
      setInquiries((list) => list.map((row) => (row.id === item.id ? { ...row, status: 'closed' } : row)));
      showToast(t('rentalInbox.rentedOutDone'), 'success');
    } catch (err) {
      showToast(err?.message || t('rentalInbox.updateFailed'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const body = () => {
    if (failed && inquiries === null) {
      return <ErrorState title={t('rentalInbox.title')} sub={t('rentalInbox.loadFailed')} actionLabel={t('rentalInbox.retry')} onAction={load} />;
    }
    if (inquiries === null) return <LoadingState label={t('common.loading')} />;
    if (tab === 'fleet') {
      const addCar = <Button key="add" title={t('rentalFleet.addCar')} icon="add-circle-outline" variant="outline" onPress={() => navigation.navigate('RentalAddCar')} />;
      if (!fleet.length) return [addCar, <EmptyState key="empty" icon="car-outline" title={t('rentalInbox.tabFleet')} sub={t('rentalInbox.fleetEmpty')} />];
      return [addCar, ...fleet.map((car) => {
        const meta = FLEET_STATUS[car.status] || FLEET_STATUS.retired;
        const check = CHECK_STATUS[car.check_status] || null;
        const backOn = car.availability?.out_now ? car.availability.back_on : null;
        return (
          <Pressable key={car.id} style={styles.card} onPress={() => navigation.navigate('RentalFleetCar', { carId: car.id })} accessibilityRole="button" accessibilityLabel={car.title}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{car.title}</Text>
                <Text style={styles.sub}>{t('rentalInbox.perDay', { amount: formatRWF(Number(car.daily_rate)) })}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: meta.bg }]}><Text style={[styles.badgeText, { color: meta.color }]}>{t(meta.key)}</Text></View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginTop: 4 }} />
            </View>
            {!!check && <Text style={[styles.sub, { color: check.color }]}>{t(`rentalFleet.checkStatus.${car.check_status}`)}</Text>}
            {!!backOn && <Text style={styles.sub}>{t('rentalCalendar.takenBack', { date: formatDay(backOn) })}</Text>}
          </Pressable>
        );
      })];
    }
    if (!inquiries.length) return <EmptyState icon="mail-open-outline" title={t('rentalInbox.emptyTitle')} sub={t('rentalInbox.emptyText')} />;
    return inquiries.map((item) => {
      const meta = INQUIRY_STATUS[item.status] || INQUIRY_STATUS.new;
      // Numbers arrive only when the renter agreed to share them.
      const phone = digits(item.renter_phone);
      const wa = digits(item.renter_whatsapp || item.renter_phone);
      const live = item.status === 'new' || item.status === 'contacted';
      return (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.car_title}</Text>
              <Text style={styles.sub}>{item.inquiry_ref} · {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: meta.bg }]}><Text style={[styles.badgeText, { color: meta.color }]}>{t(meta.key)}</Text></View>
          </View>
          <Text style={styles.renter}>{t('rentalInbox.from', { name: item.renter_name || '—' })}</Text>
          <Text style={styles.sub}>
            {t('rentalInbox.requested')}: {item.start_date ? String(item.start_date).slice(0, 10) : t('rentalInbox.flexible')}
            {item.days ? ` · ${t('rentalInbox.days', { count: item.days })}` : ''}
          </Text>
          {!!item.message && <Text style={styles.message}>{item.message}</Text>}
          {!phone && !wa && <Text style={styles.sub}>{t('rentalInbox.numberPrivate')}</Text>}
          {live && (
            <View style={styles.actions}>
              {!!item.conversation_id && <Pressable style={styles.chip} onPress={() => navigation.navigate('Chat', { convId: item.conversation_id, name: item.renter_name })}><Ionicons name="chatbubbles-outline" size={16} color={colors.textPrimary} /><Text style={styles.chipText}>{t('rentalInbox.openChat')}</Text></Pressable>}
              {!!phone && <Pressable style={styles.chip} onPress={() => open(`tel:+${phone}`)}><Ionicons name="call-outline" size={16} color={colors.textPrimary} /><Text style={styles.chipText}>{t('rentalInbox.call')}</Text></Pressable>}
              {!!wa && <Pressable style={styles.chip} onPress={() => open(`https://wa.me/${wa}`)}><Ionicons name="logo-whatsapp" size={16} color={colors.textPrimary} /><Text style={styles.chipText}>{t('rentalInbox.whatsapp')}</Text></Pressable>}
            </View>
          )}
          {live && (
            <View style={styles.actions}>
              {!!item.start_date && <Button title={t('rentalInbox.rentedOut')} icon="calendar-outline" variant="primary" fullWidth={false} loading={busyId === item.id} onPress={() => rentedOut(item)} style={styles.actionButton} />}
              {item.status === 'new' && <Button title={t('rentalInbox.markContacted')} variant="outline" fullWidth={false} loading={busyId === item.id} onPress={() => setStatus(item, 'contacted')} style={styles.actionButton} />}
              <Button title={t('rentalInbox.close')} variant="secondary" fullWidth={false} loading={busyId === item.id} onPress={() => setStatus(item, 'closed')} style={styles.actionButton} />
            </View>
          )}
        </View>
      );
    });
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('rentalInbox.title')} onBack={() => navigation.goBack()} />
      <View style={styles.tabs}>
        {['requests', 'fleet'].map((key) => (
          <Pressable key={key} style={[styles.tab, tab === key && styles.tabOn]} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: tab === key }}>
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{t(key === 'requests' ? 'rentalInbox.tabRequests' : 'rentalInbox.tabFleet')}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        {tab === 'requests' && inquiries !== null && (
          <View style={styles.info}><Ionicons name="information-circle-outline" size={21} color={colors.primary} /><Text style={styles.infoText}>{t('rentalInbox.intro')}</Text></View>
        )}
        {body()}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  tabOn: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontFamily: fonts.bold, color: colors.textSecondary },
  tabTextOn: { color: '#fff' },
  content: { padding: 20, paddingTop: 8, paddingBottom: 40, gap: 14, flexGrow: 1 },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.blueTint, borderRadius: radius.xl, padding: 14 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, padding: 16, gap: 6, ...shadows.card },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  sub: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  renter: { marginTop: 8, fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 11, fontFamily: fonts.extraBold },
  message: { marginTop: 6, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, padding: 12, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 10 },
  actionButton: { minHeight: 48, flexGrow: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary },
});
