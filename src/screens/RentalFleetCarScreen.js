import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Photo from '../components/Photo';
import { LoadingState, ErrorState } from '../components/StateViews';
import { showConfirm, showToast } from '../components/Feedback';
import { useApp } from '../context/AppContext';
import rentalsApi from '../api/rentals';
import { captureImages } from '../utils/media';
import { PHOTO } from '../utils/photo';
import { addDays, formatDay, isIsoDay, kigaliToday } from '../utils/rentalDates';
import { colors, fonts, radius, shadows } from '../theme';

// One of the provider's own rental cars: everything they keep up to date,
// on the phone they run their business from. The app's half of the website's
// /dashboard/rentals/fleet — same endpoints, same rules:
//   · the Sawa Rental Check (status, what to fix, ask for a visit)
//   · listing photos, uploaded straight from the gallery
//   · taken dates, so renters see when the car is back
//   · rates
// Publication stays with Sawa's team; nothing here can put a car live.

const CHECK_TONE = {
  passed: { color: colors.greenText, bg: colors.greenTint, icon: 'shield-checkmark' },
  expiring: { color: colors.amberText, bg: colors.amberTint, icon: 'alert-circle' },
  legacy: { color: colors.textSecondary, bg: colors.surfaceAlt, icon: 'shield-outline' },
  requested: { color: colors.primary, bg: colors.blueTint, icon: 'time-outline' },
  none: { color: colors.danger, bg: colors.danger + '12', icon: 'shield-outline' },
  failed: { color: colors.danger, bg: colors.danger + '12', icon: 'close-circle' },
  expired: { color: colors.danger, bg: colors.danger + '12', icon: 'close-circle' },
};
const CAN_REQUEST = ['none', 'failed', 'expired', 'expiring', 'legacy'];
const QUICK_LENGTHS = [1, 3, 7, 14];

export default function RentalFleetCarScreen({ navigation, route }) {
  const { t } = useApp();
  const carId = route.params?.carId;
  const [car, setCar] = useState(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);
  const today = kigaliToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(today, 2));
  const [rates, setRates] = useState(null);

  const load = useCallback(async () => {
    try {
      const mine = await rentalsApi.getMyFleet();
      const found = (Array.isArray(mine) ? mine : []).find((row) => String(row.id) === String(carId)) || null;
      setCar(found);
      setFailed(!found);
      if (found) {
        setRates({
          daily_rate: String(found.daily_rate ?? ''), weekly_rate: found.weekly_rate == null ? '' : String(found.weekly_rate),
          deposit: String(found.deposit ?? 0), min_days: String(found.min_days ?? 1), location: found.location || '',
        });
      }
    } catch {
      setFailed(true);
    }
  }, [carId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // One wrapper for every action: busy flag, honest error, reload after.
  const run = async (key, action, okMessage) => {
    setBusy(key);
    try {
      await action();
      if (okMessage) showToast(okMessage, 'success');
      await load();
    } catch (err) {
      showToast(err?.message || t('rentalFleet.failed'), 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!car) {
    return (
      <Screen background={colors.bg}>
        <BackHeader title={t('rentalFleet.title')} onBack={() => navigation.goBack()} />
        {failed ? (
          <ErrorState title={t('rentalFleet.title')} sub={t('rentalFleet.loadFailed')} actionLabel={t('rentalInbox.retry')} onAction={load} />
        ) : (
          <LoadingState label={t('common.loading')} />
        )}
      </Screen>
    );
  }

  const status = car.check_status || 'none';
  const tone = CHECK_TONE[status] || CHECK_TONE.none;
  const check = car.rental_check?.kind === 'rental_check' ? car.rental_check : null;
  const periods = car.calendar_periods || [];
  const images = car.images || [];
  const freshness = car.availability?.freshness;
  const retired = car.status === 'retired';

  const addPhotos = async () => {
    const picked = await captureImages({ preset: 'listing', limit: 6 });
    if (!picked.length) return;
    await run('photos', () => rentalsApi.uploadPhotos(car.id, picked), t('rentalFleet.photosAdded'));
  };

  const markTaken = () => {
    if (!isIsoDay(from) || !isIsoDay(to) || to < from) {
      showToast(t('rentalFleet.datesInvalid'), 'error');
      return;
    }
    run('mark', () => rentalsApi.markTaken(car.id, from, to), t('rentalFleet.calendarSaved'));
  };

  const removePeriod = async (period) => {
    const ok = await showConfirm({
      title: t('rentalFleet.removeTitle'),
      message: t('rentalCalendar.range', { from: formatDay(period.starts_on), to: formatDay(period.ends_on) }),
      confirmLabel: t('rentalFleet.remove'), cancelLabel: t('common.cancel'),
    });
    if (ok) run(`rm-${period.id}`, () => rentalsApi.removePeriod(car.id, period.id), t('rentalFleet.calendarSaved'));
  };

  const saveRates = () => {
    const number = (value) => (value === '' ? undefined : Number(String(value).replace(/[^\d]/g, '')));
    const daily = number(rates.daily_rate);
    if (!daily) { showToast(t('rentalFleet.rateInvalid'), 'error'); return; }
    run('rates', () => rentalsApi.updateMyCar(car.id, {
      daily_rate: daily, weekly_rate: number(rates.weekly_rate), deposit: number(rates.deposit) ?? 0,
      min_days: number(rates.min_days) || 1, location: rates.location.trim() || undefined,
    }), t('rentalFleet.ratesSaved'));
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title={car.title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>

        {/* Rental Check */}
        <View style={styles.card}>
          <Text style={styles.section}>{t('rentalCheck.title')}</Text>
          <View style={[styles.status, { backgroundColor: tone.bg }]}>
            <Ionicons name={tone.icon} size={18} color={tone.color} />
            <Text style={[styles.statusText, { color: tone.color }]}>{t(`rentalFleet.checkStatus.${status}`)}</Text>
          </View>
          {!!check && (
            <Text style={styles.sub}>
              {t('rentalFleet.checkDetail', {
                passed: check.passed_count, total: check.total, date: formatDay(check.checked_on),
                insurance: formatDay(check.insurance_valid_until), technical: formatDay(check.technical_control_valid_until),
              })}
            </Text>
          )}
          {!!check?.failed?.length && (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.label}>{t(check.passed ? 'rentalFleet.noted' : 'rentalFleet.fix')}</Text>
              {check.failed.map((item) => <Text key={item.id} style={styles.sub}>• {item.label}{item.note ? `: ${item.note}` : ''}</Text>)}
            </View>
          )}
          {(status === 'none' || status === 'requested') && <Text style={styles.sub}>{t('rentalFleet.checkExplain')}</Text>}
          {CAN_REQUEST.includes(status) && !retired && (
            <Button title={t('rentalFleet.requestCheck')} icon="shield-checkmark-outline" variant="outline" loading={busy === 'check'}
              onPress={() => run('check', () => rentalsApi.requestCheck(car.id), t('rentalFleet.checkRequested'))} style={styles.button} />
          )}
        </View>

        {/* Photos */}
        {!retired && (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.section, { flex: 1 }]}>{t('rentalFleet.photos')}</Text>
              <Text style={styles.sub}>{t('rentalFleet.photoCount', { count: images.length })}</Text>
            </View>
            {images.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {images.slice(0, 20).map((uri) => <Photo key={uri} uri={uri} width={PHOTO.CARD} style={styles.thumb} resizeMode="cover" />)}
              </ScrollView>
            ) : (
              <Text style={styles.sub}>{t('rentalFleet.noPhotos')}</Text>
            )}
            <Button title={t('rentalFleet.addPhotos')} icon="images-outline" variant="outline" loading={busy === 'photos'} onPress={addPhotos} style={styles.button} />
          </View>
        )}

        {/* Taken dates */}
        {!retired && (
          <View style={styles.card}>
            <Text style={styles.section}>{t('rentalFleet.takenDates')}</Text>
            <Text style={styles.sub}>{t('rentalFleet.takenHint')}</Text>
            {(freshness === 'stale' || freshness === 'aging') && periods.length > 0 && (
              <View style={[styles.status, { backgroundColor: colors.amberTint }]}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.amberText} />
                <Text style={[styles.statusText, { color: colors.amberText }]}>{t('rentalFleet.calendarStale')}</Text>
              </View>
            )}
            {periods.length ? periods.map((period) => {
              const outNow = period.starts_on <= today && period.ends_on >= today;
              return (
                <View key={period.id} style={styles.period}>
                  <Text style={styles.periodText}>{t('rentalCalendar.range', { from: formatDay(period.starts_on), to: formatDay(period.ends_on) })}</Text>
                  <View style={styles.row}>
                    {outNow && (
                      <Pressable style={styles.chip} disabled={!!busy}
                        onPress={() => run(`back-${period.id}`, () => rentalsApi.updatePeriod(car.id, period.id, { ends_on: addDays(today, -1) }), t('rentalFleet.calendarSaved'))}>
                        <Text style={styles.chipText}>{t('rentalFleet.backToday')}</Text>
                      </Pressable>
                    )}
                    <Pressable style={styles.chip} disabled={!!busy} onPress={() => removePeriod(period)} accessibilityLabel={t('rentalFleet.remove')}>
                      <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              );
            }) : <Text style={styles.sub}>{t('rentalFleet.noTaken')}</Text>}

            <View style={[styles.row, { marginTop: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{t('rentalFleet.firstDay')}</Text>
                <TextInput value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" style={styles.input} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{t('rentalFleet.lastDay')}</Text>
                <TextInput value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" style={styles.input} />
              </View>
            </View>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              {QUICK_LENGTHS.map((days) => (
                <Pressable key={days} style={styles.chip} onPress={() => isIsoDay(from) && setTo(addDays(from, days - 1))}>
                  <Text style={styles.chipText}>{t('rentalFleet.forDays', { count: days })}</Text>
                </Pressable>
              ))}
            </View>
            <Button title={t('rentalFleet.markTaken')} icon="calendar-outline" loading={busy === 'mark'} onPress={markTaken} style={styles.button} />
            <Pressable style={styles.linkButton} disabled={!!busy}
              onPress={() => run('confirm', () => rentalsApi.confirmCalendar(car.id), t('rentalFleet.calendarSaved'))}>
              <Text style={styles.link}>{t('rentalFleet.upToDate')}</Text>
            </Pressable>
          </View>
        )}

        {/* Rates */}
        {!retired && rates && (
          <View style={styles.card}>
            <Text style={styles.section}>{t('rentalFleet.rates')}</Text>
            {[
              ['daily_rate', 'rentalFleet.dailyRate', 'number-pad'],
              ['weekly_rate', 'rentalFleet.weeklyRate', 'number-pad'],
              ['deposit', 'rentalFleet.deposit', 'number-pad'],
              ['min_days', 'rentalFleet.minDays', 'number-pad'],
              ['location', 'rentalFleet.location', 'default'],
            ].map(([key, label, keyboard]) => (
              <View key={key} style={{ marginTop: 10 }}>
                <Text style={styles.label}>{t(label)}</Text>
                <TextInput value={rates[key]} onChangeText={(value) => setRates((old) => ({ ...old, [key]: value }))} keyboardType={keyboard} style={styles.input} />
              </View>
            ))}
            <Button title={t('rentalFleet.saveRates')} loading={busy === 'rates'} onPress={saveRates} style={styles.button} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, paddingBottom: 48, gap: 14 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, padding: 16, gap: 6, ...shadows.card },
  section: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  sub: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  label: { marginBottom: 6, fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },
  statusText: { flex: 1, fontSize: 13, fontFamily: fonts.bold },
  button: { marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb: { width: 112, height: 76, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  period: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 52, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 6 },
  periodText: { flex: 1, fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  chip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, minHeight: 44, minWidth: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary },
  input: { height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: 13, fontSize: 15, color: colors.textPrimary },
  linkButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  link: { fontSize: 13, fontFamily: fonts.bold, color: colors.textSecondary, textDecorationLine: 'underline' },
});
